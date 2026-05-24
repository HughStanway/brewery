# Local Software Supply Chain Platform (v2)  

## Full Design & Implementation Plan

---

# 1. Overview

This project is a self-hosted, local-first software supply chain platform that combines:

- Continuous Integration (CI)
- Continuous Deployment (CD)
- Artifact Registry
- Dependency Graph System
- Internal Package Ecosystem (future extension)

All systems run on a single machine, triggered only via GitHub webhooks, and deploy locally using Docker.

---

# 2. Core Vision

This system is **artifact-centric**, not source-centric.

Source code is transient. Artifacts are the system of record.

Everything revolves around versioned artifacts and their dependencies.

---

# 3. High-Level Architecture

GitHub
  │
  ▼
Webhook Receiver (API Gateway)
  │
  ▼
Orchestration Core (Java)
  │
  ├── Build Engine (Docker-based execution)
  ├── Dependency Resolver (graph engine)
  ├── Artifact Registry (versioned storage)
  ├── Deployment Engine (Docker Compose)
  └── Event System (internal messaging)
          │
          ▼
PostgreSQL (system of record)
          │
          ▼
Filesystem Artifact Store
          │
          ▼
Docker Runtime (services)

Dashboard (Next.js UI)

---

# 4. Core System Principles

## 4.1 Artifact-Centric Design

- Every build produces a versioned artifact
- Deployments consume artifacts, not build outputs
- Dependencies reference artifacts, not repositories

## 4.2 Dependency-Aware Ecosystem

- Every artifact can depend on other artifacts
- Semantic versioning enforced
- Dependency graph tracked in database
- Automatic rebuild propagation supported

## 4.3 Docker-Isolated Execution

- All builds executed in containers
- No host toolchain dependency
- Deterministic builds across languages

## 4.4 State-Driven Deployment

- Deployments are tracked entities
- Versioned and rollbackable
- Always reproducible

---

# 5. Core Components

## 5.1 Webhook Receiver

POST /webhooks/github

Responsibilities:

- Validate GitHub signature
- Extract repo, branch, commit
- Create pipeline run
- Enqueue execution

---

## 5.2 API Gateway Layer

- Authentication (internal tokens)
- Routing requests
- Validation

---

## 5.3 Orchestration Core (Java)

- Java 21+
- Virtual Threads
- Pipeline lifecycle management
- Dependency resolution
- Deployment orchestration
- State tracking

---

## 5.4 Build Engine (Docker-Based)

- Clone repo
- Detect project type
- Run build/test/package
- Emit artifact

Supported:

- Rust
- Go
- Python
- Node.js
- C++

---

## 5.5 Artifact Registry

Metadata stored in PostgreSQL, artifacts on disk:

{
  "name": "auth-lib",
  "version": "1.4.2",
  "dependencies": ["core-crypto@2.1.0"]
}

---

## 5.6 Dependency Resolver

- Semantic version resolution
- Dependency graph construction
- Reverse dependency tracking
- Conflict detection

---

## 5.7 Deployment Engine

- Docker Compose-based deployments
- Versioned services
- Rollback support

States:

- Pending
- Deploying
- Healthy
- Failed
- RolledBack

---

## 5.8 Dependency Graph System

Stored in PostgreSQL:

- artifacts
- dependencies
- reverse_dependencies

---

## 5.9 Cascade Rebuild System

When dependency updates:

- find dependents
- queue rebuilds
- publish new artifacts

---

## 5.10 Dashboard UI

- Next.js + React
- WebSockets for logs

Views:

- Artifact Explorer
- Build Runs
- Deployments
- Dependency Graph

---

# 6. Artifact Storage

/store/
  core-crypto/
    2.1.0/

  auth-lib/
    1.4.2/

---

# 7. Database Schema

artifacts(id, name, version, type, commit, created_at)
dependencies(artifact_id, depends_on, version_range)
builds(id, artifact_id, status)
deployments(id, artifact_version, status)
reverse_dependencies(artifact_id, dependent_id)

---

# 8. System Flows

Build Flow:
GitHub → Webhook → Build → Artifact → Registry

Deploy Flow:
Artifact → Compose Update → Docker Deploy → Healthcheck

Dependency Flow:
Update → Find Dependents → Rebuild → Republish

---

# 9. Tech Stack

- Java 21
- Spring Boot / Quarkus
- PostgreSQL
- Docker
- Next.js

---

# 10. Implementation Phases

Phase 1: Core builds + deployments
Phase 2: Artifact registry
Phase 3: Dependency engine
Phase 4: Cascade rebuilds
Phase 5: Dashboard UI

---

# 11. Final Summary

Artifact-centric local software supply chain platform with:

- CI
- CD
- Dependency graph
- Versioned registry
