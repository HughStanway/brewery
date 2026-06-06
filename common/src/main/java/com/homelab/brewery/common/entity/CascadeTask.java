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
@Table(name = "cascade_tasks")
@Data
@NoArgsConstructor
public class CascadeTask {

    @Id
    private UUID id;

    @Column(name = "chain_id", nullable = false)
    private UUID chainId;

    @Column(name = "artifact_id", nullable = false)
    private UUID artifactId;

    @Column(name = "dependency_artifact_id", nullable = false)
    private UUID dependencyArtifactId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(nullable = false)
    private String status = "pending";

    @Column(name = "build_id")
    private UUID buildId;

    @Column
    private Integer priority = 0;

    @Column(name = "attempted_at")
    private Instant attemptedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "created_at")
    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (status == null) {
            status = "pending";
        }
        if (priority == null) {
            priority = 0;
        }
    }
}
