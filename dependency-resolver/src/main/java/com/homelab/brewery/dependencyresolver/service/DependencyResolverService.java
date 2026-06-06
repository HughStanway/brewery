package com.homelab.brewery.dependencyresolver.service;

import com.homelab.brewery.common.entity.Artifact;
import com.homelab.brewery.common.entity.DependencyConflictEntity;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface DependencyResolverService {

    /**
     * Resolve dependencies for a single artifact version.
     */
    Map<String, Object> resolveDependencies(String name, String version, boolean includeTransitive, boolean includeDev);

    /**
     * Get the forward or reverse dependency graph.
     */
    Map<String, Object> getDependencyGraph(String name, String version, int depth, String direction);

    /**
     * Get reverse dependencies (dependents) for an artifact.
     */
    Map<String, Object> getReverseDependencies(String name, String version, int depth);

    /**
     * Check for version conflicts among a set of artifacts.
     */
    Map<String, Object> checkConflicts(List<Map<String, String>> artifactsRequest);

    /**
     * Get the compatibility matrix of versions for a list of artifact names.
     */
    Map<String, Object> getCompatibilityMatrix(List<String> artifactNames);

    /**
     * Run the background resolver logic for any unresolved artifacts.
     */
    void resolveUnresolvedArtifacts();
}
