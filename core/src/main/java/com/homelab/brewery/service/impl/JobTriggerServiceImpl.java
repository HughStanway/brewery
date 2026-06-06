package com.homelab.brewery.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.homelab.brewery.common.objects.github.GitHubEventMetadata;
import com.homelab.brewery.common.objects.requests.JobRequest;
import com.homelab.brewery.common.objects.requests.JobResponse;
import com.homelab.brewery.common.service.JobTriggerService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
public class JobTriggerServiceImpl implements JobTriggerService {

    private static final String HMAC_SHA256 = "HmacSHA256";
    private static final String SIGNATURE_PREFIX = "sha256=";

    private final List<String> allowedEvents;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${brewery.github.webhook.secret:}")
    private String configuredSecret;

    public JobTriggerServiceImpl(
        @Value("${brewery.github.webhook.allowed-events:push,pull_request}") List<String> allowedEvents
    ) {
        this.allowedEvents = allowedEvents;
    }

    @Override
    public JobResponse triggerJob(JobRequest jobRequest) {
        if (jobRequest.getRepository() == null || jobRequest.getCommit() == null) {
            log.error("Failed to trigger job: missing required repository or commit metadata.");
            throw new IllegalArgumentException("Webhook payload is missing required repository, branch, or commit data");
        }

        UUID buildId = jobRequest.getBuildId() != null ? jobRequest.getBuildId() : UUID.randomUUID();
        log.info("Triggering build job. buildId={}, repository={}, branch={}, commit={}",
                 buildId, jobRequest.getRepository(), jobRequest.getBranch(), jobRequest.getCommit());

        JobResponse response = new JobResponse();
        response.setBuildId(buildId);
        response.setRepository(jobRequest.getRepository());
        response.setCommit(jobRequest.getCommit());
        response.setBranch(jobRequest.getBranch());

        return response;
    }

    @Override
    public JobResponse triggerFromWebhookPayload(byte[] rawPayload, String eventType, String signatureHeader) {
        log.info("Received webhook event payload. eventType={}", eventType);

        if (signatureHeader == null || signatureHeader.isBlank()) {
            log.warn("Rejected webhook payload: missing X-Hub-Signature-256 header");
            throw new SecurityException("Missing X-Hub-Signature-256 header");
        }

        String secret = resolveSecret();
        if (isVerificationEnabled() && !validateSignature(rawPayload, signatureHeader, secret)) {
            log.error("Rejected webhook payload: invalid signature");
            throw new SecurityException("Invalid webhook signature");
        }

        if (eventType == null || eventType.isBlank()) {
            log.warn("Rejected webhook payload: missing event type");
            throw new IllegalArgumentException("Missing X-GitHub-Event header");
        }

        if (!allowedEvents.contains(eventType)) {
            log.warn("Rejected webhook payload: unsupported event type: {}", eventType);
            throw new IllegalArgumentException("Unsupported GitHub event: " + eventType);
        }

        JobRequest jobRequest;
        try {
            JsonNode payload = objectMapper.readTree(rawPayload);
            jobRequest = parseJobRequest(payload, eventType);
        } catch (Exception e) {
            log.error("Failed to parse webhook payload for event type {}", eventType, e);
            throw new IllegalArgumentException("Malformed webhook payload", e);
        }

        return triggerJob(jobRequest);
    }

    private String resolveSecret() {
        String env = System.getenv("GITHUB_WEBHOOK_SECRET");
        if (env != null && !env.isBlank()) {
            return env;
        }
        if (configuredSecret != null && !configuredSecret.isBlank()) {
            return configuredSecret;
        }
        throw new IllegalStateException("GitHub webhook secret is not configured");
    }

    private boolean isVerificationEnabled() {
        String env = System.getenv("GITHUB_WEBHOOK_VERIFY");
        if (env == null || env.isBlank()) {
            // Default to true if secret is defined to be safe, or check environment
            throw new IllegalStateException("GITHUB_WEBHOOK_VERIFY is not configured");
        }
        return env.equalsIgnoreCase("1") || env.equalsIgnoreCase("true") || env.equalsIgnoreCase("yes");
    }

    private boolean validateSignature(byte[] payload, String signatureHeader, String secret) {
        if (!signatureHeader.startsWith(SIGNATURE_PREFIX)) {
            return false;
        }

        String signature = signatureHeader.substring(SIGNATURE_PREFIX.length());
        String expected = computeHmac256(payload, secret);
        return constantTimeEquals(signature, expected);
    }

