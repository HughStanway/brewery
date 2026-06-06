package com.homelab.brewery.registry.model;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class ArtifactMetadataJson {
    private String name;
    private String version;
    private String artifactType;
    private String artifactId;
    private String buildId;
    private String repository;
    private String branch;
    private String commit;
    private String builtAt;
    private Long fileSizeBytes;
    private Map<String, String> checksums;
    private String artifactUrl;
    private String downloadUrl;
    private List<DependencyInfo> dependencies;
    private List<String> tags;

    @Data
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public static class DependencyInfo {
        private String name;
        private String versionRange;
        private String resolvedVersion;
    }
}
