package com.homelab.brewery.common.objects.requests;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

import com.homelab.brewery.common.objects.github.PullRequest;

@Data
@NoArgsConstructor
public class JobRequest {
    private Instant timestamp;
    private String repository;
    private String commit;
    private String branch = "main";
    private PullRequest pullRequestMetadata;
}
