package com.homelab.brewery.cascaderebuild.service;

import java.util.Map;
import java.util.UUID;

/**
 * Service for triggering and managing cascade rebuilds when an artifact version is updated.
 */
public interface CascadeRebuildService {

    /**
     * Triggers a cascade rebuild starting from the given artifact name/version.
     * Finds all dependents and creates CascadeTask records for each that should be rebuilt.
     *
     * @param name     artifact name that was updated
     * @param version  new version of the artifact
     * @param reason   human-readable reason (e.g. "new version published")
     * @param maxDepth maximum transitive depth to cascade
     * @return summary map including chain_id, tasks_created, affected_artifacts
     */
    Map<String, Object> triggerCascade(String name, String version, String reason, int maxDepth);

    /**
     * Returns the status of a rebuild chain including all its tasks.
     *
     * @param chainId the chain UUID
     * @return summary map with chain details and task statistics
     */
    Map<String, Object> getChainStatus(UUID chainId);

    /**
     * Dry-run analysis: returns the set of artifacts that would be affected by updating
     * the given artifact without actually triggering any builds.
     *
     * @param name    artifact name
     * @param version artifact version
     * @return map with affected artifact list
     */
    Map<String, Object> getCascadeImpact(String name, String version);

    /**
     * Cancels a running rebuild chain, setting its status to 'cancelled' and
     * all pending tasks to 'skipped'.
     *
     * @param chainId the chain UUID to cancel
     */
    void cancelChain(UUID chainId);

    /**
     * Called by the scheduler. Finds cascade tasks with status='pending' and
     * enqueues builds for them.
     */
    void processPendingTasks();
}
