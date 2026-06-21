package com.homelab.brewery.deploymentengine.model;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class DeploymentSpec {
    private Integer version;
    private DeploymentConfig deployment;
    private Map<String, ServiceSpec> services;
    private Map<String, Object> volumes;
    private Map<String, Object> networks;
    private PoliciesConfig policies;
    private RollbackConfig rollback;

    @Data
    public static class DeploymentConfig {
        private String name;
        private String description;
    }

    @Data
    public static class ServiceSpec {
        private String artifact;
        private String type; // docker, jar, binary, python-app
        private Integer replicas;
        private Map<String, String> environment;
        private List<String> ports;
        private List<String> volumes;
        private HealthCheckConfig healthCheck;
        private ResourceConfig resources;
        private String runtimeImage;
        private List<String> init;
        private List<String> depends_on;
    }

    @Data
    public static class HealthCheckConfig {
        private String endpoint;
        private String command;
        private String interval;
        private String timeout;
        private Integer unhealthyThreshold;
        private Integer retries;
    }

    @Data
    public static class ResourceConfig {
        private String cpus;
        private String memory;
    }

    @Data
    public static class PoliciesConfig {
        private String strategy;
        private Boolean waitForHealthy;
        private String healthCheckTimeout;
    }

    @Data
    public static class RollbackConfig {
        private Boolean automatic;
        private Boolean onFailure;
        private Integer keepPreviousVersions;
    }
}
