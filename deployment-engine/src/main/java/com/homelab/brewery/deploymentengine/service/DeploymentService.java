package com.homelab.brewery.deploymentengine.service;

import com.homelab.brewery.common.entity.Deployment;

import java.util.List;
import java.util.UUID;

public interface DeploymentService {
    Deployment registerOrUpdateDeployment(String name, String komodoStackName, String artifactName, String description, String username);
    Deployment deploy(UUID deploymentId);
    void triggerDeploymentsForArtifact(String artifactName, String version);
    List<Deployment> getAllDeployments();
    Deployment getDeployment(UUID id);
    void deleteDeployment(UUID id);
}
