package com.homelab.brewery.deploymentengine.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.homelab.brewery.common.entity.Deployment;
import com.homelab.brewery.deploymentengine.model.DeploymentStatusDto;
import com.homelab.brewery.deploymentengine.service.DeploymentService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/deployments")
@RequiredArgsConstructor
@Slf4j
public class DeploymentController {

    private final DeploymentService deploymentService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Data
    public static class RegisterDeploymentRequest {
        private String name;
        private String namespace;
        private String ns;
        private String k8sDeploymentName;
        private String containerName;
        private String k8sContainerName;
        private String artifactName;
        private String description;
        private String publicDomain;
        private String domainHost;
        private Integer containerPort;
        private Object envVars;
        private String memoryLimit;
        private String cpuLimit;
        private String username;
    }

    @GetMapping
    public ResponseEntity<List<Deployment>> getAllDeployments() {
        return ResponseEntity.ok(deploymentService.getAllDeployments());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Deployment> getDeployment(@PathVariable("id") UUID id) {
        Deployment deployment = deploymentService.getDeployment(id);
        if (deployment == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(deployment);
    }

    @GetMapping("/{id}/status")
    public ResponseEntity<DeploymentStatusDto> getDeploymentStatus(@PathVariable("id") UUID id) {
        DeploymentStatusDto status = deploymentService.getDeploymentStatus(id);
        return ResponseEntity.ok(status);
    }

    @GetMapping("/{id}/logs")
    public ResponseEntity<Map<String, String>> getDeploymentLogs(
            @PathVariable("id") UUID id,
            @RequestParam(value = "lines", defaultValue = "100") int lines) {
        String logs = deploymentService.getDeploymentLogs(id, lines);
        return ResponseEntity.ok(Map.of("logs", logs));
    }

    @PostMapping
    public ResponseEntity<Deployment> registerOrUpdateDeployment(@RequestBody RegisterDeploymentRequest req) {
        String name = req.getName();
        String namespace = req.getNamespace() != null ? req.getNamespace() : (req.getNs() != null ? req.getNs() : "default");
        String k8sDeploymentName = req.getK8sDeploymentName() != null && !req.getK8sDeploymentName().isBlank()
                ? req.getK8sDeploymentName()
                : name;
        String containerName = req.getContainerName() != null && !req.getContainerName().isBlank()
                ? req.getContainerName()
                : (req.getK8sContainerName() != null && !req.getK8sContainerName().isBlank() ? req.getK8sContainerName() : "app");
        String artifactName = req.getArtifactName();
        String description = req.getDescription();
        String publicDomain = req.getPublicDomain() != null ? req.getPublicDomain() : req.getDomainHost();
        String envVarsStr = serializeEnvVars(req.getEnvVars());

        if (name == null || name.isBlank() || artifactName == null || artifactName.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        Deployment deployment = deploymentService.registerOrUpdateDeployment(
                name,
                namespace,
                k8sDeploymentName,
                containerName,
                artifactName,
                description,
                publicDomain,
                req.getContainerPort(),
                envVarsStr,
                req.getMemoryLimit(),
                req.getCpuLimit(),
                req.getUsername()
        );
        return ResponseEntity.ok(deployment);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Deployment> updateDeployment(
            @PathVariable("id") UUID id,
            @RequestBody RegisterDeploymentRequest req) {
        try {
            String namespace = req.getNamespace() != null ? req.getNamespace() : (req.getNs() != null ? req.getNs() : "default");
            String k8sDeploymentName = req.getK8sDeploymentName();
            String containerName = req.getContainerName() != null ? req.getContainerName() : req.getK8sContainerName();
            String publicDomain = req.getPublicDomain() != null ? req.getPublicDomain() : req.getDomainHost();
            String envVarsStr = serializeEnvVars(req.getEnvVars());

            Deployment deployment = deploymentService.updateDeployment(
                    id,
                    req.getName(),
                    namespace,
                    k8sDeploymentName,
                    containerName,
                    req.getArtifactName(),
                    req.getDescription(),
                    publicDomain,
                    req.getContainerPort(),
                    envVarsStr,
                    req.getMemoryLimit(),
                    req.getCpuLimit(),
                    req.getUsername()
            );
            return ResponseEntity.ok(deployment);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    private String serializeEnvVars(Object envVarsObj) {
        if (envVarsObj == null) {
            return null;
        }
        if (envVarsObj instanceof String s) {
            return s;
        }
        try {
            return objectMapper.writeValueAsString(envVarsObj);
        } catch (Exception e) {
            return String.valueOf(envVarsObj);
        }
    }

    @PostMapping("/{id}/deploy")
    public ResponseEntity<Deployment> deploy(
            @PathVariable("id") UUID id,
            @RequestParam(value = "version", required = false) String versionParam,
            @RequestBody(required = false) Map<String, String> body) {
        try {
            String targetVersion = versionParam;
            if ((targetVersion == null || targetVersion.isBlank()) && body != null) {
                targetVersion = body.get("version");
            }
            Deployment deployment = deploymentService.deploy(id, targetVersion);
            return ResponseEntity.ok(deployment);
        } catch (Exception e) {
            log.error("K3s deployment rollout failed for {}", id, e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/{id}/rollback")
    public ResponseEntity<?> rollback(
            @PathVariable("id") UUID id,
            @RequestParam(value = "version", required = false) String versionParam,
            @RequestBody(required = false) Map<String, String> body) {
        try {
            String targetVersion = versionParam;
            if ((targetVersion == null || targetVersion.isBlank()) && body != null) {
                targetVersion = body.get("version");
            }
            Deployment deployment = deploymentService.rollbackDeployment(id, targetVersion);
            return ResponseEntity.ok(deployment);
        } catch (IllegalArgumentException | IllegalStateException e) {
            log.warn("Rollback rejected for {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("K3s deployment rollback failed for {}", id, e);
            return ResponseEntity.internalServerError().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/{id}/restart")
    public ResponseEntity<Deployment> restartDeployment(@PathVariable("id") UUID id) {
        try {
            Deployment deployment = deploymentService.restartDeployment(id);
            return ResponseEntity.ok(deployment);
        } catch (Exception e) {
            log.error("K3s deployment restart failed for {}", id, e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/{id}/scale")
    public ResponseEntity<Deployment> scaleDeployment(
            @PathVariable("id") UUID id,
            @RequestBody Map<String, Integer> body) {
        try {
            Integer replicas = body.getOrDefault("replicas", 1);
            Deployment deployment = deploymentService.scaleDeployment(id, replicas);
            return ResponseEntity.ok(deployment);
        } catch (Exception e) {
            log.error("K3s deployment scale failed for {}", id, e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDeployment(
            @PathVariable("id") UUID id,
            @RequestParam(value = "deleteK8s", defaultValue = "false") boolean deleteK8s) {
        try {
            deploymentService.deleteDeployment(id, deleteK8s);
            return ResponseEntity.ok(Map.of("status", "success", "message", "Deployment deleted successfully"));
        } catch (Exception e) {
            log.error("Failed to delete deployment {}", id, e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
