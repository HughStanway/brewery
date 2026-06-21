package com.homelab.brewery.deploymentengine.impl;

import com.homelab.brewery.common.entity.Artifact;
import com.homelab.brewery.common.entity.Deployment;
import com.homelab.brewery.common.repository.ArtifactRepository;
import com.homelab.brewery.common.repository.DeploymentEventRepository;
import com.homelab.brewery.common.repository.DeploymentRepository;
import com.homelab.brewery.common.repository.DeploymentVersionRepository;
import com.homelab.brewery.common.repository.ServiceHealthCheckRepository;
import com.homelab.brewery.registry.SemanticVersionResolver;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.io.File;
import java.nio.file.Files;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

public class DeploymentServiceImplTest {

    private com.homelab.brewery.common.repository.DeploymentRepository deploymentRepository;
    private com.homelab.brewery.common.repository.DeploymentVersionRepository versionRepository;
    private com.homelab.brewery.common.repository.DeploymentEventRepository eventRepository;
    private com.homelab.brewery.common.repository.ServiceHealthCheckRepository healthCheckRepository;
    private com.homelab.brewery.common.repository.ArtifactRepository artifactRepository;
    private SemanticVersionResolver versionResolver;

    private DeploymentServiceImpl deploymentService;

    @BeforeEach
    public void setUp() {
        deploymentRepository = Mockito.mock(com.homelab.brewery.common.repository.DeploymentRepository.class);
        versionRepository = Mockito.mock(com.homelab.brewery.common.repository.DeploymentVersionRepository.class);
        eventRepository = Mockito.mock(com.homelab.brewery.common.repository.DeploymentEventRepository.class);
        healthCheckRepository = Mockito.mock(com.homelab.brewery.common.repository.ServiceHealthCheckRepository.class);
        artifactRepository = Mockito.mock(com.homelab.brewery.common.repository.ArtifactRepository.class);
        versionResolver = Mockito.mock(SemanticVersionResolver.class);

        deploymentService = new DeploymentServiceImpl(
                deploymentRepository,
                versionRepository,
                eventRepository,
                healthCheckRepository,
                artifactRepository,
                versionResolver
        );
    }

    @Test
    public void testDeployWithCustomImageInitAndTarGz() throws Exception {
        UUID deploymentId = UUID.randomUUID();
        Deployment deployment = new Deployment();
        deployment.setId(deploymentId);
        deployment.setName("test-stack");
        
        String specYaml = "version: 1\n" +
                "deployment:\n" +
                "  name: \"test-stack\"\n" +
                "  description: \"Testing deployments\"\n" +
                "services:\n" +
                "  my-binary:\n" +
                "    artifact: \"my-binary-art@latest\"\n" +
                "    type: \"binary\"\n" +
                "    runtimeImage: \"custom-runner:latest\"\n" +
                "    init:\n" +
                "      - \"echo 'init 1'\"\n" +
                "      - \"echo 'init 2'\"\n";
        deployment.setDeploymentSpec(specYaml);

        when(deploymentRepository.findById(deploymentId)).thenReturn(Optional.of(deployment));
        when(deploymentRepository.save(any(Deployment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Mock artifact resolution
        Artifact artifact = new Artifact();
        artifact.setId(UUID.randomUUID());
        artifact.setName("my-binary-art");
        artifact.setVersion("1.0.0");
        artifact.setStoragePath("/mnt/artifact-store/my-binary-art/1.0.0/my-binary-art.tar.gz");
        artifact.setMetadata("{\"primary_entrypoint\": \"my-executable\"}");

        when(artifactRepository.findByName("my-binary-art")).thenReturn(List.of(artifact));
        when(versionResolver.resolveVersionRange(any(), any())).thenReturn("1.0.0");
        when(artifactRepository.findByNameAndVersion("my-binary-art", "1.0.0")).thenReturn(Optional.of(artifact));

        // Trigger deploy. It will write files and then try to run docker compose (which will fail due to no docker command in test env, but that's expected).
        try {
            deploymentService.deploy(deploymentId);
        } catch (Exception e) {
            // expected to fail on docker compose execution
        }

        // Verify the written files on disk
        File deployDir = new File("/tmp/brewery-builds/deployments/deploy-" + deploymentId);
        assertTrue(deployDir.exists(), "Deployment directory should be created");

        File composeFile = new File(deployDir, "docker-compose.yml");
        assertTrue(composeFile.exists(), "docker-compose.yml should be created");

        String composeContent = Files.readString(composeFile.toPath());
        assertTrue(composeContent.contains("image: custom-runner:latest"), "Should use custom runtimeImage");
        assertTrue(composeContent.contains("/entrypoint.sh"), "Should use entrypoint wrapper");
        assertTrue(composeContent.contains("entrypoint-my-binary.sh:/entrypoint.sh:ro"), "Should mount entrypoint wrapper");

        File entrypointFile = new File(deployDir, "entrypoint-my-binary.sh");
        assertTrue(entrypointFile.exists(), "entrypoint script should be created");

        String entrypointContent = Files.readString(entrypointFile.toPath());
        assertTrue(entrypointContent.contains("tar -xzf /mnt/artifact-store/my-binary-art/1.0.0/my-binary-art.tar.gz -C /app"), "Should extract tarball");
        assertTrue(entrypointContent.contains("echo 'init 1'"), "Should contain init command 1");
        assertTrue(entrypointContent.contains("echo 'init 2'"), "Should contain init command 2");
        assertTrue(entrypointContent.contains("exec \"/app/my-executable\" \"$@\""), "Should execute primaryEntrypoint");

        // Clean up files written during the test
        composeFile.delete();
        entrypointFile.delete();
        deployDir.delete();
    }
}
