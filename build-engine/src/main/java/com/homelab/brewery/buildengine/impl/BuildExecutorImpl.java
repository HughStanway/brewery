package com.homelab.brewery.buildengine.impl;

import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.api.command.CreateContainerResponse;
import com.github.dockerjava.api.command.PullImageResultCallback;
import com.github.dockerjava.api.model.Bind;
import com.github.dockerjava.api.model.HostConfig;
import com.github.dockerjava.api.model.Volume;
import com.github.dockerjava.api.command.WaitContainerResultCallback;
import com.homelab.brewery.buildengine.BuildExecutor;
import com.homelab.brewery.buildengine.model.BuildYamlConfig;
import com.homelab.brewery.common.entity.Artifact;
import com.homelab.brewery.common.entity.Build;
import com.homelab.brewery.common.repository.ArtifactRepository;
import com.homelab.brewery.common.repository.BuildRepository;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.io.FileUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.yaml.snakeyaml.Yaml;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.PathMatcher;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

@Service
@Slf4j
public class BuildExecutorImpl implements BuildExecutor {

    private final DockerClient dockerClient;
    private final BuildRepository buildRepository;
    private final ArtifactRepository artifactRepository;

    @Value("${brewery.artifact-store.base-path:/mnt/artifact-store}")
    private String artifactStorePath;

    public BuildExecutorImpl(
            DockerClient dockerClient,
            BuildRepository buildRepository,
            ArtifactRepository artifactRepository) {
        this.dockerClient = dockerClient;
        this.buildRepository = buildRepository;
        this.artifactRepository = artifactRepository;
    }

