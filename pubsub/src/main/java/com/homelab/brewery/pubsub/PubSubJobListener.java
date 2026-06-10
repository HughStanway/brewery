package com.homelab.brewery.pubsub;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.homelab.brewery.common.objects.requests.JobRequest;
import com.homelab.brewery.common.service.JobTriggerService;
import com.google.cloud.pubsub.v1.Subscriber;
import com.google.cloud.spring.pubsub.core.PubSubTemplate;
import com.google.cloud.spring.pubsub.PubSubAdmin;
import com.google.cloud.spring.pubsub.support.BasicAcknowledgeablePubsubMessage;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@Slf4j
public class PubSubJobListener {

    private final PubSubTemplate pubSubTemplate;
    private final JobTriggerService jobTriggerService;
    private final ObjectMapper objectMapper;
    private final String subscriptionId;
    private final PubSubAdmin pubSubAdmin;
    
    private Subscriber subscriber;

    public PubSubJobListener(
            PubSubTemplate pubSubTemplate,
            JobTriggerService jobTriggerService,
            ObjectMapper objectMapper,
            @Value("${brewery.pubsub.subscription-id:brewery-jobs-sub}") String subscriptionId,
            PubSubAdmin pubSubAdmin) {
        this.pubSubTemplate = pubSubTemplate;
        this.jobTriggerService = jobTriggerService;
        this.objectMapper = objectMapper;
        this.subscriptionId = subscriptionId;
        this.pubSubAdmin = pubSubAdmin;
    }

    @PostConstruct
    public void startListening() {
        try {
            String topicId = "brewery-jobs";
            log.info("Ensuring Pub/Sub topic '{}' and subscription '{}' exist...", topicId, subscriptionId);
            try {
                if (pubSubAdmin.getTopic(topicId) == null) {
                    pubSubAdmin.createTopic(topicId);
                    log.info("Created Pub/Sub topic: {}", topicId);
                }
            } catch (Exception e) {
                log.debug("Topic might already exist or failed to query: {}", e.getMessage());
            }
            try {
                if (pubSubAdmin.getSubscription(subscriptionId) == null) {
                    pubSubAdmin.createSubscription(subscriptionId, topicId);
                    log.info("Created Pub/Sub subscription: {}", subscriptionId);
                }
            } catch (Exception e) {
                log.debug("Subscription might already exist or failed to query: {}", e.getMessage());
            }
        } catch (Exception e) {
            log.warn("Could not verify/create Pub/Sub topic and subscription: {}", e.getMessage());
        }

        log.info("Starting Google Cloud Pub/Sub subscriber. subscriptionId={}", subscriptionId);
        try {
            this.subscriber = pubSubTemplate.subscribe(subscriptionId, this::handleMessage);
        } catch (Exception e) {
            log.error("Failed to start Pub/Sub subscription listener. subscriptionId={}", subscriptionId, e);
        }
    }

    private void handleMessage(BasicAcknowledgeablePubsubMessage message) {
        byte[] payloadBytes = message.getPubsubMessage().getData().toByteArray();
        String messageId = message.getPubsubMessage().getMessageId();
        
        log.debug("Received Pub/Sub message. messageId={}", messageId);

        try {
            // Retrieve custom attributes if forwarding raw webhook events
            String githubEvent = message.getPubsubMessage().getAttributesOrDefault("x-github-event", null);

            if (githubEvent != null) {
                // Scenario A: Raw payload passthrough
                log.info("Processing raw GitHub event via Pub/Sub. eventType={}, messageId={}", githubEvent, messageId);
                jobTriggerService.triggerFromRawPayload(payloadBytes, githubEvent);
            } else {
                // Scenario B: Pre-processed JobRequest
                log.info("Processing parsed JobRequest via Pub/Sub. messageId={}", messageId);
                JobRequest jobRequest = objectMapper.readValue(payloadBytes, JobRequest.class);
                jobTriggerService.triggerJob(jobRequest);
            }

            // Acknowledge successful processing
            message.ack();
            log.debug("Acknowledged Pub/Sub message. messageId={}", messageId);

        } catch (IllegalArgumentException | IOException e) {
            log.error("Malformed payload received. messageId={}, error={}", messageId, e.getMessage());
            // Acknowledge malformed payloads to avoid infinite reprocessing loops
            message.ack();
        } catch (Exception e) {
            log.error("Transient error processing message. Nacking for retry. messageId={}", messageId, e);
            message.nack();
        }
    }

    @PreDestroy
    public void stopListening() {
        if (subscriber != null) {
            try {
                subscriber.stopAsync().awaitTerminated();
                log.info("Closed Pub/Sub subscription flow.");
            } catch (Exception e) {
                log.error("Error closing Pub/Sub subscription flow", e);
            }
        }
    }
}
