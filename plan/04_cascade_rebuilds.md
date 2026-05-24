# Phase 4: Cascade Rebuild System

**Duration:** 1-2 weeks  
**Focus:** Automatic propagation of dependency updates  
**Deliverables:** Updating a dependency triggers dependent rebuilds automatically

**Depends on:** Phase 1, 2, 3 (build system, registry, and dependency tracking)

---

## 1. Architecture Overview

### 1.1 Component Diagram

```
Artifact Updated
(new version available)
  │
  ▼
┌─────────────────────────────────────────┐
│   Cascade Rebuild Trigger                │
│   - Identify dependents                  │
│   - Check version compatibility          │
│   - Create rebuild tasks                 │
└──────────────┬──────────────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │  Rebuild Queue       │
    │  (prioritized)       │
    └──────────┬───────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│   Build Engine                           │
│   (Phase 1: executes builds)             │
└──────────────┬──────────────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │  Registry            │
    │  (Phase 2)           │
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────┐
    │  Cascade Continues   │
    │  (if successful)     │
    └──────────────────────┘

Event Stream:
  ArtifactUpdated
    → Find dependents
    → Check version ranges
    → Enqueue rebuilds
    → Execute builds
    → Emit new ArtifactUpdated
    → Cascade continues...
```

### 1.2 Cascade Flow

```
Scenario: core-crypto@2.1.0 is released

Step 1: Trigger
  Event: ArtifactCreated { core-crypto@2.1.0 }

Step 2: Find Dependents
  Query: WHO depends on core-crypto?
  Answer: auth-lib@1.4.2, api-service@0.5.0

Step 3: Check Compatibility
  auth-lib@1.4.2 requires core-crypto@^2.0.0 ✓ (2.1.0 matches)
  api-service@0.5.0 requires core-crypto@>=1.5.0 ✓ (2.1.0 matches)

Step 4: Enqueue Rebuilds
  Rebuild: auth-lib (main branch)
  Rebuild: api-service (main branch)

Step 5: Execute Rebuilds
  Build 1: auth-lib@1.4.3-rcN (with core-crypto@2.1.0)
  Build 2: api-service@0.5.1-rcN (with core-crypto@2.1.0)

Step 6: Publish Results
  Event: ArtifactCreated { auth-lib@1.4.3-rc1 }
  Event: ArtifactCreated { api-service@0.5.1-rc1 }

Step 7: Continue Cascade
  Find dependents of auth-lib@1.4.3-rc1
  Find dependents of api-service@0.5.1-rc1
  (repeat...)

Step 8: Resolution
  Mark release candidates as ready
  Update related deployment configs
```

---

## 2. Cascade Configuration

### 2.1 Per-Repository Cascade Policy (cascade.yml)

```yaml
# In repository root or .foundry/cascade.yml

cascade:
  # Automatic cascade enabled?
  enabled: true
  
  # Strategy: "immediate", "scheduled", "manual"
  strategy: "immediate"
  
  # Only cascade on tagged releases (not commits)
  only_on_tags: false
  
  # Time to wait before triggering cascade (to batch updates)
  # Example: if multiple dependencies update within 5 mins, batch them
  batch_window_seconds: 300
  
  # Maximum cascade depth (prevent infinite loops)
  max_cascade_depth: 5
  
  # Skip cascade for certain dependents
  exclude_from_cascade:
    - "test-artifact"
    - "experimental-lib"
  
  # Rebuild strategy
  rebuild:
    # Use pinned dependency versions or latest from range?
    use_pinned_versions: false
    
    # Build on which branch?
    branch: "main"
    
    # Build strategy: "always", "if_needed", "manual"
    strategy: "if_needed"

  # Notification strategy
  notifications:
    enabled: true
    on_cascade_start: true
    on_rebuild_complete: true
    on_failures: true
    
  # Rollback on failure?
  rollback_on_failure: false
```

### 2.2 Database Schema for Cascade Tracking