    @Override
    public void executeBuild(Build build) {
        log.info("Starting build execution. buildId={}, repository={}, commit={}",
                build.getId(), build.getRepository(), build.getCommit());

        build.setStatus("building");
        build.setStartedAt(Instant.now());
        buildRepository.save(build);

        File tempDir = new File("/tmp/brewery-builds/build-" + build.getId());
        File workspaceDir = new File(tempDir, "workspace");
        String containerId = null;

        try {
            // 1. Create Workspace
            if (!workspaceDir.mkdirs()) {
                throw new IOException("Failed to create workspace directory: " + workspaceDir.getAbsolutePath());
            }

            // 2. Clone Repository at specific commit
            log.info("Cloning repository commit. buildId={}, repo={}", build.getId(), build.getRepository());
            executeGitCommand(workspaceDir, "init");
            String originUrl;
            if (new File(build.getRepository()).isAbsolute() || new File(build.getRepository()).exists()) {
                originUrl = "file://" + new File(build.getRepository()).getAbsolutePath();
            } else {
                originUrl = "https://github.com/" + build.getRepository() + ".git";
            }
            executeGitCommand(workspaceDir, "remote", "add", "origin", originUrl);
            executeGitCommand(workspaceDir, "fetch", "--depth", "1", "origin", build.getCommit());
            executeGitCommand(workspaceDir, "checkout", "FETCH_HEAD");

            // 3. Read and Parse build.yaml
            File yamlFile = new File(workspaceDir, "build.yaml");
            if (!yamlFile.exists()) {
                throw new IllegalArgumentException("Missing mandatory build.yaml configuration in repository root");
            }

            Yaml yaml = new Yaml();
            BuildYamlConfig config;
            try (InputStream is = new FileInputStream(yamlFile)) {
                config = yaml.loadAs(is, BuildYamlConfig.class);
            }

            if (config.getMetadata() == null || config.getMetadata().getName() == null) {
                throw new IllegalArgumentException("build.yaml is missing metadata.name definition");
            }
            if (config.getBuild() == null || config.getBuild().getImage() == null) {
                throw new IllegalArgumentException("build.yaml is missing build.image definition");
            }

            // 4. Pull Builder Image
            String image = config.getBuild().getImage();
            log.info("Pulling builder container image. buildId={}, image={}", build.getId(), image);
            dockerClient.pullImageCmd(image)
                    .exec(new PullImageResultCallback())
                    .awaitCompletion(5, TimeUnit.MINUTES);

            // 5. Generate Shell Execution Script inside the workspace
            File scriptFile = new File(workspaceDir, "brewery_run.sh");
            StringBuilder scriptContent = new StringBuilder();
            scriptContent.append("#!/bin/sh\nset -e\n");
            
            if (config.getSteps() != null) {
                if (config.getSteps().getSetup() != null) {
                    scriptContent.append("echo '=== STEP: SETUP ==='\n")
                                 .append(config.getSteps().getSetup()).append("\n");
                }
                if (config.getSteps().getBuild() != null) {
                    scriptContent.append("echo '=== STEP: BUILD ==='\n")
                                 .append(config.getSteps().getBuild()).append("\n");
                }
                if (config.getSteps().getTest() != null) {
                    scriptContent.append("echo '=== STEP: TEST ==='\n")
                                 .append(config.getSteps().getTest()).append("\n");
                }
            }
            Files.writeString(scriptFile.toPath(), scriptContent.toString(), StandardCharsets.UTF_8);
            scriptFile.setExecutable(true);

            // 6. Create and Start Docker Container
            log.info("Creating builder container. buildId={}, image={}", build.getId(), image);
            
            Volume volume = new Volume("/workspace");
            HostConfig hostConfig = HostConfig.newHostConfig()
                    .withBinds(new Bind(workspaceDir.getAbsolutePath(), volume));

            // Set memory boundaries if configured (e.g. "4g" -> 4294967296 bytes)
            if (config.getBuild().getMemory() != null) {
                long memoryBytes = parseMemoryLimit(config.getBuild().getMemory());
                if (memoryBytes > 0) {
                    hostConfig.withMemory(memoryBytes);
                }
            }

            CreateContainerResponse container = dockerClient.createContainerCmd(image)
                    .withHostConfig(hostConfig)
                    .withCmd("/bin/sh", "brewery_run.sh")
                    .withWorkingDir("/workspace")
                    .exec();

            containerId = container.getId();
            log.info("Starting builder container. buildId={}, containerId={}", build.getId(), containerId);
            dockerClient.startContainerCmd(containerId).exec();

            // 7. Wait for execution completion
            int timeoutSeconds = config.getBuild().getTimeoutSeconds() != null ? config.getBuild().getTimeoutSeconds() : 1800;
            log.info("Waiting for build completion. buildId={}, timeout={}s", build.getId(), timeoutSeconds);

            WaitContainerResultCallback waitCallback = dockerClient.waitContainerCmd(containerId)
                    .exec(new WaitContainerResultCallback());

            boolean finished = waitCallback.awaitCompletion(timeoutSeconds, TimeUnit.SECONDS);

            // Capture logs
            ByteArrayOutputStream logStream = new ByteArrayOutputStream();
            dockerClient.logContainerCmd(containerId)
                    .withStdOut(true)
                    .withStdErr(true)
                    .exec(new com.github.dockerjava.api.async.ResultCallback.Adapter<>() {
                        @Override
                        public void onNext(com.github.dockerjava.api.model.Frame item) {
                            try {
                                logStream.write(item.getPayload());
                            } catch (IOException e) {
                                // ignore
                            }
                        }
                    }).awaitCompletion(10, TimeUnit.SECONDS);

            String buildLogs = logStream.toString(StandardCharsets.UTF_8);
            build.setLogs(buildLogs);

            if (!finished) {
                // Timeout exceeded
                log.warn("Build timed out. buildId={}", build.getId());
                try {
                    dockerClient.killContainerCmd(containerId).exec();
                } catch (Exception e) {
                    // ignore
                }
                throw new InterruptedException("Build timeout exceeded " + timeoutSeconds + " seconds.");
            }

            // Inspect exit status
            Long exitCode = dockerClient.inspectContainerCmd(containerId).exec().getState().getExitCodeLong();
            log.info("Builder container finished. buildId={}, exitCode={}", build.getId(), exitCode);

            if (exitCode == null || exitCode != 0) {
                throw new RuntimeException("Build script exited with non-zero exit code: " + exitCode);
            }

            // 8. Extract Artifacts
            String artifactVersion = "0.0.0-" + build.getCommit().substring(0, Math.min(build.getCommit().length(), 7));
            String artifactName = config.getMetadata().getName();

            if (config.getArtifacts() == null || config.getArtifacts().isEmpty()) {
                throw new IllegalArgumentException("No artifacts configured under artifacts: list in build.yaml");
            }

            for (BuildYamlConfig.ArtifactConfig artConfig : config.getArtifacts()) {
                List<File> files = findFiles(workspaceDir, artConfig.getPattern());
                if (files.isEmpty()) {
                    throw new IOException("No files matched pattern '" + artConfig.getPattern() + "' in workspace");
                }

                for (File file : files) {
                    File destDir = new File(artifactStorePath + "/" + artifactName + "/" + artifactVersion);
                    if (!destDir.exists() && !destDir.mkdirs()) {
                        throw new IOException("Failed to create destination directory: " + destDir.getAbsolutePath());
                    }

                    File destFile = new File(destDir, file.getName());
                    FileUtils.copyFile(file, destFile);
                    log.info("Saved artifact. buildId={}, file={}, dest={}", build.getId(), file.getName(), destFile.getAbsolutePath());

                    // Calculate checksum
                    String checksum = calculateSha256(destFile);

                    // Create database entity
                    Artifact artifact = new Artifact();
                    artifact.setName(artifactName);
                    artifact.setVersion(artifactVersion);
                    artifact.setArtifactType(artConfig.getType() != null ? artConfig.getType() : "binary");
                    artifact.setBuildId(build.getId());
                    artifact.setStoragePath(destFile.getAbsolutePath());
                    artifact.setFileSizeBytes(destFile.length());
                    artifact.setChecksum(checksum);
                    artifactRepository.save(artifact);
                }
            }

            build.setStatus("success");
            log.info("Build execution completed successfully. buildId={}", build.getId());

        } catch (Exception e) {
            log.error("Build execution failed. buildId={}", build.getId(), e);
            build.setStatus("failed");
            build.setErrorMessage(e.getMessage());
        } finally {
            // Clean up Docker container
            if (containerId != null) {
                try {
                    dockerClient.removeContainerCmd(containerId).exec();
                } catch (Exception e) {
                    // ignore
                }
            }

            // Clean up workspace
            if (tempDir.exists()) {
                try {
                    FileUtils.deleteDirectory(tempDir);
                } catch (IOException e) {
                    log.error("Failed to clean up build directory: {}", tempDir.getAbsolutePath(), e);
                }
            }

            build.setCompletedAt(Instant.now());
            if (build.getStartedAt() != null) {
                build.setDurationSeconds((int) (build.getCompletedAt().getEpochSecond() - build.getStartedAt().getEpochSecond()));
            }
            buildRepository.save(build);
        }
    }

