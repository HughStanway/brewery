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
@Table(name = "dependencies")
@Data
@NoArgsConstructor
public class Dependency {

    @Id
    private UUID id;

    @Column(name = "artifact_id", nullable = false)
    private UUID artifactId;

    @Column(name = "dependency_name", nullable = false)
    private String dependencyName;

    @Column(name = "version_range", nullable = false)
    private String versionRange;

    @Column(name = "resolved_version")
    private String resolvedVersion;

    @Column(name = "dependency_artifact_id")
    private UUID dependencyArtifactId;

    @Column(name = "dependency_type", nullable = false)
    private String dependencyType = "runtime";

    @Column(name = "is_optional", nullable = false)
    private Boolean isOptional = false;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (dependencyType == null) {
            dependencyType = "runtime";
        }
        if (isOptional == null) {
            isOptional = false;
        }
    }
}
