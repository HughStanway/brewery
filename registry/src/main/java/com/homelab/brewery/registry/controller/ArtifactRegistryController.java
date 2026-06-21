package com.homelab.brewery.registry.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.homelab.brewery.common.entity.Artifact;
import com.homelab.brewery.registry.ArtifactRegistryService;
import com.homelab.brewery.registry.ArtifactStorageManager;
import com.homelab.brewery.registry.model.ArtifactMetadataJson;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/registry")
@RequiredArgsConstructor
@Slf4j
public class ArtifactRegistryController {

    private final ArtifactRegistryService registryService;
    private final ArtifactStorageManager storageManager;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostMapping(value = "/artifacts", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadArtifact(
            @RequestParam("file") MultipartFile file,
            @RequestParam("name") String name,
            @RequestParam("version") String version,
            @RequestParam("artifact_type") String artifactType,
            @RequestParam(value = "build_id", required = false) String buildId,
            @RequestParam(value = "repository", required = false) String repository,
            @RequestParam(value = "branch", required = false) String branch,
            @RequestParam(value = "commit", required = false) String commit,
            @RequestParam(value = "dependencies", required = false) String dependenciesJson,
            @RequestParam(value = "tags", required = false) List<String> tags) {


        log.info("Received artifact upload request: {} version {}", name, version);

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("Uploaded file is empty");
        }

        try {
            List<ArtifactMetadataJson.DependencyInfo> dependencies = new ArrayList<>();
            if (dependenciesJson != null && !dependenciesJson.isBlank()) {
                dependencies = objectMapper.readValue(dependenciesJson, new TypeReference<>() {});
            }

            try (InputStream is = file.getInputStream()) {
                Artifact artifact = registryService.registerArtifact(
                        name,
                        version,
                        artifactType,
                        buildId,
                        repository,
                        branch,
                        commit,
                        file.getOriginalFilename(),
                        is,
                        dependencies,
                        tags != null ? tags : Collections.emptyList(),
                        file.getOriginalFilename()
                );

                Map<String, Object> response = new HashMap<>();
                response.put("id", artifact.getId());
                response.put("name", artifact.getName());
                response.put("version", artifact.getVersion());
                response.put("artifact_url", "/registry/" + name + "/" + version + "/" + file.getOriginalFilename());
                response.put("download_url", "/api/registry/artifacts/" + name + "/" + version + "/download");
                response.put("checksum", artifact.getChecksum());

                return ResponseEntity.status(HttpStatus.CREATED).body(response);
            }
        } catch (Exception e) {
            log.error("Artifact upload failed: {}", name, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Upload failed: " + e.getMessage());
        }
    }

    @GetMapping("/artifacts")
    public ResponseEntity<?> listAllArtifacts() {
        try {
            List<Artifact> results = registryService.search(null, null, null);
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            log.error("Failed to list all artifacts", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to retrieve artifacts: " + e.getMessage());
        }
    }

    @GetMapping("/artifacts/{name}")
    public ResponseEntity<?> listVersions(@PathVariable("name") String name) {
        List<Artifact> versions = registryService.listVersions(name);
        if (versions.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        List<Map<String, Object>> versionDetails = new ArrayList<>();
        String latest = null;

        for (Artifact art : versions) {
            Map<String, Object> detail = new HashMap<>();
            detail.put("version", art.getVersion());
            detail.put("artifact_type", art.getArtifactType());
            detail.put("created_at", art.getCreatedAt());
            detail.put("file_size_bytes", art.getFileSizeBytes());
            detail.put("tags", art.getTags());
            detail.put("is_latest", art.getIsLatest());
            detail.put("deprecated_at", art.getDeprecatedAt() != null ? art.getDeprecatedAt().toString() : null);
            detail.put("build_id", art.getBuildId() != null ? art.getBuildId().toString() : null);
            detail.put("buildId", art.getBuildId() != null ? art.getBuildId().toString() : null);
            detail.put("download_url", "/api/registry/artifacts/" + name + "/" + art.getVersion() + "/download");
            versionDetails.add(detail);

            if (Boolean.TRUE.equals(art.getIsLatest())) {
                latest = art.getVersion();
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("name", name);
        response.put("versions", versionDetails);
        response.put("latest", latest);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/artifacts/{name}/{version}")
    public ResponseEntity<?> getArtifactMetadata(
            @PathVariable("name") String name,
            @PathVariable("version") String version) {

        // Resolve version range or alias
        String targetVersion = resolveAliasOrRange(name, version);
        
        Optional<Artifact> artifactOpt = registryService.findArtifact(name, targetVersion);
        if (artifactOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Artifact art = artifactOpt.get();
        try {
            ArtifactMetadataJson meta = objectMapper.readValue(art.getMetadata(), ArtifactMetadataJson.class);
            return ResponseEntity.ok(meta);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to parse artifact metadata: " + e.getMessage());
        }
    }

    @GetMapping("/artifacts/{name}/{version}/download")
    public ResponseEntity<?> downloadArtifact(
            @PathVariable("name") String name,
            @PathVariable("version") String version,
            HttpServletRequest request) {

        String targetVersion = resolveAliasOrRange(name, version);

        Optional<Artifact> artifactOpt = registryService.findArtifact(name, targetVersion);
        if (artifactOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Artifact art = artifactOpt.get();
        Path path = Paths.get(art.getStoragePath());
        String filename = path.getFileName().toString();

        try {
            InputStream is = storageManager.getArtifact(name, targetVersion, filename);
            
            // Record download count
            registryService.recordDownload(name, targetVersion, request.getHeader("User-Agent"));

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .contentLength(art.getFileSizeBytes())
                    .body(new InputStreamResource(is));
        } catch (Exception e) {
            log.error("Failed to download artifact {} version {}", name, version, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Download failed: " + e.getMessage());
        }
    }

    @GetMapping("/search")
    public ResponseEntity<?> search(
            @RequestParam(value = "q", required = false) String query,
            @RequestParam(value = "type", required = false) String type,
            @RequestParam(value = "tag", required = false) String tag) {

        List<Artifact> results = registryService.search(query, type, tag);

        List<Map<String, Object>> responseResults = new ArrayList<>();
        for (Artifact art : results) {
            Map<String, Object> details = new HashMap<>();
            details.put("name", art.getName());
            details.put("version", art.getVersion());
            details.put("artifact_type", art.getArtifactType());
            details.put("tags", art.getTags());
            details.put("last_updated", art.getCreatedAt());
            
            try {
                ArtifactMetadataJson meta = objectMapper.readValue(art.getMetadata(), ArtifactMetadataJson.class);
                details.put("repository", meta.getRepository());
            } catch (Exception e) {
                // ignore
            }
            responseResults.add(details);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("total", responseResults.size());
        response.put("results", responseResults);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/artifacts/{name}/{version}/tags")
    public ResponseEntity<?> addTags(
            @PathVariable("name") String name,
            @PathVariable("version") String version,
            @RequestBody Map<String, List<String>> requestBody) {

        List<String> tags = requestBody.get("tags");
        if (tags != null) {
            for (String tag : tags) {
                registryService.tagArtifact(name, version, tag);
            }
        }

        Optional<Artifact> artifactOpt = registryService.findArtifact(name, version);
        if (artifactOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Artifact art = artifactOpt.get();
        Map<String, Object> response = new HashMap<>();
        response.put("name", art.getName());
        response.put("version", art.getVersion());
        response.put("tags", art.getTags());

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/artifacts/{name}/{version}/tags/{tag}")
    public ResponseEntity<?> removeTag(
            @PathVariable("name") String name,
            @PathVariable("version") String version,
            @PathVariable("tag") String tag) {

        try {
            registryService.removeTag(name, version, tag);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/artifacts/{name}/{version}")
    public ResponseEntity<?> deleteArtifact(
            @PathVariable("name") String name,
            @PathVariable("version") String version) {
        log.info("Received request to delete artifact: {} version {}", name, version);
        try {
            registryService.deleteArtifact(name, version);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            log.warn("Artifact not found for deletion: {} version {}", name, version);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Failed to delete artifact: {} version {}", name, version, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to delete artifact: " + e.getMessage());
        }
    }

    @PostMapping("/aliases")
    public ResponseEntity<?> createAlias(@RequestBody Map<String, String> requestBody) {
        String name = requestBody.get("name");
        String alias = requestBody.get("alias");
        String targetVersion = requestBody.get("target_version");

        if (name == null || alias == null || targetVersion == null) {
            return ResponseEntity.badRequest().body("Missing required parameters: name, alias, target_version");
        }

        registryService.createVersionAlias(name, alias, targetVersion);

        Map<String, Object> response = new HashMap<>();
        response.put("name", name);
        response.put("alias", alias);
        response.put("target_version", targetVersion);
        response.put("actual_version", targetVersion);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/aliases/{name}/{alias}")
    public ResponseEntity<?> getAlias(
            @PathVariable("name") String name,
            @PathVariable("alias") String alias) {

        Optional<String> targetVersion = registryService.resolveVersionAlias(name, alias);
        if (targetVersion.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Map<String, Object> response = new HashMap<>();
        response.put("name", name);
        response.put("alias", alias);
        response.put("target_version", targetVersion.get());

        return ResponseEntity.ok(response);
    }

    private String resolveAliasOrRange(String name, String version) {
        // 1. Resolve alias (e.g. "latest")
        Optional<String> aliased = registryService.resolveVersionAlias(name, version);
        if (aliased.isPresent()) {
            return aliased.get();
        }
        
        // 2. Resolve range (e.g. "^1.2.0")
        if (version.startsWith("^") || version.startsWith("~") || version.equals("*") || version.startsWith(">") || version.startsWith("<")) {
            return registryService.resolveVersionRange(name, version);
        }
        
        return version;
    }
}