```sql
-- Rebuild chains (track cascade sessions)
CREATE TABLE rebuild_chains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  root_artifact_id UUID NOT NULL REFERENCES artifacts(id),
  root_cause TEXT NOT NULL, -- "dependency_updated", "manual_trigger"
  status VARCHAR(50) DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'partial_success', 'failed')),
  depth INT DEFAULT 0,
  parent_chain_id UUID REFERENCES rebuild_chains(id),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  UNIQUE(root_artifact_id, started_at)
);

CREATE INDEX idx_chains_root ON rebuild_chains(root_artifact_id);
CREATE INDEX idx_chains_status ON rebuild_chains(status);
CREATE INDEX idx_chains_parent ON rebuild_chains(parent_chain_id);

-- Cascade tasks (individual rebuild tasks in a chain)
CREATE TABLE cascade_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id UUID NOT NULL REFERENCES rebuild_chains(id) ON DELETE CASCADE,
  artifact_id UUID NOT NULL REFERENCES artifacts(id),
  dependency_artifact_id UUID NOT NULL REFERENCES artifacts(id),
  reason TEXT NOT NULL, -- "dependency_updated_to_X"
  status VARCHAR(50) DEFAULT 'pending'
    CHECK (status IN ('pending', 'building', 'success', 'failed', 'skipped')),
  build_id UUID REFERENCES builds(id),
  priority INT DEFAULT 0,
  attempted_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cascade_tasks_chain ON cascade_tasks(chain_id);
CREATE INDEX idx_cascade_tasks_status ON cascade_tasks(status);
CREATE INDEX idx_cascade_tasks_artifact ON cascade_tasks(artifact_id);
```

---

## 3. Cascade Trigger Mechanisms

### 3.1 Event-Driven Cascade

```java
@Component
public class CascadeEventListener {
  
  @Autowired
  private CascadeRebuildService cascadeService;
  
  @Autowired
  private DependencyService dependencyService;
  
  /**
   * Listen for artifact creation events
   */
  @EventListener
  public void onArtifactCreated(ArtifactCreatedEvent event) {
    
    logger.info("Artifact created: {} v{}", event.artifactName(), event.version());
    
    try {
      // Find all artifacts that depend on this one
      List<Artifact> dependents = dependencyService.findDependents(
        event.artifactName(),
        event.version()
      );
      
      if (dependents.isEmpty()) {
        logger.debug("No dependents found for {}", event.artifactName());
        return;
      }
      
      logger.info("Found {} dependents for {}", dependents.size(), event.artifactName());
      
      // Check if cascade is enabled for these dependents
      List<Artifact> cascadeCandidates = dependents.stream()
        .filter(this::isCascadeEnabled)
        .collect(Collectors.toList());
      
      if (cascadeCandidates.isEmpty()) {
        logger.debug("No cascade-enabled dependents");
        return;
      }
      
      // Create rebuild chain
      RebuildChain chain = cascadeService.createRebuildChain(
        event.artifactId(),
        "dependency_updated",
        event.artifactName() + "@" + event.version()
      );
      
      // Enqueue cascade tasks
      cascadeService.enqueueCascadeRebuild(chain, cascadeCandidates);
      
      logger.info("Cascade rebuild initiated for {} artifacts", cascadeCandidates.size());
      
    } catch (Exception e) {
      logger.error("Error initiating cascade rebuild", e);
    }
  }
  
  private boolean isCascadeEnabled(Artifact dependent) {
    // Check artifact's cascade.yml or default policy
    CascadePolicy policy = getCascadePolicy(dependent);
    return policy.isEnabled();
  }
}
```

### 3.2 Scheduled Cascade Batching

