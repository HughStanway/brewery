package com.homelab.brewery.common.repository;

import com.homelab.brewery.common.entity.DeploymentEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DeploymentEventRepository extends JpaRepository<DeploymentEvent, UUID> {
    List<DeploymentEvent> findByDeploymentIdOrderByCreatedAtDesc(UUID deploymentId);
}
