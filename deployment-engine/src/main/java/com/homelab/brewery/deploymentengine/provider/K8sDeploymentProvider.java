package com.homelab.brewery.deploymentengine.provider;

import com.homelab.brewery.deploymentengine.model.DeploymentStatusDto;
import io.fabric8.kubernetes.api.model.Container;
import io.fabric8.kubernetes.api.model.Pod;
import io.fabric8.kubernetes.api.model.PodList;

import io.fabric8.kubernetes.api.model.apps.Deployment;
import io.fabric8.kubernetes.api.model.apps.DeploymentBuilder;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.KubernetesClientBuilder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
public class K8sDeploymentProvider {

    private final KubernetesClient k8sClient;

    public K8sDeploymentProvider() {
        KubernetesClient client = null;
        try {
            client = new KubernetesClientBuilder().build();
            log.info("Successfully initialized Fabric8 KubernetesClient for K3s integration.");
        } catch (Exception e) {
            log.warn("Could not initialize Fabric8 KubernetesClient: {}. K8s operations will fallback gracefully.", e.getMessage());
        }
        this.k8sClient = client;
    }

    public boolean deployOrPatchImage(String namespace, String deploymentName, String containerName, String fullImageTag) {
        if (k8sClient == null) {
            log.warn("KubernetesClient is null. Skipping deployment for {}/{}.", namespace, deploymentName);
            return false;
        }

        String targetNs = (namespace != null && !namespace.isBlank()) ? namespace : "default";
        String targetContainer = (containerName != null && !containerName.isBlank()) ? containerName : "app";

        log.info("Patching K3s Deployment [{}/{}] -> container '{}' image: {}", targetNs, deploymentName, targetContainer, fullImageTag);
        try {
            Deployment existing = k8sClient.apps().deployments()
                    .inNamespace(targetNs)
                    .withName(deploymentName)
                    .get();

            if (existing == null) {
                log.warn("Deployment {}/{} does not exist in K3s cluster. Skipping patch.", targetNs, deploymentName);
                return false;
            }

            k8sClient.apps().deployments()
                    .inNamespace(targetNs)
                    .withName(deploymentName)
                    .edit(d -> new DeploymentBuilder(d)
                        .editSpec()
                          .editTemplate()
                            .editSpec()
                              .editMatchingContainer(c -> c.getName().equalsIgnoreCase(targetContainer) || c.getName().equalsIgnoreCase(deploymentName))
                                .withImage(fullImageTag)
                              .endContainer()
                            .endSpec()
                          .endTemplate()
                        .endSpec()
                        .build()
                    );

            log.info("Successfully patched K3s deployment {}/{} image to {}", targetNs, deploymentName, fullImageTag);
            return true;
        } catch (Exception e) {
            log.error("Failed patching K3s deployment {}/{}", targetNs, deploymentName, e);
            return false;
        }
    }

    public boolean restartDeployment(String namespace, String deploymentName) {
        if (k8sClient == null) return false;
        String targetNs = (namespace != null && !namespace.isBlank()) ? namespace : "default";
        log.info("Triggering rolling restart for K3s deployment {}/{}", targetNs, deploymentName);
        try {
            k8sClient.apps().deployments()
                    .inNamespace(targetNs)
                    .withName(deploymentName)
                    .edit(d -> new DeploymentBuilder(d)
                        .editSpec()
                          .editTemplate()
                            .editMetadata()
                              .addToAnnotations("kubectl.kubernetes.io/restartedAt", Instant.now().toString())
                            .endMetadata()
                          .endTemplate()
                        .endSpec()
                        .build()
                    );
            log.info("Successfully triggered rolling restart for {}/{}", targetNs, deploymentName);
            return true;
        } catch (Exception e) {
            log.error("Failed restarting K3s deployment {}/{}", targetNs, deploymentName, e);
            return false;
        }
    }

