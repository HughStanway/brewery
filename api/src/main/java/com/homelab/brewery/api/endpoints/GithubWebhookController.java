package com.homelab.brewery.api.endpoints;

import com.homelab.brewery.common.dto.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("api/webhook/github")
public class GithubWebhookController {

    @GetMapping
    public ApiResponse<Map<String, String>> health() {
        return ApiResponse.success(
            Map.of("status", "UP", "service", "brewery-orchestrator"),
            "Service is running"
        );
    }
}
