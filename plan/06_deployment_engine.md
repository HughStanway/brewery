# Phase 6: Deployment Engine

**Duration:** 2 weeks  
**Focus:** Docker Compose-based service deployment and rollback  
**Deliverables:** Versioned deployments with health tracking and rollback capability

**Depends on:** Phase 1 & 2 (artifacts available), parallel to Phase 5

---

## 1. Architecture Overview

### 1.1 Component Diagram

```
Deployment Request
  │
  ▼
┌─────────────────────────────────┐
│  Deployment Orchestrator        │
│  - Validate configuration       │
│  - Plan deployment              │
│  - Execute Docker Compose       │
│  - Monitor health               │
└──────────────┬──────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌──────────────┐  ┌──────────────────┐
│  Docker      │  │  PostgreSQL      │
│  Compose     │  │  Deployment      │
│  Runtime     │  │  History         │
└──────────────┘  └──────────────────┘
    │
    ▼
┌──────────────────────────────────┐
│  Health Check & Monitoring       │
│  - Container health              │
│  - Endpoint availability         │
│  - Resource usage                │
│  - Automatic remediation         │
└──────────────────────────────────┘
```

### 1.2 Deployment Lifecycle

```
Plan Phase:
  1. Parse deployment spec
  2. Resolve artifact versions
  3. Fetch artifacts
  4. Generate docker-compose.yml
  5. Validate configuration
  6. Dry-run (optional)

Deploy Phase:
  1. Backup current config
  2. Pull images / load artifacts
  3. Run: docker-compose up -d
  4. Wait for containers ready
  5. Run health checks
  6. Update database

Monitor Phase:
  1. Continuous health polling
  2. Log collection
  3. Resource monitoring
  4. Auto-remediation on failure

Rollback Phase (if needed):
  1. Restore previous config
  2. Run: docker-compose up -d
  3. Verify health
  4. Update database
```

---

## 2. Deployment Configuration Model

### 2.1 Deployment Spec (YAML)

```yaml
# deployment.yml
version: 1

deployment:
  name: "production-api"
  description: "Production API stack"
  
services:
  api-server:
    artifact: "api-server@1.2.3"
    type: "docker"  # or "jar", "binary", "python-app"
    replicas: 2
    environment:
      LOG_LEVEL: "info"
      DB_HOST: "postgres:5432"
      REDIS_HOST: "redis:6379"
    ports:
      - "8080:8080"
    healthCheck:
      endpoint: "GET /health"
      interval: 10s
      timeout: 5s
      unhealthyThreshold: 3
    resources:
      cpus: "0.5"
      memory: "512m"
    depends_on:
      - postgres
      - redis
  
  postgres:
    artifact: "postgres:15"
    type: "docker"
    environment:
      POSTGRES_PASSWORD_FILE: "/run/secrets/db_password"
    volumes:
      - "postgres_data:/var/lib/postgresql/data"
    ports:
      - "5432:5432"
    healthCheck:
      command: "pg_isready -U postgres"
      interval: 5s
      timeout: 3s
  
  redis:
    artifact: "redis:7"
    type: "docker"
    ports:
      - "6379:6379"
    healthCheck:
      command: "redis-cli ping"
      interval: 5s
      timeout: 3s

volumes:
  postgres_data:
    driver: local

networks:
  default:
    driver: bridge

# Deployment policies
policies:
  strategy: "rolling"  # rolling or blue-green
  maxSurge: 1
  maxUnavailable: 0
  waitForHealthy: true
  healthCheckTimeout: 60s
  
# Rollback policy
rollback:
  automatic: true
  onFailure: true
  keepPreviousVersions: 3

# Notification
notifications:
  enabled: true
  channels:
    - type: "webhook"
      url: "https://monitoring.example.com/deploy"
```

### 2.2 Database Schema

