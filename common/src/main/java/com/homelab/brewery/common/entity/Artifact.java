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
@Table(name = "artifacts")
@Data
@NoArgsConstructor
public class Artifact {

    @Id
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String version;

    @Column(name = "artifact_type", nullable = false)
    private String artifactType;

    @Column(name = "build_id", nullable = false)
    private UUID buildId;

    @Column(name = "storage_path", nullable = false)
    private String storagePath;

    @Column(name = "file_size_bytes")
    private Long fileSizeBytes;

    @Column(name = "checksum")
    private String checksum;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
    }
}
