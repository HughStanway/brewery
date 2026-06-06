package com.homelab.brewery.common.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "dependency_conflicts")
@Data
@NoArgsConstructor
public class DependencyConflictEntity {

    @Id
    private UUID id;

    @Column(name = "artifact_id", nullable = false)
    private UUID artifactId;

    @Column(name = "conflict_description", nullable = false)
    private String conflictDescription;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "involved_artifacts", nullable = false, columnDefinition = "text[]")
    private String[] involvedArtifacts;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "suggested_resolutions", columnDefinition = "text[]")
    private String[] suggestedResolutions;

    @Column(name = "detected_at", insertable = false, updatable = false)
    private Instant detectedAt;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
    }
}
