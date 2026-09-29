package com.homelab.brewery.deploymentengine.client;

import com.homelab.brewery.deploymentengine.config.KomodoConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
@Slf4j
public class KomodoApiClient {

    private final RestClient restClient;
    private final KomodoConfig config;
    private String jwtToken;

    public KomodoApiClient(KomodoConfig config) {
        this.config = config;
        this.restClient = RestClient.builder()
                .baseUrl(config.getBaseUrl())
                .build();
    }

    private synchronized String getOrAuthenticateJwt() {
        if (jwtToken != null && !jwtToken.isBlank()) {
            return jwtToken;
        }

        try {
            Map<String, Object> loginPayload = Map.of(
                    "type", "LoginLocalUser",
                    "params", Map.of(
                            "username", "admin",
                            "password", "admin"
                    )
            );

            ResponseEntity<Map> response = restClient.post()
                    .uri("/auth")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(loginPayload)
                    .retrieve()
                    .toEntity(Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Object jwt = response.getBody().get("jwt");
                if (jwt != null) {
                    this.jwtToken = jwt.toString();
                    log.info("Successfully authenticated with Komodo Core and acquired JWT token.");
                    return this.jwtToken;
                }
            }
        } catch (Exception e) {
            log.warn("Failed to authenticate with Komodo Core via admin credentials: {}", e.getMessage());
        }

        return null;
    }

    private RestClient.RequestBodySpec applyAuthHeaders(RestClient.RequestBodySpec spec) {
        if (config.getApiKey() != null && !config.getApiKey().isBlank()) {
            spec.header("X-API-KEY", config.getApiKey());
            spec.header("X-Komodo-Api-Key", config.getApiKey());
        }
        if (config.getApiSecret() != null && !config.getApiSecret().isBlank()) {
            spec.header("X-API-SECRET", config.getApiSecret());
            spec.header("X-Komodo-Api-Secret", config.getApiSecret());
        }

        String jwt = getOrAuthenticateJwt();
        if (jwt != null && !jwt.isBlank()) {
            spec.header("Authorization", jwt);
        }

        return spec;
    }

    public boolean provisionStack(String stackName, String artifactName, String version) {
        log.info("Provisioning / updating Komodo stack: {} for artifact: {}@{}", stackName, artifactName, version);

        Map<String, Object> payload = Map.of(
                "type", "CreateStack",
                "params", Map.of(
                        "name", stackName
                )
        );

        try {
            RestClient.RequestBodySpec requestSpec = restClient.post()
                    .uri("/write")
                    .contentType(MediaType.APPLICATION_JSON);

            requestSpec = applyAuthHeaders(requestSpec);

            ResponseEntity<Map> response = requestSpec.body(payload)
                    .retrieve()
                    .toEntity(Map.class);

            boolean ok = response.getStatusCode().is2xxSuccessful();
            log.info("Komodo CreateStack response status: {}", response.getStatusCode());
            return ok;
        } catch (Exception e) {
            log.warn("Komodo CreateStack returned notice for stack {} (will proceed to DeployStack): {}", stackName, e.getMessage());
            return false;
        }
    }

    public boolean triggerStackDeployment(String stackName, String imageTag) {
        log.info("Triggering Komodo DeployStack execution for stack: {}, imageTag: {}", stackName, imageTag);

        Map<String, Object> payload = Map.of(
                "type", "DeployStack",
                "params", Map.of(
                        "stack", stackName
                )
        );

        try {
            RestClient.RequestBodySpec requestSpec = restClient.post()
                    .uri("/execute")
                    .contentType(MediaType.APPLICATION_JSON);

            requestSpec = applyAuthHeaders(requestSpec);

            ResponseEntity<Map> response = requestSpec.body(payload)
                    .retrieve()
                    .toEntity(Map.class);

            boolean success = response.getStatusCode().is2xxSuccessful();
            log.info("Komodo DeployStack response status: {}", response.getStatusCode());
            return success;
        } catch (Exception e) {
            log.error("Failed to execute DeployStack on Komodo for stack {}", stackName, e);
            return false;
        }
    }

    public String buildKomodoStackUiUrl(String stackName) {
        if (stackName == null || stackName.isBlank()) {
            return config.getBaseUrl();
        }
        return String.format("%s/stacks/%s", config.getBaseUrl(), stackName);
    }
}
