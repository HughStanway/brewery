package com.homelab.brewery.common.repository;

import com.homelab.brewery.common.entity.Artifact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ArtifactRepository extends JpaRepository<Artifact, UUID> {
    Optional<Artifact> findByNameAndVersion(String name, String version);
    List<Artifact> findByName(String name);
}
