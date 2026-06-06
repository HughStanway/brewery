package com.homelab.brewery.cascaderebuild.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.homelab.brewery.buildengine.BuildQueueManager;
import com.homelab.brewery.cascaderebuild.service.CascadeRebuildService;
import com.homelab.brewery.common.entity.Artifact;
import com.homelab.brewery.common.entity.Build;
import com.homelab.brewery.common.entity.CascadeTask;
import com.homelab.brewery.common.entity.RebuildChain;
import com.homelab.brewery.common.entity.ReverseDependency;
import com.homelab.brewery.common.repository.ArtifactRepository;
import com.homelab.brewery.common.repository.BuildRepository;
import com.homelab.brewery.common.repository.CascadeTaskRepository;
import com.homelab.brewery.common.repository.DependencyRepository;
import com.homelab.brewery.common.repository.RebuildChainRepository;
import com.homelab.brewery.common.repository.ReverseDependencyRepository;
import com.homelab.brewery.registry.model.ArtifactMetadataJson;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
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
public class CascadeRebuildServiceImpl implements CascadeRebuildService {

    private final ArtifactRepository artifactRepository;
    private final ReverseDependencyRepository reverseDependencyRepository;
    private final RebuildChainRepository rebuildChainRepository;
    private final CascadeTaskRepository cascadeTaskRepository;
    private final DependencyRepository dependencyRepository;
    private final BuildQueueManager buildQueueManager;
    private final BuildRepository buildRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    @Transactional
    public Map<String, Object> triggerCascade(String name, String version, String reason, int maxDepth) {
        log.info("Triggering cascade rebuild for {}@{} reason='{}' maxDepth={}", name, version, reason, maxDepth);

        Optional<Artifact> triggerArtifactOpt = artifactRepository.findByNameAndVersion(name, version);
        if (triggerArtifactOpt.isEmpty()) {
            throw new IllegalArgumentException("Artifact not found: " + name + "@" + version);
        }
        Artifact triggerArtifact = triggerArtifactOpt.get();

        // Create the rebuild chain record
        RebuildChain chain = new RebuildChain();
        chain.setRootArtifactId(triggerArtifact.getId());
        chain.setRootCause(reason);
        chain.setStatus("running");
        chain.setDepth(0);
        RebuildChain savedChain = rebuildChainRepository.save(chain);

        // Find direct dependents using reverse_dependencies table
        List<Artifact> directDependents = findDirectDependents(triggerArtifact.getId());
        log.info("Found {} direct dependents of {}@{}", directDependents.size(), name, version);

        int tasksCreated = 0;
        List<String> affectedArtifacts = new ArrayList<>();

        for (Artifact dependent : directDependents) {
            // Check version range compatibility
            if (!isCompatibleWithNewVersion(dependent, name, version)) {
                log.debug("Skipping dependent {}@{} - version range not compatible with {}",
                        dependent.getName(), dependent.getVersion(), version);
                continue;
            }

            CascadeTask task = new CascadeTask();
            task.setChainId(savedChain.getId());
            task.setArtifactId(dependent.getId());
            task.setDependencyArtifactId(triggerArtifact.getId());
            task.setReason("Dependency " + name + " updated to version " + version + ": " + reason);
            task.setStatus("pending");
            task.setPriority(0);
            cascadeTaskRepository.save(task);
            tasksCreated++;
            affectedArtifacts.add(dependent.getName() + "@" + dependent.getVersion());
            log.info("Created cascade task for dependent {}@{}", dependent.getName(), dependent.getVersion());
        }

        // If no tasks created, mark chain as completed immediately
        if (tasksCreated == 0) {
            savedChain.setStatus("completed");
            savedChain.setCompletedAt(Instant.now());
            rebuildChainRepository.save(savedChain);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("chain_id", savedChain.getId().toString());
        result.put("trigger_artifact", name + "@" + version);
        result.put("tasks_created", tasksCreated);
        result.put("affected_artifacts", affectedArtifacts);
        result.put("status", savedChain.getStatus());
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getChainStatus(UUID chainId) {
        Optional<RebuildChain> chainOpt = rebuildChainRepository.findById(chainId);
        if (chainOpt.isEmpty()) {
            throw new IllegalArgumentException("Rebuild chain not found: " + chainId);
        }
        RebuildChain chain = chainOpt.get();
        List<CascadeTask> tasks = cascadeTaskRepository.findByChainId(chainId);

        // Gather task statistics
        Map<String, Long> statusCounts = tasks.stream()
                .collect(Collectors.groupingBy(CascadeTask::getStatus, Collectors.counting()));

        List<Map<String, Object>> taskDetails = new ArrayList<>();
        for (CascadeTask task : tasks) {
            Map<String, Object> taskMap = new LinkedHashMap<>();
            taskMap.put("task_id", task.getId().toString());
            taskMap.put("status", task.getStatus());
            taskMap.put("artifact_id", task.getArtifactId().toString());
            taskMap.put("reason", task.getReason());
            taskMap.put("priority", task.getPriority());
            if (task.getBuildId() != null) {
                taskMap.put("build_id", task.getBuildId().toString());
            }
            if (task.getAttemptedAt() != null) {
                taskMap.put("attempted_at", task.getAttemptedAt().toString());
            }
            if (task.getCompletedAt() != null) {
                taskMap.put("completed_at", task.getCompletedAt().toString());
            }
            if (task.getErrorMessage() != null) {
                taskMap.put("error_message", task.getErrorMessage());
            }
            // Enrich with artifact name/version
            artifactRepository.findById(task.getArtifactId()).ifPresent(art -> {
                taskMap.put("artifact_name", art.getName());
                taskMap.put("artifact_version", art.getVersion());
            });
            taskDetails.add(taskMap);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("chain_id", chain.getId().toString());
        result.put("root_artifact_id", chain.getRootArtifactId().toString());
        result.put("root_cause", chain.getRootCause());
        result.put("status", chain.getStatus());
        result.put("depth", chain.getDepth());
        result.put("started_at", chain.getStartedAt() != null ? chain.getStartedAt().toString() : null);
        result.put("completed_at", chain.getCompletedAt() != null ? chain.getCompletedAt().toString() : null);
        result.put("task_count", tasks.size());
        result.put("task_status_counts", statusCounts);
        result.put("tasks", taskDetails);
        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getCascadeImpact(String name, String version) {
        log.info("Computing cascade impact for {}@{}", name, version);

        Optional<Artifact> triggerOpt = artifactRepository.findByNameAndVersion(name, version);
        if (triggerOpt.isEmpty()) {
            throw new IllegalArgumentException("Artifact not found: " + name + "@" + version);
        }
        Artifact triggerArtifact = triggerOpt.get();

        // BFS up to maxDepth=5 over reverse_dependencies
        int maxDepth = 5;
        List<Map<String, Object>> affectedList = new ArrayList<>();
        Set<UUID> visited = new HashSet<>();
        Queue<UUID> queue = new LinkedList<>();
        Map<UUID, Integer> depthMap = new HashMap<>();

        visited.add(triggerArtifact.getId());
        queue.add(triggerArtifact.getId());
        depthMap.put(triggerArtifact.getId(), 0);

        while (!queue.isEmpty()) {
            UUID currentId = queue.poll();
            int currentDepth = depthMap.get(currentId);

            if (currentDepth >= maxDepth) {
                continue;
            }

            List<ReverseDependency> reverseDeps = reverseDependencyRepository.findByArtifactId(currentId);
            for (ReverseDependency rd : reverseDeps) {
                UUID dependentId = rd.getDependentArtifactId();
                if (!visited.contains(dependentId)) {
                    visited.add(dependentId);
                    queue.add(dependentId);
                    depthMap.put(dependentId, currentDepth + 1);

                    Optional<Artifact> depArtOpt = artifactRepository.findById(dependentId);
                    if (depArtOpt.isPresent()) {
                        Artifact depArt = depArtOpt.get();
                        Map<String, Object> entry = new LinkedHashMap<>();
                        entry.put("artifact_name", depArt.getName());
                        entry.put("artifact_version", depArt.getVersion());
                        entry.put("artifact_id", depArt.getId().toString());
                        entry.put("depth", currentDepth + 1);
                        entry.put("direct", currentDepth == 0);
                        affectedList.add(entry);
                    }
                }
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("trigger_artifact", name + "@" + version);
        result.put("total_affected", affectedList.size());
        result.put("max_depth_searched", maxDepth);
        result.put("affected_artifacts", affectedList);
        result.put("dry_run", true);
        return result;
    }

    @Override
    @Transactional
    public void cancelChain(UUID chainId) {
        log.info("Cancelling rebuild chain {}", chainId);
        Optional<RebuildChain> chainOpt = rebuildChainRepository.findById(chainId);
        if (chainOpt.isEmpty()) {
            throw new IllegalArgumentException("Rebuild chain not found: " + chainId);
        }
        RebuildChain chain = chainOpt.get();
        chain.setStatus("cancelled");
        chain.setCompletedAt(Instant.now());
        rebuildChainRepository.save(chain);

        // Mark all pending tasks as skipped
        List<CascadeTask> pendingTasks = cascadeTaskRepository.findByChainIdAndStatus(chainId, "pending");
        for (CascadeTask task : pendingTasks) {
            task.setStatus("skipped");
            task.setCompletedAt(Instant.now());
            cascadeTaskRepository.save(task);
        }
        log.info("Cancelled chain {} and skipped {} pending tasks", chainId, pendingTasks.size());
    }

    @Override
    @Transactional
    public void processPendingTasks() {
        log.debug("Processing pending cascade tasks...");
        List<CascadeTask> pendingTasks = cascadeTaskRepository.findByStatus("pending");
        if (pendingTasks.isEmpty()) {
            return;
        }
        log.info("Found {} pending cascade tasks to process", pendingTasks.size());

        for (CascadeTask task : pendingTasks) {
            try {
                Optional<Artifact> artifactOpt = artifactRepository.findById(task.getArtifactId());
                if (artifactOpt.isEmpty()) {
                    log.warn("Artifact not found for cascade task {}, marking as error", task.getId());
                    task.setStatus("error");
                    task.setErrorMessage("Artifact not found: " + task.getArtifactId());
                    task.setCompletedAt(Instant.now());
                    cascadeTaskRepository.save(task);
                    continue;
                }
                Artifact artifact = artifactOpt.get();

                // Extract repository and commit from artifact metadata JSON
                String repository = artifact.getName(); // fallback
                String commit = "HEAD";
                String branch = "main";

                if (artifact.getMetadata() != null && !artifact.getMetadata().isBlank()) {
                    try {
                        ArtifactMetadataJson meta = objectMapper.readValue(artifact.getMetadata(), ArtifactMetadataJson.class);
                        if (meta.getRepository() != null && !meta.getRepository().isBlank()) {
                            repository = meta.getRepository();
                        }
                        if (meta.getCommit() != null && !meta.getCommit().isBlank()) {
                            commit = meta.getCommit();
                        }
                        if (meta.getBranch() != null && !meta.getBranch().isBlank()) {
                            branch = meta.getBranch();
                        }
                    } catch (Exception e) {
                        log.warn("Could not parse metadata JSON for artifact {}, using defaults", artifact.getId(), e);
                    }
                }

                // Create a new Build entity for this cascade task
                Build build = new Build();
                build.setRepository(repository);
                build.setBranch(branch);
                build.setCommit(commit);
                build.setStatus("pending");
                Build savedBuild = buildRepository.save(build);

                // Enqueue the build
                buildQueueManager.enqueue(savedBuild);

                // Update the task to 'building'
                task.setBuildId(savedBuild.getId());
                task.setStatus("building");
                task.setAttemptedAt(Instant.now());
                cascadeTaskRepository.save(task);

                log.info("Enqueued build {} for cascade task {} (artifact {}@{})",
                        savedBuild.getId(), task.getId(), artifact.getName(), artifact.getVersion());

            } catch (Exception e) {
                log.error("Failed to process cascade task {}", task.getId(), e);
                task.setStatus("error");
                task.setErrorMessage(e.getMessage());
                task.setCompletedAt(Instant.now());
                cascadeTaskRepository.save(task);
            }
        }

        // Update chain statuses: check if all tasks in a chain are now terminal
        List<UUID> chainIds = pendingTasks.stream()
                .map(CascadeTask::getChainId)
                .distinct()
                .collect(Collectors.toList());

        for (UUID chainId : chainIds) {
            updateChainStatusIfComplete(chainId);
        }
    }

    // ─── private helpers ────────────────────────────────────────────────────────

    /**
     * Returns all artifacts that directly depend on the given artifact ID.
     */
    private List<Artifact> findDirectDependents(UUID artifactId) {
        List<ReverseDependency> reverseDeps = reverseDependencyRepository.findByArtifactId(artifactId);
        List<Artifact> dependents = new ArrayList<>();
        for (ReverseDependency rd : reverseDeps) {
            artifactRepository.findById(rd.getDependentArtifactId()).ifPresent(dependents::add);
        }
        return dependents;
    }

    /**
     * Checks whether the given dependent artifact's declared version range for the
     * trigger dependency name is satisfied by the new version.
     * Uses simple string parsing matching the logic in SemanticVersionResolver.
     */
    private boolean isCompatibleWithNewVersion(Artifact dependent, String depName, String newVersion) {
        if (dependent.getMetadata() == null || dependent.getMetadata().isBlank()) {
            // No metadata - assume compatible to be safe
            return true;
        }
        try {
            ArtifactMetadataJson meta = objectMapper.readValue(dependent.getMetadata(), ArtifactMetadataJson.class);
            if (meta.getDependencies() == null || meta.getDependencies().isEmpty()) {
                return true;
            }
            for (ArtifactMetadataJson.DependencyInfo dep : meta.getDependencies()) {
                if (depName.equalsIgnoreCase(dep.getName())) {
                    String range = dep.getVersionRange();
                    if (range == null || range.isBlank() || range.equals("*")) {
                        return true;
                    }
                    return versionSatisfiesRange(newVersion, range);
                }
            }
            // Dependency not declared in metadata - skip rebuild
            return false;
        } catch (Exception e) {
            log.warn("Failed to parse metadata for dependent artifact {}, assuming compatible", dependent.getId(), e);
            return true;
        }
    }

    /**
     * Simple version range check matching SemanticVersionResolver logic.
     */
    private boolean versionSatisfiesRange(String version, String range) {
        try {
            int[] ver = parseVersion(version);
            String clean = range.trim();
            if (clean.startsWith("^")) {
                int[] target = parseVersion(clean.substring(1));
                return ver[0] == target[0] && compareVersion(ver, target) >= 0;
            } else if (clean.startsWith("~")) {
                int[] target = parseVersion(clean.substring(1));
                return ver[0] == target[0] && ver[1] == target[1] && compareVersion(ver, target) >= 0;
            } else if (clean.startsWith(">=")) {
                int[] target = parseVersion(clean.substring(2));
                return compareVersion(ver, target) >= 0;
            } else if (clean.startsWith(">")) {
                int[] target = parseVersion(clean.substring(1));
                return compareVersion(ver, target) > 0;
            } else if (clean.startsWith("<=")) {
                int[] target = parseVersion(clean.substring(2));
                return compareVersion(ver, target) <= 0;
            } else if (clean.startsWith("<")) {
                int[] target = parseVersion(clean.substring(1));
                return compareVersion(ver, target) < 0;
            } else {
                // Exact match
                int[] target = parseVersion(clean);
                return compareVersion(ver, target) == 0;
            }
        } catch (Exception e) {
            log.warn("Could not parse version range '{}' for version '{}', defaulting to compatible", range, version);
            return true;
        }
    }

    private int[] parseVersion(String v) {
        String clean = v.trim().replaceAll("[^0-9.]", "");
        String[] parts = clean.split("\\.");
        int major = parts.length > 0 ? safeParse(parts[0]) : 0;
        int minor = parts.length > 1 ? safeParse(parts[1]) : 0;
        int patch = parts.length > 2 ? safeParse(parts[2]) : 0;
        return new int[]{major, minor, patch};
    }

    private int safeParse(String s) {
        try {
            return Integer.parseInt(s.replaceAll("[^0-9]", ""));
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private int compareVersion(int[] a, int[] b) {
        for (int i = 0; i < 3; i++) {
            if (a[i] != b[i]) return Integer.compare(a[i], b[i]);
        }
        return 0;
    }

    /**
     * Updates chain status to 'completed' if all tasks are in a terminal state.
     */
    private void updateChainStatusIfComplete(UUID chainId) {
        Optional<RebuildChain> chainOpt = rebuildChainRepository.findById(chainId);
        if (chainOpt.isEmpty()) return;
        RebuildChain chain = chainOpt.get();
        if ("cancelled".equals(chain.getStatus()) || "completed".equals(chain.getStatus())) {
            return;
        }
        List<CascadeTask> allTasks = cascadeTaskRepository.findByChainId(chainId);
        boolean allTerminal = allTasks.stream().allMatch(t ->
                "completed".equals(t.getStatus()) || "error".equals(t.getStatus())
                        || "skipped".equals(t.getStatus()) || "building".equals(t.getStatus()));
        if (allTerminal && !allTasks.isEmpty()) {
            // Mark chain completed once all tasks are at least enqueued/building
            boolean anyError = allTasks.stream().anyMatch(t -> "error".equals(t.getStatus()));
            chain.setStatus(anyError ? "completed_with_errors" : "running");
            rebuildChainRepository.save(chain);
        }
    }
}
