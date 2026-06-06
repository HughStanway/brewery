package com.homelab.brewery.cascaderebuild.listener;

import com.homelab.brewery.cascaderebuild.service.CascadeRebuildService;
import com.homelab.brewery.common.event.ArtifactRegisteredEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class CascadeEventListener {

    private final CascadeRebuildService cascadeRebuildService;

    @EventListener
    public void onArtifactRegistered(ArtifactRegisteredEvent event) {
        log.info("Received ArtifactRegisteredEvent for {}@{} (id={})",
                event.getArtifactName(), event.getArtifactVersion(), event.getArtifactId());
        try {
            cascadeRebuildService.triggerCascade(
                    event.getArtifactName(),
                    event.getArtifactVersion(),
                    "New version registered: " + event.getArtifactName() + "@" + event.getArtifactVersion(),
                    5
            );
        } catch (Exception e) {
            // Never block the publishing thread
            log.error("Error triggering cascade rebuild for {}@{}: {}",
                    event.getArtifactName(), event.getArtifactVersion(), e.getMessage(), e);
        }
    }
}
