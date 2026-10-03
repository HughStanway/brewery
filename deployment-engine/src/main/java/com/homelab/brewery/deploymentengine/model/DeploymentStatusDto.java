package com.homelab.brewery.deploymentengine.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeploymentStatusDto {
    private String namespace;
    private String deploymentName;
    private String containerName;
    private boolean exists;
    private String status; // RUNNING, DEGRADED, STOPPED, NOT_FOUND, ERROR
    private Integer desiredReplicas;
    private Integer readyReplicas;
    private Integer updatedReplicas;
    private String currentImage;
    private String headlampUrl;
    private List<PodInfo> pods;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PodInfo {
        private String name;
        private String phase;
        private boolean ready;
        private int restartCount;
    }
}
