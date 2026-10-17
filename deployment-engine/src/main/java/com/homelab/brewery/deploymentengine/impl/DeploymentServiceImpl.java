package com.homelab.brewery.deploymentengine.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.homelab.brewery.common.entity.Artifact;
import com.homelab.brewery.common.entity.Deployment;
import com.homelab.brewery.common.repository.ArtifactRepository;
import com.homelab.brewery.common.repository.DeploymentRepository;
import com.homelab.brewery.deploymentengine.model.DeploymentStatusDto;
import com.homelab.brewery.deploymentengine.provider.K8sDeploymentProvider;
import com.homelab.brewery.deploymentengine.service.DeploymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.yaml.snakeyaml.Yaml;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeploymentServiceImpl implements DeploymentService {

    private final DeploymentRepository deploymentRepository;
    private final ArtifactRepository artifactRepository;
    private final K8sDeploymentProvider k8sDeploymentProvider;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    @Transactional
    public Deployment registerOrUpdateDeployment(
            String name,
            String namespace,
            String k8sDeploymentName,
            String containerName,
            String artifactName,
            String description,
            String publicDomain,
            String username) {
        return registerOrUpdateDeployment(
                name,
                namespace,
                k8sDeploymentName,
                containerName,
                artifactName,
                description,
                publicDomain,
                null,
                null,
                null,
                null,
                username
        );
    }

    @Override
    @Transactional
    public Deployment registerOrUpdateDeployment(
            String name,
            String namespace,
            String k8sDeploymentName,
            String containerName,
            String artifactName,
            String description,
            String publicDomain,
            Integer containerPort,
            String envVars,
            String memoryLimit,
            String cpuLimit,
            String username) {

        Optional<Deployment> existingOpt = deploymentRepository.findByName(name);
        Deployment deployment = existingOpt.orElseGet(() -> {
            Deployment d = new Deployment();
            d.setName(name);
            return d;
        });

        return applyDeploymentUpdates(
                deployment,
                name,
                namespace,
                k8sDeploymentName,
                containerName,
                artifactName,
                description,
                publicDomain,
                containerPort,
                envVars,
                memoryLimit,
                cpuLimit,
                username
        );
    }

    @Override
    @Transactional
    public Deployment updateDeployment(
            UUID deploymentId,
            String name,
            String namespace,
            String k8sDeploymentName,
            String containerName,
            String artifactName,
            String description,
            String publicDomain,
            Integer containerPort,
            String envVars,
            String memoryLimit,
            String cpuLimit,
            String username) {

        Deployment deployment = deploymentRepository.findById(deploymentId)
                .orElseThrow(() -> new IllegalArgumentException("Deployment not found: " + deploymentId));

        return applyDeploymentUpdates(
                deployment,
                name != null && !name.isBlank() ? name : deployment.getName(),
                namespace,
                k8sDeploymentName,
                containerName,
                artifactName != null && !artifactName.isBlank() ? artifactName : deployment.getArtifactName(),
                description,
                publicDomain,
                containerPort,
                envVars,
                memoryLimit,
                cpuLimit,
                username
        );
    }

    private Deployment applyDeploymentUpdates(
            Deployment deployment,
            String name,
            String namespace,
            String k8sDeploymentName,
            String containerName,
            String artifactName,
            String description,
            String publicDomain,
            Integer containerPort,
            String envVars,
            String memoryLimit,
            String cpuLimit,
            String username) {

        String targetNs = (namespace != null && !namespace.isBlank()) ? namespace.trim() : "default";
        String targetK8sName = (k8sDeploymentName != null && !k8sDeploymentName.isBlank()) ? k8sDeploymentName.trim() : name;
        String targetContainer = (containerName != null && !containerName.isBlank()) ? containerName.trim() : "app";
        String cleanDomain = (publicDomain != null && !publicDomain.isBlank()) ? publicDomain.trim() : null;

        log.info("Registering/updating K3s deployment mapping: name={}, ns={}, k8sName={}, container={}, artifact={}, publicDomain={}, port={}, mem={}, cpu={}",
                name, targetNs, targetK8sName, targetContainer, artifactName, cleanDomain, containerPort, memoryLimit, cpuLimit);

        deployment.setName(name);
        deployment.setNamespace(targetNs);
        deployment.setK8sDeploymentName(targetK8sName);
        deployment.setK8sContainerName(targetContainer);
        deployment.setArtifactName(artifactName);
        deployment.setDescription(description);
        deployment.setPublicDomain(cleanDomain);
        deployment.setContainerPort(containerPort != null && containerPort > 0 ? containerPort : null);
        deployment.setEnvVars(envVars != null && !envVars.isBlank() ? envVars.trim() : null);
        deployment.setMemoryLimit(memoryLimit != null && !memoryLimit.isBlank() ? memoryLimit.trim() : null);
        deployment.setCpuLimit(cpuLimit != null && !cpuLimit.isBlank() ? cpuLimit.trim() : null);
        deployment.setDeployedBy(username != null && !username.isBlank() ? username : "system");
        deployment.setHeadlampUrl("https://deployments.bigiron.dev/c/main/deployments/" + targetNs + "/" + targetK8sName);
        deployment.setUpdatedAt(Instant.now());

        if (deployment.getStatus() == null) {
            deployment.setStatus("PENDING");
        }

        if (cleanDomain == null && deployment.getDeployedAt() != null) {
            k8sDeploymentProvider.reconcileIngress(targetNs, targetK8sName, null);
        }

        return deploymentRepository.save(deployment);
    }

    @Override
    @Transactional
    public Deployment deploy(UUID deploymentId) {
        return deploy(deploymentId, null);
    }

    @Override
    @Transactional
    public Deployment deploy(UUID deploymentId, String targetVersion) {
        Deployment deployment = deploymentRepository.findById(deploymentId)
                .orElseThrow(() -> new IllegalArgumentException("Deployment not found: " + deploymentId));

        String versionToDeploy = (targetVersion != null && !targetVersion.isBlank()) ? targetVersion.trim() : null;

        if (versionToDeploy == null) {
            if (deployment.getDeployedVersion() == null || deployment.getDeployedVersion().isBlank()) {
                if (deployment.getArtifactName() != null) {
                    Optional<Artifact> latest = artifactRepository.findByNameAndIsLatestTrue(deployment.getArtifactName());
                    if (latest.isPresent()) {
                        versionToDeploy = latest.get().getVersion();
                    } else {
                        List<Artifact> versions = artifactRepository.findByNameOrderByCreatedAtDesc(deployment.getArtifactName());
                        if (!versions.isEmpty()) {
                            versionToDeploy = versions.get(0).getVersion();
                        }
                    }
                }
            } else {
                versionToDeploy = deployment.getDeployedVersion();
            }
        }

        return executeDeploymentRollout(deployment, versionToDeploy);
    }

    @Override
    @Transactional
    public Deployment rollbackDeployment(UUID deploymentId, String targetVersion) {
        Deployment deployment = deploymentRepository.findById(deploymentId)
                .orElseThrow(() -> new IllegalArgumentException("Deployment not found: " + deploymentId));

        String rollbackVersion = (targetVersion != null && !targetVersion.isBlank())
                ? targetVersion.trim()
                : deployment.getPreviousDeployedVersion();

        if ((rollbackVersion == null || rollbackVersion.isBlank()) && deployment.getArtifactName() != null) {
            List<Artifact> versions = artifactRepository.findByNameOrderByCreatedAtDesc(deployment.getArtifactName());
            for (Artifact art : versions) {
                if (!art.getVersion().equals(deployment.getDeployedVersion())) {
                    rollbackVersion = art.getVersion();
                    break;
                }
            }
        }

        if (rollbackVersion == null || rollbackVersion.isBlank()) {
            throw new IllegalStateException("No previous version available to roll back to for deployment: " + deployment.getName());
        }

        log.info("Rolling back deployment {} ({}/{}) from version {} to {}",
                deployment.getName(), deployment.getNamespace(), deployment.getK8sDeploymentName(),
                deployment.getDeployedVersion(), rollbackVersion);

        return executeDeploymentRollout(deployment, rollbackVersion);
    }

    private Deployment executeDeploymentRollout(Deployment deployment, String newVersion) {
        String ns = deployment.getNamespace();
        String k8sName = deployment.getK8sDeploymentName();
        String container = deployment.getK8sContainerName();

        if (newVersion != null && !newVersion.isBlank()) {
            if (deployment.getDeployedVersion() != null
                    && !deployment.getDeployedVersion().isBlank()
                    && !deployment.getDeployedVersion().equals(newVersion)) {
                deployment.setPreviousDeployedVersion(deployment.getDeployedVersion());
            }
            deployment.setDeployedVersion(newVersion);
        }

        log.info("Triggering K3s rollout for deployment: {}, k8s: {}/{}, version: {}",
                deployment.getName(), ns, k8sName, deployment.getDeployedVersion());
        deployment.setStatus("DEPLOYING");
        deployment.setDeployedAt(Instant.now());
        deploymentRepository.save(deployment);

        Artifact artifact = resolveArtifactEntity(deployment.getArtifactName(), deployment.getDeployedVersion());
        ResolvedConfig resolvedConfig = resolveMergedConfig(deployment, artifact);

        String registryPrefix = "registry:5000/";
        String imageTag = null;
        if (deployment.getArtifactName() != null && deployment.getDeployedVersion() != null) {
            String art = deployment.getArtifactName();
            imageTag = art.contains("/") ? art + ":" + deployment.getDeployedVersion() : registryPrefix + art + ":" + deployment.getDeployedVersion();
        }

        boolean success = false;
        if (imageTag != null && k8sName != null) {
            success = k8sDeploymentProvider.deployOrPatchImage(
                    ns,
                    k8sName,
                    container,
                    imageTag,
                    resolvedConfig.publicDomain,
                    resolvedConfig.containerPort,
                    resolvedConfig.envVars,
                    resolvedConfig.memoryLimit,
                    resolvedConfig.cpuLimit
            );
        }

        if (success) {
            deployment.setStatus("SUCCESS");
            deployment.setCompletedAt(Instant.now());
            log.info("Successfully completed deployment rollout for {}/{}", ns, k8sName);
        } else {
            deployment.setStatus("FAILED");
            deployment.setCompletedAt(Instant.now());
            log.error("Failed deployment rollout for {}/{}", ns, k8sName);
        }

        return deploymentRepository.save(deployment);
    }

    private Artifact resolveArtifactEntity(String artifactName, String version) {
        if (artifactName == null || artifactName.isBlank()) {
            return null;
        }
        if (version != null && !version.isBlank()) {
            Optional<Artifact> exact = artifactRepository.findByNameAndVersion(artifactName, version);
            if (exact.isPresent()) {
                return exact.get();
            }
        }
        return artifactRepository.findByNameAndIsLatestTrue(artifactName).orElse(null);
    }

    public static class ResolvedConfig {
        public Integer containerPort = 80;
        public Map<String, String> envVars = new LinkedHashMap<>();
        public String memoryLimit;
        public String cpuLimit;
        public String publicDomain;
    }

    public ResolvedConfig resolveMergedConfig(Deployment deployment, Artifact artifact) {
        ResolvedConfig config = new ResolvedConfig();

        // 1. Parse defaults from artifact's deploymentYaml if present
        String yamlStr = extractDeploymentYaml(artifact, deployment);
        if (yamlStr != null && !yamlStr.isBlank()) {
            applyYamlDefaults(config, yamlStr);
        }

        // 2. Override with Deployment entity configuration where specified
        if (deployment.getContainerPort() != null && deployment.getContainerPort() > 0) {
            config.containerPort = deployment.getContainerPort();
        }
        if (deployment.getEnvVars() != null && !deployment.getEnvVars().isBlank()) {
            config.envVars.putAll(parseEnvVarsString(deployment.getEnvVars()));
        }
        if (deployment.getMemoryLimit() != null && !deployment.getMemoryLimit().isBlank()) {
            config.memoryLimit = deployment.getMemoryLimit().trim();
        }
        if (deployment.getCpuLimit() != null && !deployment.getCpuLimit().isBlank()) {
            config.cpuLimit = deployment.getCpuLimit().trim();
        }
        if (deployment.getPublicDomain() != null && !deployment.getPublicDomain().isBlank()) {
            config.publicDomain = deployment.getPublicDomain().trim();
        }

        return config;
    }

    private String extractDeploymentYaml(Artifact artifact, Deployment deployment) {
        if (artifact != null && artifact.getMetadata() != null && !artifact.getMetadata().isBlank()) {
            try {
                JsonNode root = objectMapper.readTree(artifact.getMetadata());
                JsonNode yamlNode = root.get("deployment_yaml");
                if (yamlNode == null || yamlNode.isNull()) {
                    yamlNode = root.get("deploymentYaml");
                }
                if (yamlNode != null && !yamlNode.isNull() && !yamlNode.asText().isBlank()) {
                    return yamlNode.asText();
                }
            } catch (Exception e) {
                log.debug("Failed to parse artifact metadata JSON for deployment_yaml: {}", e.getMessage());
            }
        }
        if (deployment != null && deployment.getDeploymentSpec() != null && !deployment.getDeploymentSpec().isBlank()) {
            return deployment.getDeploymentSpec();
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private void applyYamlDefaults(ResolvedConfig config, String yamlContent) {
        try {
            Yaml yaml = new Yaml();
            Object loaded = yaml.load(yamlContent);
            if (!(loaded instanceof Map<?, ?> map)) {
                return;
            }

            // Port defaults
            Integer port = parsePortObject(firstNonNull(map, "containerPort", "container_port", "port"));
            if (port == null && map.get("ports") instanceof List<?> portsList && !portsList.isEmpty()) {
                Object firstPort = portsList.get(0);
                if (firstPort instanceof Map<?, ?> portMap) {
                    port = parsePortObject(firstNonNull(portMap, "containerPort", "container_port", "targetPort", "port"));
                } else {
                    port = parsePortObject(firstPort);
                }
            }
            if (port != null && port > 0) {
                config.containerPort = port;
            }

            // Env defaults
            Object envObj = firstNonNull(map, "envVars", "env_vars", "env", "environment");
            extractEnvFromObject(config.envVars, envObj);

            // Resource defaults
            Object memObj = firstNonNull(map, "memoryLimit", "memory_limit", "memory");
            if (memObj != null && !String.valueOf(memObj).isBlank()) {
                config.memoryLimit = String.valueOf(memObj).trim();
            }
            Object cpuObj = firstNonNull(map, "cpuLimit", "cpu_limit", "cpu");
            if (cpuObj != null && !String.valueOf(cpuObj).isBlank()) {
                config.cpuLimit = String.valueOf(cpuObj).trim();
            }

            if (map.get("resources") instanceof Map<?, ?> resMap) {
                Map<?, ?> limitsMap = (resMap.get("limits") instanceof Map<?, ?> lm) ? lm : resMap;
                Object resMem = firstNonNull(limitsMap, "memory", "memoryLimit", "memory_limit");
                if (resMem != null && !String.valueOf(resMem).isBlank()) {
                    config.memoryLimit = String.valueOf(resMem).trim();
                }
                Object resCpu = firstNonNull(limitsMap, "cpu", "cpuLimit", "cpu_limit");
                if (resCpu != null && !String.valueOf(resCpu).isBlank()) {
                    config.cpuLimit = String.valueOf(resCpu).trim();
                }
            }

            // Public domain default
            Object domainObj = firstNonNull(map, "publicDomain", "public_domain", "domainHost", "domain");
            if (domainObj != null && !String.valueOf(domainObj).isBlank()) {
                config.publicDomain = String.valueOf(domainObj).trim();
            }
        } catch (Exception e) {
            log.warn("Failed parsing deploymentYaml defaults: {}", e.getMessage());
        }
    }

    private Object firstNonNull(Map<?, ?> map, String... keys) {
        for (String k : keys) {
            Object val = map.get(k);
            if (val != null) {
                return val;
            }
        }
        return null;
    }

    private Integer parsePortObject(Object obj) {
        if (obj == null) return null;
        if (obj instanceof Number n) {
            return n.intValue();
        }
        String s = String.valueOf(obj).trim();
        if (s.contains(":")) {
            s = s.substring(s.lastIndexOf(':') + 1).trim();
        }
        if (s.contains("/")) {
            s = s.substring(0, s.indexOf('/')).trim();
        }
        try {
            return Integer.parseInt(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private void extractEnvFromObject(Map<String, String> target, Object envObj) {
        if (envObj instanceof Map<?, ?> envMap) {
            for (Map.Entry<?, ?> entry : envMap.entrySet()) {
                if (entry.getKey() != null) {
                    target.put(String.valueOf(entry.getKey()).trim(), entry.getValue() != null ? String.valueOf(entry.getValue()) : "");
                }
            }
        } else if (envObj instanceof List<?> envList) {
            for (Object item : envList) {
                if (item instanceof Map<?, ?> itemMap) {
                    Object name = firstNonNull(itemMap, "name", "key");
                    Object value = itemMap.get("value");
                    if (name != null) {
                        target.put(String.valueOf(name).trim(), value != null ? String.valueOf(value) : "");
                    }
                } else if (item instanceof String line) {
                    int idx = line.indexOf('=');
                    if (idx > 0) {
                        target.put(line.substring(0, idx).trim(), line.substring(idx + 1).trim());
                    }
                }
            }
        } else if (envObj instanceof String envStr) {
            target.putAll(parseEnvVarsString(envStr));
        }
    }

    public Map<String, String> parseEnvVarsString(String raw) {
        Map<String, String> result = new LinkedHashMap<>();
        if (raw == null || raw.isBlank()) {
            return result;
        }
        String trimmed = raw.trim();
        if (trimmed.startsWith("{")) {
            try {
                Map<String, Object> parsed = objectMapper.readValue(trimmed, new TypeReference<Map<String, Object>>() {});
                for (Map.Entry<String, Object> entry : parsed.entrySet()) {
                    if (entry.getKey() != null && !entry.getKey().isBlank()) {
                        result.put(entry.getKey().trim(), entry.getValue() != null ? String.valueOf(entry.getValue()) : "");
                    }
                }
                return result;
            } catch (Exception e) {
                log.debug("Could not parse envVars as JSON, falling back to KEY=VALUE line parsing: {}", e.getMessage());
            }
        }

        String[] lines = trimmed.split("\\r?\\n");
        for (String line : lines) {
            String cleanLine = line.trim();
            if (cleanLine.isEmpty() || cleanLine.startsWith("#")) {
                continue;
            }
            int eqIdx = cleanLine.indexOf('=');
            if (eqIdx > 0) {
                String k = cleanLine.substring(0, eqIdx).trim();
                String v = cleanLine.substring(eqIdx + 1).trim();
                if (!k.isEmpty()) {
                    result.put(k, v);
                }
            }
        }
        return result;
    }

    @Override
    @Transactional
    public Deployment restartDeployment(UUID deploymentId) {
        Deployment deployment = deploymentRepository.findById(deploymentId)
                .orElseThrow(() -> new IllegalArgumentException("Deployment not found: " + deploymentId));

        String ns = deployment.getNamespace();
        String k8sName = deployment.getK8sDeploymentName();

        log.info("Triggering restart for deployment {}/{}", ns, k8sName);
        boolean success = k8sDeploymentProvider.restartDeployment(ns, k8sName);
        if (success) {
            deployment.setStatus("SUCCESS");
            deployment.setUpdatedAt(Instant.now());
        } else {
            deployment.setStatus("FAILED");
        }
        return deploymentRepository.save(deployment);
    }

    @Override
    @Transactional
    public Deployment scaleDeployment(UUID deploymentId, int replicas) {
        Deployment deployment = deploymentRepository.findById(deploymentId)
                .orElseThrow(() -> new IllegalArgumentException("Deployment not found: " + deploymentId));

        String ns = deployment.getNamespace();
        String k8sName = deployment.getK8sDeploymentName();

        log.info("Scaling deployment {}/{} to replicas={}", ns, k8sName, replicas);
        boolean success = k8sDeploymentProvider.scaleDeployment(ns, k8sName, replicas);
        if (success) {
            deployment.setStatus(replicas == 0 ? "STOPPED" : "SUCCESS");
            deployment.setUpdatedAt(Instant.now());
        } else {
            deployment.setStatus("FAILED");
        }
        return deploymentRepository.save(deployment);
    }

    @Override
    @Transactional
    public void deleteDeployment(UUID id, boolean deleteK8sResources) {
        Deployment d = deploymentRepository.findById(id).orElse(null);
        if (d != null) {
            if (deleteK8sResources) {
                log.info("Deleting underlying K3s resources for {}/{}", d.getNamespace(), d.getK8sDeploymentName());
                k8sDeploymentProvider.deleteDeploymentResources(d.getNamespace(), d.getK8sDeploymentName());
            }
            log.info("Deleting deployment record: {}", id);
            deploymentRepository.deleteById(id);
        }
    }

    @Override
    public DeploymentStatusDto getDeploymentStatus(UUID id) {
        Deployment d = deploymentRepository.findById(id).orElse(null);
        if (d == null) {
            return DeploymentStatusDto.builder()
                    .status("NOT_FOUND")
                    .exists(false)
                    .build();
        }

        DeploymentStatusDto liveStatus = k8sDeploymentProvider.getDeploymentStatusDetails(
                d.getNamespace(),
                d.getK8sDeploymentName(),
                d.getK8sContainerName()
        );

        // Synchronize live K3s liveness status back to DB if appropriate
        if ("STOPPED".equals(liveStatus.getStatus()) && !"STOPPED".equals(d.getStatus())) {
            d.setStatus("STOPPED");
            deploymentRepository.save(d);
        } else if ("RUNNING".equals(liveStatus.getStatus()) && !"SUCCESS".equals(d.getStatus()) && !"DEPLOYING".equals(d.getStatus())) {
            d.setStatus("SUCCESS");
            deploymentRepository.save(d);
        } else if ("FAILED".equals(liveStatus.getStatus()) && "SUCCESS".equals(d.getStatus())) {
            d.setStatus("FAILED");
            deploymentRepository.save(d);
        }

        return liveStatus;
    }

    @Override
    public String getDeploymentLogs(UUID id, int tailLines) {
        Deployment d = deploymentRepository.findById(id).orElse(null);
        if (d == null) return "Deployment mapping not found.";
        return k8sDeploymentProvider.getPodLogs(d.getNamespace(), d.getK8sDeploymentName(), tailLines);
    }

    @Override
    @Transactional
    public void triggerDeploymentsForArtifact(String artifactName, String version) {
        log.info("Triggering deployments for artifact: {} @ {}", artifactName, version);
        List<Deployment> deployments = deploymentRepository.findByArtifactName(artifactName);

        if (deployments.isEmpty()) {
            log.debug("No deployments registered for artifact: {}", artifactName);
            return;
        }

        for (Deployment deployment : deployments) {
            executeDeploymentRollout(deployment, version);
        }
    }

    @Override
    public List<Deployment> getAllDeployments() {
        return deploymentRepository.findAll();
    }

    @Override
    public Deployment getDeployment(UUID id) {
        return deploymentRepository.findById(id).orElse(null);
    }
}
