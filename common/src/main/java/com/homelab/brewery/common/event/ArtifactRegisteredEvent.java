package com.homelab.brewery.common.event;

import org.springframework.context.ApplicationEvent;

import java.util.UUID;

/**
 * Spring ApplicationEvent published when an artifact is successfully registered in the registry.
 * Placed in the common module so both registry (publisher) and cascade-rebuild (listener) can reference it
 * without creating a circular module dependency.
 */
public class ArtifactRegisteredEvent extends ApplicationEvent {

    private final String artifactName;
    private final String artifactVersion;
    private final UUID artifactId;

    public ArtifactRegisteredEvent(Object source, String artifactName, String artifactVersion, UUID artifactId) {
        super(source);
        this.artifactName = artifactName;
        this.artifactVersion = artifactVersion;
        this.artifactId = artifactId;
    }

    public String getArtifactName() {
        return artifactName;
    }

    public String getArtifactVersion() {
        return artifactVersion;
    }

    public UUID getArtifactId() {
        return artifactId;
    }
}
