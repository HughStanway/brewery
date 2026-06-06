package com.homelab.brewery.common.repository;

import com.homelab.brewery.common.entity.Build;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BuildRepository extends JpaRepository<Build, UUID> {
    List<Build> findByStatusIn(List<String> statuses);
}
