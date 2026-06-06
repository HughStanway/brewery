package com.homelab.brewery.registry.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.homelab.brewery.registry.ArtifactStorageManager;
import com.homelab.brewery.registry.model.ArtifactMetadataJson;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class ArtifactStorageManagerImpl implements ArtifactStorageManager {

    private final String basePath;
    private final ObjectMapper objectMapper;

    public ArtifactStorageManagerImpl(
            @Value("${brewery.artifact-store.base-path:/mnt/artifact-store}") String basePath) {
        this.basePath = basePath;
        this.objectMapper = new ObjectMapper().enable(SerializationFeature.INDENT_OUTPUT);
    }

    @Override
    public void storeArtifact(
            String name,
            String version,
            String filename,
            InputStream artifactStream,
            ArtifactMetadataJson metadata) throws IOException {

        Path dir = getArtifactDirectoryPath(name, version);
        if (!Files.exists(dir)) {
            Files.createDirectories(dir);
        }

        Path artifactFile = dir.resolve(filename);
        log.info("Saving artifact to: {}", artifactFile.toAbsolutePath());

        // 1. Copy artifact stream to file
        try (OutputStream os = Files.newOutputStream(artifactFile)) {
            artifactStream.transferTo(os);
        }

        // 2. Calculate and write SHA-256 checksum file
        String sha256;
        try (InputStream is = Files.newInputStream(artifactFile)) {
            sha256 = calculateChecksum(is);
        }
        Path shaFile = dir.resolve(filename + ".sha256");
        Files.writeString(shaFile, sha256, StandardCharsets.UTF_8);

        // 3. Write metadata.json
        if (metadata.getChecksums() == null) {
            metadata.setChecksums(Map.of("sha256", sha256));
        }
        metadata.setFileSizeBytes(Files.size(artifactFile));
        
        Path metadataFile = dir.resolve("metadata.json");
        objectMapper.writeValue(metadataFile.toFile(), metadata);
        log.info("Artifact metadata saved successfully for {} version {}", name, version);
    }

    @Override
    public InputStream getArtifact(String name, String version, String filename) throws IOException {
        Path artifactFile = getArtifactDirectoryPath(name, version).resolve(filename);
        if (!Files.exists(artifactFile)) {
            throw new FileNotFoundException("Artifact file not found: " + artifactFile.toAbsolutePath());
        }
        return Files.newInputStream(artifactFile);
    }

    @Override
    public void deleteArtifact(String name, String version) throws IOException {
        Path dir = getArtifactDirectoryPath(name, version);
        if (Files.exists(dir)) {
            deleteDirectoryRecursively(dir.toFile());
            log.info("Deleted artifact directory: {}", dir.toAbsolutePath());
        }
    }

    @Override
    public String calculateChecksum(InputStream stream) throws IOException {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] buffer = new byte[8192];
            int read;
            while ((read = stream.read(buffer)) > 0) {
                digest.update(buffer, 0, read);
            }
            byte[] hash = digest.digest();
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IOException("SHA-256 algorithm not available", e);
        }
    }

    @Override
    public List<String> listVersions(String name) {
        List<String> versions = new ArrayList<>();
        Path artifactDir = Paths.get(basePath, name);
        if (Files.exists(artifactDir) && Files.isDirectory(artifactDir)) {
            File[] files = artifactDir.toFile().listFiles(File::isDirectory);
            if (files != null) {
                for (File file : files) {
                    versions.add(file.getName());
                }
            }
        }
        return versions;
    }

    @Override
    public Path getArtifactDirectoryPath(String name, String version) {
        return Paths.get(basePath, name, version);
    }

    private void deleteDirectoryRecursively(File file) throws IOException {
        File[] children = file.listFiles();
        if (children != null) {
            for (File child : children) {
                deleteDirectoryRecursively(child);
            }
        }
        if (!file.delete()) {
            throw new IOException("Failed to delete file or directory: " + file.getAbsolutePath());
        }
    }
}
