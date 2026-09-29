package com.homelab.brewery.deploymentengine.impl;

import com.homelab.brewery.common.entity.Deployment;
import com.homelab.brewery.common.repository.DeploymentRepository;
import com.homelab.brewery.deploymentengine.client.KomodoApiClient;
import com.homelab.brewery.deploymentengine.provider.K8sDeploymentProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

public class DeploymentServiceImplTest {

    private DeploymentRepository deploymentRepository;
    private KomodoApiClient komodoApiClient;
    private K8sDeploymentProvider k8sDeploymentProvider;
    private DeploymentServiceImpl deploymentService;

    @BeforeEach
    public void setUp() {
        deploymentRepository = Mockito.mock(DeploymentRepository.class);
        komodoApiClient = Mockito.mock(KomodoApiClient.class);
        k8sDeploymentProvider = Mockito.mock(K8sDeploymentProvider.class);

        when(komodoApiClient.buildKomodoStackUiUrl("my-stack"))
                .thenReturn("http://localhost:9120/stacks/my-stack");

        deploymentService = new DeploymentServiceImpl(deploymentRepository, komodoApiClient, k8sDeploymentProvider);
    }

    @Test
    public void testRegisterOrUpdateDeployment() {
        when(deploymentRepository.findByName("production-api")).thenReturn(Optional.empty());
        when(deploymentRepository.save(any(Deployment.class))).thenAnswer(inv -> inv.getArgument(0));

        Deployment deployment = deploymentService.registerOrUpdateDeployment(
                "production-api", "my-stack", "api-server", "Production stack", "admin"
        );

        assertNotNull(deployment);
        assertEquals("production-api", deployment.getName());
        assertEquals("my-stack", deployment.getKomodoStackName());
        assertEquals("api-server", deployment.getArtifactName());
        assertEquals("http://localhost:9120/stacks/my-stack", deployment.getKomodoUrl());
        assertEquals("PENDING", deployment.getStatus());
        verify(deploymentRepository).save(any(Deployment.class));
    }

    @Test
    public void testDeploySuccess() {
        UUID id = UUID.randomUUID();
        Deployment deployment = new Deployment();
        deployment.setId(id);
        deployment.setName("production-api");
        deployment.setKomodoStackName("my-stack");
        deployment.setArtifactName("api-server");
        deployment.setDeployedVersion("1.4.0");

        when(deploymentRepository.findById(id)).thenReturn(Optional.of(deployment));
        when(deploymentRepository.save(any(Deployment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(komodoApiClient.triggerStackDeployment(eq("my-stack"), eq("api-server:1.4.0"))).thenReturn(true);

        Deployment result = deploymentService.deploy(id);

        assertEquals("SUCCESS", result.getStatus());
        assertNotNull(result.getCompletedAt());
        verify(komodoApiClient).triggerStackDeployment("my-stack", "api-server:1.4.0");
    }

    @Test
    public void testTriggerDeploymentsForArtifact() {
        Deployment d1 = new Deployment();
        d1.setId(UUID.randomUUID());
        d1.setName("prod-1");
        d1.setKomodoStackName("stack-1");
        d1.setArtifactName("core-service");

        when(deploymentRepository.findByArtifactName("core-service")).thenReturn(List.of(d1));
        when(deploymentRepository.save(any(Deployment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(komodoApiClient.triggerStackDeployment(eq("stack-1"), eq("core-service:2.0.0"))).thenReturn(true);

        deploymentService.triggerDeploymentsForArtifact("core-service", "2.0.0");

        assertEquals("2.0.0", d1.getDeployedVersion());
        assertEquals("SUCCESS", d1.getStatus());
        verify(komodoApiClient).triggerStackDeployment("stack-1", "core-service:2.0.0");
    }
}
