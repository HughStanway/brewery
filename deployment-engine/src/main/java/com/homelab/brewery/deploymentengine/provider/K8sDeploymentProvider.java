package com.homelab.brewery.deploymentengine.provider;

import io.fabric8.kubernetes.api.model.apps.Deployment;
import io.fabric8.kubernetes.api.model.apps.DeploymentBuilder;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.KubernetesClientBuilder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class K8sDeploymentProvider {

    private final KubernetesClient k8sClient;

    public K8sDeploymentProvider() {
        // Automatically connects using in-cluster ServiceAccount token or local KUBECONFIG
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

    public boolean isHealthy(String namespace, String deploymentName) {
        if (k8sClient == null) return false;
        try {
            String targetNs = (namespace != null && !namespace.isBlank()) ? namespace : "default";
            Deployment d = k8sClient.apps().deployments().inNamespace(targetNs).withName(deploymentName).get();
            if (d == null || d.getStatus() == null) return false;
            Integer readyReplicas = d.getStatus().getReadyReplicas();
            Integer replicas = d.getSpec().getReplicas();
            return readyReplicas != null && readyReplicas.equals(replicas);
        } catch (Exception e) {
            return false;
        }
    }
}
