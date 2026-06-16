package com.homelab.brewery.common.repository;

import com.homelab.brewery.common.entity.DeploymentVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DeploymentVersionRepository extends JpaRepository<DeploymentVersion, UUID> {
    List<DeploymentVersion> findByDeploymentIdOrderByVersionNumberDesc(UUID deploymentId);
    Optional<DeploymentVersion> findByDeploymentIdAndVersionNumber(UUID deploymentId, Integer versionNumber);
}
