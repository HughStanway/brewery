package com.homelab.brewery.deploymentengine.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "brewery.deployment.komodo")
@Data
public class KomodoConfig {
    private String baseUrl = "http://localhost:9120";
    private String apiKey;
    private String apiSecret;
    private int timeoutSeconds = 30;
}
