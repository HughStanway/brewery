package com.homelab.brewery.common.repository;

import com.homelab.brewery.common.entity.VersionAlias;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface VersionAliasRepository extends JpaRepository<VersionAlias, UUID> {
    Optional<VersionAlias> findByArtifactNameAndAlias(String artifactName, String alias);
}
