package com.homelab.brewery.common.repository;

import com.homelab.brewery.common.entity.ResolvedDependency;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ResolvedDependencyRepository extends JpaRepository<ResolvedDependency, UUID> {
    List<ResolvedDependency> findByArtifactId(UUID artifactId);
    Optional<ResolvedDependency> findByArtifactIdAndDependencyId(UUID artifactId, UUID dependencyId);
    void deleteByArtifactId(UUID artifactId);
    void deleteByResolvedToArtifactId(UUID resolvedToArtifactId);
}
