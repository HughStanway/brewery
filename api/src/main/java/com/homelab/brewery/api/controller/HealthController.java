package com.homelab.brewery.api.controller;

import com.homelab.brewery.common.dto.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/health")
public class HealthController {
    
    @GetMapping
    public ApiResponse<Map<String, String>> health() {
        return ApiResponse.success(
            Map.of("status", "UP", "service", "brewery-orchestrator")
        );
    }
}
