package com.homelab.brewery.buildengine.model;

import lombok.Data;
import java.util.List;

@Data
public class BuildYamlConfig {
    private Metadata metadata;
    private Build build;
    private Steps steps;
    private List<ArtifactConfig> artifacts;

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
}
