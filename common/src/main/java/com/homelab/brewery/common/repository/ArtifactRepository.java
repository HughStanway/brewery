package com.homelab.brewery.common.repository;

import com.homelab.brewery.common.entity.Artifact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;
import java.util.Optional;

@Repository
public interface ArtifactRepository extends JpaRepository<Artifact, UUID> {
    Optional<Artifact> findByNameAndVersion(String name, String version);
}