    private void executeGitCommand(File dir, String... command) throws IOException, InterruptedException {
        ProcessBuilder pb = new ProcessBuilder(command);
        pb.directory(dir);
        Process p = pb.start();
        boolean success = p.waitFor(60, TimeUnit.SECONDS);
        if (!success || p.exitValue() != 0) {
            String error = new String(p.getErrorStream().readAllBytes(), StandardCharsets.UTF_8);
            throw new IOException("Git command failed: " + String.join(" ", command) + ". Error: " + error);
        }
    }

    private List<File> findFiles(File root, String pattern) throws IOException {
        List<File> matchedFiles = new ArrayList<>();
        String glob = "glob:" + root.getAbsolutePath() + "/" + pattern;
        PathMatcher matcher = FileSystems.getDefault().getPathMatcher(glob);

        try (Stream<Path> stream = Files.walk(root.toPath())) {
            stream.filter(matcher::matches)
                    .filter(Files::isRegularFile)
                    .map(Path::toFile)
                    .forEach(matchedFiles::add);
        }
        return matchedFiles;
    }

    private String calculateSha256(File file) throws IOException, NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream is = new FileInputStream(file)) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = is.read(buffer)) > 0) {
                digest.update(buffer, 0, read);
            }
        }
        byte[] hash = digest.digest();
        return HexFormat.of().formatHex(hash);
    }

    private long parseMemoryLimit(String memoryStr) {
        try {
            String clean = memoryStr.toLowerCase().trim();
            if (clean.endsWith("g")) {
                return Long.parseLong(clean.substring(0, clean.length() - 1)) * 1024 * 1024 * 1024;
            } else if (clean.endsWith("m")) {
                return Long.parseLong(clean.substring(0, clean.length() - 1)) * 1024 * 1024;
            } else if (clean.endsWith("k")) {
                return Long.parseLong(clean.substring(0, clean.length() - 1)) * 1024;
            }
            return Long.parseLong(clean);
        } catch (Exception e) {
            return 0;
        }
    }
}
