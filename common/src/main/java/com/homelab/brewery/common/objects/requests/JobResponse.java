package com.homelab.brewery.common.objects.requests;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
public class JobResponse {
    private String status;
    private UUID buildId;
    private String repository;
    private String commit;
    private String branch = "main";
}
