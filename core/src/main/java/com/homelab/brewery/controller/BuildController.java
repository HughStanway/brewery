package com.homelab.brewery.controller;

import com.homelab.brewery.buildengine.BuildQueueManager;
import com.homelab.brewery.common.entity.Build;
import com.homelab.brewery.common.repository.BuildRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/builds")
@RequiredArgsConstructor
@Slf4j
public class BuildController {

    private final BuildRepository buildRepository;
    private final BuildQueueManager buildQueueManager;

    @GetMapping
    public ResponseEntity<List<Build>> getAllBuilds() {
        try {
            List<Build> builds = buildRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
            return ResponseEntity.ok(builds);
        } catch (Exception e) {
            log.error("Failed to retrieve all builds", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Build> getBuildById(@PathVariable("id") UUID id) {
        return buildRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/retry")
    public ResponseEntity<?> retryBuild(@PathVariable("id") UUID id) {
        log.info("Request received to retry build. id={}", id);
        return buildRepository.findById(id)
                .map(build -> {
                    try {
                        build.setStatus("pending");
                        build.setStartedAt(null);
                        build.setCompletedAt(null);
                        build.setDurationSeconds(null);
                        build.setLogs(null);
                        build.setErrorMessage(null);
                        Build savedBuild = buildRepository.save(build);
                        
                        buildQueueManager.enqueue(savedBuild);
                        log.info("Successfully enqueued build retry. id={}", id);
                        return ResponseEntity.ok(savedBuild);
                    } catch (Exception e) {
                        log.error("Failed to retry build. id={}", id, e);
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .body("Failed to retry build: " + e.getMessage());
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancelBuild(@PathVariable("id") UUID id) {
        log.info("Request received to cancel build. id={}", id);
        return buildRepository.findById(id)
                .map(build -> {
                    try {
                        if ("pending".equals(build.getStatus()) || "building".equals(build.getStatus())) {
                            build.setStatus("cancelled");
                            Build savedBuild = buildRepository.save(build);
                            log.info("Successfully cancelled build. id={}", id);
                            return ResponseEntity.ok(savedBuild);
                        } else {
                            return ResponseEntity.badRequest().body("Build cannot be cancelled in status: " + build.getStatus());
                        }
                    } catch (Exception e) {
                        log.error("Failed to cancel build. id={}", id, e);
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .body("Failed to cancel build: " + e.getMessage());
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
