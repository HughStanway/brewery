package com.homelab.brewery.cascaderebuild.controller;

import com.homelab.brewery.cascaderebuild.service.CascadeRebuildService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.homelab.brewery.common.repository.ArtifactRepository;
import com.homelab.brewery.common.repository.CascadeTaskRepository;
import java.util.Map;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/cascade")
@RequiredArgsConstructor
@Slf4j
public class CascadeRebuildController {

    private final CascadeRebuildService cascadeRebuildService;
    private final com.homelab.brewery.common.repository.RebuildChainRepository rebuildChainRepository;
    private final ArtifactRepository artifactRepository;
    private final CascadeTaskRepository cascadeTaskRepository;

    /**
     * POST /api/cascade/trigger/{name}/{version}
     * Body: {"reason":"...","max_depth":5}
     */
    @PostMapping("/trigger/{name}/{version}")
    public ResponseEntity<?> triggerCascade(
            @PathVariable("name") String name,
            @PathVariable("version") String version,
            @RequestBody(required = false) Map<String, Object> body) {
        try {
            String reason = "manual trigger";
            int maxDepth = 5;
            if (body != null) {
                if (body.containsKey("reason") && body.get("reason") != null) {
                    reason = body.get("reason").toString();
                }
                if (body.containsKey("max_depth") && body.get("max_depth") != null) {
                    maxDepth = Integer.parseInt(body.get("max_depth").toString());
                }
            }
            Map<String, Object> result = cascadeRebuildService.triggerCascade(name, version, reason, maxDepth);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            log.warn("Cascade trigger failed - not found: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error triggering cascade for {}@{}", name, version, e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/cascade/chains
     */
    @GetMapping("/chains")
    public ResponseEntity<?> listAllChains() {
        try {
            List<com.homelab.brewery.common.entity.RebuildChain> chains = rebuildChainRepository.findAll(
                org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "startedAt")
            );
            List<java.util.Map<String, Object>> enriched = chains.stream().map(chain -> {
                java.util.Map<String, Object> map = new java.util.LinkedHashMap<>();
                map.put("id", chain.getId());
                map.put("chainId", chain.getId());
                map.put("rootArtifactId", chain.getRootArtifactId());
                map.put("rootCause", chain.getRootCause());
                map.put("status", chain.getStatus());
                map.put("depth", chain.getDepth());
                map.put("parentChainId", chain.getParentChainId());
                map.put("startedAt", chain.getStartedAt());
                map.put("completedAt", chain.getCompletedAt());
                
                if (chain.getBuildId() != null) {
                    map.put("buildId", chain.getBuildId().toString());
                    map.put("build_id", chain.getBuildId().toString());
                }
                
                if (chain.getRootArtifactId() != null) {
                    artifactRepository.findById(chain.getRootArtifactId()).ifPresent(art -> {
                        map.put("rootArtifactName", art.getName());
                        map.put("root_artifact_name", art.getName());
                        map.put("rootArtifactVersion", art.getVersion());
                        map.put("root_artifact_version", art.getVersion());
                        if (chain.getBuildId() == null) {
                            map.put("buildId", art.getBuildId() != null ? art.getBuildId().toString() : null);
                            map.put("build_id", art.getBuildId() != null ? art.getBuildId().toString() : null);
                        }
                        
                        String triggerType = chain.getTriggerType();
                        if (triggerType == null) {
                            // Fallback for older database records
                            triggerType = "New version publication";
                            if (art.getBuildId() != null) {
                                List<com.homelab.brewery.common.entity.CascadeTask> tasks = cascadeTaskRepository.findByBuildId(art.getBuildId());
                                if (tasks != null && !tasks.isEmpty()) {
                                    triggerType = "Dependency cascade rebuild";
                                }
                            }
                        }
                        map.put("triggerType", triggerType);
                        map.put("trigger_type", triggerType);
                    });
                }
                return map;
            }).collect(java.util.stream.Collectors.toList());
            
            return ResponseEntity.ok(enriched);
        } catch (Exception e) {
            log.error("Error listing rebuild chains", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/cascade/chains/{chainId}
     */
    @GetMapping("/chains/{chainId}")
    public ResponseEntity<?> getChainStatus(@PathVariable("chainId") UUID chainId) {
        try {
            Map<String, Object> result = cascadeRebuildService.getChainStatus(chainId);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            log.warn("Chain not found: {}", chainId);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error retrieving chain status for {}", chainId, e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/cascade/chains/{chainId}/cancel
     */
    @PostMapping("/chains/{chainId}/cancel")
    public ResponseEntity<?> cancelChain(@PathVariable("chainId") UUID chainId) {
        try {
            cascadeRebuildService.cancelChain(chainId);
            return ResponseEntity.ok(Map.of("chain_id", chainId.toString(), "status", "cancelled"));
        } catch (IllegalArgumentException e) {
            log.warn("Chain not found for cancellation: {}", chainId);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error cancelling chain {}", chainId, e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/cascade/impact/{name}/{version}
     */
    @GetMapping("/impact/{name}/{version}")
    public ResponseEntity<?> getCascadeImpact(
            @PathVariable("name") String name,
            @PathVariable("version") String version) {
        try {
            Map<String, Object> result = cascadeRebuildService.getCascadeImpact(name, version);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            log.warn("Impact analysis failed - not found: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Error computing cascade impact for {}@{}", name, version, e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
