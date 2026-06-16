package com.homelab.brewery.common.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "deployment_versions")
@Data
@NoArgsConstructor
public class DeploymentVersion {

    @Id
    private UUID id;

    @Column(name = "deployment_id", nullable = false)
    private UUID deploymentId;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Column(name = "compose_config", nullable = false, columnDefinition = "TEXT")
    private String composeConfig;

    @Column(name = "artifact_versions", nullable = false, columnDefinition = "JSONB")
    private String artifactVersions;

    @Column(name = "deployed_at", insertable = false, updatable = false)
    private Instant deployedAt;

    @Column(name = "undeployed_at")
    private Instant undeployedAt;

    @Column(nullable = false)
    private String status;

    @Column(name = "docker_compose_output", columnDefinition = "TEXT")
    private String dockerComposeOutput;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (status == null) {
            status = "active";
        }
    }
}
