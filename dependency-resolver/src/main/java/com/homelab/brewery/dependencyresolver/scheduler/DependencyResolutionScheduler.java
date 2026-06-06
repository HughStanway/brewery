package com.homelab.brewery.dependencyresolver.scheduler;

import com.homelab.brewery.dependencyresolver.service.DependencyResolverService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DependencyResolutionScheduler {

    private final DependencyResolverService dependencyResolverService;

    @Scheduled(fixedDelayString = "${brewery.dependency-resolver.scheduler.delay-ms:30000}", initialDelay = 5000)
    public void resolveArtifactDependencies() {
        log.debug("Dependency Resolution Scheduler triggered.");
        try {
            dependencyResolverService.resolveUnresolvedArtifacts();
        } catch (Exception e) {
            log.error("Error running dependency resolution background job", e);
        }
    }
}
