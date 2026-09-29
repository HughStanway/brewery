package com.homelab.brewery.deploymentengine.impl;

import com.homelab.brewery.common.entity.Deployment;
import com.homelab.brewery.common.repository.DeploymentRepository;
import com.homelab.brewery.deploymentengine.client.KomodoApiClient;
import com.homelab.brewery.deploymentengine.service.DeploymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.homelab.brewery.deploymentengine.provider.K8sDeploymentProvider;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeploymentServiceImpl implements DeploymentService {

    private final DeploymentRepository deploymentRepository;
    private final KomodoApiClient komodoApiClient;
    private final K8sDeploymentProvider k8sDeploymentProvider;

    @Override
    @Transactional
    public Deployment registerOrUpdateDeployment(String name, String komodoStackName, String artifactName, String description, String username) {
        log.info("Registering or updating Komodo deployment mapping for name: {}, komodoStack: {}, artifactName: {}",
                name, komodoStackName, artifactName);

        Optional<Deployment> existingOpt = deploymentRepository.findByName(name);
        Deployment deployment = existingOpt.orElseGet(() -> {
            Deployment d = new Deployment();
            d.setName(name);
            return d;
        });

        deployment.setKomodoStackName(komodoStackName);
        deployment.setArtifactName(artifactName);
        deployment.setDescription(description);
        deployment.setDeployedBy(username != null ? username : "system");
        deployment.setKomodoUrl(komodoApiClient.buildKomodoStackUiUrl(komodoStackName));
        deployment.setUpdatedAt(Instant.now());

        if (deployment.getStatus() == null) {
            deployment.setStatus("PENDING");
        }

        return deploymentRepository.save(deployment);
    }

    @Override
    @Transactional
    public Deployment deploy(UUID deploymentId) {
        Deployment deployment = deploymentRepository.findById(deploymentId)
                .orElseThrow(() -> new IllegalArgumentException("Deployment not found: " + deploymentId));

        log.info("Triggering Komodo rollout for deployment: {}, stack: {}", deployment.getName(), deployment.getKomodoStackName());
        deployment.setStatus("DEPLOYING");
        deployment.setDeployedAt(Instant.now());
        deploymentRepository.save(deployment);

        String imageTag = deployment.getArtifactName() != null && deployment.getDeployedVersion() != null
                ? deployment.getArtifactName() + ":" + deployment.getDeployedVersion()
                : null;

        String stackOrDeployName = deployment.getKomodoStackName() != null ? deployment.getKomodoStackName() : deployment.getName();
        boolean success = false;

        // 1. Try K3s Deployment Handoff
        if (imageTag != null && stackOrDeployName != null) {
            success = k8sDeploymentProvider.deployOrPatchImage("default", stackOrDeployName, "app", imageTag);
        }

        // 2. Fallback to Komodo API if K3s deployment not matched
        if (!success && stackOrDeployName != null) {
            komodoApiClient.provisionStack(stackOrDeployName, deployment.getArtifactName(), deployment.getDeployedVersion());
            success = komodoApiClient.triggerStackDeployment(stackOrDeployName, imageTag);
        }

        if (success) {
            deployment.setStatus("SUCCESS");
            deployment.setCompletedAt(Instant.now());
            log.info("Successfully triggered deployment for {}", stackOrDeployName);
        } else {
            deployment.setStatus("FAILED");
            deployment.setCompletedAt(Instant.now());
            log.error("Failed triggering deployment for {}", stackOrDeployName);
        }

        return deploymentRepository.save(deployment);
    }

    @Override
    @Transactional
    public void triggerDeploymentsForArtifact(String artifactName, String version) {
        log.info("Triggering deployments for artifact: {} @ {}", artifactName, version);
        List<Deployment> deployments = deploymentRepository.findByArtifactName(artifactName);

        if (deployments.isEmpty()) {
            log.debug("No deployments registered for artifact: {}", artifactName);
            return;
        }

        for (Deployment deployment : deployments) {
            String stackOrDeployName = deployment.getKomodoStackName() != null ? deployment.getKomodoStackName() : deployment.getName();
            log.info("Triggering deployment for target: {} with artifact {}@{}",
                    stackOrDeployName, artifactName, version);

            deployment.setDeployedVersion(version);
            deployment.setStatus("DEPLOYING");
            deployment.setDeployedAt(Instant.now());
            deploymentRepository.save(deployment);

            String imageTag = artifactName + ":" + version;

            // 1. Try K3s Deployment Handoff
            boolean success = k8sDeploymentProvider.deployOrPatchImage("default", stackOrDeployName, "app", imageTag);

            // 2. Fallback to Komodo API if K3s deployment not matched
            if (!success) {
                komodoApiClient.provisionStack(stackOrDeployName, artifactName, version);
                success = komodoApiClient.triggerStackDeployment(stackOrDeployName, imageTag);
            }

            deployment.setStatus(success ? "SUCCESS" : "FAILED");
            deployment.setCompletedAt(Instant.now());
            deploymentRepository.save(deployment);
        }
    }

    @Override
    public List<Deployment> getAllDeployments() {
        return deploymentRepository.findAll();
    }

    @Override
    public Deployment getDeployment(UUID id) {
        return deploymentRepository.findById(id).orElse(null);
    }

    @Override
    @Transactional
    public void deleteDeployment(UUID id) {
        log.info("Deleting deployment mapping with id: {}", id);
        deploymentRepository.deleteById(id);
    }
}
