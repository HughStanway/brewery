package com.homelab.brewery.deploymentengine.service;

import com.homelab.brewery.common.entity.Deployment;
import com.homelab.brewery.deploymentengine.model.DeploymentStatusDto;

import java.util.List;
import java.util.UUID;

public interface DeploymentService {
    Deployment registerOrUpdateDeployment(
            String name,
            String namespace,
            String k8sDeploymentName,
            String containerName,
            String artifactName,
            String description,
            String publicDomain,
            String username
    );

    Deployment deploy(UUID deploymentId);
    Deployment restartDeployment(UUID deploymentId);
    Deployment scaleDeployment(UUID deploymentId, int replicas);
    void deleteDeployment(UUID deploymentId, boolean deleteK8sResources);
    DeploymentStatusDto getDeploymentStatus(UUID deploymentId);
    String getDeploymentLogs(UUID deploymentId, int tailLines);
    List<Deployment> getAllDeployments();
    Deployment getDeployment(UUID id);
    void triggerDeploymentsForArtifact(String artifactName, String version);
}
