package com.homelab.brewery.common.repository;

import com.homelab.brewery.common.entity.ReverseDependency;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ReverseDependencyRepository extends JpaRepository<ReverseDependency, UUID> {
    List<ReverseDependency> findByArtifactId(UUID artifactId);
    List<ReverseDependency> findByDependentArtifactId(UUID dependentArtifactId);
    void deleteByArtifactId(UUID artifactId);
    void deleteByDependentArtifactId(UUID dependentArtifactId);
}
