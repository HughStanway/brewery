package com.homelab.brewery.api.endpoints;

import com.homelab.brewery.common.dto.ApiResponse;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("api/jobs/init")
public class InitJobController {

    @PostMapping
    public ApiResponse<Map<String, String>> health() {
        return ApiResponse.success(
            Map.of("status", "UP", "service", "brewery-orchestrator"),
            "Service is running"
        );
    }
}