```sql
-- Deployments
CREATE TABLE deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('planning', 'deploying', 'healthy', 'unhealthy', 'failed', 'rolled_back')),
  deployment_spec JSONB NOT NULL,
  deployed_at TIMESTAMP,
  completed_at TIMESTAMP,
  deployed_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deployments_status ON deployments(status);
CREATE INDEX idx_deployments_deployed_at ON deployments(deployed_at DESC);

-- Deployment versions (history)
CREATE TABLE deployment_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  compose_config JSONB NOT NULL,
  artifact_versions JSONB NOT NULL,
  deployed_at TIMESTAMP,
  undeployed_at TIMESTAMP,
  status VARCHAR(50) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'previous', 'failed', 'rolled_back')),
  docker_compose_output TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(deployment_id, version_number)
);

CREATE INDEX idx_deployment_versions_status ON deployment_versions(status);
CREATE INDEX idx_deployment_versions_deployment ON deployment_versions(deployment_id);

-- Deployment events (audit trail)
CREATE TABLE deployment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL
    CHECK (event_type IN ('planned', 'started', 'progressed', 'succeeded', 'failed', 'rolled_back')),
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deployment_events_deployment ON deployment_events(deployment_id);
CREATE INDEX idx_deployment_events_type ON deployment_events(event_type);

-- Service health checks
CREATE TABLE service_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID NOT NULL REFERENCES deployments(id),
  service_name TEXT NOT NULL,
  status VARCHAR(50) NOT NULL
    CHECK (status IN ('healthy', 'unhealthy', 'unknown')),
  last_checked_at TIMESTAMP,
  response_time_ms INT,
  error_message TEXT,
  check_count INT DEFAULT 0,
  consecutive_failures INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(deployment_id, service_name)
);

CREATE INDEX idx_health_checks_status ON service_health_checks(status);
CREATE INDEX idx_health_checks_deployment ON service_health_checks(deployment_id);
```

---

## 3. Deployment Engine Implementation

### 3.1 Core Deployment Service

```java
@Service
public class DeploymentService {
  
  @Autowired
  private DeploymentRepository deploymentRepository;
  
  @Autowired
  private DockerComposeGenerator composeGenerator;
  
  @Autowired
  private DockerClient dockerClient;
  
  @Autowired
  private HealthCheckService healthCheckService;
  
  /**
   * Plan deployment (dry-run)
   */
  public DeploymentPlan planDeployment(String name, DeploymentSpec spec)
    throws DeploymentException {
    
    logger.info("Planning deployment: {}", name);
    
    // Validate spec
    validateDeploymentSpec(spec);
    
    // Resolve artifact versions
    Map<String, String> resolvedVersions = resolveArtifactVersions(spec);
    
    // Generate docker-compose config
    String composeConfig = composeGenerator.generate(spec, resolvedVersions);
    
    // Validate config
    validateDockerComposeConfig(composeConfig);
    
    // Build plan
    DeploymentPlan plan = new DeploymentPlan();
    plan.setName(name);
    plan.setComposeConfig(composeConfig);
    plan.setArtifactVersions(resolvedVersions);
    plan.setServiceCount(spec.getServices().size());
    plan.setEstimatedDuration(estimateDeploymentDuration(spec));
    
    return plan;
  }
  
  /**
   * Execute deployment
   */
  public Deployment deploy(String name, DeploymentSpec spec)
    throws DeploymentException {
    
    logger.info("Deploying: {}", name);
    
    // Create deployment record
    Deployment deployment = new Deployment();
    deployment.setName(name);
    deployment.setStatus("planning");
    deployment.setDeploymentSpec(spec);
    deployment.setDeployedBy(getCurrentUser());
    deployment = deploymentRepository.save(deployment);
    
    try {
      // Plan deployment
      DeploymentPlan plan = planDeployment(name, spec);
      
      // Update status
      deployment.setStatus("deploying");
      deploymentRepository.save(deployment);
      
      // Backup current version if exists
      backupCurrentDeployment(deployment);
      
      // Write compose config to file
      Path composeFile = writeComposeConfig(
        deployment.getId(),
        plan.getComposeConfig()
      );
      
      // Deploy using Docker Compose
      executeDockerCompose(composeFile, "up", "-d");
      
      // Record deployment version
      recordDeploymentVersion(deployment, plan);
      
      // Wait for containers to be ready
      waitForContainersReady(deployment, spec);
      
      // Run health checks
      Map<String, HealthStatus> healthStatus = 
        healthCheckService.checkAll(deployment);
      
      // Determine final status
      boolean allHealthy = healthStatus.values().stream()
        .allMatch(HealthStatus::isHealthy);
      
      if (allHealthy) {
        deployment.setStatus("healthy");
        logger.info("Deployment successful: {}", name);
      } else {
        deployment.setStatus("unhealthy");
        logger.warn("Deployment unhealthy: {}", name);
      }
      
      deployment.setDeployedAt(Instant.now());
      deployment.setCompletedAt(Instant.now());
      
    } catch (Exception e) {
      logger.error("Deployment failed: {}", name, e);
      deployment.setStatus("failed");
      deployment.setCompletedAt(Instant.now());
      
      // Trigger rollback if configured
      if (shouldAutoRollback(spec)) {
        rollback(deployment);
      }
      
      throw new DeploymentException(
        "Deployment failed: " + e.getMessage(), e
      );
    }
    
    return deploymentRepository.save(deployment);
  }
  
  /**
   * Rollback to previous version
   */
  public void rollback(Deployment deployment) throws DeploymentException {
    
    logger.info("Rolling back deployment: {}", deployment.getName());
    
    // Find previous successful version
    DeploymentVersion previousVersion = 
      deploymentRepository.findPreviousSuccessfulVersion(deployment.getId());
    
    if (previousVersion == null) {
      throw new DeploymentException("No previous version to rollback to");
    }
    
    // Write previous compose config
    Path composeFile = writeComposeConfig(
      deployment.getId(),
      previousVersion.getComposeConfig()
    );
    
    // Deploy previous version
    executeDockerCompose(composeFile, "up", "-d");
    
    // Update deployment status
    deployment.setStatus("rolled_back");
    deploymentRepository.save(deployment);
    
    // Record rollback event
    recordDeploymentEvent(
      deployment,
      "rolled_back",
      "Rolled back to version " + previousVersion.getVersionNumber()
    );
  }
  
  /**
   * Wait for containers to be in ready state
   */
  private void waitForContainersReady(
    Deployment deployment,
    DeploymentSpec spec
  ) throws InterruptedException {
    
    Instant deadline = Instant.now()
      .plus(Duration.ofSeconds(300)); // 5 min timeout
    
    for (ServiceSpec service : spec.getServices()) {
      while (Instant.now().isBefore(deadline)) {
        
        ContainerStatus status = getContainerStatus(
          deployment.getId(),
          service.getName()
        );
        
        if (status.isReady()) {
          logger.info(
            "Container ready: {}/{}",
            deployment.getName(),
            service.getName()
          );
          break;
        }
        
        Thread.sleep(1000); // Check every second
      }
    }
  }
}
```

