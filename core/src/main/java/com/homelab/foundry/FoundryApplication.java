package com.homelab.foundry;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FoundryApplication {

    public static void main(String[] args) {
        SpringApplication.run(FoundryApplication.class, args);
    }
}
