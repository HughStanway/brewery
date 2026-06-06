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
@Table(name = "resolved_dependencies")
@Data
@NoArgsConstructor
public class ResolvedDependency {

    @Id
    private UUID id;

    @Column(name = "artifact_id", nullable = false)
    private UUID artifactId;

    @Column(name = "dependency_id", nullable = false)
    private UUID dependencyId;

    @Column(name = "resolved_to_artifact_id", nullable = false)
    private UUID resolvedToArtifactId;

    @Column(name = "resolved_version", nullable = false)
    private String resolvedVersion;

    @Column(name = "resolution_time", insertable = false, updatable = false)
    private Instant resolutionTime;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
    }
}
