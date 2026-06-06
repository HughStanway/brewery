package com.homelab.brewery.buildengine.model;

import lombok.Data;
import java.util.List;

@Data
public class BuildYamlConfig {
    private Metadata metadata;
    private Build build;
    private Steps steps;
    private List<ArtifactConfig> artifacts;
    private List<DependencyConfig> dependencies;

    @Data
    public static class Metadata {
        private String name;
        private String versionScheme;
    }

    @Data
    public static class Build {
        private String image;
        private Integer timeoutSeconds;
        private String memory;
        private Integer cpus;
    }

    @Data
    public static class Steps {
        private String setup;
        private String build;
        private String test;
    }

    @Data
    public static class ArtifactConfig {
        private String name;
        private String pattern;
        private String type;
    }

    @Data
    public static class DependencyConfig {
        private String name;
        private String versionRange;
        private String version_range;
        private String type;
        private Boolean optional;

        public String getResolvedVersionRange() {
            return versionRange != null ? versionRange : version_range;
        }
    }
}
