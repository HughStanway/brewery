package com.homelab.brewery.deploymentengine.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.homelab.brewery.common.entity.Artifact;
import com.homelab.brewery.common.entity.Deployment;
import com.homelab.brewery.common.entity.DeploymentEvent;
import com.homelab.brewery.common.entity.DeploymentVersion;
import com.homelab.brewery.common.entity.ServiceHealthCheck;
import com.homelab.brewery.common.repository.ArtifactRepository;
import com.homelab.brewery.common.repository.DeploymentEventRepository;
import com.homelab.brewery.common.repository.DeploymentRepository;
import com.homelab.brewery.common.repository.DeploymentVersionRepository;
import com.homelab.brewery.common.repository.ServiceHealthCheckRepository;
import com.homelab.brewery.deploymentengine.model.DeploymentSpec;
import com.homelab.brewery.deploymentengine.service.DeploymentService;
import com.homelab.brewery.registry.SemanticVersionResolver;
import com.homelab.brewery.registry.model.ArtifactMetadataJson;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.yaml.snakeyaml.DumperOptions;
import org.yaml.snakeyaml.Yaml;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeploymentServiceImpl implements DeploymentService {

    private final DeploymentRepository deploymentRepository;
    private final DeploymentVersionRepository versionRepository;
    private final DeploymentEventRepository eventRepository;
    private final ServiceHealthCheckRepository healthCheckRepository;
    private final ArtifactRepository artifactRepository;
    private final SemanticVersionResolver versionResolver;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    @Transactional
    public Deployment createOrUpdateDeployment(String name, String specYaml, String username) {
        log.info("Creating or updating deployment configuration for {}", name);
        
        // Validate YAML parsing
        DeploymentSpec spec = parseSpec(specYaml);
        if (spec.getDeployment() == null || spec.getDeployment().getName() == null) {
            throw new IllegalArgumentException("deployment.yml must define deployment.name");
        }
        if (!spec.getDeployment().getName().equals(name)) {
            throw new IllegalArgumentException("deployment.yml name does not match the stack name: " + name);
        }

        Optional<Deployment> existingOpt = deploymentRepository.findByName(name);
        Deployment deployment;
        if (existingOpt.isPresent()) {
            deployment = existingOpt.get();
        } else {
            deployment = new Deployment();
            deployment.setName(name);
        }

        deployment.setDescription(spec.getDeployment().getDescription());
        deployment.setDeploymentSpec(specYaml);
        deployment.setDeployedBy(username != null ? username : "system");
        deployment.setUpdatedAt(Instant.now());
        
        deployment = deploymentRepository.save(deployment);
        
        recordEvent(deployment.getId(), "planned", "Configuration saved/updated successfully", null);
        return deployment;
    }

    @Override
    public Map<String, Object> planDeployment(String specYaml) {
        log.info("Evaluating dry-run plan for deployment spec");
        DeploymentSpec spec = parseSpec(specYaml);
        Map<String, String> resolvedVersions = resolveArtifactVersions(spec);
        
        Map<String, Object> plan = new LinkedHashMap<>();
        plan.put("name", spec.getDeployment() != null ? spec.getDeployment().getName() : "unnamed");
        plan.put("description", spec.getDeployment() != null ? spec.getDeployment().getDescription() : "");
        plan.put("services_count", spec.getServices() != null ? spec.getServices().size() : 0);
        plan.put("resolved_versions", resolvedVersions);
        
        return plan;
    }

    @Override
    @Transactional
    public Deployment deploy(UUID deploymentId) {
        Deployment deployment = deploymentRepository.findById(deploymentId)
                .orElseThrow(() -> new IllegalArgumentException("Deployment not found: " + deploymentId));

        log.info("Executing deployment rollout for stack: {}", deployment.getName());
        deployment.setStatus("deploying");
        deployment.setDeployedAt(Instant.now());
        deployment = deploymentRepository.save(deployment);

        recordEvent(deployment.getId(), "started", "Rollout started", null);

        try {
            DeploymentSpec spec = parseSpec(deployment.getDeploymentSpec());
            
            // 1. Resolve artifact versions
            Map<String, String> resolvedVersions = resolveArtifactVersions(spec);
            
            // 2. Generate Docker Compose YAML map
            Map<String, Object> composeMap = new LinkedHashMap<>();
            composeMap.put("version", "3.8");

            Map<String, Object> servicesMap = new LinkedHashMap<>();
            boolean usesArtifactStore = false;

            File deployDir = new File("/tmp/brewery-builds/deployments/deploy-" + deployment.getId());
            deployDir.mkdirs();

            for (Map.Entry<String, DeploymentSpec.ServiceSpec> entry : spec.getServices().entrySet()) {
                String serviceName = entry.getKey();
                DeploymentSpec.ServiceSpec service = entry.getValue();

                Map<String, Object> serviceMap = new LinkedHashMap<>();
                serviceMap.put("container_name", deployment.getName() + "-" + serviceName);

                boolean serviceUsesArtifactStore = false;
                boolean useWrapperScript = false;

                // Set image & wrapper settings depending on Type
                String image = service.getArtifact();
                if (image != null && image.contains("@")) {
                    String artifactName = image.substring(0, image.indexOf("@"));
                    String resolvedVer = resolvedVersions.get(artifactName);
                    
                    Artifact artifact = artifactRepository.findByNameAndVersion(artifactName, resolvedVer)
                            .orElseThrow(() -> new IllegalStateException("Resolved artifact not found: " + artifactName + "@" + resolvedVer));

                    boolean isTarGz = artifact.getStoragePath() != null && artifact.getStoragePath().endsWith(".tar.gz");
                    boolean hasInit = service.getInit() != null && !service.getInit().isEmpty();
                    useWrapperScript = isTarGz || hasInit;

                    String baseImage = service.getRuntimeImage();

                    String primaryEntrypoint = null;
                    if (artifact.getMetadata() != null && !artifact.getMetadata().isBlank()) {
                        try {
                            ArtifactMetadataJson meta = objectMapper.readValue(artifact.getMetadata(), ArtifactMetadataJson.class);
                            primaryEntrypoint = meta.getPrimaryEntrypoint();
                        } catch (Exception e) {
                            log.warn("Failed to parse metadata json for entrypoint mapping", e);
                        }
                    }

                    if ("binary".equalsIgnoreCase(service.getType())) {
                        serviceMap.put("image", baseImage != null ? baseImage : "ubuntu:22.04");
                        serviceUsesArtifactStore = true;
                        usesArtifactStore = true;
                        if (useWrapperScript) {
                            writeWrapperScript(deployDir, serviceName, service, artifact, artifactName, isTarGz, primaryEntrypoint);
                            serviceMap.put("entrypoint", List.of("/entrypoint.sh"));
                        } else {
                            serviceMap.put("entrypoint", List.of(artifact.getStoragePath()));
                        }
                    } else if ("jar".equalsIgnoreCase(service.getType())) {
                        serviceMap.put("image", baseImage != null ? baseImage : "eclipse-temurin:21-jre");
                        serviceUsesArtifactStore = true;
                        usesArtifactStore = true;
                        if (useWrapperScript) {
                            writeWrapperScript(deployDir, serviceName, service, artifact, artifactName, isTarGz, primaryEntrypoint);
                            serviceMap.put("entrypoint", List.of("/entrypoint.sh"));
                        } else {
                            serviceMap.put("command", List.of("java", "-jar", artifact.getStoragePath()));
                        }
                    } else if ("python-app".equalsIgnoreCase(service.getType())) {
                        serviceMap.put("image", baseImage != null ? baseImage : "python:3.10-slim");
                        serviceUsesArtifactStore = true;
                        usesArtifactStore = true;
                        if (useWrapperScript) {
                            writeWrapperScript(deployDir, serviceName, service, artifact, artifactName, isTarGz, primaryEntrypoint);
                            serviceMap.put("entrypoint", List.of("/entrypoint.sh"));
                        } else {
                            serviceMap.put("command", List.of("python", artifact.getStoragePath()));
                        }
                    } else {
                        // Docker type
                        serviceMap.put("image", artifact.getStoragePath());
                    }

                    List<String> serviceVolumes = new ArrayList<>();
                    if (service.getVolumes() != null) {
                        serviceVolumes.addAll(service.getVolumes());
                    }
                    if (serviceUsesArtifactStore) {
                        serviceVolumes.add("artifact_store:/mnt/artifact-store:ro");
                    }
                    if (useWrapperScript) {
                        String hostScriptPath = "/tmp/brewery-builds/deployments/deploy-" + deployment.getId() + "/entrypoint-" + serviceName + ".sh";
                        serviceVolumes.add(hostScriptPath + ":/entrypoint.sh:ro");
                    }
                    if (!serviceVolumes.isEmpty()) {
                        serviceMap.put("volumes", serviceVolumes);
                    }
                } else {
                    // Direct docker hub/registry pull image
                    serviceMap.put("image", image);
                    if (service.getVolumes() != null && !service.getVolumes().isEmpty()) {
                        serviceMap.put("volumes", service.getVolumes());
                    }
                }

                if (service.getReplicas() != null && service.getReplicas() > 1) {
                    Map<String, Object> deployConfig = new LinkedHashMap<>();
                    deployConfig.put("replicas", service.getReplicas());
                    serviceMap.put("deploy", deployConfig);
                }

                if (service.getEnvironment() != null) {
                    serviceMap.put("environment", service.getEnvironment());
                }

                if (service.getPorts() != null) {
                    serviceMap.put("ports", service.getPorts());
                }

                if (service.getDepends_on() != null) {
                    serviceMap.put("depends_on", service.getDepends_on());
                }

                servicesMap.put(serviceName, serviceMap);
            }

            composeMap.put("services", servicesMap);

            if (spec.getVolumes() != null) {
                composeMap.put("volumes", new LinkedHashMap<>(spec.getVolumes()));
            }
            if (usesArtifactStore) {
                Map<String, Object> volumesSection = (Map<String, Object>) composeMap.computeIfAbsent("volumes", k -> new LinkedHashMap<>());
                Map<String, Object> artifactStoreVol = new LinkedHashMap<>();
                artifactStoreVol.put("external", true);
                artifactStoreVol.put("name", "brewery_artifact_store");
                volumesSection.put("artifact_store", artifactStoreVol);
            }

            if (spec.getNetworks() != null) {
                composeMap.put("networks", spec.getNetworks());
            }

            String composeYaml = generateComposeYaml(composeMap);

            // 3. Write Compose to file
            File composeFile = new File(deployDir, "docker-compose.yml");
            Files.writeString(composeFile.toPath(), composeYaml, StandardCharsets.UTF_8);

            // Ensure local bind volume brewery_artifact_store exists inside the Docker daemon
            if (usesArtifactStore) {
                try {
                    List<String> createVolCmd = List.of(
                        "docker", "volume", "create",
                        "--driver", "local",
                        "--opt", "type=none",
                        "--opt", "device=/mnt/artifact-store",
                        "--opt", "o=bind",
                        "brewery_artifact_store"
                    );
                    executeCommand(createVolCmd);
                } catch (Exception e) {
                    log.warn("Failed to ensure brewery_artifact_store volume exists: {}", e.getMessage());
                }
            }

            // 4. Run docker compose up
            List<String> composeCommand = List.of("docker", "compose", "-p", deployment.getName(), "-f", composeFile.getAbsolutePath(), "up", "-d", "--remove-orphans");
            String outputLogs = executeCommand(composeCommand);

            // 5. Save version history record
            int nextVersionNum = 1;
            List<DeploymentVersion> versions = versionRepository.findByDeploymentIdOrderByVersionNumberDesc(deployment.getId());
            if (!versions.isEmpty()) {
                nextVersionNum = versions.get(0).getVersionNumber() + 1;
                // Mark previous active version as previous
                for (DeploymentVersion v : versions) {
                    if ("active".equals(v.getStatus())) {
                        v.setStatus("previous");
                        v.setUndeployedAt(Instant.now());
                        versionRepository.save(v);
                    }
                }
            }

            DeploymentVersion version = new DeploymentVersion();
            version.setDeploymentId(deployment.getId());
            version.setVersionNumber(nextVersionNum);
            version.setComposeConfig(composeYaml);
            version.setArtifactVersions(objectMapper.writeValueAsString(resolvedVersions));
            version.setDockerComposeOutput(outputLogs);
            version.setStatus("active");
            versionRepository.save(version);

            // 6. Monitor health
            deployment.setStatus("healthy");
            deployment.setCompletedAt(Instant.now());
            deploymentRepository.save(deployment);
            
            recordEvent(deployment.getId(), "succeeded", "Rollout succeeded, stack version " + nextVersionNum + " is active", null);

            // Trigger async check health checks
            checkAndRemediateHealth(deployment.getId());

        } catch (Exception e) {
            log.error("Deployment failed for {}", deployment.getName(), e);
            deployment.setStatus("failed");
            deployment.setCompletedAt(Instant.now());
            deploymentRepository.save(deployment);

            recordEvent(deployment.getId(), "failed", "Rollout failed: " + e.getMessage(), null);

            // Automatic rollback logic
            DeploymentSpec spec = parseSpec(deployment.getDeploymentSpec());
            if (spec.getRollback() != null && Boolean.TRUE.equals(spec.getRollback().getAutomatic())) {
                log.info("Auto-rollback enabled. Reverting to last successful version.");
                try {
                    rollbackToLastSuccessful(deployment);
                } catch (Exception rollbackErr) {
                    log.error("Auto-rollback failed", rollbackErr);
                    recordEvent(deployment.getId(), "failed", "Auto-rollback failed: " + rollbackErr.getMessage(), null);
                }
            }
        }

        return deployment;
    }

    @Override
    @Transactional
    public void rollback(UUID deploymentId, Integer targetVersion) {
        Deployment deployment = deploymentRepository.findById(deploymentId)
                .orElseThrow(() -> new IllegalArgumentException("Deployment not found"));

        log.info("Manual rollback triggered for {}, targetVersion={}", deployment.getName(), targetVersion);
        
        List<DeploymentVersion> versions = versionRepository.findByDeploymentIdOrderByVersionNumberDesc(deploymentId);
        DeploymentVersion target = versions.stream()
                .filter(v -> v.getVersionNumber().equals(targetVersion))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Target version not found: " + targetVersion));

        try {
            // Write target compose config to disk
            File deployDir = new File("/tmp/brewery-builds/deployments/deploy-" + deployment.getId());
            deployDir.mkdirs();
            File composeFile = new File(deployDir, "docker-compose.yml");
            Files.writeString(composeFile.toPath(), target.getComposeConfig(), StandardCharsets.UTF_8);

            // Run compose up
            List<String> composeCommand = List.of("docker", "compose", "-p", deployment.getName(), "-f", composeFile.getAbsolutePath(), "up", "-d", "--remove-orphans");
            executeCommand(composeCommand);

            // Update statuses
            for (DeploymentVersion v : versions) {
                if ("active".equals(v.getStatus())) {
                    v.setStatus("previous");
                    v.setUndeployedAt(Instant.now());
                    versionRepository.save(v);
                }
            }
            target.setStatus("active");
            versionRepository.save(target);

            deployment.setStatus("healthy");
            deploymentRepository.save(deployment);

            recordEvent(deploymentId, "rolled_back", "Rolled back successfully to version " + targetVersion, null);
        } catch (Exception e) {
            log.error("Manual rollback failed", e);
            deployment.setStatus("failed");
            deploymentRepository.save(deployment);
            recordEvent(deploymentId, "failed", "Rollback failed: " + e.getMessage(), null);
            throw new RuntimeException("Rollback failed", e);
        }
    }

    private void rollbackToLastSuccessful(Deployment deployment) throws Exception {
        List<DeploymentVersion> versions = versionRepository.findByDeploymentIdOrderByVersionNumberDesc(deployment.getId());
        // Find the most recent active or previous version that is NOT the newest failed one
        DeploymentVersion target = versions.stream()
                .filter(v -> !"failed".equals(v.getStatus()))
                .skip(1) // skip the failed one we just registered
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("No previous version to rollback to"));

        log.info("Rolling back to version {}", target.getVersionNumber());

        File deployDir = new File("/tmp/brewery-builds/deployments/deploy-" + deployment.getId());
        File composeFile = new File(deployDir, "docker-compose.yml");
        Files.writeString(composeFile.toPath(), target.getComposeConfig(), StandardCharsets.UTF_8);

        List<String> composeCommand = List.of("docker", "compose", "-p", deployment.getName(), "-f", composeFile.getAbsolutePath(), "up", "-d", "--remove-orphans");
        executeCommand(composeCommand);

        target.setStatus("active");
        versionRepository.save(target);

        deployment.setStatus("rolled_back");
        deploymentRepository.save(deployment);

        recordEvent(deployment.getId(), "rolled_back", "Auto-rolled back successfully to version " + target.getVersionNumber(), null);
    }

    @Override
    public List<Deployment> getAllDeployments() {
        return deploymentRepository.findAll();
    }

    @Override
    public Deployment getDeployment(UUID id) {
        return deploymentRepository.findById(id).orElse(null);
    }

    @Override
    public List<DeploymentVersion> getDeploymentVersions(UUID deploymentId) {
        return versionRepository.findByDeploymentIdOrderByVersionNumberDesc(deploymentId);
    }

    @Override
    public List<DeploymentEvent> getDeploymentEvents(UUID deploymentId) {
        return eventRepository.findByDeploymentIdOrderByCreatedAtDesc(deploymentId);
    }

    @Override
    public List<ServiceHealthCheck> getServiceHealthChecks(UUID deploymentId) {
        return healthCheckRepository.findByDeploymentId(deploymentId);
    }

    @Override
    @Transactional
    public void checkAndRemediateHealth(UUID deploymentId) {
        Deployment deployment = deploymentRepository.findById(deploymentId).orElse(null);
        if (deployment == null) return;

        if ("paused".equalsIgnoreCase(deployment.getStatus())) {
            log.info("Deployment {} is paused. Skipping health check execution.", deployment.getName());
            return;
        }

        log.info("Running health checks check for deployment: {}", deployment.getName());
        try {
            DeploymentSpec spec = parseSpec(deployment.getDeploymentSpec());
            boolean allHealthy = true;

            for (Map.Entry<String, DeploymentSpec.ServiceSpec> entry : spec.getServices().entrySet()) {
                String serviceName = entry.getKey();
                DeploymentSpec.ServiceSpec service = entry.getValue();
                DeploymentSpec.HealthCheckConfig hcConfig = service.getHealthCheck();
                
                ServiceHealthCheck healthCheck = healthCheckRepository.findByDeploymentIdAndServiceName(deploymentId, serviceName)
                        .orElseGet(() -> {
                            ServiceHealthCheck hc = new ServiceHealthCheck();
                            hc.setDeploymentId(deploymentId);
                            hc.setServiceName(serviceName);
                            hc.setCheckCount(0);
                            hc.setConsecutiveFailures(0);
                            return hc;
                        });

                // Ensure non-null values if loaded from a state with null values
                if (healthCheck.getCheckCount() == null) healthCheck.setCheckCount(0);
                if (healthCheck.getConsecutiveFailures() == null) healthCheck.setConsecutiveFailures(0);

                healthCheck.setCheckCount(healthCheck.getCheckCount() + 1);
                healthCheck.setLastCheckedAt(Instant.now());

                if (hcConfig == null) {
                    healthCheck.setStatus("unknown");
                    healthCheckRepository.save(healthCheck);
                    continue;
                }

                long start = System.currentTimeMillis();
                try {
                    if (hcConfig.getEndpoint() != null) {
                        // HTTP check
                        String url = hcConfig.getEndpoint().replace("GET ", "").trim();
                        if (!url.startsWith("http")) {
                            // Assume localhost mapping
                            url = "http://localhost:" + url.substring(url.indexOf(":") + 1);
                        }
                        HttpURLConnection connection = (HttpURLConnection) new URI(url).toURL().openConnection();
                        connection.setRequestMethod("GET");
                        connection.setConnectTimeout(5000);
                        connection.setReadTimeout(5000);
                        int responseCode = connection.getResponseCode();
                        long duration = System.currentTimeMillis() - start;

                        healthCheck.setResponseTimeMs((int) duration);
                        if (responseCode >= 200 && responseCode < 400) {
                            healthCheck.setStatus("healthy");
                            healthCheck.setConsecutiveFailures(0);
                            healthCheck.setErrorMessage(null);
                        } else {
                            throw new Exception("HTTP response code: " + responseCode);
                        }
                    } else if (hcConfig.getCommand() != null) {
                        // Command execution check
                        List<String> inspectCmd = List.of("docker", "exec", deployment.getName() + "-" + serviceName, "/bin/sh", "-c", hcConfig.getCommand());
                        executeCommand(inspectCmd);
                        long duration = System.currentTimeMillis() - start;

                        healthCheck.setResponseTimeMs((int) duration);
                        healthCheck.setStatus("healthy");
                        healthCheck.setConsecutiveFailures(0);
                        healthCheck.setErrorMessage(null);
                    } else {
                        healthCheck.setStatus("unknown");
                    }
                } catch (Exception checkErr) {
                    long duration = System.currentTimeMillis() - start;
                    healthCheck.setResponseTimeMs((int) duration);
                    healthCheck.setStatus("unhealthy");
                    healthCheck.setConsecutiveFailures(healthCheck.getConsecutiveFailures() + 1);
                    healthCheck.setErrorMessage(checkErr.getMessage());
                    allHealthy = false;

                    log.warn("Health check failed for service {}/{}", deployment.getName(), serviceName);
                }

                healthCheckRepository.save(healthCheck);
            }

            // Update stack status if changed
            String targetStatus = allHealthy ? "healthy" : "unhealthy";
            if (!targetStatus.equals(deployment.getStatus())) {
                deployment.setStatus(targetStatus);
                deploymentRepository.save(deployment);
                recordEvent(deploymentId, "progressed", "Deployment health state changed to: " + targetStatus, null);
            }

        } catch (Exception e) {
            log.error("Failed executing health checks", e);
        }
    }

    private DeploymentSpec parseSpec(String specYaml) {
        Yaml yaml = new Yaml();
        return yaml.loadAs(specYaml, DeploymentSpec.class);
    }

    private Map<String, String> resolveArtifactVersions(DeploymentSpec spec) {
        Map<String, String> resolved = new HashMap<>();
        if (spec.getServices() == null) return resolved;

        for (DeploymentSpec.ServiceSpec service : spec.getServices().values()) {
            String image = service.getArtifact();
            if (image != null && image.contains("@")) {
                String artifactName = image.substring(0, image.indexOf("@"));
                String range = image.substring(image.indexOf("@") + 1);

                List<Artifact> artifacts = artifactRepository.findByName(artifactName);
                if (artifacts == null || artifacts.isEmpty()) {
                    throw new IllegalArgumentException("No registered artifacts found for name: " + artifactName);
                }

                List<String> versions = artifacts.stream().map(Artifact::getVersion).toList();
                String resolvedVer = versionResolver.resolveVersionRange(range, versions);
                if (resolvedVer == null) {
                    throw new IllegalStateException("Failed to resolve version range: " + range + " for " + artifactName);
                }
                resolved.put(artifactName, resolvedVer);
            }
        }
        return resolved;
    }

    private String generateComposeYaml(Map<String, Object> composeMap) {
        DumperOptions options = new DumperOptions();
        options.setDefaultFlowStyle(DumperOptions.FlowStyle.BLOCK);
        options.setPrettyFlow(true);
        Yaml yaml = new Yaml(options);
        return yaml.dump(composeMap);
    }

    private String executeCommand(List<String> command) throws Exception {
        log.info("Executing command: {}", String.join(" ", command));
        ProcessBuilder pb = new ProcessBuilder(command);
        pb.redirectErrorStream(true);
        Process process = pb.start();

        StringBuilder output = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
            }
        }

        boolean finished = process.waitFor(5, TimeUnit.MINUTES);
        if (!finished) {
            process.destroyForcibly();
            throw new RuntimeException("Command timed out: " + String.join(" ", command));
        }

        if (process.exitValue() != 0) {
            throw new RuntimeException("Command failed with exit status " + process.exitValue() + ". Output: " + output);
        }

        return output.toString();
    }

    private void recordEvent(UUID deploymentId, String type, String message, Map<String, Object> metadata) {
        try {
            DeploymentEvent event = new DeploymentEvent();
            event.setDeploymentId(deploymentId);
            event.setEventType(type);
            event.setMessage(message);
            if (metadata != null) {
                event.setMetadata(objectMapper.writeValueAsString(metadata));
            }
            eventRepository.save(event);
        } catch (Exception e) {
            log.error("Failed recording deployment event", e);
        }
    }

    @Override
    public String getContainerLogs(UUID id, String serviceName) {
        Deployment deployment = deploymentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Deployment not found: " + id));
        String containerName = deployment.getName() + "-" + serviceName;
        List<String> command = List.of("docker", "logs", "--tail", "100", containerName);
        try {
            return executeCommand(command);
        } catch (Exception e) {
            log.warn("Failed fetching logs for container: {}", containerName, e.getMessage());
            return "[Container " + containerName + " is not running or not found]\n";
        }
    }

    @Override
    public Map<String, Object> getContainerStats(UUID id, String serviceName) {
        Deployment deployment = deploymentRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Deployment not found: " + id));
        String containerName = deployment.getName() + "-" + serviceName;
        List<String> command = List.of("docker", "stats", "--no-stream", "--format", "{{.CPUPerc}},{{.MemUsage}},{{.MemPerc}},{{.NetIO}}", containerName);
        try {
            String output = executeCommand(command).trim();
            String[] parts = output.split(",");
            if (parts.length >= 4) {
                return Map.of(
                    "cpu", parts[0].trim(),
                    "memoryUsage", parts[1].trim(),
                    "memoryPercent", parts[2].trim(),
                    "network", parts[3].trim(),
                    "online", true
                );
            }
        } catch (Exception e) {
            log.warn("Failed fetching stats for container: {} - {}", containerName, e.getMessage());
        }
        return Map.of(
            "cpu", "0.0%",
            "memoryUsage", "0B / 0B",
            "memoryPercent", "0.0%",
            "network", "0B / 0B",
            "online", false
        );
    }

    @Override
    @Transactional
    public Deployment pauseDeployment(UUID deploymentId) {
        Deployment deployment = deploymentRepository.findById(deploymentId)
                .orElseThrow(() -> new IllegalArgumentException("Deployment not found: " + deploymentId));

        log.info("Pausing deployment stack: {}", deployment.getName());
        
        File deployDir = new File("/tmp/brewery-builds/deployments/deploy-" + deploymentId);
        File composeFile = new File(deployDir, "docker-compose.yml");
        if (!composeFile.exists()) {
            throw new IllegalStateException("Docker compose file not found. Deployment must be active to pause.");
        }

        try {
            List<String> command = List.of("docker", "compose", "-p", deployment.getName(), "-f", composeFile.getAbsolutePath(), "pause");
            executeCommand(command);
            
            deployment.setStatus("paused");
            deployment = deploymentRepository.save(deployment);

            // Update all service health checks to paused status
            try {
                List<ServiceHealthCheck> healthChecks = healthCheckRepository.findByDeploymentId(deploymentId);
                for (ServiceHealthCheck hc : healthChecks) {
                    hc.setStatus("paused");
                    hc.setErrorMessage("Deployment manually paused");
                    healthCheckRepository.save(hc);
                }
            } catch (Exception he) {
                log.warn("Failed to update service health checks status to paused for deployment {}", deploymentId, he);
            }
            
            recordEvent(deploymentId, "progressed", "Deployment stack paused manually", null);
            return deployment;
        } catch (Exception e) {
            log.error("Failed pausing deployment stack: {}", deployment.getName(), e);
            throw new RuntimeException("Failed pausing stack", e);
        }
    }

    @Override
    @Transactional
    public Deployment resumeDeployment(UUID deploymentId) {
        Deployment deployment = deploymentRepository.findById(deploymentId)
                .orElseThrow(() -> new IllegalArgumentException("Deployment not found: " + deploymentId));

        log.info("Resuming deployment stack: {}", deployment.getName());
        
        File deployDir = new File("/tmp/brewery-builds/deployments/deploy-" + deploymentId);
        File composeFile = new File(deployDir, "docker-compose.yml");
        if (!composeFile.exists()) {
            throw new IllegalStateException("Docker compose file not found. Deployment must be active to resume.");
        }

        try {
            List<String> command = List.of("docker", "compose", "-p", deployment.getName(), "-f", composeFile.getAbsolutePath(), "unpause");
            executeCommand(command);
            
            deployment.setStatus("healthy");
            deployment = deploymentRepository.save(deployment);
            
            recordEvent(deploymentId, "progressed", "Deployment stack resumed manually", null);
            
            // Trigger health check to confirm health status
            checkAndRemediateHealth(deploymentId);
            
            return deployment;
        } catch (Exception e) {
            log.error("Failed resuming deployment stack: {}", deployment.getName(), e);
            throw new RuntimeException("Failed resuming stack", e);
        }
    }

    @Override
    @Transactional
    public Deployment restartDeployment(UUID deploymentId) {
        Deployment deployment = deploymentRepository.findById(deploymentId)
                .orElseThrow(() -> new IllegalArgumentException("Deployment not found: " + deploymentId));

        log.info("Restarting deployment stack: {}", deployment.getName());
        
        File deployDir = new File("/tmp/brewery-builds/deployments/deploy-" + deploymentId);
        File composeFile = new File(deployDir, "docker-compose.yml");
        if (!composeFile.exists()) {
            throw new IllegalStateException("Docker compose file not found. Deployment must be active to restart.");
        }

        try {
            List<String> command = List.of("docker", "compose", "-p", deployment.getName(), "-f", composeFile.getAbsolutePath(), "restart");
            executeCommand(command);
            
            deployment.setStatus("healthy");
            deployment = deploymentRepository.save(deployment);
            
            recordEvent(deploymentId, "progressed", "Deployment stack restarted manually", null);
            
            // Trigger health check to confirm health status
            checkAndRemediateHealth(deploymentId);
            
            return deployment;
        } catch (Exception e) {
            log.error("Failed restarting deployment stack: {}", deployment.getName(), e);
            throw new RuntimeException("Failed restarting stack", e);
        }
    }

    @Override
    @Transactional
    public void deleteDeployment(UUID deploymentId) {
        Deployment deployment = deploymentRepository.findById(deploymentId)
                .orElseThrow(() -> new IllegalArgumentException("Deployment not found: " + deploymentId));

        log.info("Deleting deployment: {}", deployment.getName());
        
        try {
            File deployDir = new File("/tmp/brewery-builds/deployments/deploy-" + deploymentId);
            File composeFile = new File(deployDir, "docker-compose.yml");
            if (composeFile.exists()) {
                List<String> stopCommand = List.of("docker", "compose", "-p", deployment.getName(), "-f", composeFile.getAbsolutePath(), "down", "--volumes", "--remove-orphans");
                try {
                    executeCommand(stopCommand);
                } catch (Exception e) {
                    log.warn("Failed to stop Docker containers for delete: {}", e.getMessage());
                }
                deleteDirectory(deployDir);
            }
        } catch (Exception e) {
            log.error("Failed executing Docker compose down during deletion", e);
        }

        // Delete database records in dependency order
        List<ServiceHealthCheck> healthChecks = healthCheckRepository.findByDeploymentId(deploymentId);
        healthCheckRepository.deleteAll(healthChecks);

        List<DeploymentEvent> events = eventRepository.findByDeploymentIdOrderByCreatedAtDesc(deploymentId);
        eventRepository.deleteAll(events);

        List<DeploymentVersion> versions = versionRepository.findByDeploymentIdOrderByVersionNumberDesc(deploymentId);
        versionRepository.deleteAll(versions);

        deploymentRepository.delete(deployment);
    }

    private void writeWrapperScript(File deployDir, String serviceName, DeploymentSpec.ServiceSpec service, Artifact artifact, String artifactName, boolean isTarGz, String primaryEntrypoint) throws java.io.IOException {
        File scriptFile = new File(deployDir, "entrypoint-" + serviceName + ".sh");
        StringBuilder script = new StringBuilder();
        script.append("#!/bin/sh\n");
        script.append("set -e\n");

        if (isTarGz) {
            script.append("echo '=== Unpacking Artifact archive ==='\n");
            script.append("mkdir -p /app\n");
            script.append("tar -xzf ").append(artifact.getStoragePath()).append(" -C /app\n");
        }

        if (service.getInit() != null && !service.getInit().isEmpty()) {
            script.append("echo '=== Running Initialization Steps ==='\n");
            for (String initCmd : service.getInit()) {
                script.append(initCmd).append("\n");
            }
        }

        script.append("echo '=== Launching Service ==='\n");
        if ("binary".equalsIgnoreCase(service.getType())) {
            if (isTarGz) {
                String entrypoint = primaryEntrypoint;
                if (entrypoint == null || entrypoint.isBlank()) {
                    entrypoint = artifactName;
                }
                script.append("if [ -f \"/app/").append(entrypoint).append("\" ]; then\n")
                      .append("  chmod +x \"/app/").append(entrypoint).append("\"\n")
                      .append("  exec \"/app/").append(entrypoint).append("\" \"$@\"\n")
                      .append("else\n")
                      .append("  # Find first file in /app that is a regular file and try to run it\n")
                      .append("  FIRST_FILE=$(find /app -type f | head -n 1)\n")
                      .append("  if [ -n \"$FIRST_FILE\" ]; then\n")
                      .append("    chmod +x \"$FIRST_FILE\"\n")
                      .append("    exec \"$FIRST_FILE\" \"$@\"\n")
                      .append("  else\n")
                      .append("    echo 'No executable file found in /app'\n")
                      .append("    exit 1\n")
                      .append("  fi\n")
                      .append("fi\n");
            } else {
                script.append("exec ").append(artifact.getStoragePath()).append(" \"$@\"\n");
            }
        } else if ("jar".equalsIgnoreCase(service.getType())) {
            if (isTarGz) {
                String entrypoint = primaryEntrypoint;
                if (entrypoint != null && entrypoint.endsWith(".jar")) {
                    script.append("exec java -jar \"/app/").append(entrypoint).append("\" \"$@\"\n");
                } else {
                    script.append("JAR_FILE=$(find /app -name \"*.jar\" | head -n 1)\n")
                          .append("if [ -n \"$JAR_FILE\" ]; then\n")
                          .append("  exec java -jar \"$JAR_FILE\" \"$@\"\n")
                          .append("else\n")
                          .append("  echo 'No .jar file found in /app'\n")
                          .append("  exit 1\n")
                          .append("fi\n");
                }
            } else {
                script.append("exec java -jar ").append(artifact.getStoragePath()).append(" \"$@\"\n");
            }
        } else if ("python-app".equalsIgnoreCase(service.getType())) {
            if (isTarGz) {
                String entrypoint = primaryEntrypoint;
                if (entrypoint != null && entrypoint.endsWith(".py")) {
                    script.append("exec python \"/app/").append(entrypoint).append("\" \"$@\"\n");
                } else {
                    script.append("PY_FILE=$(find /app -name \"*.py\" | head -n 1)\n")
                          .append("if [ -n \"$PY_FILE\" ]; then\n")
                          .append("  exec python \"$PY_FILE\" \"$@\"\n")
                          .append("else\n")
                          .append("  echo 'No .py file found in /app'\n")
                          .append("  exit 1\n")
                          .append("fi\n");
                }
            } else {
                script.append("exec python ").append(artifact.getStoragePath()).append(" \"$@\"\n");
            }
        }

        Files.writeString(scriptFile.toPath(), script.toString(), StandardCharsets.UTF_8);
        try {
            scriptFile.setExecutable(true, false);
        } catch (Exception e) {
            log.warn("Failed to set executable permissions on {}", scriptFile.getAbsolutePath(), e);
        }
    }

    private void deleteDirectory(File dir) {
        File[] files = dir.listFiles();
        if (files != null) {
            for (File f : files) {
                if (f.isDirectory()) {
                    deleteDirectory(f);
                } else {
                    f.delete();
                }
            }
        }
        dir.delete();
    }
}