    public boolean scaleDeployment(String namespace, String deploymentName, int replicas) {
        if (k8sClient == null) return false;
        String targetNs = (namespace != null && !namespace.isBlank()) ? namespace : "default";
        log.info("Scaling K3s deployment {}/{} to replicas={}", targetNs, deploymentName, replicas);
        try {
            k8sClient.apps().deployments()
                    .inNamespace(targetNs)
                    .withName(deploymentName)
                    .scale(replicas);
            log.info("Successfully scaled {}/{} to {}", targetNs, deploymentName, replicas);
            return true;
        } catch (Exception e) {
            log.error("Failed scaling K3s deployment {}/{}", targetNs, deploymentName, e);
            return false;
        }
    }

    public boolean deleteDeploymentResources(String namespace, String deploymentName) {
        if (k8sClient == null) return false;
        String targetNs = (namespace != null && !namespace.isBlank()) ? namespace : "default";
        log.info("Deleting K3s deployment resources for {}/{}", targetNs, deploymentName);
        try {
            k8sClient.apps().deployments()
                    .inNamespace(targetNs)
                    .withName(deploymentName)
                    .delete();
            
            k8sClient.services()
                    .inNamespace(targetNs)
                    .withName(deploymentName)
                    .delete();

            log.info("Successfully deleted deployment and service for {}/{}", targetNs, deploymentName);
            return true;
        } catch (Exception e) {
            log.error("Failed deleting K3s deployment resources {}/{}", targetNs, deploymentName, e);
            return false;
        }
    }

    public DeploymentStatusDto getDeploymentStatusDetails(String namespace, String deploymentName, String containerName) {
        String targetNs = (namespace != null && !namespace.isBlank()) ? namespace : "default";
        String targetContainer = (containerName != null && !containerName.isBlank()) ? containerName : "app";
        String headlampUrl = "https://deployments.bigiron.dev/c/main/deployments/" + targetNs + "/" + deploymentName;

        if (k8sClient == null) {
            return DeploymentStatusDto.builder()
                    .namespace(targetNs)
                    .deploymentName(deploymentName)
                    .containerName(targetContainer)
                    .exists(false)
                    .status("ERROR")
                    .desiredReplicas(0)
                    .readyReplicas(0)
                    .headlampUrl(headlampUrl)
                    .pods(Collections.emptyList())
                    .build();
        }

        try {
            Deployment d = k8sClient.apps().deployments().inNamespace(targetNs).withName(deploymentName).get();
            if (d == null) {
                return DeploymentStatusDto.builder()
                        .namespace(targetNs)
                        .deploymentName(deploymentName)
                        .containerName(targetContainer)
                        .exists(false)
                        .status("NOT_FOUND")
                        .desiredReplicas(0)
                        .readyReplicas(0)
                        .headlampUrl(headlampUrl)
                        .pods(Collections.emptyList())
                        .build();
            }

            Integer desired = d.getSpec() != null && d.getSpec().getReplicas() != null ? d.getSpec().getReplicas() : 0;
            Integer ready = d.getStatus() != null && d.getStatus().getReadyReplicas() != null ? d.getStatus().getReadyReplicas() : 0;
            Integer updated = d.getStatus() != null && d.getStatus().getUpdatedReplicas() != null ? d.getStatus().getUpdatedReplicas() : 0;

            String currentImage = "unknown";
            if (d.getSpec() != null && d.getSpec().getTemplate() != null && d.getSpec().getTemplate().getSpec() != null) {
                List<Container> containers = d.getSpec().getTemplate().getSpec().getContainers();
                if (containers != null && !containers.isEmpty()) {
                    currentImage = containers.get(0).getImage();
                    for (Container c : containers) {
                        if (c.getName().equalsIgnoreCase(targetContainer)) {
                            currentImage = c.getImage();
                            break;
                        }
                    }
                }
            }

            String livenessStatus;
            if (desired == 0) {
                livenessStatus = "STOPPED";
            } else if (ready.equals(desired) && ready > 0) {
                livenessStatus = "RUNNING";
            } else if (ready > 0) {
                livenessStatus = "DEGRADED";
            } else {
                livenessStatus = "FAILED";
            }

            // Fetch pods for detailed liveness
            List<DeploymentStatusDto.PodInfo> podInfos = new ArrayList<>();
            try {
                Map<String, String> matchLabels = d.getSpec() != null && d.getSpec().getSelector() != null
                        ? d.getSpec().getSelector().getMatchLabels()
                        : Collections.emptyMap();

                PodList podList = k8sClient.pods().inNamespace(targetNs).withLabels(matchLabels).list();
                if (podList != null && podList.getItems() != null) {
                    for (Pod p : podList.getItems()) {
                        String podName = p.getMetadata().getName();
                        String phase = p.getStatus() != null ? p.getStatus().getPhase() : "Unknown";
                        boolean isPodReady = p.getStatus() != null && p.getStatus().getConditions() != null &&
                                p.getStatus().getConditions().stream().anyMatch(c -> "Ready".equals(c.getType()) && "True".equals(c.getStatus()));
                        int restarts = 0;
                        if (p.getStatus() != null && p.getStatus().getContainerStatuses() != null) {
                            restarts = p.getStatus().getContainerStatuses().stream()
                                    .mapToInt(cs -> cs.getRestartCount() != null ? cs.getRestartCount() : 0)
                                    .sum();
                        }
                        podInfos.add(DeploymentStatusDto.PodInfo.builder()
                                .name(podName)
                                .phase(phase)
                                .ready(isPodReady)
                                .restartCount(restarts)
                                .build());
                    }
                }
            } catch (Exception pe) {
                log.debug("Failed reading pods for {}/{}: {}", targetNs, deploymentName, pe.getMessage());
            }

            return DeploymentStatusDto.builder()
                    .namespace(targetNs)
                    .deploymentName(deploymentName)
                    .containerName(targetContainer)
                    .exists(true)
                    .status(livenessStatus)
                    .desiredReplicas(desired)
                    .readyReplicas(ready)
                    .updatedReplicas(updated)
                    .currentImage(currentImage)
                    .headlampUrl(headlampUrl)
                    .pods(podInfos)
                    .build();

        } catch (Exception e) {
            log.error("Failed retrieving status for K3s deployment {}/{}", targetNs, deploymentName, e);
            return DeploymentStatusDto.builder()
                    .namespace(targetNs)
                    .deploymentName(deploymentName)
                    .containerName(targetContainer)
                    .exists(false)
                    .status("ERROR")
                    .desiredReplicas(0)
                    .readyReplicas(0)
                    .headlampUrl(headlampUrl)
                    .pods(Collections.emptyList())
                    .build();
        }
    }

