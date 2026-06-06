package com.homelab.brewery.controller;

import com.homelab.brewery.common.entity.Build;
import com.homelab.brewery.common.repository.ArtifactRepository;
import com.homelab.brewery.common.repository.BuildRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Slf4j
public class DashboardController {

    private final ArtifactRepository artifactRepository;
    private final BuildRepository buildRepository;

    @GetMapping("/stats")
    public ResponseEntity<?> getDashboardStats() {
        try {
            long totalArtifacts = artifactRepository.count();
            List<Build> builds = buildRepository.findAll();
            long totalBuilds = builds.size();

            long pendingCount = 0;
            long buildingCount = 0;
            long successCount = 0;
            long failedCount = 0;
            long cancelledCount = 0;

            for (Build b : builds) {
                switch (b.getStatus()) {
                    case "pending" -> pendingCount++;
                    case "building" -> buildingCount++;
                    case "success" -> successCount++;
                    case "failed" -> failedCount++;
                    case "cancelled" -> cancelledCount++;
                }
            }

            long completedBuilds = successCount + failedCount;
            double successRate = completedBuilds > 0 
                ? (double) successCount / completedBuilds * 100 
                : 0.0;

            Map<String, Object> stats = new HashMap<>();
            stats.put("totalArtifacts", totalArtifacts);
            stats.put("totalBuilds", totalBuilds);
            stats.put("successRate", Math.round(successRate * 10) / 10.0);
            stats.put("queueCount", pendingCount + buildingCount);
            stats.put("pendingCount", pendingCount);
            stats.put("buildingCount", buildingCount);
            stats.put("successCount", successCount);
            stats.put("failedCount", failedCount);
            stats.put("cancelledCount", cancelledCount);

            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("Failed to gather dashboard stats", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error retrieving stats: " + e.getMessage());
        }
    }
}
