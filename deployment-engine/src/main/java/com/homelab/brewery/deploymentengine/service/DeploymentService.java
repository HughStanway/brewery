package com.homelab.brewery.deploymentengine.service;

import com.homelab.brewery.common.entity.Deployment;
import com.homelab.brewery.common.entity.DeploymentEvent;
import com.homelab.brewery.common.entity.DeploymentVersion;
import com.homelab.brewery.common.entity.ServiceHealthCheck;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface DeploymentService {
    Deployment createOrUpdateDeployment(String name, String specYaml, String username);
    Map<String, Object> planDeployment(String specYaml);
    Deployment deploy(UUID deploymentId);
    void rollback(UUID deploymentId, Integer targetVersion);
    List<Deployment> getAllDeployments();
    Deployment getDeployment(UUID id);
    List<DeploymentVersion> getDeploymentVersions(UUID deploymentId);
    List<DeploymentEvent> getDeploymentEvents(UUID deploymentId);
    List<ServiceHealthCheck> getServiceHealthChecks(UUID deploymentId);
    void checkAndRemediateHealth(UUID deploymentId);
    String getContainerLogs(UUID id, String serviceName);
    Map<String, Object> getContainerStats(UUID id, String serviceName);
}
