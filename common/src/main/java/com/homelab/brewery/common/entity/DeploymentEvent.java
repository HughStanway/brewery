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
@Table(name = "deployment_events")
@Data
@NoArgsConstructor
public class DeploymentEvent {

    @Id
    private UUID id;

    @Column(name = "deployment_id", nullable = false)
    private UUID deploymentId;

    @Column(name = "event_type", nullable = false)
    private String eventType;

    @Column(columnDefinition = "TEXT")
    private String message;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    private String metadata;

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
    }
}