```java
@Component
public class CascadeBatchProcessor {
  
  @Scheduled(cron = "0 */5 * * * *")  // Every 5 minutes
  public void processPendingCascades() {
    
    // Find all pending cascade tasks
    List<CascadeTask> pending = cascadeTaskRepository
      .findAllByStatus("pending")
      .stream()
      .sorted(Comparator.comparing(CascadeTask::getPriority).reversed())
      .collect(Collectors.toList());
    
    if (pending.isEmpty()) {
      return;
    }
    
    logger.info("Processing {} pending cascade tasks", pending.size());
    
    for (CascadeTask task : pending) {
      try {
        processCascadeTask(task);
      } catch (Exception e) {
        logger.error("Error processing cascade task {}", task.getId(), e);
        task.setStatus("failed");
        task.setErrorMessage(e.getMessage());
        cascadeTaskRepository.save(task);
      }
    }
  }
  
  private void processCascadeTask(CascadeTask task) throws Exception {
    
    Artifact dependent = artifactRepository.findById(task.getArtifactId());
    
    // Check if version range is still compatible
    if (!isStillCompatible(dependent, task.getDependencyArtifactId())) {
      logger.info("Task {} skipped: version no longer compatible", task.getId());
      task.setStatus("skipped");
      cascadeTaskRepository.save(task);
      return;
    }
    
    // Enqueue build
    Build build = buildService.enqueueBuild(
      dependent.getRepository(),
      dependent.getBranch(),
      "Cascade rebuild (dependency update)"
    );
    
    task.setBuildId(build.getId());
    task.setStatus("building");
    task.setAttemptedAt(Instant.now());
    cascadeTaskRepository.save(task);
    
    logger.info("Cascade rebuild {} enqueued for {}", build.getId(), dependent.getName());
  }
  
  private boolean isStillCompatible(Artifact dependent, UUID dependencyId) {
    // Check if the dependent still requires the dependency
    List<Dependency> deps = dependencyService.getDependencies(dependent.getId());
    
    for (Dependency dep : deps) {
      if (dep.getDependencyArtifactId().equals(dependencyId)) {
        return true;
      }
    }
    
    return false;
  }
}
```

---

## 4. Cascade Service Implementation

### 4.1 Main Cascade Rebuild Service

```java
@Service
public class CascadeRebuildService {
  
  @Autowired
  private RebuildChainRepository chainRepository;
  
  @Autowired
  private CascadeTaskRepository taskRepository;
  
  @Autowired
  private DependencyService dependencyService;
  
  @Autowired
  private VersionRangeResolver versionResolver;
  
  @Autowired
  private BuildService buildService;
  
  /**
   * Create a new rebuild chain
   */
  public RebuildChain createRebuildChain(
    UUID rootArtifactId,
    String cause,
    String causeDescription
  ) {
    RebuildChain chain = new RebuildChain();
    chain.setRootArtifactId(rootArtifactId);
    chain.setRootCause(cause);
    chain.setCauseDescription(causeDescription);
    chain.setStatus("running");
    chain.setStartedAt(Instant.now());
    chain.setDepth(0);
    
    return chainRepository.save(chain);
  }
  
  /**
   * Enqueue cascade rebuild tasks
   */
  public void enqueueCascadeRebuild(
    RebuildChain chain,
    List<Artifact> dependents
  ) {
    int priority = 100; // Start with high priority
    
    for (Artifact dependent : dependents) {
      
      // Get version resolution info
      String reason = String.format(
        "Dependency %s updated",
        getDependencyName(chain)
      );
      
      CascadeTask task = new CascadeTask();
      task.setChainId(chain.getId());
      task.setArtifactId(dependent.getId());
      task.setDependencyArtifactId(getRootArtifactId(chain));
      task.setReason(reason);
      task.setStatus("pending");
      task.setPriority(priority--);
      
      taskRepository.save(task);
      
      logger.info(
        "Enqueued cascade task: {} depends on trigger artifact",
        dependent.getName()
      );
    }
  }
  
  /**
   * Mark cascade chain as complete
   */
  public void completeCascadeChain(
    RebuildChain chain,
    String finalStatus
  ) {
    chain.setStatus(finalStatus);
    chain.setCompletedAt(Instant.now());
    chainRepository.save(chain);
    
    // Emit cascade completion event
    logger.info(
      "Cascade chain {} completed with status: {}",
      chain.getId(),
      finalStatus
    );
  }
  
  /**
   * Get cascade chain statistics
   */
  public CascadeStatistics getChainStatistics(UUID chainId) {
    RebuildChain chain = chainRepository.findById(chainId).orElseThrow();
    
    List<CascadeTask> tasks = taskRepository.findByChainId(chainId);
    
    CascadeStatistics stats = new CascadeStatistics();
    stats.setTotalTasks(tasks.size());
    stats.setSuccessfulTasks((int) tasks.stream()
      .filter(t -> "success".equals(t.getStatus()))
      .count());
    stats.setFailedTasks((int) tasks.stream()
      .filter(t -> "failed".equals(t.getStatus()))
      .count());
    stats.setSkippedTasks((int) tasks.stream()
      .filter(t -> "skipped".equals(t.getStatus()))
      .count());
    stats.setDuration(
      Duration.between(chain.getStartedAt(), chain.getCompletedAt())
    );
    
    return stats;
  }
}
```

