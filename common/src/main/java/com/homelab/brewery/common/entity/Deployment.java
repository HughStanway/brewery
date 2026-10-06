package com.homelab.brewery.common.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "deployments")
@Data
@NoArgsConstructor
public class Deployment {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(name = "komodo_stack_name")
    private String komodoStackName;

    @Column(name = "namespace")
    private String namespace;

    @Column(name = "k8s_deployment_name")
    private String k8sDeploymentName;

    @Column(name = "k8s_container_name")
    private String k8sContainerName;

    @Column(name = "artifact_name")
    private String artifactName;

    @Column(name = "deployed_version")
    private String deployedVersion;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String status;

    @Column(name = "deployment_spec", columnDefinition = "TEXT")
    private String deploymentSpec;

    @Column(name = "komodo_url")
    private String komodoUrl;

    @Column(name = "headlamp_url")
    private String headlampUrl;

    @Column(name = "public_domain")
    private String publicDomain;

    public String getNamespace() {
        return (namespace != null && !namespace.isBlank()) ? namespace : "default";
    }

    public String getK8sContainerName() {
        return (k8sContainerName != null && !k8sContainerName.isBlank()) ? k8sContainerName : "app";
    }

    public String getK8sDeploymentName() {
        if (k8sDeploymentName != null && !k8sDeploymentName.isBlank()) {
            return k8sDeploymentName;
        }
        if (komodoStackName != null && !komodoStackName.isBlank()) {
            return komodoStackName;
        }
        return name;
    }

    public String getHeadlampUrl() {
        if (headlampUrl != null && !headlampUrl.isBlank()) {
            return headlampUrl;
        }
        String ns = getNamespace();
        String k8sName = getK8sDeploymentName();
        return "https://deployments.bigiron.dev/c/main/deployments/" + ns + "/" + k8sName;
    }

    @Column(name = "deployed_at")
    private Instant deployedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "deployed_by")
    private String deployedBy;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (status == null) {
            status = "pending";
        }
        if (deploymentSpec == null) {
            deploymentSpec = "";
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        updatedAt = Instant.now();
    }
}