### 3.2 Docker Compose Generator

```java
@Service
public class DockerComposeGenerator {
  
  /**
   * Generate docker-compose.yml from deployment spec
   */
  public String generate(
    DeploymentSpec spec,
    Map<String, String> resolvedVersions
  ) throws IOException {
    
    Map<String, Object> compose = new LinkedHashMap<>();
    compose.put("version", "3.8");
    
    // Generate services
    Map<String, Object> services = new LinkedHashMap<>();
    
    for (ServiceSpec service : spec.getServices()) {
      services.put(service.getName(), generateService(service, resolvedVersions));
    }
    
    compose.put("services", services);
    
    // Add volumes
    if (spec.getVolumes() != null) {
      compose.put("volumes", spec.getVolumes());
    }
    
    // Add networks
    compose.put("networks", spec.getNetworks());
    
    // Convert to YAML
    ObjectMapper mapper = new ObjectMapper();
    mapper.setDefaultMergeable(true);
    return mapper.writerWithDefaultPrettyPrinter().writeValueAsString(compose);
  }
  
  private Map<String, Object> generateService(
    ServiceSpec service,
    Map<String, String> resolvedVersions
  ) {
    Map<String, Object> serviceMap = new LinkedHashMap<>();
    
    String image = resolveImage(service.getArtifact(), resolvedVersions);
    serviceMap.put("image", image);
    
    if (service.getReplicas() > 1) {
      // Use deploy for multiple replicas
      Map<String, Object> deploy = new LinkedHashMap<>();
      deploy.put("replicas", service.getReplicas());
      serviceMap.put("deploy", deploy);
    }
    
    if (service.getEnvironment() != null) {
      serviceMap.put("environment", service.getEnvironment());
    }
    
    if (service.getPorts() != null) {
      serviceMap.put("ports", service.getPorts());
    }
    
    if (service.getVolumes() != null) {
      serviceMap.put("volumes", service.getVolumes());
    }
    
    if (service.getResources() != null) {
      Map<String, Object> deploy = 
        (Map<String, Object>) serviceMap.get("deploy");
      if (deploy == null) {
        deploy = new LinkedHashMap<>();
        serviceMap.put("deploy", deploy);
      }
      
      Map<String, Object> resources = new LinkedHashMap<>();
      if (service.getResources().getCpus() != null) {
        resources.put("cpus", service.getResources().getCpus());
      }
      if (service.getResources().getMemory() != null) {
        resources.put("memory", service.getResources().getMemory());
      }
      deploy.put("resources", resources);
    }
    
    if (service.getHealthCheck() != null) {
      serviceMap.put("healthcheck", generateHealthCheck(service.getHealthCheck()));
    }
    
    return serviceMap;
  }
  
  private Map<String, Object> generateHealthCheck(HealthCheckConfig config) {
    Map<String, Object> healthCheck = new LinkedHashMap<>();
    
    if (config.getCommand() != null) {
      healthCheck.put("test", List.of("CMD-SHELL", config.getCommand()));
    }
    
    if (config.getInterval() != null) {
      healthCheck.put("interval", config.getInterval());
    }
    
    if (config.getTimeout() != null) {
      healthCheck.put("timeout", config.getTimeout());
    }
    
    if (config.getRetries() != null) {
      healthCheck.put("retries", config.getRetries());
    }
    
    return healthCheck;
  }
}
```

