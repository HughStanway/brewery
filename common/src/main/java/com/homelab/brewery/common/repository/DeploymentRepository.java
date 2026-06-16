package com.homelab.brewery.common.repository;

import com.homelab.brewery.common.entity.Deployment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DeploymentRepository extends JpaRepository<Deployment, UUID> {
    Optional<Deployment> findByName(String name);
    List<Deployment> findByStatus(String status);
}
