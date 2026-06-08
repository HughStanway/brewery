package com.homelab.brewery.common.repository;

import com.homelab.brewery.common.entity.ArtifactMetadata;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ArtifactMetadataRepository extends JpaRepository<ArtifactMetadata, UUID> {
    Optional<ArtifactMetadata> findByArtifactId(UUID artifactId);
    void deleteByArtifactId(UUID artifactId);
}
