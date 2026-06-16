package com.homelab.brewery.deploymentengine.scheduler;

import com.homelab.brewery.common.entity.Deployment;
import com.homelab.brewery.deploymentengine.service.DeploymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Slf4j
@RequiredArgsConstructor
public class DeploymentHealthScheduler {

    private final DeploymentService deploymentService;

    @Scheduled(fixedDelayString = "${brewery.deployment.health.interval-ms:30000}", initialDelay = 15000)
    public void runHealthChecks() {
        log.debug("Starting scheduled deployment health checks run");
        try {
            List<Deployment> deployments = deploymentService.getAllDeployments();
            for (Deployment d : deployments) {
                if ("healthy".equalsIgnoreCase(d.getStatus()) || 
                    "unhealthy".equalsIgnoreCase(d.getStatus()) || 
                    "rolled_back".equalsIgnoreCase(d.getStatus())) {
                    
                    deploymentService.checkAndRemediateHealth(d.getId());
                }
            }
        } catch (Exception e) {
            log.error("Error running scheduled deployment health checks", e);
        }
    }
}
