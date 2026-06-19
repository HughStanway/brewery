package com.homelab.brewery.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/system")
@RequiredArgsConstructor
public class SystemSettingsController {

    private final Environment environment;

    @Value("${brewery.build.timeout-seconds:1800}")
    private int buildTimeoutSeconds;

    @Value("${brewery.build.max-concurrent-builds:2}")
    private int maxConcurrentBuilds;

    @Value("${brewery.build.container-memory:4g}")
    private String containerMemory;

    @Value("${brewery.build.container-cpus:2}")
    private String containerCpus;

    @Value("${brewery.artifact-store.base-path:/mnt/artifact-store}")
    private String artifactStorePath;

    @Value("${brewery.artifact-store.retention-days:90}")
    private int artifactRetentionDays;

    @Value("${brewery.docker.host:unix:///var/run/docker.sock}")
    private String dockerHost;

    @Value("${brewery.docker.buildkit-enabled:true}")
    private boolean buildkitEnabled;

    @GetMapping("/config")
    public ResponseEntity<?> getSystemConfig() {
        Map<String, Object> config = new HashMap<>();
        config.put("activeProfiles", environment.getActiveProfiles());
        config.put("buildTimeoutSeconds", buildTimeoutSeconds);
        config.put("maxConcurrentBuilds", maxConcurrentBuilds);
        config.put("containerMemory", containerMemory);
        config.put("containerCpus", containerCpus);
        config.put("artifactStorePath", artifactStorePath);
        config.put("artifactRetentionDays", artifactRetentionDays);
        config.put("dockerHost", dockerHost);
        config.put("buildkitEnabled", buildkitEnabled);
        return ResponseEntity.ok(config);
    }
}
