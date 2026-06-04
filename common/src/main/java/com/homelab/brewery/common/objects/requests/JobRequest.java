package com.homelab.brewery.common.objects.requests;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;
import java.time.Instant;

import com.homelab.brewery.common.objects.github.GitHubEventMetadata;

@Data
@NoArgsConstructor
public class JobRequest {
    private Instant timestamp;
    private UUID buildId;
    private String repository;
    private String commit;
    private String branch;
    private GitHubEventMetadata githubEventMetadata;
}