### 3.3 Health Check Service

```java
@Service
public class HealthCheckService {
  
  /**
   * Check health of all services in deployment
   */
  public Map<String, HealthStatus> checkAll(Deployment deployment)
    throws Exception {
    
    Map<String, HealthStatus> results = new LinkedHashMap<>();
    
    for (ServiceSpec service : deployment.getSpec().getServices()) {
      HealthStatus status = checkService(deployment, service);
      results.put(service.getName(), status);
      
      // Update database
      recordHealthCheck(deployment, service.getName(), status);
    }
    
    return results;
  }
  
  /**
   * Check health of single service
   */
  private HealthStatus checkService(
    Deployment deployment,
    ServiceSpec service
  ) throws Exception {
    
    HealthCheckConfig config = service.getHealthCheck();
    
    if (config == null) {
      return new HealthStatus("unknown", null, -1);
    }
    
    long startTime = System.currentTimeMillis();
    
    try {
      if (config.getEndpoint() != null) {
        // HTTP endpoint check
        return checkHttpEndpoint(config.getEndpoint());
      } else if (config.getCommand() != null) {
        // Command check
        return checkCommand(
          deployment.getId(),
          service.getName(),
          config.getCommand()
        );
      }
      
      return new HealthStatus("unknown", null, -1);
      
    } catch (Exception e) {
      long duration = System.currentTimeMillis() - startTime;
      return new HealthStatus("unhealthy", e.getMessage(), duration);
    }
  }
  
  private HealthStatus checkHttpEndpoint(String endpoint) {
    long startTime = System.currentTimeMillis();
    
    try {
      // Parse endpoint (e.g., "GET http://localhost:8080/health")
      HttpClient httpClient = HttpClient.newHttpClient();
      HttpRequest request = HttpRequest.newBuilder()
        .GET()
        .uri(URI.create(endpoint))
        .timeout(Duration.ofSeconds(5))
        .build();
      
      HttpResponse<String> response = 
        httpClient.send(request, HttpResponse.BodyHandlers.ofString());
      
      long duration = System.currentTimeMillis() - startTime;
      
      if (response.statusCode() >= 200 && response.statusCode() < 300) {
        return new HealthStatus("healthy", null, duration);
      } else {
        return new HealthStatus(
          "unhealthy",
          "HTTP " + response.statusCode(),
          duration
        );
      }
      
    } catch (Exception e) {
      long duration = System.currentTimeMillis() - startTime;
      return new HealthStatus("unhealthy", e.getMessage(), duration);
    }
  }
  
  /**
   * Background task: continuous health monitoring
   */
  @Scheduled(fixedDelay = 30000)  // Every 30 seconds
  public void continuousHealthMonitoring() {
    
    // Find all active deployments
    List<Deployment> active = deploymentRepository
      .findAllByStatus("healthy");
    
    for (Deployment deployment : active) {
      try {
        Map<String, HealthStatus> status = checkAll(deployment);
        
        // Check if any service is unhealthy
        boolean anyUnhealthy = status.values().stream()
          .anyMatch(s -> "unhealthy".equals(s.getStatus()));
        
        if (anyUnhealthy) {
          logger.warn(
            "Deployment unhealthy: {} - triggering remediation",
            deployment.getName()
          );
          
          // Trigger remediation (restart, rollback, etc.)
          triggerRemediation(deployment);
        }
        
      } catch (Exception e) {
        logger.error("Error monitoring deployment {}", deployment.getName(), e);
      }
    }
  }
}
```

