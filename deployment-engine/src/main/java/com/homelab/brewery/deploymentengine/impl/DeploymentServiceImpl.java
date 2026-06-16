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

            for (Map.Entry<String, DeploymentSpec.ServiceSpec> entry : spec.getServices().entrySet()) {
                String serviceName = entry.getKey();
                DeploymentSpec.ServiceSpec service = entry.getValue();

                Map<String, Object> serviceMap = new LinkedHashMap<>();
                serviceMap.put("container_name", deployment.getName() + "-" + serviceName);

                // Set image & wrapper settings depending on Type
                String image = service.getArtifact();
                if (image != null && image.contains("@")) {
                    String artifactName = image.substring(0, image.indexOf("@"));
                    String resolvedVer = resolvedVersions.get(artifactName);
                    
                    Artifact artifact = artifactRepository.findByNameAndVersion(artifactName, resolvedVer)
                            .orElseThrow(() -> new IllegalStateException("Resolved artifact not found: " + artifactName + "@" + resolvedVer));

                    if ("binary".equalsIgnoreCase(service.getType())) {
                        serviceMap.put("image", "ubuntu:22.04");
                        serviceMap.put("entrypoint", List.of(artifact.getStoragePath()));
                        usesArtifactStore = true;
                    } else if ("jar".equalsIgnoreCase(service.getType())) {
                        serviceMap.put("image", "eclipse-temurin:21-jre");
                        serviceMap.put("command", List.of("java", "-jar", artifact.getStoragePath()));
                        usesArtifactStore = true;
                    } else if ("python-app".equalsIgnoreCase(service.getType())) {
                        serviceMap.put("image", "python:3.10-slim");
                        serviceMap.put("command", List.of("python", artifact.getStoragePath()));
                        usesArtifactStore = true;
                    } else {
                        // Docker type
                        serviceMap.put("image", artifact.getStoragePath());
                    }
                } else {
                    // Direct docker hub/registry pull image
                    serviceMap.put("image", image);
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

                List<String> serviceVolumes = new ArrayList<>();
                if (service.getVolumes() != null) {
                    serviceVolumes.addAll(service.getVolumes());
                }
                if (usesArtifactStore) {
                    serviceVolumes.add("artifact_store:/mnt/artifact-store:ro");
                }
                if (!serviceVolumes.isEmpty()) {
                    serviceMap.put("volumes", serviceVolumes);
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
            File deployDir = new File("/tmp/brewery-builds/deployments/deploy-" + deployment.getId());
            deployDir.mkdirs();
            File composeFile = new File(deployDir, "docker-compose.yml");
            Files.writeString(composeFile.toPath(), composeYaml, StandardCharsets.UTF_8);

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
}
