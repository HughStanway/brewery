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

    public boolean deployOrPatchImage(String namespace, String deploymentName, String containerName, String fullImageTag, String domainHost) {
        if (k8sClient == null) {
            log.warn("KubernetesClient is null. Skipping deployment for {}/{}.", namespace, deploymentName);
            return false;
        }

        String targetNs = (namespace != null && !namespace.isBlank()) ? namespace : "default";
        String targetContainer = (containerName != null && !containerName.isBlank()) ? containerName : "app";

        log.info("Deploying/patching K3s Deployment [{}/{}] -> container '{}' image: {}", targetNs, deploymentName, targetContainer, fullImageTag);
        try {
            ensureNamespaceExists(targetNs);

            Deployment existing = k8sClient.apps().deployments()
                    .inNamespace(targetNs)
                    .withName(deploymentName)
                    .get();

            if (existing == null) {
                log.info("Deployment {}/{} does not exist in K3s. Creating new deployment...", targetNs, deploymentName);
                createNewDeployment(targetNs, deploymentName, targetContainer, fullImageTag, domainHost);
                return true;
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

            ensureServiceExists(targetNs, deploymentName, Map.of("app", deploymentName));

            if (domainHost != null && !domainHost.isBlank()) {
                ensureIngressExists(targetNs, deploymentName, domainHost);
            }

            return true;
        } catch (Exception e) {
            log.error("Failed deploying/patching K3s deployment {}/{}", targetNs, deploymentName, e);
            return false;
        }
    }

    public boolean deployOrPatchImage(String namespace, String deploymentName, String containerName, String fullImageTag) {
        return deployOrPatchImage(namespace, deploymentName, containerName, fullImageTag, null);
    }

    private void ensureNamespaceExists(String namespace) {
        try {
            if (k8sClient.namespaces().withName(namespace).get() == null) {
                log.info("Creating K3s namespace: {}", namespace);
                k8sClient.namespaces().resource(new io.fabric8.kubernetes.api.model.NamespaceBuilder()
                        .withNewMetadata()
                          .withName(namespace)
                        .endMetadata()
                        .build()).create();
            }
        } catch (Exception e) {
            log.warn("Could not check/create namespace {}: {}", namespace, e.getMessage());
        }
    }

    private void createNewDeployment(String namespace, String deploymentName, String containerName, String fullImageTag, String domainHost) {
        Map<String, String> labels = Map.of("app", deploymentName);

        Deployment newDeployment = new DeploymentBuilder()
                .withNewMetadata()
                  .withName(deploymentName)
                  .withNamespace(namespace)
                  .withLabels(labels)
                .endMetadata()
                .withNewSpec()
                  .withReplicas(1)
                  .withNewSelector()
                    .withMatchLabels(labels)
                  .endSelector()
                  .withNewTemplate()
                    .withNewMetadata()
                      .withLabels(labels)
                    .endMetadata()
                    .withNewSpec()
                      .addNewContainer()
                        .withName(containerName)
                        .withImage(fullImageTag)
                        .addNewPort()
                          .withContainerPort(80)
                        .endPort()
                      .endContainer()
                    .endSpec()
                  .endTemplate()
                .endSpec()
                .build();

        k8sClient.apps().deployments().inNamespace(namespace).resource(newDeployment).create();
        log.info("Successfully created K3s deployment {}/{} with image {}", namespace, deploymentName, fullImageTag);

        ensureServiceExists(namespace, deploymentName, labels);

        // Only provision Traefik Ingress if domainHost is explicitly requested
        if (domainHost != null && !domainHost.isBlank()) {
            ensureIngressExists(namespace, deploymentName, domainHost);
        }
    }

    private void ensureServiceExists(String namespace, String deploymentName, Map<String, String> labels) {
        try {
            var existingDep = k8sClient.apps().deployments().inNamespace(namespace).withName(deploymentName).get();
            List<Integer> containerPorts = new ArrayList<>();
            if (existingDep != null && existingDep.getSpec() != null && existingDep.getSpec().getTemplate() != null && existingDep.getSpec().getTemplate().getSpec() != null) {
                var containers = existingDep.getSpec().getTemplate().getSpec().getContainers();
                if (containers != null) {
                    for (var c : containers) {
                        if (c.getPorts() != null) {
                            for (var p : c.getPorts()) {
                                if (p.getContainerPort() != null && !containerPorts.contains(p.getContainerPort())) {
                                    containerPorts.add(p.getContainerPort());
                                }
                            }
                        }
                    }
                }
            }

            List<io.fabric8.kubernetes.api.model.ServicePort> ports = new ArrayList<>();
            int primaryPort = containerPorts.isEmpty() ? 80 : containerPorts.get(0);

            ports.add(new io.fabric8.kubernetes.api.model.ServicePortBuilder()
                    .withName("http")
                    .withPort(80)
                    .withTargetPort(new io.fabric8.kubernetes.api.model.IntOrString(primaryPort))
                    .build());

            for (int cp : containerPorts) {
                if (cp != 80) {
                    ports.add(new io.fabric8.kubernetes.api.model.ServicePortBuilder()
                            .withName("port-" + cp)
                            .withPort(cp)
                            .withTargetPort(new io.fabric8.kubernetes.api.model.IntOrString(cp))
                            .build());
                }
            }

            var existingService = k8sClient.services().inNamespace(namespace).withName(deploymentName).get();
            if (existingService == null) {
                io.fabric8.kubernetes.api.model.Service newService = new io.fabric8.kubernetes.api.model.ServiceBuilder()
                        .withNewMetadata()
                          .withName(deploymentName)
                          .withNamespace(namespace)
                        .endMetadata()
                        .withNewSpec()
                          .withSelector(labels)
                          .withPorts(ports)
                        .endSpec()
                        .build();

                k8sClient.services().inNamespace(namespace).resource(newService).create();
                log.info("Created K3s service {}/{} with ports {}", namespace, deploymentName, ports);
            } else {
                k8sClient.services().inNamespace(namespace).withName(deploymentName)
                        .edit(s -> new io.fabric8.kubernetes.api.model.ServiceBuilder(s)
                                .editSpec()
                                  .withPorts(ports)
                                .endSpec()
                                .build());
                log.info("Updated K3s service {}/{} with ports {}", namespace, deploymentName, ports);
            }
        } catch (Exception se) {
            log.warn("Could not create/update service for {}/{}: {}", namespace, deploymentName, se.getMessage());
        }
    }

    private void ensureIngressExists(String namespace, String deploymentName, String domainHost) {
        try {
            if (k8sClient.network().v1().ingresses().inNamespace(namespace).withName(deploymentName).get() == null) {
                log.info("Provisioning dynamic Traefik Ingress for {}/{} -> https://{}", namespace, deploymentName, domainHost);
                io.fabric8.kubernetes.api.model.networking.v1.Ingress newIngress = new io.fabric8.kubernetes.api.model.networking.v1.IngressBuilder()
                        .withNewMetadata()
                          .withName(deploymentName)
                          .withNamespace(namespace)
                          .addToAnnotations("cert-manager.io/cluster-issuer", "letsencrypt-prod")
                          .addToAnnotations("traefik.ingress.kubernetes.io/router.middlewares", "authelia-authelia-forwardauth@kubernetescrd")
                        .endMetadata()
                        .withNewSpec()
                          .withIngressClassName("traefik")
                          .addNewTl()
                            .addToHosts(domainHost)
                            .withSecretName(deploymentName + "-bigiron-dev-tls")
                          .endTl()
                          .addNewRule()
                            .withHost(domainHost)
                            .withNewHttp()
                              .addNewPath()
                                .withPath("/")
                                .withPathType("Prefix")
                                .withNewBackend()
                                  .withNewService()
                                    .withName(deploymentName)
                                    .withNewPort()
                                      .withNumber(80)
                                    .endPort()
                                  .endService()
                                .endBackend()
                              .endPath()
                            .endHttp()
                          .endRule()
                        .endSpec()
                        .build();

                k8sClient.network().v1().ingresses().inNamespace(namespace).resource(newIngress).create();
                log.info("Successfully provisioned K3s Ingress {}/{} -> https://{}", namespace, deploymentName, domainHost);
            }
        } catch (Exception ie) {
            log.warn("Could not create ingress for {}/{}: {}", namespace, deploymentName, ie.getMessage());
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
