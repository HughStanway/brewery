package com.homelab.brewery.deploymentengine.impl;

import com.homelab.brewery.common.entity.Artifact;
import com.homelab.brewery.common.entity.Deployment;
import com.homelab.brewery.common.repository.ArtifactRepository;
import com.homelab.brewery.common.repository.DeploymentRepository;
import com.homelab.brewery.deploymentengine.provider.K8sDeploymentProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

public class DeploymentServiceImplTest {

    private DeploymentRepository deploymentRepository;
    private ArtifactRepository artifactRepository;
    private K8sDeploymentProvider k8sDeploymentProvider;
    private DeploymentServiceImpl deploymentService;

    @BeforeEach
    public void setUp() {
        deploymentRepository = Mockito.mock(DeploymentRepository.class);
        artifactRepository = Mockito.mock(ArtifactRepository.class);
        k8sDeploymentProvider = Mockito.mock(K8sDeploymentProvider.class);

        deploymentService = new DeploymentServiceImpl(deploymentRepository, artifactRepository, k8sDeploymentProvider);
    }

    @Test
    public void testRegisterOrUpdateDeployment() {
        when(deploymentRepository.findByName("production-api")).thenReturn(Optional.empty());
        when(deploymentRepository.save(any(Deployment.class))).thenAnswer(inv -> inv.getArgument(0));

        Deployment deployment = deploymentService.registerOrUpdateDeployment(
                "production-api",
                "default",
                "my-stack",
                "app",
                "api-server",
                "Production stack",
                "api.bigiron.dev",
                8080,
                "SPRING_PROFILES_ACTIVE=prod\nLOG_LEVEL=INFO",
                "512Mi",
                "500m",
                "admin"
        );

        assertNotNull(deployment);
        assertEquals("production-api", deployment.getName());
        assertEquals("default", deployment.getNamespace());
        assertEquals("my-stack", deployment.getK8sDeploymentName());
        assertEquals("api-server", deployment.getArtifactName());
        assertEquals("api.bigiron.dev", deployment.getPublicDomain());
        assertEquals(8080, deployment.getContainerPort());
        assertEquals("512Mi", deployment.getMemoryLimit());
        assertEquals("500m", deployment.getCpuLimit());
        assertEquals("PENDING", deployment.getStatus());
        verify(deploymentRepository).save(any(Deployment.class));
    }

