package com.homelab.brewery.deploymentengine.impl;

import com.homelab.brewery.common.entity.Artifact;
import com.homelab.brewery.common.entity.Deployment;
import com.homelab.brewery.common.repository.ArtifactRepository;
import com.homelab.brewery.common.repository.DeploymentRepository;
import com.homelab.brewery.deploymentengine.client.KomodoApiClient;
import com.homelab.brewery.deploymentengine.model.DeploymentStatusDto;
import com.homelab.brewery.deploymentengine.provider.K8sDeploymentProvider;
import com.homelab.brewery.deploymentengine.service.DeploymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeploymentServiceImpl implements DeploymentService {

    private final DeploymentRepository deploymentRepository;
    private final ArtifactRepository artifactRepository;
    private final KomodoApiClient komodoApiClient;
    private final K8sDeploymentProvider k8sDeploymentProvider;

    @Override
    @Transactional
    public Deployment registerOrUpdateDeployment(
            String name,
            String namespace,
            String k8sDeploymentName,
            String containerName,
            String artifactName,
            String description,
            String publicDomain,
            String username) {

        String targetNs = (namespace != null && !namespace.isBlank()) ? namespace : "default";
        String targetK8sName = (k8sDeploymentName != null && !k8sDeploymentName.isBlank()) ? k8sDeploymentName : name;
        String targetContainer = (containerName != null && !containerName.isBlank()) ? containerName : "app";

        log.info("Registering/updating K3s deployment mapping: name={}, ns={}, k8sName={}, container={}, artifact={}, publicDomain={}",
                name, targetNs, targetK8sName, targetContainer, artifactName, publicDomain);

        Optional<Deployment> existingOpt = deploymentRepository.findByName(name);
        Deployment deployment = existingOpt.orElseGet(() -> {
            Deployment d = new Deployment();
            d.setName(name);
            return d;
        });

        deployment.setNamespace(targetNs);
        deployment.setK8sDeploymentName(targetK8sName);
        deployment.setK8sContainerName(targetContainer);
        deployment.setKomodoStackName(targetK8sName);
        deployment.setArtifactName(artifactName);
        deployment.setDescription(description);
        deployment.setPublicDomain(publicDomain);
        deployment.setDeployedBy(username != null ? username : "system");
        deployment.setHeadlampUrl("https://deployments.bigiron.dev/c/main/deployments/" + targetNs + "/" + targetK8sName);
        deployment.setKomodoUrl(komodoApiClient.buildKomodoStackUiUrl(targetK8sName));
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

        String ns = deployment.getNamespace();
        String k8sName = deployment.getK8sDeploymentName();
        String container = deployment.getK8sContainerName();

        log.info("Triggering K3s rollout for deployment: {}, k8s: {}/{}", deployment.getName(), ns, k8sName);
        deployment.setStatus("DEPLOYING");
        deployment.setDeployedAt(Instant.now());
        deploymentRepository.save(deployment);

        if (deployment.getDeployedVersion() == null || deployment.getDeployedVersion().isBlank()) {
            if (deployment.getArtifactName() != null) {
                Optional<Artifact> latest = artifactRepository.findByNameAndIsLatestTrue(deployment.getArtifactName());
                if (latest.isPresent()) {
                    deployment.setDeployedVersion(latest.get().getVersion());
                } else {
                    List<Artifact> versions = artifactRepository.findByNameOrderByCreatedAtDesc(deployment.getArtifactName());
                    if (!versions.isEmpty()) {
                        deployment.setDeployedVersion(versions.get(0).getVersion());
                    }
                }
            }
        }

        String registryPrefix = "registry:5000/";
        String imageTag = null;
        if (deployment.getArtifactName() != null && deployment.getDeployedVersion() != null) {
            String art = deployment.getArtifactName();
            imageTag = art.contains("/") ? art + ":" + deployment.getDeployedVersion() : registryPrefix + art + ":" + deployment.getDeployedVersion();
        }

        boolean success = false;
        if (imageTag != null && k8sName != null) {
            String domainHost = (deployment.getPublicDomain() != null && !deployment.getPublicDomain().isBlank()) 
                    ? deployment.getPublicDomain() 
                    : (("pubfinder-ui".equalsIgnoreCase(k8sName) || "beerdar".equalsIgnoreCase(k8sName)) ? "beerdar.bigiron.dev" : null);
            success = k8sDeploymentProvider.deployOrPatchImage(ns, k8sName, container, imageTag, domainHost);
        }

        // Fallback to Komodo API if K3s deployment not matched
        if (!success && k8sName != null) {
            komodoApiClient.provisionStack(k8sName, deployment.getArtifactName(), deployment.getDeployedVersion());
            success = komodoApiClient.triggerStackDeployment(k8sName, imageTag);
        }

        if (success) {
            deployment.setStatus("SUCCESS");
            deployment.setCompletedAt(Instant.now());
            log.info("Successfully triggered deployment for {}/{}", ns, k8sName);
        } else {
            deployment.setStatus("FAILED");
            deployment.setCompletedAt(Instant.now());
            log.error("Failed triggering deployment for {}/{}", ns, k8sName);
        }

        return deploymentRepository.save(deployment);
    }

    @Override
    @Transactional
    public Deployment restartDeployment(UUID deploymentId) {
        Deployment deployment = deploymentRepository.findById(deploymentId)
                .orElseThrow(() -> new IllegalArgumentException("Deployment not found: " + deploymentId));

        String ns = deployment.getNamespace();
        String k8sName = deployment.getK8sDeploymentName();

        log.info("Triggering restart for deployment {}/{}", ns, k8sName);
        boolean success = k8sDeploymentProvider.restartDeployment(ns, k8sName);
        if (success) {
            deployment.setStatus("SUCCESS");
            deployment.setUpdatedAt(Instant.now());
        } else {
            deployment.setStatus("FAILED");
        }
        return deploymentRepository.save(deployment);
    }

    @Override
    @Transactional
    public Deployment scaleDeployment(UUID deploymentId, int replicas) {
        Deployment deployment = deploymentRepository.findById(deploymentId)
                .orElseThrow(() -> new IllegalArgumentException("Deployment not found: " + deploymentId));

        String ns = deployment.getNamespace();
        String k8sName = deployment.getK8sDeploymentName();

        log.info("Scaling deployment {}/{} to replicas={}", ns, k8sName, replicas);
        boolean success = k8sDeploymentProvider.scaleDeployment(ns, k8sName, replicas);
        if (success) {
            deployment.setStatus(replicas == 0 ? "STOPPED" : "SUCCESS");
            deployment.setUpdatedAt(Instant.now());
        } else {
            deployment.setStatus("FAILED");
        }
        return deploymentRepository.save(deployment);
    }

    @Override
    @Transactional
    public void deleteDeployment(UUID id, boolean deleteK8sResources) {
        Deployment d = deploymentRepository.findById(id).orElse(null);
        if (d != null) {
            if (deleteK8sResources) {
                log.info("Deleting underlying K3s resources for {}/{}", d.getNamespace(), d.getK8sDeploymentName());
                k8sDeploymentProvider.deleteDeploymentResources(d.getNamespace(), d.getK8sDeploymentName());
            }
            log.info("Deleting deployment record: {}", id);
            deploymentRepository.deleteById(id);
        }
    }

    @Override
    public DeploymentStatusDto getDeploymentStatus(UUID id) {
        Deployment d = deploymentRepository.findById(id).orElse(null);
        if (d == null) {
            return DeploymentStatusDto.builder()
                    .status("NOT_FOUND")
                    .exists(false)
                    .build();
        }

        DeploymentStatusDto liveStatus = k8sDeploymentProvider.getDeploymentStatusDetails(
                d.getNamespace(),
                d.getK8sDeploymentName(),
                d.getK8sContainerName()
        );

        // Synchronize live K3s liveness status back to DB if appropriate
        if ("STOPPED".equals(liveStatus.getStatus()) && !"STOPPED".equals(d.getStatus())) {
            d.setStatus("STOPPED");
            deploymentRepository.save(d);
        } else if ("RUNNING".equals(liveStatus.getStatus()) && !"SUCCESS".equals(d.getStatus()) && !"DEPLOYING".equals(d.getStatus())) {
            d.setStatus("SUCCESS");
            deploymentRepository.save(d);
        }

        return liveStatus;
    }

    @Override
    public String getDeploymentLogs(UUID id, int tailLines) {
        Deployment d = deploymentRepository.findById(id).orElse(null);
        if (d == null) return "Deployment mapping not found.";
        return k8sDeploymentProvider.getPodLogs(d.getNamespace(), d.getK8sDeploymentName(), tailLines);
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
            String ns = deployment.getNamespace();
            String k8sName = deployment.getK8sDeploymentName();
            String container = deployment.getK8sContainerName();

            log.info("Triggering deployment for target: {}/{} with artifact {}@{}",
                    ns, k8sName, artifactName, version);

            deployment.setDeployedVersion(version);
            deployment.setStatus("DEPLOYING");
            deployment.setDeployedAt(Instant.now());
            deploymentRepository.save(deployment);

            String registryPrefix = "registry:5000/";
            String imageTag = artifactName.contains("/") ? artifactName + ":" + version : registryPrefix + artifactName + ":" + version;

            String domainHost = (deployment.getPublicDomain() != null && !deployment.getPublicDomain().isBlank()) 
                    ? deployment.getPublicDomain() 
                    : (("pubfinder-ui".equalsIgnoreCase(k8sName) || "beerdar".equalsIgnoreCase(k8sName)) ? "beerdar.bigiron.dev" : null);
            boolean success = k8sDeploymentProvider.deployOrPatchImage(ns, k8sName, container, imageTag, domainHost);

            if (!success) {
                komodoApiClient.provisionStack(k8sName, artifactName, version);
                success = komodoApiClient.triggerStackDeployment(k8sName, imageTag);
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
}
