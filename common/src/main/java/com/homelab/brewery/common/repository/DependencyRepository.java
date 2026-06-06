package com.homelab.brewery.common.repository;

import com.homelab.brewery.common.entity.Dependency;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DependencyRepository extends JpaRepository<Dependency, UUID> {
    List<Dependency> findByArtifactId(UUID artifactId);
    Optional<Dependency> findByArtifactIdAndDependencyName(UUID artifactId, String dependencyName);
    List<Dependency> findByDependencyName(String dependencyName);
}
