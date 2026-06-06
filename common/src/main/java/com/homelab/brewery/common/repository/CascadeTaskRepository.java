package com.homelab.brewery.common.repository;

import com.homelab.brewery.common.entity.CascadeTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CascadeTaskRepository extends JpaRepository<CascadeTask, UUID> {
    List<CascadeTask> findByChainId(UUID chainId);
    List<CascadeTask> findByStatus(String status);
    List<CascadeTask> findByChainIdAndStatus(UUID chainId, String status);
    List<CascadeTask> findByArtifactId(UUID artifactId);
}
