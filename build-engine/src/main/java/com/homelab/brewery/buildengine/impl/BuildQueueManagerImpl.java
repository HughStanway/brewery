package com.homelab.brewery.buildengine.impl;

import com.homelab.brewery.buildengine.BuildExecutor;
import com.homelab.brewery.buildengine.BuildQueueManager;
import com.homelab.brewery.common.entity.Build;
import com.homelab.brewery.common.repository.BuildRepository;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class BuildQueueManagerImpl implements BuildQueueManager {

    private final BuildExecutor buildExecutor;
    private final BuildRepository buildRepository;
    private final int maxConcurrentBuilds;
    private ExecutorService executorService;

    public BuildQueueManagerImpl(
            BuildExecutor buildExecutor,
            BuildRepository buildRepository,
            @Value("${brewery.build.max-concurrent-builds:2}") int maxConcurrentBuilds) {
        this.buildExecutor = buildExecutor;
        this.buildRepository = buildRepository;
        this.maxConcurrentBuilds = maxConcurrentBuilds;
    }

    @PostConstruct
    public void init() {
        log.info("Initializing BuildQueueManager with max-concurrent-builds={}", maxConcurrentBuilds);
        this.executorService = Executors.newFixedThreadPool(maxConcurrentBuilds);
        
        // Recover pending / building builds from database on startup
        resumePendingBuilds();
    }

    private void resumePendingBuilds() {
        try {
            log.info("Checking for pending or building runs to resume...");
            List<Build> pendingBuilds = buildRepository.findByStatusIn(List.of("pending", "building"));
            log.info("Found {} builds to resume", pendingBuilds.size());
            for (Build build : pendingBuilds) {
                log.info("Rescheduling build run: id={}, repo={}, commit={}", build.getId(), build.getRepository(), build.getCommit());
                // Mark back to pending so executor knows it's restarting
                build.setStatus("pending");
                buildRepository.save(build);
                enqueue(build);
            }
        } catch (Exception e) {
            log.error("Failed to resume pending builds", e);
        }
    }

    @Override
    public void enqueue(Build build) {
        log.info("Enqueuing build execution request. buildId={}", build.getId());
        executorService.submit(() -> {
            try {
                buildExecutor.executeBuild(build);
            } catch (Exception e) {
                log.error("Unexpected error during build execution for buildId={}", build.getId(), e);
            }
        });
    }

    @PreDestroy
    public void shutdown() {
        log.info("Shutting down BuildQueueManager executor service...");
        if (executorService != null) {
            executorService.shutdown();
            try {
                if (!executorService.awaitTermination(30, TimeUnit.SECONDS)) {
                    log.warn("Executor did not terminate in 30 seconds; forcing shutdown.");
                    executorService.shutdownNow();
                }
            } catch (InterruptedException e) {
                log.error("Shutdown interrupted", e);
                executorService.shutdownNow();
                Thread.currentThread().interrupt();
            }
        }
    }
}
