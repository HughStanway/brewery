package com.homelab.brewery.common.service;

import com.homelab.brewery.common.objects.requests.JobRequest;
import com.homelab.brewery.common.objects.requests.JobResponse;

public interface JobTriggerService {
    /**
     * Standard entrypoint for parsed job requests.
     */
    JobResponse triggerJob(JobRequest jobRequest);

    /**
     * Entrypoint for raw GitHub webhook payloads (validates signature + parses).
     */
    JobResponse triggerFromWebhookPayload(byte[] rawPayload, String eventType, String signatureHeader);
}