---

## 5. Cascade Conflict Resolution

### 5.1 Conflict Detection During Cascade

```java
@Service
public class CascadeConflictResolver {
  
  /**
   * Check if cascade would create conflicts
   */
  public CascadeConflictReport analyzeCascadeImpact(
    UUID triggerArtifactId,
    List<Artifact> affectedDependents
  ) throws DependencyResolutionException {
    
    CascadeConflictReport report = new CascadeConflictReport();
    
    // Simulate building each dependent with new dependency version
    for (Artifact dependent : affectedDependents) {
      
      // Get current dependency graph
      DependencyGraph currentGraph = dependencyService.buildGraph(
        dependent.getName(),
        dependent.getVersion()
      );
      
      // Simulate with new dependency version
      DependencyGraph simulatedGraph = simulateCascade(
        dependent,
        triggerArtifactId,
        currentGraph
      );
      
      // Check for conflicts
      List<DependencyConflict> conflicts = conflictDetector
        .detectConflicts(List.of(dependent), simulatedGraph);
      
      if (!conflicts.isEmpty()) {
        report.addPotentialConflict(dependent.getName(), conflicts);
      }
    }
    
    return report;
  }
  
  /**
   * Suggest resolution for cascade conflicts
   */
  public CascadeResolution suggestResolution(CascadeConflictReport report) {
    
    CascadeResolution resolution = new CascadeResolution();
    
    for (Map.Entry<String, List<DependencyConflict>> entry 
      : report.getConflicts().entrySet()) {
      
      String dependentName = entry.getKey();
      List<DependencyConflict> conflicts = entry.getValue();
      
      for (DependencyConflict conflict : conflicts) {
        
        // Option 1: Wait for dependent to update its constraints
        ResolutionOption option1 = new ResolutionOption();
        option1.setType("wait_for_dependent_update");
        option1.setDescription(String.format(
          "Wait for %s to update its dependency constraints",
          dependentName
        ));
        option1.setRiskLevel("low");
        
        // Option 2: Delay cascade
        ResolutionOption option2 = new ResolutionOption();
        option2.setType("delay_cascade");
        option2.setDescription(String.format(
          "Delay cascade rebuild of %s until compatible version available",
          dependentName
        ));
        option2.setRiskLevel("medium");
        
        // Option 3: Partial upgrade (older compatible version)
        ResolutionOption option3 = new ResolutionOption();
        option3.setType("partial_upgrade");
        option3.setDescription(String.format(
          "Upgrade to older compatible version instead"
        ));
        option3.setRiskLevel("low");
        
        resolution.addOptions(List.of(option1, option2, option3));
      }
    }
    
    return resolution;
  }
}
```

---

## 6. Cascade API

### 6.1 Manually Trigger Cascade

**POST** `/api/cascade/trigger/{name}/{version}`

```json
Request:
{
  "reason": "manual_trigger",
  "only_direct_dependents": false,
  "max_depth": 5,
  "execute_immediately": true
}

Response:
{
  "chain_id": "uuid-chain-123",
  "root_artifact": "core-crypto@2.1.0",
  "initial_dependents_count": 3,
  "status": "running",
  "started_at": "2026-05-22T14:30:00Z"
}
```

