package com.homelab.brewery.controller;

import com.homelab.brewery.common.objects.requests.JobResponse;
import com.homelab.brewery.common.service.JobTriggerService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;

@RestController
@RequestMapping("/api/webhooks/github")
@Slf4j
public class GitHubWebhookController {

    private final JobTriggerService jobTriggerService;
    private final String webhookSecret;

    public GitHubWebhookController(
            JobTriggerService jobTriggerService,
            @Value("${brewery.github.webhook.secret:${BREWERY_GITHUB_WEBHOOK_SECRET:disabled}}") String webhookSecret) {
        this.jobTriggerService = jobTriggerService;
        this.webhookSecret = webhookSecret;
    }

    @PostMapping
    public ResponseEntity<?> handleGitHubWebhook(
            @RequestBody byte[] rawPayload,
            @RequestHeader(value = "X-GitHub-Event", required = false) String eventType,
            @RequestHeader(value = "X-Hub-Signature-256", required = false) String signatureHeader) {

        log.info("Received direct GitHub webhook. eventType={}", eventType);

        if (eventType == null || eventType.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing X-GitHub-Event header"));
        }

        // Validate HMAC signature if secret is configured
        boolean isSecretConfigured = webhookSecret != null 
                && !webhookSecret.isBlank() 
                && !"disabled".equalsIgnoreCase(webhookSecret.trim()) 
                && !"none".equalsIgnoreCase(webhookSecret.trim());

        if (isSecretConfigured) {
            if (!verifySignature(rawPayload, signatureHeader)) {
                log.warn("Signature verification failed for GitHub webhook event: {}. signatureHeader present: {}", 
                        eventType, signatureHeader != null && !signatureHeader.isBlank());
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Signature verification failed"));
            }
        } else {
            log.info("Webhook HMAC signature verification is disabled/unconfigured. Processing event: {}", eventType);
        }

        // Handle ping event from GitHub
        if ("ping".equalsIgnoreCase(eventType)) {
            log.info("GitHub ping event received. Webhook configuration is valid.");
            return ResponseEntity.ok(Map.of("message", "pong"));
        }

        try {
            JobResponse response = jobTriggerService.triggerFromRawPayload(rawPayload, eventType);
            log.info("Successfully enqueued build for webhook event. buildId={}, repository={}", 
                    response.getBuildId(), response.getRepository());
            return ResponseEntity.status(HttpStatus.ACCEPTED)
                    .body(Map.of(
                            "message", "Accepted",
                            "buildId", response.getBuildId(),
                            "repository", response.getRepository(),
                            "branch", response.getBranch(),
                            "commit", response.getCommit()
                    ));
        } catch (IllegalArgumentException e) {
            log.warn("Webhook event ignored or invalid: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.OK)
                    .body(Map.of("message", "Ignored: " + e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to process direct GitHub webhook", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal server error: " + e.getMessage()));
        }
    }

    private boolean verifySignature(byte[] payload, String signatureHeader) {
        if (signatureHeader == null || !signatureHeader.startsWith("sha256=")) {
            return false;
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKey);
            byte[] expectedHash = mac.doFinal(payload);
            String expectedSignature = "sha256=" + HexFormat.of().formatHex(expectedHash);

            return MessageDigest.isEqual(expectedSignature.getBytes(StandardCharsets.UTF_8), signatureHeader.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            log.error("Error verifying HMAC signature", e);
            return false;
        }
    }
}
