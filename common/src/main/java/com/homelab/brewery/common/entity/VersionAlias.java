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
@Table(name = "version_aliases")
@Data
@NoArgsConstructor
public class VersionAlias {

    @Id
    private UUID id;

    @Column(name = "artifact_name", nullable = false)
    private String artifactName;

    @Column(nullable = false)
    private String alias;

    @Column(name = "actual_version", nullable = false)
    private String actualVersion;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
    }
}
