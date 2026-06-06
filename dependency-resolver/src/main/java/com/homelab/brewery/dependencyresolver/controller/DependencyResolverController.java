package com.homelab.brewery.dependencyresolver.controller;

import com.homelab.brewery.dependencyresolver.service.DependencyResolverService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dependencies")
@RequiredArgsConstructor
public class DependencyResolverController {

    private final DependencyResolverService dependencyResolverService;

    @PostMapping("/resolve/{name}/{version}")
    public ResponseEntity<?> resolveDependencies(
            @PathVariable("name") String name,
            @PathVariable("version") String version,
            @RequestBody(required = false) Map<String, Boolean> requestBody) {

        boolean includeTransitive = requestBody == null || requestBody.getOrDefault("include_transitive", true);
        boolean includeDev = requestBody != null && requestBody.getOrDefault("include_dev_dependencies", false);

        try {
            Map<String, Object> result = dependencyResolverService.resolveDependencies(name, version, includeTransitive, includeDev);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Failed to resolve dependencies: " + e.getMessage());
        }
    }

    @GetMapping("/graph/{name}/{version}")
    public ResponseEntity<?> getDependencyGraph(
            @PathVariable("name") String name,
            @PathVariable("version") String version,
            @RequestParam(value = "depth", defaultValue = "2") int depth,
            @RequestParam(value = "direction", defaultValue = "forward") String direction) {

        try {
            Map<String, Object> result = dependencyResolverService.getDependencyGraph(name, version, depth, direction);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Failed to generate dependency graph: " + e.getMessage());
        }
    }

    @GetMapping("/reverse/{name}/{version}")
    public ResponseEntity<?> getReverseDependencies(
            @PathVariable("name") String name,
            @PathVariable("version") String version,
            @RequestParam(value = "depth", defaultValue = "2") int depth) {

        try {
            Map<String, Object> result = dependencyResolverService.getReverseDependencies(name, version, depth);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Failed to retrieve reverse dependencies: " + e.getMessage());
        }
    }

    @PostMapping("/conflicts")
    public ResponseEntity<?> checkConflicts(@RequestBody Map<String, List<Map<String, String>>> requestBody) {
        List<Map<String, String>> artifacts = requestBody.get("artifacts");
        if (artifacts == null) {
            return ResponseEntity.badRequest().body("Missing required parameter: artifacts");
        }

        try {
            Map<String, Object> result = dependencyResolverService.checkConflicts(artifacts);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Failed to check conflicts: " + e.getMessage());
        }
    }

    @GetMapping("/compatibility-matrix")
    public ResponseEntity<?> getCompatibilityMatrix(@RequestParam("artifacts") String artifactsParam) {
        if (artifactsParam == null || artifactsParam.isBlank()) {
            return ResponseEntity.badRequest().body("Missing required parameter: artifacts");
        }

        List<String> artifactNames = Arrays.asList(artifactsParam.split(","));
        try {
            Map<String, Object> result = dependencyResolverService.getCompatibilityMatrix(artifactNames);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Failed to calculate compatibility matrix: " + e.getMessage());
        }
    }
}