    @Test
    public void testDeploySuccess() {
        UUID id = UUID.randomUUID();
        Deployment deployment = new Deployment();
        deployment.setId(id);
        deployment.setName("production-api");
        deployment.setNamespace("default");
        deployment.setK8sDeploymentName("my-stack");
        deployment.setK8sContainerName("app");
        deployment.setArtifactName("api-server");
        deployment.setDeployedVersion("1.4.0");
        deployment.setContainerPort(8080);
        deployment.setMemoryLimit("512Mi");
        deployment.setCpuLimit("500m");

        when(deploymentRepository.findById(id)).thenReturn(Optional.of(deployment));
        when(deploymentRepository.save(any(Deployment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(k8sDeploymentProvider.deployOrPatchImage(
                eq("default"),
                eq("my-stack"),
                eq("app"),
                eq("registry:5000/api-server:1.4.0"),
                isNull(),
                eq(8080),
                eq(Collections.emptyMap()),
                eq("512Mi"),
                eq("500m")
        )).thenReturn(true);

        Deployment result = deploymentService.deploy(id);

        assertEquals("SUCCESS", result.getStatus());
        assertNotNull(result.getCompletedAt());
        verify(k8sDeploymentProvider).deployOrPatchImage(
                eq("default"),
                eq("my-stack"),
                eq("app"),
                eq("registry:5000/api-server:1.4.0"),
                isNull(),
                eq(8080),
                eq(Collections.emptyMap()),
                eq("512Mi"),
                eq("500m")
        );
    }

    @Test
    public void testTriggerDeploymentsForArtifactAndTrackPreviousVersion() {
        Deployment d1 = new Deployment();
        d1.setId(UUID.randomUUID());
        d1.setName("prod-1");
        d1.setNamespace("default");
        d1.setK8sDeploymentName("stack-1");
        d1.setK8sContainerName("app");
        d1.setArtifactName("core-service");
        d1.setDeployedVersion("1.0.0");

        when(deploymentRepository.findByArtifactName("core-service")).thenReturn(List.of(d1));
        when(deploymentRepository.save(any(Deployment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(k8sDeploymentProvider.deployOrPatchImage(
                eq("default"),
                eq("stack-1"),
                eq("app"),
                eq("registry:5000/core-service:2.0.0"),
                isNull(),
                eq(80),
                eq(Collections.emptyMap()),
                isNull(),
                isNull()
        )).thenReturn(true);

        deploymentService.triggerDeploymentsForArtifact("core-service", "2.0.0");

        assertEquals("2.0.0", d1.getDeployedVersion());
        assertEquals("1.0.0", d1.getPreviousDeployedVersion());
        assertEquals("SUCCESS", d1.getStatus());
        verify(k8sDeploymentProvider).deployOrPatchImage(
                eq("default"),
                eq("stack-1"),
                eq("app"),
                eq("registry:5000/core-service:2.0.0"),
                isNull(),
                eq(80),
                eq(Collections.emptyMap()),
                isNull(),
                isNull()
        );
    }

    @Test
    public void testDeploymentYamlMergedWithEntityOverrides() {
        UUID id = UUID.randomUUID();
        Deployment deployment = new Deployment();
        deployment.setId(id);
        deployment.setName("web-service");
        deployment.setNamespace("brewery");
        deployment.setK8sDeploymentName("web-service");
        deployment.setK8sContainerName("app");
        deployment.setArtifactName("web-app");
        deployment.setDeployedVersion("1.0.0");
        // Override port and one env var on the Deployment entity
        deployment.setContainerPort(3000);
        deployment.setEnvVars("{\"NODE_ENV\":\"production\",\"CUSTOM\":\"override\"}");

        Artifact artifact = new Artifact();
        artifact.setName("web-app");
        artifact.setVersion("1.0.0");
        artifact.setMetadata("{\"deployment_yaml\":\"containerPort: 8080\\nmemoryLimit: 256Mi\\ncpuLimit: 250m\\npublicDomain: web.bigiron.dev\\nenv:\\n  NODE_ENV: development\\n  DEFAULT_KEY: defaultVal\\n\"}");

        when(deploymentRepository.findById(id)).thenReturn(Optional.of(deployment));
        when(deploymentRepository.save(any(Deployment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(artifactRepository.findByNameAndVersion("web-app", "1.0.0")).thenReturn(Optional.of(artifact));
        when(k8sDeploymentProvider.deployOrPatchImage(
                eq("brewery"),
                eq("web-service"),
                eq("app"),
                eq("registry:5000/web-app:1.0.0"),
                eq("web.bigiron.dev"),
                eq(3000),
                eq(Map.of("NODE_ENV", "production", "DEFAULT_KEY", "defaultVal", "CUSTOM", "override")),
                eq("256Mi"),
                eq("250m")
        )).thenReturn(true);

        Deployment result = deploymentService.deploy(id);
        assertEquals("SUCCESS", result.getStatus());
    }

    @Test
    public void testRollbackDeployment() {
        UUID id = UUID.randomUUID();
        Deployment deployment = new Deployment();
        deployment.setId(id);
        deployment.setName("production-api");
        deployment.setNamespace("default");
        deployment.setK8sDeploymentName("my-stack");
        deployment.setK8sContainerName("app");
        deployment.setArtifactName("api-server");
        deployment.setDeployedVersion("2.0.0");
        deployment.setPreviousDeployedVersion("1.5.0");

        when(deploymentRepository.findById(id)).thenReturn(Optional.of(deployment));
        when(deploymentRepository.save(any(Deployment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(k8sDeploymentProvider.deployOrPatchImage(
                eq("default"),
                eq("my-stack"),
                eq("app"),
                eq("registry:5000/api-server:1.5.0"),
                isNull(),
                eq(80),
                eq(Collections.emptyMap()),
                isNull(),
                isNull()
        )).thenReturn(true);

        Deployment result = deploymentService.rollbackDeployment(id, null);

        assertEquals("1.5.0", result.getDeployedVersion());
        assertEquals("2.0.0", result.getPreviousDeployedVersion());
        assertEquals("SUCCESS", result.getStatus());
    }
}
