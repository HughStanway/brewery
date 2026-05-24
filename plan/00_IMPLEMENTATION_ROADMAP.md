# Implementation Roadmap

Self-Hosted Software Supply Chain Platform

## Overview

This is the detailed architectural plan for the Local Software Supply Chain Platform. Each phase builds upon the previous, creating a complete artifact-centric CI/CD system optimized for a homelab environment.

**Core Principle:** Artifacts are the system of record. Everything revolves around versioned artifacts and their dependencies.

---

## Phase Completion Order

### [Phase 1: Webhook Receiver & Core Build Engine](01_webhook_and_build_engine.md)
**Duration:** 2-3 weeks  
**Focus:** GitHub integration and containerized build execution  
**Outcomes:** GitHub webhooks trigger builds, Docker-isolated builds produce artifacts

### [Phase 2: Artifact Registry & Storage](02_artifact_registry.md)
**Duration:** 1-2 weeks  
**Focus:** Versioned artifact storage and metadata management  
**Outcomes:** Built artifacts are stored, versioned, and queryable

### [Phase 3: Dependency Resolution Engine](03_dependency_resolution.md)
**Duration:** 2-3 weeks  
**Focus:** Semantic versioning, dependency graph, conflict detection  
**Outcomes:** Dependencies tracked, conflicts detected, graphs visualizable

### [Phase 4: Cascade Rebuild System](04_cascade_rebuilds.md)
**Duration:** 1-2 weeks  
**Focus:** Automatic propagation of dependency updates  
**Outcomes:** Updating a dependency triggers dependent rebuilds automatically

### [Phase 5: Dashboard & Web UI](05_dashboard_ui.md)
**Duration:** 2-3 weeks  
**Focus:** Visualization and control interface  
**Outcomes:** Web dashboard for monitoring, artifact exploration, deployment management

### [Phase 6: Deployment Engine (parallel with Phase 5)](06_deployment_engine.md)
**Duration:** 2 weeks  
**Focus:** Docker Compose-based service deployment and rollback  
**Outcomes:** Versioned deployments with health tracking and rollback capability

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     GitHub Events                        │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │   Phase 1: Webhook Receiver        │
        │   POST /webhooks/github            │
        └────────────┬───────────────────────┘
                     │
                     ▼
        ┌────────────────────────────────────┐
        │   Phase 1: Build Engine            │
        │   Docker-Isolated Execution        │
        └────────────┬───────────────────────┘
                     │
                     ▼
        ┌────────────────────────────────────┐
        │   Phase 2: Artifact Registry       │
        │   Versioned Storage + Metadata     │
        └────────────┬───────────────────────┘
                     │
        ┌────────────┴────────────────────────┐
        │                                     │
        ▼                                     ▼
┌──────────────────────┐        ┌──────────────────────┐
│  Phase 3: Dependency │        │  Phase 6: Deployment │
│   Resolution Engine  │        │      Engine          │
└──────────┬───────────┘        └──────────┬───────────┘
           │                               │
           ▼                               ▼
┌──────────────────────┐        ┌──────────────────────┐
│ Phase 4: Cascade    │        │  Phase 5: Dashboard  │
│  Rebuild System     │        │   Web Interface      │
└──────────────────────┘        └──────────────────────┘
```

---

## Data Model Overview

```
PostgreSQL Schema:

artifacts
├── id (UUID)
├── name (String)
├── version (SemVer)
├── type (String: jar, docker, binary, wheel, etc.)
├── build_id (UUID)
├── commit (String)
├── created_at (Timestamp)
└── metadata (JSONB)

builds
├── id (UUID)
├── artifact_id (UUID)
├── repository (String)
├── branch (String)
├── commit (String)
├── status (enum: pending, building, success, failed)
├── started_at (Timestamp)
├── completed_at (Timestamp)
└── logs (Text)

dependencies
├── id (UUID)
├── artifact_id (UUID)
├── depends_on (String: "name@version_range")
├── resolved_to (UUID)
└── created_at (Timestamp)

deployments
├── id (UUID)
├── name (String)
├── artifact_version (String)
├── status (enum: pending, deploying, healthy, failed, rolled_back)
├── config (JSONB: docker-compose config)
├── deployed_at (Timestamp)
└── metadata (JSONB)

reverse_dependencies
├── artifact_id (UUID)
├── dependent_id (UUID)
└── created_at (Timestamp)
```

---

## Development Environment Setup

### Prerequisites
- Java 21+
- Docker
- PostgreSQL 15+
- Node.js 18+
- Git

### Local Development Stack
```yaml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: supply_chain
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  artifact-store:
    image: registry:2
    ports:
      - "5000:5000"
    volumes:
      - artifact_data:/var/lib/registry

volumes:
  postgres_data:
  artifact_data:
```

---

## Cross-Phase Integration Points

### Data Flow
1. **GitHub → Build:** Webhooks capture repository events
2. **Build → Artifact:** Build outputs versioned and stored
3. **Artifact → Deployment:** Deployments reference artifact versions
4. **Dependency → Cascade:** Dependency changes trigger rebuild chains
5. **All → Dashboard:** Real-time visibility into all operations

### API Contracts (to be detailed in each phase)
- Webhook Receiver API
- Build Execution API
- Artifact Registry API
- Dependency Resolution API
- Deployment Management API

---

## Success Criteria

- [ ] **Phase 1:** GitHub webhook successfully triggers containerized builds
- [ ] **Phase 2:** Artifacts are versioned, stored, and query-able
- [ ] **Phase 3:** Dependency graphs are constructed and conflicts detected
- [ ] **Phase 4:** Dependency updates automatically trigger dependent rebuilds
- [ ] **Phase 5:** Dashboard provides full visibility into system state
- [ ] **Phase 6:** Services deployed and rolled back via version control

---

## Estimated Timeline

- **Phases 1-2:** 3-4 weeks (foundation)
- **Phases 3-4:** 3-4 weeks (dependency management)
- **Phases 5-6:** 4-5 weeks (UI & deployment)
- **Total:** 10-13 weeks to MVP

---

## Key Technologies

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Core Orchestration | Java 21 + Spring Boot | Virtual threads, performance, ecosystem |
| Build Isolation | Docker | Language-agnostic, reproducible |
| State Management | PostgreSQL | Relational for dependency graphs |
| Artifact Storage | Filesystem + Registry API | Simple, local, scalable |
| Deployment | Docker Compose | Lightweight, version-controlled |
| UI | Next.js + React | Type-safe, WebSocket support |

---

## Next Steps

1. Begin with [Phase 1: Webhook Receiver & Build Engine](01_webhook_and_build_engine.md)
2. Implement GitHub webhook validation and routing
3. Build containerized build executor with multi-language support
4. Proceed to Phase 2 once Phase 1 is complete