---

## 4. Deployment API

### 4.1 Plan Deployment

**POST** `/api/deployments/plan`

```json
Request:
{
  "name": "production-api",
  "spec": { /* deployment spec YAML as object */ }
}

Response:
{
  "plan_id": "uuid-plan-123",
  "name": "production-api",
  "services": 3,
  "artifact_count": 3,
  "estimated_duration_seconds": 120,
  "dry_run": true
}
```

### 4.2 Deploy

**POST** `/api/deployments`

```json
Request:
{
  "name": "production-api",
  "spec": { /* deployment spec */ }
}

Response (201 Created):
{
  "id": "uuid-deploy-123",
  "name": "production-api",
  "status": "deploying",
  "started_at": "2026-05-22T14:30:00Z",
  "version": 1
}
```

### 4.3 Get Deployment Status

**GET** `/api/deployments/{id}`

```json
Response:
{
  "id": "uuid-deploy-123",
  "name": "production-api",
  "status": "healthy",
  "version": 1,
  "deployed_at": "2026-05-22T14:30:00Z",
  "services": [
    {
      "name": "api-server",
      "image": "my-api-server:1.2.3",
      "replicas": 2,
      "running": 2,
      "health": "healthy"
    },
    {
      "name": "postgres",
      "image": "postgres:15",
      "replicas": 1,
      "running": 1,
      "health": "healthy"
    }
  ],
  "compose_config": "..." // Docker compose YAML
}
```

### 4.4 Rollback

**POST** `/api/deployments/{id}/rollback`

```
Response: 200 OK

Deployment immediately starts rolling back to previous version
```

### 4.5 Get Deployment History

**GET** `/api/deployments/{id}/history`

```json
Response:
{
  "versions": [
    {
      "version": 3,
      "deployed_at": "2026-05-22T14:30:00Z",
      "status": "active",
      "artifacts": {
        "api-server": "1.2.3",
        "postgres": "15"
      }
    },
    {
      "version": 2,
      "deployed_at": "2026-05-20T10:15:00Z",
      "status": "previous",
      "artifacts": {
        "api-server": "1.2.2",
        "postgres": "15"
      }
    }
  ]
}
```

---

## 5. Testing Strategy

### 5.1 Unit Tests

```java
@Test
void testDeploymentSpecValidation() { }

@Test
void testDockerComposeGeneration() { }

@Test
void testHealthCheckExecution() { }

@Test
void testVersionResolution() { }
```

### 5.2 Integration Tests

```java
@Test
void testEndToEndDeployment() { }

@Test
void testDeploymentRollback() { }

@Test
void testHealthMonitoring() { }

@Test
void testMultipleServicesDeployment() { }
```

---

## 6. Success Criteria

- [ ] Deployment specs parsed correctly
- [ ] Docker compose configs generated
- [ ] Deployments execute successfully
- [ ] Health checks run and report status
- [ ] Rollback works correctly
- [ ] Multiple versions tracked
- [ ] Service dependencies handled
- [ ] Resource limits enforced
- [ ] All APIs respond correctly
- [ ] Monitoring detects unhealthy services

---

## 7. Next Steps

1. Implement deployment service and Docker Compose integration
2. Build deployment spec parser and validator
3. Implement Docker Compose generator
4. Create health check service
5. Build deployment APIs
6. Set up database schema for deployments
7. Implement rollback logic
8. Create monitoring and auto-remediation
9. Write comprehensive tests
10. Integrate with Phase 5 dashboard

---

## 8. Future Enhancements

- Blue-green deployments
- Canary deployments
- Service mesh integration (Istio, Linkerd)
- GitOps-style deployment from repository
- Cost optimization and resource scaling
- Integration with container registries
