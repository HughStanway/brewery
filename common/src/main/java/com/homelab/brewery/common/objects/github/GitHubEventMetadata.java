package com.homelab.brewery.common.objects.github;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
public class GitHubEventMetadata {
    private Long id;
    private Integer number;

    private String repository;
    private String title;
    private String body;
    private String state = "open";
    private String authorLogin;

    private String baseBranch;
    private String baseSha;
    private String headBranch;
    private String headSha;
    private String mergeCommitSha;

    private boolean merged;

    private Instant createdAt;
    private Instant updatedAt;
    private Instant closedAt;
    private Instant mergedAt;
}
