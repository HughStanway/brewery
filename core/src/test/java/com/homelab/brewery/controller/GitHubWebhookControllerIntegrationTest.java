package com.homelab.brewery.controller;

import com.homelab.brewery.common.objects.requests.JobResponse;
import com.homelab.brewery.common.service.JobTriggerService;
import com.homelab.brewery.core.security.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(GitHubWebhookController.class)
@Import(SecurityConfig.class)
@TestPropertySource(properties = "brewery.github.webhook-secret=test-integration-secret")
public class GitHubWebhookControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private JobTriggerService jobTriggerService;

    private final String secret = "test-integration-secret";

    @Test
    public void testPingWebhookViaMockMvc() throws Exception {
        byte[] payload = "{\"zen\":\"Design for failure.\"}".getBytes(StandardCharsets.UTF_8);
        String signature = calculateHmac(payload, secret);

        mockMvc.perform(post("/api/webhooks/github")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-GitHub-Event", "ping")
                .header("X-Hub-Signature-256", signature)
                .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("pong"));
    }

    @Test
    public void testUnauthorizedInvalidSignatureViaMockMvc() throws Exception {
        byte[] payload = "{\"ref\":\"refs/heads/main\"}".getBytes(StandardCharsets.UTF_8);

        mockMvc.perform(post("/api/webhooks/github")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-GitHub-Event", "push")
                .header("X-Hub-Signature-256", "sha256=badsignature")
                .content(payload))
                .andExpect(status().isUnauthorized());
    }

    @Test
    public void testPushWebhookViaMockMvc() throws Exception {
        byte[] payload = "{\"ref\":\"refs/heads/main\",\"after\":\"1ae63d712345\"}".getBytes(StandardCharsets.UTF_8);
        String signature = calculateHmac(payload, secret);

        JobResponse mockResponse = new JobResponse();
        UUID buildId = UUID.randomUUID();
        mockResponse.setBuildId(buildId);
        mockResponse.setRepository("myteam/myrepo");
        mockResponse.setBranch("main");
        mockResponse.setCommit("1ae63d712345");

        when(jobTriggerService.triggerFromRawPayload(any(), eq("push"))).thenReturn(mockResponse);

        mockMvc.perform(post("/api/webhooks/github")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-GitHub-Event", "push")
                .header("X-Hub-Signature-256", signature)
                .content(payload))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.message").value("Accepted"))
                .andExpect(jsonPath("$.repository").value("myteam/myrepo"));
    }

    private String calculateHmac(byte[] payload, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec key = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        mac.init(key);
        return "sha256=" + HexFormat.of().formatHex(mac.doFinal(payload));
    }
}
