package com.homelab.brewery.registry;

import com.homelab.brewery.common.entity.Artifact;
import com.homelab.brewery.common.entity.ArtifactMetadata;
import com.homelab.brewery.registry.model.ArtifactMetadataJson;

import java.io.InputStream;
import java.util.List;
import java.util.Optional;

public interface ArtifactRegistryService {

    /**
     * Registers and stores a built artifact file along with its metadata.
     */
    Artifact registerArtifact(
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
            List<String> tags,
            String primaryEntrypoint
    );

    Optional<Artifact> findArtifact(String name, String version);

    List<Artifact> listVersions(String name);

    List<Artifact> search(String query, String type, String tag);

    void tagArtifact(String name, String version, String tag);

    void removeTag(String name, String version, String tag);

    void createVersionAlias(String name, String alias, String targetVersion);

    Optional<String> resolveVersionAlias(String name, String alias);

    String resolveVersionRange(String name, String versionRange);

    Optional<ArtifactMetadata> getExtendedMetadata(String name, String version);

    void saveExtendedMetadata(String name, String version, ArtifactMetadata metadata);

    void recordDownload(String name, String version, String userAgent);

    void deleteArtifact(String name, String version);
}