    private String computeHmac256(byte[] payload, String secret) {
        try {
            Mac mac = Mac.getInstance(HMAC_SHA256);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_SHA256));
            byte[] digest = mac.doFinal(payload);
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("Unable to compute HMAC-SHA256", e);
        }
    }

    private boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null || a.length() != b.length()) {
            return false;
        }
        int result = 0;
        for (int i = 0; i < a.length(); i++) {
            result |= a.charAt(i) ^ b.charAt(i);
        }
        return result == 0;
    }

    private JobRequest parseJobRequest(JsonNode payload, String eventType) {
        JobRequest request = new JobRequest();
        request.setTimestamp(Instant.now());

        switch (eventType) {
            case "push" -> parsePushPayload(payload, request);
            case "pull_request" -> parsePullRequestPayload(payload, request);
            default -> throw new IllegalArgumentException("Unsupported event type: " + eventType);
        }

        return request;
    }

    private void parsePushPayload(JsonNode payload, JobRequest request) {
        String repository = payload.path("repository").path("full_name").asText(null);
        String branch = parseBranchRef(payload.path("ref").asText(null));
        String commit = payload.path("after").asText(null);

        request.setBuildId(UUID.randomUUID());
        request.setRepository(repository);
        request.setBranch(branch != null ? branch : request.getBranch());
        request.setCommit(commit);
        request.setGithubEventMetadata(buildGitHubEventMetadata(payload, repository, branch, commit, "push"));
    }

    private void parsePullRequestPayload(JsonNode payload, JobRequest request) {
        JsonNode pr = payload.path("pull_request");
        JsonNode head = pr.path("head");
        JsonNode repo = head.path("repo");

        String repository = repo.path("full_name").asText(null);
        String branch = head.path("ref").asText(null);
        String commit = head.path("sha").asText(null);

        request.setBuildId(UUID.randomUUID());
        request.setRepository(repository);
        request.setBranch(branch != null ? branch : request.getBranch());
        request.setCommit(commit);
        request.setGithubEventMetadata(buildGitHubEventMetadata(payload, repository, branch, commit, "pull_request"));
    }

    private GitHubEventMetadata buildGitHubEventMetadata(JsonNode payload, String repository, String branch, String commit, String eventType) {
        GitHubEventMetadata metadata = new GitHubEventMetadata();
        metadata.setRepository(repository);
        metadata.setHeadBranch(branch);
        metadata.setHeadSha(commit);

        JsonNode pr = payload.path("pull_request");
        if (!pr.isMissingNode() && !pr.isNull()) {
            metadata.setId(pr.path("id").asLong());
            metadata.setNumber(pr.path("number").asInt());
            metadata.setTitle(pr.path("title").asText(null));
            metadata.setBody(pr.path("body").asText(null));
            metadata.setState(pr.path("state").asText("open"));
            metadata.setAuthorLogin(pr.path("user").path("login").asText(null));
            metadata.setBaseBranch(pr.path("base").path("ref").asText(null));
            metadata.setBaseSha(pr.path("base").path("sha").asText(null));
            metadata.setMergeCommitSha(pr.path("merge_commit_sha").asText(null));
            metadata.setMerged(pr.path("merged").asBoolean(false));
            metadata.setCreatedAt(parseInstant(pr, "created_at"));
            metadata.setUpdatedAt(parseInstant(pr, "updated_at"));
            metadata.setClosedAt(parseInstant(pr, "closed_at"));
            metadata.setMergedAt(parseInstant(pr, "merged_at"));
        }

        JsonNode headCommit = payload.path("head_commit");
        if (!headCommit.isMissingNode() && !headCommit.isNull()) {
            if (metadata.getTitle() == null) {
                metadata.setTitle(headCommit.path("message").asText(null));
            }
            if (metadata.getBody() == null) {
                metadata.setBody(headCommit.path("url").asText(null));
            }
            if (metadata.getAuthorLogin() == null) {
                metadata.setAuthorLogin(headCommit.path("author").path("username").asText(null));
            }
            if (metadata.getCreatedAt() == null) {
                metadata.setCreatedAt(parseInstant(headCommit, "timestamp"));
            }
        }

        if (metadata.getAuthorLogin() == null) {
            metadata.setAuthorLogin(payload.path("pusher").path("name").asText(null));
        }

        if (metadata.getTitle() == null) {
            JsonNode headCommitMessage = payload.path("head_commit").path("message");
            if (!headCommitMessage.isMissingNode()) {
                metadata.setTitle(headCommitMessage.asText(null));
            }
        }

        if (metadata.getBody() == null) {
            metadata.setBody(payload.path("compare").asText(null));
        }

        JsonNode repositoryNode = payload.path("repository");
        if (!repositoryNode.isMissingNode() && repositoryNode.hasNonNull("id")) {
            metadata.setId(repositoryNode.path("id").asLong());
        }

        if (metadata.getState() == null) {
            metadata.setState(eventType);
        }
        return metadata;
    }

    private String parseBranchRef(String ref) {
        if (ref == null || ref.isBlank()) {
            return null;
        }
        final String prefix = "refs/heads/";
        return ref.startsWith(prefix) ? ref.substring(prefix.length()) : ref;
    }

    private Instant parseInstant(JsonNode node, String fieldName) {
        String value = node.path(fieldName).asText(null);
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Instant.parse(value);
        } catch (DateTimeParseException e) {
            return null;
        }
    }
}
