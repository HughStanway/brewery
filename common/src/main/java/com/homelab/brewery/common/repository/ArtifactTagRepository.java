package com.homelab.brewery.common.repository;

import com.homelab.brewery.common.entity.ArtifactTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ArtifactTagRepository extends JpaRepository<ArtifactTag, UUID> {
    List<ArtifactTag> findByArtifactId(UUID artifactId);
    Optional<ArtifactTag> findByArtifactIdAndTag(UUID artifactId, String tag);
    void deleteByArtifactIdAndTag(UUID artifactId, String tag);
}
