package com.homelab.brewery.registry.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.homelab.brewery.common.entity.Artifact;
import com.homelab.brewery.common.entity.ArtifactMetadata;
import com.homelab.brewery.common.entity.ArtifactTag;
import com.homelab.brewery.common.entity.Build;
import com.homelab.brewery.common.entity.VersionAlias;
import com.homelab.brewery.common.event.ArtifactRegisteredEvent;
import com.homelab.brewery.common.repository.BuildRepository;
import com.homelab.brewery.common.repository.ArtifactMetadataRepository;
import com.homelab.brewery.common.repository.ArtifactRepository;
import com.homelab.brewery.common.repository.ArtifactTagRepository;
import com.homelab.brewery.common.repository.VersionAliasRepository;
import com.homelab.brewery.common.repository.DependencyRepository;
import com.homelab.brewery.common.repository.ResolvedDependencyRepository;
import com.homelab.brewery.common.repository.CascadeTaskRepository;
import com.homelab.brewery.common.repository.RebuildChainRepository;
import com.homelab.brewery.registry.ArtifactRegistryService;
import com.homelab.brewery.registry.ArtifactStorageManager;
import com.homelab.brewery.registry.SemanticVersionResolver;
import com.homelab.brewery.registry.model.ArtifactMetadataJson;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ArtifactRegistryServiceImpl implements ArtifactRegistryService {

    private final ArtifactRepository artifactRepository;
    private final ArtifactMetadataRepository metadataRepository;
    private final ArtifactTagRepository tagRepository;
    private final VersionAliasRepository aliasRepository;
    private final DependencyRepository dependencyRepository;
    private final ResolvedDependencyRepository resolvedDependencyRepository;
    private final CascadeTaskRepository cascadeTaskRepository;
    private final RebuildChainRepository rebuildChainRepository;
    private final ArtifactStorageManager storageManager;
    private final SemanticVersionResolver versionResolver;
    private final ApplicationEventPublisher eventPublisher;
    private final BuildRepository buildRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    @Transactional
    public Artifact registerArtifact(
            String name,
            String version,
            String artifactType,
            String buildId,
            String repository,
            String branch,
            String commit,
            String filename,
            InputStream artifactStream,
            List<ArtifactMetadataJson.DependencyInfo> dependencies,
            List<String> tags) {

        log.info("Registering new artifact: {} version {}", name, version);

        // 1. Prepare JSON metadata structure
        ArtifactMetadataJson jsonMetadata = new ArtifactMetadataJson();
        jsonMetadata.setName(name);
        jsonMetadata.setVersion(version);
        jsonMetadata.setArtifactType(artifactType);
        jsonMetadata.setBuildId(buildId);
        jsonMetadata.setRepository(repository);
        jsonMetadata.setBranch(branch);
        jsonMetadata.setCommit(commit);
        jsonMetadata.setBuiltAt(Instant.now().toString());
        jsonMetadata.setDependencies(dependencies);
        jsonMetadata.setTags(tags);

        // Set URLs
        String downloadUrl = "/api/registry/artifacts/" + name + "/" + version + "/download";
        String artifactUrl = "/registry/" + name + "/" + version + "/" + filename;
        jsonMetadata.setDownloadUrl(downloadUrl);
        jsonMetadata.setArtifactUrl(artifactUrl);

        try {
            // 2. Write file to filesystem storage via storage manager
            storageManager.storeArtifact(name, version, filename, artifactStream, jsonMetadata);

            // 3. Retrieve computed file details
            Path dir = storageManager.getArtifactDirectoryPath(name, version);
            Path artifactFile = dir.resolve(filename);
            try {
                artifactFile.toFile().setExecutable(true, false);
            } catch (Exception e) {
                log.warn("Failed to set executable permission on file: {}", artifactFile, e);
            }
            long fileSizeBytes = Files.size(artifactFile);

            Path shaFile = dir.resolve(filename + ".sha256");
            String checksum = Files.readString(shaFile, StandardCharsets.UTF_8).trim();

            // 4. Mark all previous versions of this artifact as not latest and deprecated
            List<Artifact> existingVersions = artifactRepository.findByName(name);
            for (Artifact ext : existingVersions) {
                if (ext.getVersion().equals(version)) {
                    continue; // Skip the version currently being registered/overwritten
                }
                if (Boolean.TRUE.equals(ext.getIsLatest())) {
                    ext.setIsLatest(false);
                }
                if (ext.getDeprecatedAt() == null) {
                    ext.setDeprecatedAt(Instant.now());
                }
                artifactRepository.save(ext);
            }

            // 5. Create and save new Artifact database entity or update existing one to prevent duplicates
            Optional<Artifact> existingOpt = artifactRepository.findByNameAndVersion(name, version);
            Artifact artifact = existingOpt.orElseGet(Artifact::new);
            if (artifact.getId() == null) {
                artifact.setId(UUID.randomUUID());
            }
            artifact.setName(name);
            artifact.setVersion(version);
            artifact.setArtifactType(artifactType);
            if (buildId == null || buildId.isBlank() || "null".equalsIgnoreCase(buildId)) {
                artifact.setBuildId(null);
            } else {
                try {
                    UUID bId = UUID.fromString(buildId);
                    if (buildRepository.existsById(bId)) {
                        artifact.setBuildId(bId);
                    } else {
                        log.info("Build {} not found in database. Setting build_id to null for direct API upload.", buildId);
                        artifact.setBuildId(null);
                    }
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid UUID format for build_id '{}'. Setting to null.", buildId);
                    artifact.setBuildId(null);
                }
            }

            artifact.setStoragePath(artifactFile.toAbsolutePath().toString());
            artifact.setFileSizeBytes(fileSizeBytes);
            artifact.setChecksum(checksum);
            artifact.setIsLatest(true);
            artifact.setDeprecatedAt(null);
            if (artifact.getDownloadCount() == null) {
                artifact.setDownloadCount(0);
            }
            
            // Map tags list to array representation
            if (tags != null && !tags.isEmpty()) {
                artifact.setTags(tags.toArray(new String[0]));
            } else {
                artifact.setTags(new String[0]);
            }

            // Serialize full metadata json schema
            artifact.setMetadata(objectMapper.writeValueAsString(jsonMetadata));
            
            Artifact savedArtifact = artifactRepository.save(artifact);

            // 6. Save relational tags to artifact_tags table (clean existing first if overwriting)
            if (existingOpt.isPresent()) {
                tagRepository.deleteByArtifactId(artifact.getId());
            }
            if (tags != null) {
                for (String t : tags) {
                    ArtifactTag tagEntity = new ArtifactTag();
                    tagEntity.setArtifactId(savedArtifact.getId());
                    tagEntity.setTag(t);
                    tagRepository.save(tagEntity);
                }
            }

            log.info("Successfully registered artifact in database. id={}", savedArtifact.getId());

            // 7. Publish ArtifactRegisteredEvent to trigger cascade rebuilds
            eventPublisher.publishEvent(
                    new ArtifactRegisteredEvent(this, savedArtifact.getName(), savedArtifact.getVersion(), savedArtifact.getId()));

            return savedArtifact;

        } catch (Exception e) {
            log.error("Failed to register artifact: {}", name, e);
            throw new RuntimeException("Artifact registration failed", e);
        }
    }

    @Override
    public Optional<Artifact> findArtifact(String name, String version) {
        return artifactRepository.findByNameAndVersion(name, version);
    }

    @Override
    public List<Artifact> listVersions(String name) {
        return artifactRepository.findByName(name);
    }

    @Override
    public List<Artifact> search(String query, String type, String tag) {
        List<Artifact> all = artifactRepository.findAll();
        return all.stream()
                .filter(a -> query == null || query.isBlank() || a.getName().toLowerCase().contains(query.toLowerCase()))
                .filter(a -> type == null || type.isBlank() || a.getArtifactType().equalsIgnoreCase(type))
                .filter(a -> tag == null || tag.isBlank() || (a.getTags() != null && Arrays.asList(a.getTags()).contains(tag)))
                .collect(Collectors.toList());
    }

    private void updateMetadataJsonTags(Artifact artifact, List<String> newTags) {
        try {
            ArtifactMetadataJson metaJson;
            if (artifact.getMetadata() != null && !artifact.getMetadata().isBlank()) {
                metaJson = objectMapper.readValue(artifact.getMetadata(), ArtifactMetadataJson.class);
            } else {
                metaJson = new ArtifactMetadataJson();
            }

            metaJson.setTags(newTags);

            String updatedJsonStr = objectMapper.writeValueAsString(metaJson);
            artifact.setMetadata(updatedJsonStr);

            Path dir = storageManager.getArtifactDirectoryPath(artifact.getName(), artifact.getVersion());
            if (Files.exists(dir)) {
                Path metadataFile = dir.resolve("metadata.json");
                objectMapper.writerWithDefaultPrettyPrinter().writeValue(metadataFile.toFile(), metaJson);
                log.info("Successfully updated metadata.json file on disk with tags: {}", newTags);
            }
        } catch (Exception e) {
            log.error("Failed to update metadata JSON and file for {} version {}", 
                    artifact.getName(), artifact.getVersion(), e);
        }
    }

    @Override
    @Transactional
    public void tagArtifact(String name, String version, String tag) {
        Optional<Artifact> artifactOpt = findArtifact(name, version);
        if (artifactOpt.isEmpty()) {
            throw new IllegalArgumentException("Artifact not found: " + name + " version " + version);
        }
        Artifact artifact = artifactOpt.get();

        // 1. Check if tag already exists in relational DB table
        Optional<ArtifactTag> existingTag = tagRepository.findByArtifactIdAndTag(artifact.getId(), tag);
        if (existingTag.isEmpty()) {
            ArtifactTag tagEntity = new ArtifactTag();
            tagEntity.setArtifactId(artifact.getId());
            tagEntity.setTag(tag);
            tagRepository.save(tagEntity);
        }

        // 2. Append to tags array on main artifact table
        List<String> currentTags = artifact.getTags() != null ? new ArrayList<>(Arrays.asList(artifact.getTags())) : new ArrayList<>();
        if (!currentTags.contains(tag)) {
            currentTags.add(tag);
            artifact.setTags(currentTags.toArray(new String[0]));
            updateMetadataJsonTags(artifact, currentTags);
            artifactRepository.save(artifact);
        }
        log.info("Tagged artifact {} version {} with tag '{}'", name, version, tag);
    }

    @Override
    @Transactional
    public void removeTag(String name, String version, String tag) {
        Optional<Artifact> artifactOpt = findArtifact(name, version);
        if (artifactOpt.isEmpty()) {
            throw new IllegalArgumentException("Artifact not found: " + name + " version " + version);
        }
        Artifact artifact = artifactOpt.get();

        // 1. Delete from relation table
        tagRepository.deleteByArtifactIdAndTag(artifact.getId(), tag);

        // 2. Remove from tags array
        if (artifact.getTags() != null) {
            List<String> currentTags = new ArrayList<>(Arrays.asList(artifact.getTags()));
            if (currentTags.remove(tag)) {
                artifact.setTags(currentTags.toArray(new String[0]));
                updateMetadataJsonTags(artifact, currentTags);
                artifactRepository.save(artifact);
            }
        }
        log.info("Removed tag '{}' from artifact {} version {}", tag, name, version);
    }

    @Override
    @Transactional
    public void createVersionAlias(String name, String alias, String targetVersion) {
        Optional<VersionAlias> existing = aliasRepository.findByArtifactNameAndAlias(name, alias);
        VersionAlias aliasEntity = existing.orElseGet(VersionAlias::new);
        
        aliasEntity.setArtifactName(name);
        aliasEntity.setAlias(alias);
        aliasEntity.setActualVersion(targetVersion);
        aliasRepository.save(aliasEntity);
        log.info("Created alias '{}' matching version {} for artifact {}", alias, targetVersion, name);
    }

    @Override
    public Optional<String> resolveVersionAlias(String name, String alias) {
        return aliasRepository.findByArtifactNameAndAlias(name, alias)
                .map(VersionAlias::getActualVersion);
    }

    @Override
    public String resolveVersionRange(String name, String versionRange) {
        List<String> versions = listVersions(name).stream()
                .map(Artifact::getVersion)
                .collect(Collectors.toList());
        return versionResolver.resolveVersionRange(versionRange, versions);
    }

    @Override
    public Optional<ArtifactMetadata> getExtendedMetadata(String name, String version) {
        return findArtifact(name, version)
                .flatMap(art -> metadataRepository.findByArtifactId(art.getId()));
    }

    @Override
    @Transactional
    public void saveExtendedMetadata(String name, String version, ArtifactMetadata metadata) {
        Optional<Artifact> artifactOpt = findArtifact(name, version);
        if (artifactOpt.isEmpty()) {
            throw new IllegalArgumentException("Artifact not found: " + name + " version " + version);
        }
        Artifact artifact = artifactOpt.get();

        Optional<ArtifactMetadata> existing = metadataRepository.findByArtifactId(artifact.getId());
        ArtifactMetadata dbMetadata = existing.orElseGet(ArtifactMetadata::new);

        dbMetadata.setArtifactId(artifact.getId());
        dbMetadata.setDescription(metadata.getDescription());
        dbMetadata.setKeywords(metadata.getKeywords());
        dbMetadata.setLicense(metadata.getLicense());
        dbMetadata.setHomepageUrl(metadata.getHomepageUrl());
        dbMetadata.setRepositoryUrl(metadata.getRepositoryUrl());
        dbMetadata.setMaintainers(metadata.getMaintainers());

        metadataRepository.save(dbMetadata);
        log.info("Saved extended metadata for {} version {}", name, version);
    }

    @Override
    @Transactional
    public void recordDownload(String name, String version, String userAgent) {
        Optional<Artifact> artifactOpt = findArtifact(name, version);
        if (artifactOpt.isPresent()) {
            Artifact artifact = artifactOpt.get();
            artifact.setDownloadCount(artifact.getDownloadCount() + 1);
            artifact.setLastAccessedAt(Instant.now());
            artifactRepository.save(artifact);
            log.info("Recorded download of {} version {}. Total={}, User-Agent={}", 
                    name, version, artifact.getDownloadCount(), userAgent);
        }
    }

    @Override
    @Transactional
    public void deleteArtifact(String name, String version) {
        log.info("Deleting artifact: {} version {}", name, version);
        Optional<Artifact> artifactOpt = findArtifact(name, version);
        if (artifactOpt.isEmpty()) {
            throw new IllegalArgumentException("Artifact not found: " + name + " version " + version);
        }
        Artifact artifact = artifactOpt.get();
        UUID artifactId = artifact.getId();

        // 1. Delete associated relational tag records
        tagRepository.deleteByArtifactId(artifactId);

        // 2. Delete associated metadata record
        metadataRepository.deleteByArtifactId(artifactId);

        // 3. Nullify dependency resolutions pointing to this artifact as a dependency
        dependencyRepository.nullifyDependencyResolutions(artifactId);

        // 4. Delete resolved dependencies pointing to this artifact as a resolved target
        resolvedDependencyRepository.deleteByResolvedToArtifactId(artifactId);

        // 5. Delete rebuild chains and cascade tasks referencing this artifact
        cascadeTaskRepository.deleteByArtifactId(artifactId);
        cascadeTaskRepository.deleteByDependencyArtifactId(artifactId);
        rebuildChainRepository.deleteByRootArtifactId(artifactId);

        // 6. Delete version aliases pointing to this actual version
        aliasRepository.deleteByArtifactNameAndActualVersion(name, version);

        // 7. Delete the artifact record itself
        artifactRepository.delete(artifact);

        // 8. Delete the artifact directory from disk storage
        try {
            storageManager.deleteArtifact(name, version);
            log.info("Successfully deleted artifact files from storage for: {} version {}", name, version);
        } catch (Exception e) {
            log.error("Failed to delete artifact files from storage for: {} version {}", name, version, e);
            throw new RuntimeException("Failed to delete artifact files from storage", e);
        }
        
        log.info("Successfully deleted artifact {} version {} from database and storage", name, version);
    }
}
