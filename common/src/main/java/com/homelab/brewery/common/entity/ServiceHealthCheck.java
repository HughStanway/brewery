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
@Table(name = "service_health_checks")
@Data
@NoArgsConstructor
public class ServiceHealthCheck {

    @Id
    private UUID id;

    @Column(name = "deployment_id", nullable = false)
    private UUID deploymentId;

    @Column(name = "service_name", nullable = false)
    private String serviceName;

    @Column(nullable = false)
    private String status;

    @Column(name = "last_checked_at")
    private Instant lastCheckedAt;

    @Column(name = "response_time_ms")
    private Integer responseTimeMs;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "check_count")
    private Integer checkCount;

    @Column(name = "consecutive_failures")
    private Integer consecutiveFailures;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (checkCount == null) {
            checkCount = 0;
        }
        if (consecutiveFailures == null) {
            consecutiveFailures = 0;
        }
        if (lastCheckedAt == null) {
            lastCheckedAt = Instant.now();
        }
    }
}
