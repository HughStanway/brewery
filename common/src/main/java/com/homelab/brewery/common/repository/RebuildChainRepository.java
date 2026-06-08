package com.homelab.brewery.common.repository;

import com.homelab.brewery.common.entity.RebuildChain;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RebuildChainRepository extends JpaRepository<RebuildChain, UUID> {
    List<RebuildChain> findByStatus(String status);
    List<RebuildChain> findByRootArtifactId(UUID rootArtifactId);
    void deleteByRootArtifactId(UUID rootArtifactId);
}