### 6.2 Get Cascade Chain Status

**GET** `/api/cascade/chains/{chain_id}`

```json
Response:
{
  "chain_id": "uuid-chain-123",
  "root_artifact": "core-crypto@2.1.0",
  "status": "running",
  "started_at": "2026-05-22T14:30:00Z",
  "completed_at": null,
  "statistics": {
    "total_tasks": 5,
    "successful": 2,
    "failed": 0,
    "pending": 3,
    "skipped": 0
  },
  "tasks": [
    {
      "task_id": "task-1",
      "artifact": "auth-lib@1.4.2",
      "status": "success",
      "new_version_built": "1.4.3-rc1",
      "completed_at": "2026-05-22T14:35:00Z"
    },
    {
      "task_id": "task-2",
      "artifact": "api-service@0.5.0",
      "status": "building",
      "build_id": "build-456"
    }
  ]
}
```

### 6.3 Cancel Cascade Chain

**POST** `/api/cascade/chains/{chain_id}/cancel`

```
Response: 200 OK
```

### 6.4 Get Cascade Impact Analysis

**GET** `/api/cascade/impact/{name}/{version}?dry_run=true`

```json
Response:
{
  "root_artifact": "core-crypto@2.1.0",
  "direct_dependents": 3,
  "transitive_dependents": 8,
  "potential_conflicts": 1,
  "estimated_rebuild_time_minutes": 15,
  "affected_artifacts": [
    {
      "name": "auth-lib",
      "current_version": "1.4.2",
      "would_rebuild": true
    }
  ],
  "recommendations": [
    "Proceed with cascade"
  ]
}
```

---

## 7. Testing Strategy

### 7.1 Unit Tests

```java
@Test
void testCascadeTrigger() { }

@Test
void testDependentIdentification() { }

@Test
void testVersionRangeCompatibilityCheck() { }

@Test
void testCascadeDepthLimiting() { }

@Test
void testConflictDetectionInCascade() { }

@Test
void testBatchingOfCascadeTasks() { }
```

### 7.2 Integration Tests

```java
@Test
void testEndToEndCascadeRebuild() { }

@Test
void testCascadeWithConflicts() { }

@Test
void testCascadeChainCompletion() { }

@Test
void testCascadeCancellation() { }
```

---

## 8. Monitoring & Alerts

### 8.1 Metrics

```
cascade_chains_total: Total cascade chains initiated
cascade_tasks_duration_seconds: Time taken per cascade task
cascade_failures_total: Failed cascade tasks
cascade_conflicts_detected: Conflicts detected during cascade
cascade_depth_max: Maximum cascade depth reached
```

### 8.2 Alerts

```yaml
- Alert: CascadeChainFailed
  Condition: cascade_chain_status == "failed"
  Action: Notify maintainers

- Alert: CascadeDepthExceeded
  Condition: cascade_depth >= max_depth
  Action: Stop cascade, notify

- Alert: ConflictDetectedInCascade
  Condition: cascade_conflicts_detected > 0
  Action: Review and manual approval required
```

---

## 9. Success Criteria

- [ ] Artifact creation triggers cascade detection
- [ ] Dependent artifacts identified correctly
- [ ] Version compatibility checked before rebuild
- [ ] Cascade depth limited to prevent infinite loops
- [ ] Multiple concurrent cascades handled
- [ ] Conflicts detected and reported
- [ ] Cascade tasks queued and executed in order
- [ ] Cascade completion tracked and reported
- [ ] Manual cascade trigger works
- [ ] Cascade can be cancelled

---

## 10. Next Steps

1. Implement event listener for artifact creation
2. Build cascade task enqueueing logic
3. Create rebuild batching processor
4. Implement conflict detection for cascades
5. Build cascade APIs
6. Set up metrics and monitoring
7. Write comprehensive tests
8. Proceed to [Phase 5: Dashboard UI](05_dashboard_ui.md) and [Phase 6: Deployment Engine](06_deployment_engine.md)