    public String getPodLogs(String namespace, String deploymentName, int tailLines) {
        if (k8sClient == null) return "KubernetesClient not connected.";
        String targetNs = (namespace != null && !namespace.isBlank()) ? namespace : "default";
        int lines = tailLines > 0 ? tailLines : 100;
        try {
            Deployment d = k8sClient.apps().deployments().inNamespace(targetNs).withName(deploymentName).get();
            if (d == null || d.getSpec() == null || d.getSpec().getSelector() == null) {
                return "Deployment " + targetNs + "/" + deploymentName + " not found.";
            }

            Map<String, String> matchLabels = d.getSpec().getSelector().getMatchLabels();
            PodList podList = k8sClient.pods().inNamespace(targetNs).withLabels(matchLabels).list();

            if (podList == null || podList.getItems() == null || podList.getItems().isEmpty()) {
                return "No running pods found for " + targetNs + "/" + deploymentName;
            }

            Pod targetPod = podList.getItems().get(0);
            String logs = k8sClient.pods()
                    .inNamespace(targetNs)
                    .withName(targetPod.getMetadata().getName())
                    .tailingLines(lines)
                    .getLog();

            return logs != null ? logs : "No log output returned.";
        } catch (Exception e) {
            log.error("Failed reading logs for {}/{}", targetNs, deploymentName, e);
            return "Error retrieving logs: " + e.getMessage();
        }
    }

    public boolean isHealthy(String namespace, String deploymentName) {
        DeploymentStatusDto details = getDeploymentStatusDetails(namespace, deploymentName, "app");
        return "RUNNING".equalsIgnoreCase(details.getStatus());
    }
}
