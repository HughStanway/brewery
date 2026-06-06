package com.homelab.brewery.cascaderebuild.scheduler;

import com.homelab.brewery.cascaderebuild.service.CascadeRebuildService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class CascadeRebuildScheduler {

    private final CascadeRebuildService cascadeRebuildService;

    @Scheduled(fixedDelayString = "${brewery.cascade.scheduler.delay-ms:60000}", initialDelay = 10000)
    public void processPendingCascadeTasks() {
        log.debug("Cascade Rebuild Scheduler triggered.");
        try {
            cascadeRebuildService.processPendingTasks();
        } catch (Exception e) {
            log.error("Error running cascade rebuild background job", e);
        }
    }
}
