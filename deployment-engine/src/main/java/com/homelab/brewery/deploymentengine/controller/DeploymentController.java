package com.homelab.brewery.deploymentengine.controller;

import com.homelab.brewery.common.entity.Deployment;
import com.homelab.brewery.common.entity.DeploymentEvent;
import com.homelab.brewery.common.entity.DeploymentVersion;
import com.homelab.brewery.common.entity.ServiceHealthCheck;
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
    public ResponseEntity<Deployment> createOrUpdateDeployment(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        String specYaml = body.get("specYaml");
        String username = body.get("username");
        if (name == null || specYaml == null) {
            return ResponseEntity.badRequest().build();
        }
        Deployment deployment = deploymentService.createOrUpdateDeployment(name, specYaml, username);
        return ResponseEntity.ok(deployment);
    }

    @PostMapping("/plan")
    public ResponseEntity<?> planDeployment(@RequestBody Map<String, String> body) {
        String specYaml = body.get("specYaml");
        if (specYaml == null) {
            return ResponseEntity.badRequest().build();
        }
        try {
            Map<String, Object> plan = deploymentService.planDeployment(specYaml);
            return ResponseEntity.ok(plan);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/deploy")
    public ResponseEntity<Deployment> deploy(@PathVariable("id") UUID id) {
        try {
            Deployment deployment = deploymentService.deploy(id);
            return ResponseEntity.ok(deployment);
        } catch (Exception e) {
            log.error("Deployment failed for {}", id, e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/{id}/rollback/{version}")
    public ResponseEntity<?> rollback(@PathVariable("id") UUID id, @PathVariable("version") Integer version) {
        try {
            deploymentService.rollback(id, version);
            return ResponseEntity.ok(Map.of("status", "success", "message", "Rolled back to version " + version));
        } catch (Exception e) {
            log.error("Rollback failed", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}/versions")
    public ResponseEntity<List<DeploymentVersion>> getDeploymentVersions(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(deploymentService.getDeploymentVersions(id));
    }

    @GetMapping("/{id}/events")
    public ResponseEntity<List<DeploymentEvent>> getDeploymentEvents(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(deploymentService.getDeploymentEvents(id));
    }

    @GetMapping("/{id}/health")
    public ResponseEntity<List<ServiceHealthCheck>> getServiceHealthChecks(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(deploymentService.getServiceHealthChecks(id));
    }

    @PostMapping("/{id}/health/check")
    public ResponseEntity<?> triggerHealthCheck(@PathVariable("id") UUID id) {
        try {
            deploymentService.checkAndRemediateHealth(id);
            return ResponseEntity.ok(Map.of("status", "success", "message", "Health check completed"));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
