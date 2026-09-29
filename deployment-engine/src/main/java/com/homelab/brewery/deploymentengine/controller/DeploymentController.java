package com.homelab.brewery.deploymentengine.controller;

import com.homelab.brewery.common.entity.Deployment;
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

    @PostMapping
    public ResponseEntity<Deployment> registerOrUpdateDeployment(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        String komodoStackName = body.get("komodoStackName");
        String artifactName = body.get("artifactName");
        String description = body.get("description");
        String username = body.get("username");

        if (name == null || komodoStackName == null || artifactName == null) {
            return ResponseEntity.badRequest().build();
        }

        Deployment deployment = deploymentService.registerOrUpdateDeployment(
                name, komodoStackName, artifactName, description, username
        );
        return ResponseEntity.ok(deployment);
    }

    @PostMapping("/{id}/deploy")
    public ResponseEntity<Deployment> deploy(@PathVariable("id") UUID id) {
        try {
            Deployment deployment = deploymentService.deploy(id);
            return ResponseEntity.ok(deployment);
        } catch (Exception e) {
            log.error("Komodo deployment failed for {}", id, e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDeployment(@PathVariable("id") UUID id) {
        try {
            deploymentService.deleteDeployment(id);
            return ResponseEntity.ok(Map.of("status", "success", "message", "Deployment mapping deleted successfully"));
        } catch (Exception e) {
            log.error("Failed to delete deployment {}", id, e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
