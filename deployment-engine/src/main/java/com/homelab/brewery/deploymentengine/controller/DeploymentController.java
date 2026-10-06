package com.homelab.brewery.deploymentengine.controller;

import com.homelab.brewery.common.entity.Deployment;
import com.homelab.brewery.deploymentengine.model.DeploymentStatusDto;
import com.homelab.brewery.deploymentengine.service.DeploymentService;
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
    public ResponseEntity<Deployment> registerOrUpdateDeployment(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        String namespace = body.getOrDefault("namespace", body.getOrDefault("ns", "default"));
        String k8sDeploymentName = body.getOrDefault("k8sDeploymentName", body.getOrDefault("komodoStackName", name));
        String containerName = body.getOrDefault("containerName", body.getOrDefault("k8sContainerName", "app"));
        String artifactName = body.get("artifactName");
        String description = body.get("description");
        String publicDomain = body.getOrDefault("publicDomain", body.get("domainHost"));
        String username = body.get("username");

        if (name == null || artifactName == null) {
            return ResponseEntity.badRequest().build();
        }

        Deployment deployment = deploymentService.registerOrUpdateDeployment(
                name, namespace, k8sDeploymentName, containerName, artifactName, description, publicDomain, username
        );
        return ResponseEntity.ok(deployment);
    }

    @PostMapping("/{id}/deploy")
    public ResponseEntity<Deployment> deploy(@PathVariable("id") UUID id) {
        try {
            Deployment deployment = deploymentService.deploy(id);
            return ResponseEntity.ok(deployment);
        } catch (Exception e) {
            log.error("K3s deployment rollout failed for {}", id, e);
            return ResponseEntity.internalServerError().build();
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
