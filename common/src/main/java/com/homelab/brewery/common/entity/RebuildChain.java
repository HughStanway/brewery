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
@Table(name = "rebuild_chains")
@Data
@NoArgsConstructor
public class RebuildChain {

    @Id
    private UUID id;

    @Column(name = "root_artifact_id", nullable = false)
    private UUID rootArtifactId;

    @Column(name = "root_cause", nullable = false, columnDefinition = "TEXT")
    private String rootCause;

    @Column(nullable = false)
    private String status = "running";

    @Column
    private Integer depth = 0;

    @Column(name = "parent_chain_id")
    private UUID parentChainId;

    @Column(name = "trigger_type")
    private String triggerType;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (startedAt == null) {
            startedAt = Instant.now();
        }
        if (status == null) {
            status = "running";
        }
        if (depth == null) {
            depth = 0;
        }
    }
}
