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

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/cascade")
@RequiredArgsConstructor
@Slf4j
public class CascadeRebuildController {

    private final CascadeRebuildService cascadeRebuildService;

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
