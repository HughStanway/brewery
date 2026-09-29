package com.homelab.brewery.deploymentengine.listener;

import com.homelab.brewery.common.event.ArtifactRegisteredEvent;
import com.homelab.brewery.deploymentengine.service.DeploymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.concurrent.CompletableFuture;

@Component
@Slf4j
@RequiredArgsConstructor
public class DeploymentEventListener {

    private final DeploymentService deploymentService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onArtifactRegistered(ArtifactRegisteredEvent event) {
        log.info("Received ArtifactRegisteredEvent for {}@{}", event.getArtifactName(), event.getArtifactVersion());

        CompletableFuture.runAsync(() -> {
            try {
                deploymentService.triggerDeploymentsForArtifact(event.getArtifactName(), event.getArtifactVersion());
            } catch (Exception e) {
                log.error("Error processing Komodo deployment for registered artifact {}@{}",
                        event.getArtifactName(), event.getArtifactVersion(), e);
            }
        });
    }
}
