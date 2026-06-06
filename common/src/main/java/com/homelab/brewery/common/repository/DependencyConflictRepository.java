package com.homelab.brewery.common.repository;

import com.homelab.brewery.common.entity.DependencyConflictEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DependencyConflictRepository extends JpaRepository<DependencyConflictEntity, UUID> {
    List<DependencyConflictEntity> findByArtifactId(UUID artifactId);
    void deleteByArtifactId(UUID artifactId);
}
