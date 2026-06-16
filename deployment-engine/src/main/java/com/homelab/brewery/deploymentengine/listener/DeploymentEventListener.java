package com.homelab.brewery.deploymentengine.listener;

import com.homelab.brewery.common.entity.Deployment;
import com.homelab.brewery.common.event.ArtifactRegisteredEvent;
import com.homelab.brewery.deploymentengine.model.DeploymentSpec;
import com.homelab.brewery.deploymentengine.service.DeploymentService;
import com.homelab.brewery.registry.SemanticVersionResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.yaml.snakeyaml.Yaml;

import java.util.List;
import java.util.concurrent.CompletableFuture;

@Component
@Slf4j
@RequiredArgsConstructor
public class DeploymentEventListener {

    private final DeploymentService deploymentService;
    private final SemanticVersionResolver versionResolver;

    @EventListener
    public void onArtifactRegistered(ArtifactRegisteredEvent event) {
        log.info("Received ArtifactRegisteredEvent for {}@{}", event.getArtifactName(), event.getArtifactVersion());

        // Run asynchronously to avoid blocking the caller thread (e.g. build processor)
        CompletableFuture.runAsync(() -> {
            try {
                List<Deployment> deployments = deploymentService.getAllDeployments();
                Yaml yaml = new Yaml();

                for (Deployment deployment : deployments) {
                    // Skip if deployment is already in a deploying state to avoid concurrent rollout conflicts
                    if ("deploying".equalsIgnoreCase(deployment.getStatus())) {
                        continue;
                    }

                    DeploymentSpec spec = yaml.loadAs(deployment.getDeploymentSpec(), DeploymentSpec.class);
                    if (spec.getServices() == null) continue;

                    boolean shouldRedeploy = false;

                    for (DeploymentSpec.ServiceSpec service : spec.getServices().values()) {
                        String artifactRef = service.getArtifact();
                        if (artifactRef != null && artifactRef.contains("@")) {
                            String name = artifactRef.substring(0, artifactRef.indexOf("@"));
                            String range = artifactRef.substring(artifactRef.indexOf("@") + 1);

                            if (name.equals(event.getArtifactName())) {
                                // Check if the new version is compatible/satisfies the range
                                if (range.equalsIgnoreCase("latest") || range.equalsIgnoreCase("any") || range.equals("*")) {
                                    shouldRedeploy = true;
                                    break;
                                } else {
                                    // Use SemanticVersionResolver range matching logic
                                    String resolved = versionResolver.resolveVersionRange(range, List.of(event.getArtifactVersion()));
                                    if (event.getArtifactVersion().equals(resolved)) {
                                        shouldRedeploy = true;
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    if (shouldRedeploy) {
                        log.info("Triggering automatic deployment update for stack: {} due to new artifact version: {}",
                                deployment.getName(), event.getArtifactVersion());
                        deploymentService.deploy(deployment.getId());
                    }
                }
            } catch (Exception e) {
                log.error("Error processing auto-deployment for registered artifact {}", event.getArtifactName(), e);
            }
        });
    }
}
