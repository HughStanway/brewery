package com.homelab.brewery.registry;

import com.homelab.brewery.registry.model.ArtifactMetadataJson;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;
import java.util.List;

public interface ArtifactStorageManager {
    
    /**
     * Store an artifact file and generate metadata.json
     */
    void storeArtifact(
        String name,
        String version,
        String filename,
        InputStream artifactStream,
        ArtifactMetadataJson metadata
    ) throws IOException;
    
    /**
     * Retrieve artifact file input stream
     */
    InputStream getArtifact(String name, String version, String filename) throws IOException;
    
    /**
     * Delete artifact folder from storage
     */
    void deleteArtifact(String name, String version) throws IOException;
    
    /**
     * Calculate SHA-256 checksum of a file
     */
    String calculateChecksum(InputStream stream) throws IOException;
    
    /**
     * List all versions of an artifact in storage
     */
    List<String> listVersions(String name);
    
    /**
     * Get storage path for the artifact version directory
     */
    Path getArtifactDirectoryPath(String name, String version);
}
