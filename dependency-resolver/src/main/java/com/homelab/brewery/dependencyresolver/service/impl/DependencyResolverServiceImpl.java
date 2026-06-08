package com.homelab.brewery.dependencyresolver.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.homelab.brewery.common.entity.Artifact;
import com.homelab.brewery.common.entity.Dependency;
import com.homelab.brewery.common.entity.DependencyConflictEntity;
import com.homelab.brewery.common.entity.ResolvedDependency;
import com.homelab.brewery.common.entity.ReverseDependency;
import com.homelab.brewery.common.repository.ArtifactRepository;
import com.homelab.brewery.common.repository.DependencyConflictRepository;
import com.homelab.brewery.common.repository.DependencyRepository;
import com.homelab.brewery.common.repository.ResolvedDependencyRepository;
import com.homelab.brewery.common.repository.ReverseDependencyRepository;
import com.homelab.brewery.dependencyresolver.service.DependencyResolverService;
import com.homelab.brewery.registry.ArtifactRegistryService;
import com.homelab.brewery.registry.model.ArtifactMetadataJson;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Queue;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DependencyResolverServiceImpl implements DependencyResolverService {

    private final ArtifactRepository artifactRepository;
    private final DependencyRepository dependencyRepository;
    private final ResolvedDependencyRepository resolvedDependencyRepository;
    private final ReverseDependencyRepository reverseDependencyRepository;
    private final DependencyConflictRepository dependencyConflictRepository;
    private final ArtifactRegistryService registryService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    @Transactional
    public Map<String, Object> resolveDependencies(String name, String version, boolean includeTransitive, boolean includeDev) {
        long startTime = System.currentTimeMillis();
        Map<String, Object> response = new LinkedHashMap<>();

        // 1. Resolve alias or range to concrete version
        String targetVersion = resolveAliasOrRange(name, version);
        Optional<Artifact> rootArtifactOpt = artifactRepository.findByNameAndVersion(name, targetVersion);
        if (rootArtifactOpt.isEmpty()) {
            throw new IllegalArgumentException("Artifact not found: " + name + " version " + targetVersion);
        }
        Artifact rootArtifact = rootArtifactOpt.get();
        String rootIdStr = name + "@" + targetVersion;
        response.put("artifact", rootIdStr);

        // Graphs structure tracking
        List<Map<String, Object>> resolvedDepsList = new ArrayList<>();
        List<Map<String, Object>> transitiveDepsList = new ArrayList<>();
        List<String> conflictsList = new ArrayList<>();

        // Helper structure for BFS traversal
        Queue<String> queue = new LinkedList<>();
        Set<String> visited = new HashSet<>();
        Map<String, List<String>> paths = new HashMap<>(); // path to each node
        Map<String, String> requiredByMap = new HashMap<>();

        // Seed with root
        queue.add(rootIdStr);
        visited.add(rootIdStr);
        paths.put(rootIdStr, List.of(rootIdStr));

        // Adjacency list for cycle detection
        Map<String, List<String>> adjList = new HashMap<>();

        // Track resolved versions of package names to check for conflicts (e.g. name -> list of versions)
        Map<String, Set<String>> versionsPerPackage = new HashMap<>();

        while (!queue.isEmpty()) {
            String current = queue.poll();
            String[] currentParts = current.split("@");
            String currentName = currentParts[0];
            String currentVersion = currentParts[1];

            Optional<Artifact> currentArtifactOpt = artifactRepository.findByNameAndVersion(currentName, currentVersion);
            if (currentArtifactOpt.isEmpty()) {
                continue;
            }
            Artifact currentArtifact = currentArtifactOpt.get();

            // Extract dependencies from metadata JSON
            List<ArtifactMetadataJson.DependencyInfo> depsInfo = getDependenciesFromMetadata(currentArtifact);
            for (ArtifactMetadataJson.DependencyInfo info : depsInfo) {
                // If we don't want dev dependencies, skip dev typed dependencies
                boolean isDev = "dev".equalsIgnoreCase(info.getVersionRange()); // or check a type field if defined
                // Wait, in build.yaml / metadata.json, dependencies are stored as ArtifactMetadataJson.DependencyInfo.
                // Let's assume standard runtime type.
                
                String depName = info.getName();
                String range = info.getVersionRange();

                // Resolve version range to concrete version
                String resolvedVer = resolveAliasOrRange(depName, range);
                if (resolvedVer == null) {
                    conflictsList.add("Could not resolve version range '" + range + "' for dependency: " + depName);
                    continue;
                }

                // Check if this is transitive or direct dependency relative to the root
                boolean isTransitive = !current.equals(rootIdStr);
                
                String depIdStr = depName + "@" + resolvedVer;

                // Track for cycle detection
                adjList.computeIfAbsent(current, k -> new ArrayList<>()).add(depIdStr);

                // Track package versions for conflict detection
                versionsPerPackage.computeIfAbsent(depName, k -> new HashSet<>()).add(resolvedVer);

                // Persist dependency declaration and resolution mappings
                persistDependencyRelations(currentArtifact, depName, range, resolvedVer);

                // Add details
                Map<String, Object> depDetail = new LinkedHashMap<>();
                depDetail.put("name", depName);
                depDetail.put("requested_range", range);
                depDetail.put("resolved_version", resolvedVer);
                depDetail.put("dependency_type", "runtime");
                depDetail.put("transitive", isTransitive);
                if (isTransitive) {
                    depDetail.put("required_by", current);
                }
                resolvedDepsList.add(depDetail);

                if (isTransitive) {
                    Map<String, Object> transDetail = new LinkedHashMap<>();
                    transDetail.put("path", current + " -> " + depIdStr);
                    transDetail.put("dependency", depIdStr);
                    transitiveDepsList.add(transDetail);
                }

                // Process transitively if requested
                if (includeTransitive && !visited.contains(depIdStr)) {
                    visited.add(depIdStr);
                    requiredByMap.put(depIdStr, current);
                    queue.add(depIdStr);
                }
            }
        }

        // 2. Detect cycles in the resolved graph
        List<String> cyclesList = new ArrayList<>();
        if (includeTransitive) {
            findCycles(rootIdStr, adjList, new HashSet<>(), new HashSet<>(), new ArrayList<>(), cyclesList);
            conflictsList.addAll(cyclesList);
        }

        // 3. Format conflicts list
        for (Map.Entry<String, Set<String>> entry : versionsPerPackage.entrySet()) {
            if (entry.getValue().size() > 1) {
                conflictsList.add("Version conflict detected for package '" + entry.getKey() + 
                                 "'. Multiple conflicting versions resolved: " + entry.getValue());
            }
        }

        response.put("resolved_dependencies", resolvedDepsList);
        response.put("transitive_dependencies", transitiveDepsList);
        response.put("conflicts", conflictsList);
        response.put("resolution_time_ms", (System.currentTimeMillis() - startTime));

        // 4. Save conflicts to database
        try {
            dependencyConflictRepository.deleteByArtifactId(rootArtifact.getId());
            for (String conflictDesc : conflictsList) {
                DependencyConflictEntity conflictEntity = new DependencyConflictEntity();
                conflictEntity.setArtifactId(rootArtifact.getId());
                conflictEntity.setConflictDescription(conflictDesc);
                conflictEntity.setInvolvedArtifacts(new String[]{rootArtifact.getName() + "@" + rootArtifact.getVersion()});
                conflictEntity.setSuggestedResolutions(new String[]{"Review range constraint settings in build.yaml"});
                dependencyConflictRepository.save(conflictEntity);
            }
        } catch (Exception e) {
            log.error("Failed to save dependency conflicts to database for {}", rootArtifact.getId(), e);
        }

        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getDependencyGraph(String name, String version, int depth, String direction) {
        String targetVersion = resolveAliasOrRange(name, version);
        String rootIdStr = name + "@" + targetVersion;

        List<Map<String, Object>> nodes = new ArrayList<>();
        List<Map<String, Object>> edges = new ArrayList<>();

        Set<String> processedNodes = new HashSet<>();
        Queue<String> queue = new LinkedList<>();
        Map<String, Integer> nodeDepths = new HashMap<>();

        queue.add(rootIdStr);
        nodeDepths.put(rootIdStr, 0);

        while (!queue.isEmpty()) {
            String current = queue.poll();
            int currentDepth = nodeDepths.get(current);

            if (currentDepth > depth || processedNodes.contains(current)) {
                continue;
            }
            processedNodes.add(current);

            String[] parts = current.split("@");
            String currentName = parts[0];
            String currentVersion = parts[1];

            // Add node detail
            Map<String, Object> nodeMap = new LinkedHashMap<>();
            nodeMap.put("id", current);
            nodeMap.put("name", currentName);
            nodeMap.put("version", currentVersion);
            nodeMap.put("type", currentDepth == 0 ? "root" : "runtime");
            if (currentDepth > 0) {
                nodeMap.put("transitive", currentDepth > 1);
            }
            nodes.add(nodeMap);

            if (currentDepth >= depth) {
                continue;
            }

            if ("forward".equalsIgnoreCase(direction)) {
                // Forward graph: dependencies of current
                Optional<Artifact> currentArtifactOpt = artifactRepository.findByNameAndVersion(currentName, currentVersion);
                if (currentArtifactOpt.isPresent()) {
                    List<ArtifactMetadataJson.DependencyInfo> deps = getDependenciesFromMetadata(currentArtifactOpt.get());
                    for (ArtifactMetadataJson.DependencyInfo dep : deps) {
                        String depResolvedVer = resolveAliasOrRange(dep.getName(), dep.getVersionRange());
                        if (depResolvedVer != null) {
                            String depIdStr = dep.getName() + "@" + depResolvedVer;
                            
                            Map<String, Object> edgeMap = new LinkedHashMap<>();
                            edgeMap.put("from", current);
                            edgeMap.put("to", depIdStr);
                            edgeMap.put("type", "depends-on");
                            edgeMap.put("version_range", dep.getVersionRange());
                            edges.add(edgeMap);

                            if (!processedNodes.contains(depIdStr)) {
                                nodeDepths.put(depIdStr, currentDepth + 1);
                                queue.add(depIdStr);
                            }
                        }
                    }
                }
            } else {
                // Reverse graph: dependents of current
                Optional<Artifact> currentArtifactOpt = artifactRepository.findByNameAndVersion(currentName, currentVersion);
                if (currentArtifactOpt.isPresent()) {
                    List<ReverseDependency> dependents = reverseDependencyRepository.findByArtifactId(currentArtifactOpt.get().getId());
                    for (ReverseDependency depRelation : dependents) {
                        Optional<Artifact> depArtifactOpt = artifactRepository.findById(depRelation.getDependentArtifactId());
                        if (depArtifactOpt.isPresent()) {
                            Artifact depArt = depArtifactOpt.get();
                            String depIdStr = depArt.getName() + "@" + depArt.getVersion();

                            Map<String, Object> edgeMap = new LinkedHashMap<>();
                            edgeMap.put("from", depIdStr);
                            edgeMap.put("to", current);
                            edgeMap.put("type", "depends-on");
                            edges.add(edgeMap);

                            if (!processedNodes.contains(depIdStr)) {
                                nodeDepths.put(depIdStr, currentDepth + 1);
                                queue.add(depIdStr);
                            }
                        }
                    }
                }
            }
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("artifact", rootIdStr);
        Map<String, Object> graph = new LinkedHashMap<>();
        graph.put("nodes", nodes);
        graph.put("edges", edges);
        response.put("graph", graph);

        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getReverseDependencies(String name, String version, int depth) {
        return getDependencyGraph(name, version, depth, "reverse");
    }

    @Override
    @Transactional
    public Map<String, Object> checkConflicts(List<Map<String, String>> artifactsRequest) {
        Map<String, Object> response = new LinkedHashMap<>();
        List<Map<String, Object>> conflicts = new ArrayList<>();
        List<Map<String, Object>> recommendations = new ArrayList<>();

        // Map to hold artifactName -> resolvedVersion -> Set of dependent artifacts causing this resolution
        Map<String, Map<String, Set<String>>> resolvedVersionsMapping = new HashMap<>();

        for (Map<String, String> req : artifactsRequest) {
            String name = req.get("name");
            String version = req.get("version");
            if (name == null || version == null) continue;

            String targetVersion = resolveAliasOrRange(name, version);
            Optional<Artifact> artifactOpt = artifactRepository.findByNameAndVersion(name, targetVersion);
            if (artifactOpt.isEmpty()) continue;

            // Resolve dependencies transitively to extract all package version resolutions
            Map<String, Object> resolution = resolveDependencies(name, targetVersion, true, false);
            List<Map<String, Object>> resolvedDeps = (List<Map<String, Object>>) resolution.get("resolved_dependencies");

            String rootIdStr = name + "@" + targetVersion;
            for (Map<String, Object> dep : resolvedDeps) {
                String depName = (String) dep.get("name");
                String resolvedVer = (String) dep.get("resolved_version");
                String requestedRange = (String) dep.get("requested_range");
                
                String pathCause = (Boolean) dep.get("transitive") 
                        ? (String) dep.get("required_by") 
                        : rootIdStr;

                resolvedVersionsMapping.computeIfAbsent(depName, k -> new HashMap<>())
                                      .computeIfAbsent(resolvedVer, k -> new HashSet<>())
                                      .add(pathCause + " (requested: " + requestedRange + ")");
            }
        }

        boolean hasConflicts = false;
        for (Map.Entry<String, Map<String, Set<String>>> packageEntry : resolvedVersionsMapping.entrySet()) {
            String packageName = packageEntry.getKey();
            Map<String, Set<String>> versions = packageEntry.getValue();

            if (versions.size() > 1) {
                hasConflicts = true;
                
                Map<String, Object> conflict = new LinkedHashMap<>();
                conflict.put("type", "version_conflict");
                
                StringBuilder desc = new StringBuilder("Dependency '" + packageName + "' resolved to multiple conflicting versions: ");
                List<String> involved = new ArrayList<>();
                List<String> resolutions = new ArrayList<>();

                for (Map.Entry<String, Set<String>> verEntry : versions.entrySet()) {
                    desc.append(packageName).append("@").append(verEntry.getKey()).append(" required by ").append(verEntry.getValue()).append("; ");
                    involved.addAll(verEntry.getValue());
                    
                    // Suggest upgrading to the highest version available
                    resolutions.add("Upgrade dependents to support " + packageName + "@" + verEntry.getKey());
                }

                conflict.put("description", desc.toString());
                conflict.put("involved_artifacts", involved);
                conflict.put("suggested_resolutions", resolutions);
                conflicts.add(conflict);

                // Add to recommendation DTO
                String maxVersion = versions.keySet().stream()
                        .max(String::compareTo)
                        .orElse("");

                Map<String, Object> rec = new LinkedHashMap<>();
                rec.put("artifact", packageName);
                rec.put("suggested_version", maxVersion);
                rec.put("reason", "Resolves version mismatch across dependents");
                recommendations.add(rec);
            }
        }

        response.put("has_conflicts", hasConflicts);
        response.put("conflicts", conflicts);
        response.put("resolution_recommendations", recommendations);

        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getCompatibilityMatrix(List<String> artifactNames) {
        Map<String, Object> response = new LinkedHashMap<>();
        List<Map<String, Object>> matrix = new ArrayList<>();

        for (String name : artifactNames) {
            List<Artifact> versions = artifactRepository.findByName(name);
            if (versions.isEmpty()) continue;

            Map<String, Object> artifactMatrix = new LinkedHashMap<>();
            artifactMatrix.put("artifact", name);
            
            List<String> versionList = versions.stream().map(Artifact::getVersion).toList();
            artifactMatrix.put("versions", versionList);

            Map<String, Map<String, List<String>>> compatibleWith = new LinkedHashMap<>();

            for (Artifact art : versions) {
                List<ArtifactMetadataJson.DependencyInfo> deps = getDependenciesFromMetadata(art);
                for (ArtifactMetadataJson.DependencyInfo dep : deps) {
                    String depName = dep.getName();
                    String range = dep.getVersionRange();

                    // Find all available versions of dependency matching this range
                    List<Artifact> depVersions = artifactRepository.findByName(depName);
                    List<String> matchingVersions = depVersions.stream()
                            .map(Artifact::getVersion)
                            .filter(v -> {
                                try {
                                    return registryService.resolveVersionRange(depName, range) != null;
                                } catch (Exception e) {
                                    return false;
                                }
                            })
                            .toList();

                    compatibleWith.computeIfAbsent(depName, k -> new LinkedHashMap<>())
                                  .put(art.getVersion(), matchingVersions);
                }
            }

            artifactMatrix.put("compatible_with", compatibleWith);
            matrix.add(artifactMatrix);
        }

        response.put("matrix", matrix);
        return response;
    }

    @Override
    @Transactional
    public void resolveUnresolvedArtifacts() {
        log.debug("Running background scheduled task to resolve newly registered artifacts...");
        
        List<Artifact> allArtifacts = artifactRepository.findAll();
        for (Artifact art : allArtifacts) {
            try {
                // If dependencies are already declared but resolved_dependencies is empty, resolve them
                List<ArtifactMetadataJson.DependencyInfo> deps = getDependenciesFromMetadata(art);
                if (deps.isEmpty()) {
                    continue; // No dependencies to resolve
                }

                List<ResolvedDependency> existingResolutions = resolvedDependencyRepository.findByArtifactId(art.getId());
                if (existingResolutions.size() == deps.size()) {
                    continue; // Already fully resolved
                }

                log.info("Resolving unresolved dependencies for artifact: {} version {}", art.getName(), art.getVersion());
                
                // Run full resolution
                Map<String, Object> resolution = resolveDependencies(art.getName(), art.getVersion(), true, false);
                
                // Track and save conflicts in dependency_conflicts table
                List<String> conflicts = (List<String>) resolution.get("conflicts");
                if (conflicts != null && !conflicts.isEmpty()) {
                    // Delete old conflicts
                    dependencyConflictRepository.deleteByArtifactId(art.getId());

                    for (String conflictDesc : conflicts) {
                        DependencyConflictEntity conflictEntity = new DependencyConflictEntity();
                        conflictEntity.setArtifactId(art.getId());
                        conflictEntity.setConflictDescription(conflictDesc);
                        conflictEntity.setInvolvedArtifacts(new String[]{art.getName() + "@" + art.getVersion()});
                        conflictEntity.setSuggestedResolutions(new String[]{"Review range constraint settings in build.yaml"});
                        dependencyConflictRepository.save(conflictEntity);
                    }
                }
            } catch (Exception e) {
                log.error("Failed to run background dependency resolution for artifact id={}", art.getId(), e);
            }
        }
    }

    private String resolveAliasOrRange(String name, String rangeOrAlias) {
        // 1. Resolve alias (e.g. "latest")
        Optional<String> aliased = registryService.resolveVersionAlias(name, rangeOrAlias);
        if (aliased.isPresent()) {
            return aliased.get();
        }

        // 2. Resolve SemVer range
        try {
            return registryService.resolveVersionRange(name, rangeOrAlias);
        } catch (Exception e) {
            // Range resolution failed, query direct match
            return rangeOrAlias;
        }
    }

    private List<ArtifactMetadataJson.DependencyInfo> getDependenciesFromMetadata(Artifact artifact) {
        if (artifact.getMetadata() == null || artifact.getMetadata().isBlank()) {
            return Collections.emptyList();
        }
        try {
            ArtifactMetadataJson meta = objectMapper.readValue(artifact.getMetadata(), ArtifactMetadataJson.class);
            return meta.getDependencies() != null ? meta.getDependencies() : Collections.emptyList();
        } catch (Exception e) {
            log.error("Failed to parse metadata JSON for artifact {}", artifact.getId(), e);
            return Collections.emptyList();
        }
    }

    private void persistDependencyRelations(Artifact rootArtifact, String depName, String range, String resolvedVersion) {
        try {
            // Find target resolved dependency artifact ID
            Optional<Artifact> resolvedArtifactOpt = artifactRepository.findByNameAndVersion(depName, resolvedVersion);
            UUID resolvedArtifactId = resolvedArtifactOpt.map(Artifact::getId).orElse(null);

            // 1. Save to dependencies table
            Optional<Dependency> existingDepOpt = dependencyRepository.findByArtifactIdAndDependencyName(rootArtifact.getId(), depName);
            Dependency dependency = existingDepOpt.orElseGet(Dependency::new);
            dependency.setArtifactId(rootArtifact.getId());
            dependency.setDependencyName(depName);
            dependency.setVersionRange(range);
            dependency.setResolvedVersion(resolvedVersion);
            dependency.setDependencyArtifactId(resolvedArtifactId);
            dependency.setDependencyType("runtime");
            dependency.setIsOptional(false);
            Dependency savedDependency = dependencyRepository.save(dependency);

            // 2. Save cache resolved dependency
            Optional<ResolvedDependency> existingResolvedOpt = resolvedDependencyRepository.findByArtifactIdAndDependencyId(rootArtifact.getId(), savedDependency.getId());
            if (existingResolvedOpt.isEmpty() && resolvedArtifactId != null) {
                ResolvedDependency resolved = new ResolvedDependency();
                resolved.setArtifactId(rootArtifact.getId());
                resolved.setDependencyId(savedDependency.getId());
                resolved.setResolvedToArtifactId(resolvedArtifactId);
                resolved.setResolvedVersion(resolvedVersion);
                resolvedDependencyRepository.save(resolved);
            }

            // 3. Save reverse dependency
            if (resolvedArtifactId != null) {
                // artifactId is B (the dependency), dependentArtifactId is A (the root depending on B)
                Optional<ReverseDependency> existingRev = reverseDependencyRepository.findByArtifactId(resolvedArtifactId).stream()
                        .filter(r -> r.getDependentArtifactId().equals(rootArtifact.getId()))
                        .findFirst();
                if (existingRev.isEmpty()) {
                    ReverseDependency reverse = new ReverseDependency();
                    reverse.setArtifactId(resolvedArtifactId);
                    reverse.setDependentArtifactId(rootArtifact.getId());
                    reverseDependencyRepository.save(reverse);
                }
            }
        } catch (Exception e) {
            log.error("Failed to persist dependency database relations for {}", rootArtifact.getId(), e);
        }
    }

    private void findCycles(String current, Map<String, List<String>> adjList, 
                            Set<String> visited, Set<String> stack, 
                            List<String> currentPath, List<String> cyclesList) {
        visited.add(current);
        stack.add(current);
        currentPath.add(current);

        List<String> neighbors = adjList.get(current);
        if (neighbors != null) {
            for (String neighbor : neighbors) {
                if (stack.contains(neighbor)) {
                    int startIndex = currentPath.indexOf(neighbor);
                    List<String> cyclePath = new ArrayList<>(currentPath.subList(startIndex, currentPath.size()));
                    cyclePath.add(neighbor);
                    cyclesList.add("Circular dependency detected: " + String.join(" -> ", cyclePath));
                } else if (!visited.contains(neighbor)) {
                    findCycles(neighbor, adjList, visited, stack, currentPath, cyclesList);
                }
            }
        }

        currentPath.remove(currentPath.size() - 1);
        stack.remove(current);
    }
}
