package com.homelab.brewery.common.repository;

import com.homelab.brewery.common.entity.ServiceHealthCheck;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ServiceHealthCheckRepository extends JpaRepository<ServiceHealthCheck, UUID> {
    List<ServiceHealthCheck> findByDeploymentId(UUID deploymentId);
    Optional<ServiceHealthCheck> findByDeploymentIdAndServiceName(UUID deploymentId, String serviceName);
}
