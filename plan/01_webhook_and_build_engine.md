# Phase 1: Webhook Receiver & Build Engine

**Duration:** 2-3 weeks  
**Focus:** GitHub integration and containerized build execution  
**Deliverables:** GitHub webhooks trigger builds, Docker-isolated builds produce versioned artifacts

---

## 1. Architecture Overview

### 1.1 Component Diagram

```
GitHub
  │
  │ POST /webhooks/github
  │ (with X-Hub-Signature-256)
  │
  ▼
┌─────────────────────────────────┐
│   Webhook Receiver (Spring API) │
│   - Validate signature          │
│   - Extract event metadata      │
│   - Route to appropriate action │
└──────────────┬──────────────────┘
               │
               ▼
        ┌──────────────┐
        │ Queue/Event  │
        │ (in-memory   │
        │  or Redis)   │
        └──────────────┘
               │
               ▼
┌──────────────────────────────────┐
│   Build Engine (Docker)          │
│   - Clone repository             │
│   - Detect project type          │
│   - Run build in isolated env    │
│   - Package artifact             │
│   - Emit completion event        │
└──────────────┬───────────────────┘
               │
               ▼
        ┌──────────────────────┐
        │  Artifact Store      │
        │  (filesystem)        │
        │  /store/{name}/{ver} │
        └──────────────────────┘
               │
               ▼
        ┌──────────────────────┐
        │   PostgreSQL         │
        │   builds table       │
        │   artifacts table    │
        └──────────────────────┘
```

### 1.2 Data Flow

```
GitHub Push Event
  ↓ (JSON payload)
Webhook Handler validates signature
  ↓
Extract: owner/repo, branch, commit hash, commit message
  ↓
Create BuildRun record (status: PENDING)
  ↓
Enqueue build task
  ↓
Build Engine picks up task
  ↓
Clone repo at commit hash
  ↓
Detect project type (Cargo.toml, go.mod, pyproject.toml, package.json, CMakeLists.txt)
  ↓
Build in Docker container (language-specific image)
  ↓
Extract build artifacts & generate version
  ↓
Store artifact to /store/{name}/{version}/{artifact}
  ↓
Update BuildRun (status: SUCCESS, artifact_id)
  ↓
Emit ArtifactCreated event
```

---

## 2. Webhook Receiver Specification

### 2.1 API Endpoint

**POST** `/webhooks/github`

### 2.2 Request Validation

```java
// Header validation
X-Hub-Signature-256: sha256=<signature>

// Signature calculation (HMAC-SHA256)
signature = HMAC-SHA256(githubSecret, requestBody)
```

### 2.3 Request Payload (Simplified)

```json
{
  "action": "opened|synchronize|closed",
  "pull_request": {
    "number": 123,
    "head": {
      "ref": "feature-branch",
      "sha": "abc123...",
      "repo": {
        "name": "auth-lib",
        "owner": {
          "login": "myteam"
        }
      }
    }
  },
  "push": {
    "ref": "refs/heads/main",
    "after": "abc123...",
    "repository": {
      "full_name": "myteam/auth-lib"
    }
  }
}
```

### 2.4 Response

```json
{
  "status": "acknowledged",
  "build_id": "uuid-123",
  "repository": "myteam/auth-lib",
  "branch": "main",
  "commit": "abc123..."
}
```

### 2.5 Error Handling

```
401 Unauthorized - Invalid signature
400 Bad Request - Malformed payload
404 Not Found - Repository not configured
429 Too Many Requests - Rate limiting
500 Internal Server Error - Processing failure
```

---

## 3. Build Engine Architecture

### 3.1 Build Execution Flow

```
Input:
  - repository: "myteam/auth-lib"
  - commit: "abc123..."
  - branch: "main"

Step 1: Clone Repository
  git clone --depth 1 --branch main https://github.com/myteam/auth-lib.git /tmp/build-{uuid}

Step 2: Detect Project Type
  Check for: Cargo.toml → Rust
            go.mod → Go
            pyproject.toml / setup.py → Python
            package.json → Node.js
            CMakeLists.txt → C++

Step 3: Prepare Build Container
  Select base image for language
  Mount working directory
  Set environment variables

Step 4: Execute Build in Container
  Run language-specific build command
  Capture stdout/stderr to logs
  Monitor for timeout (default: 30 mins)

Step 5: Extract Artifacts
  Copy build outputs from container
  Organize by artifact type (jar, wheel, binary, etc.)

Step 6: Generate Version & Metadata
  Compute version from:
    - Git tags (semver)
    - Commit count
    - Commit message markers (#major, #minor, #patch)
    Default: 0.0.0-{commit_short}

Step 7: Store to Artifact Registry
  /store/{name}/{version}/
    artifact.{ext}
    metadata.json
    build.log

Step 8: Update Database
  INSERT into artifacts table
  UPDATE builds table (status: SUCCESS)

Step 9: Emit Event
  ArtifactCreated { id, name, version, type }
```

### 3.2 Language Support & Build Configurations

#### Rust
```dockerfile
FROM rust:latest
WORKDIR /build
COPY . .
RUN cargo build --release
# Artifact: target/release/{binary_name}
```

#### Go
```dockerfile
FROM golang:1.21
WORKDIR /build
COPY . .
RUN go build -o {binary_name} .
# Artifact: ./{binary_name}
```

#### Python
```dockerfile
FROM python:3.11
WORKDIR /build
COPY . .
RUN pip install -e .
RUN python -m build
# Artifact: dist/*.whl
```

#### Node.js
```dockerfile
FROM node:20
WORKDIR /build
COPY . .
RUN npm ci
RUN npm run build
# Artifact: dist/
```

#### C++
```dockerfile
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y build-essential cmake
WORKDIR /build
COPY . .
RUN mkdir -p build && cd build && cmake .. && make
# Artifact: build/bin/{binary_name}
```

### 3.3 Build Configuration (buildkit.yml)

```yaml
# Optional per-repository build configuration
version: 1

build:
  timeout: 1800  # seconds
  memory: 4g
  cpus: 2
  
commands:
  setup: |
    # Pre-build steps
  build: |
    # Custom build command (overrides defaults)
  test: |
    # Test command
  package: |
    # Packaging step

artifacts:
  - pattern: "target/release/*"
    type: "binary"
    name: "{repo_name}"
  - pattern: "dist/*.whl"
    type: "python-wheel"
    name: "{repo_name}"

versioning:
  scheme: "semver"  # or "commit-based"
  tag_pattern: "v*"  # git tag pattern

dependencies:
  - "myteam/core-lib@^1.0.0"
  - "myteam/crypto@>=2.0.0"
```

---

## 4. Database Schema (Phase 1)

### 4.1 builds table

```sql
CREATE TABLE builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository TEXT NOT NULL,
  branch TEXT NOT NULL,
  commit TEXT NOT NULL,
  webhook_event_id TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'building', 'success', 'failed', 'timeout')),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_seconds INT,
  logs TEXT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_builds_repo_branch ON builds(repository, branch);
CREATE INDEX idx_builds_status ON builds(status);
CREATE INDEX idx_builds_created_at ON builds(created_at DESC);
```

### 4.2 artifacts table (minimal for Phase 1)

```sql
CREATE TABLE artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  artifact_type VARCHAR(50) NOT NULL
    CHECK (artifact_type IN ('binary', 'jar', 'wheel', 'npm-package', 'docker-image')),
  build_id UUID NOT NULL REFERENCES builds(id),
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  checksum TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, version)
);

CREATE INDEX idx_artifacts_name_version ON artifacts(name, version);
CREATE INDEX idx_artifacts_build_id ON artifacts(build_id);
```

---

## 5. Implementation Tasks

### 5.1 Core Components to Build

- [ ] **Webhook Receiver Service** (Spring Boot REST controller)
  - POST /webhooks/github
  - GitHub signature validation (HMAC-SHA256)
  - Request parsing and routing
  - Response handling

- [ ] **Build Queue** (in-memory or Redis)
  - Enqueue build tasks
  - Prioritization (main branch first)
  - Retry logic for failed builds

- [ ] **Build Engine** (Docker-based executor)
  - Repository cloning
  - Project type detection
  - Language-specific builders
  - Container lifecycle management
  - Artifact extraction

- [ ] **Artifact Storage Manager**
  - Filesystem organization (/store/{name}/{version})
  - Metadata file generation
  - Checksum calculation

- [ ] **Database Layer**
  - PostgreSQL schema setup
  - JDBC/JPA repositories for builds & artifacts
  - Transaction management

- [ ] **Logging & Observability**
  - Build logs (per-build streaming)
  - Structured logging (JSON format)
  - Build duration tracking

---

## 6. Configuration & Environment

### 6.1 Application Configuration (application.yml)

```yaml
server:
  port: 8080
  servlet:
    context-path: /api

spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/supply_chain
    username: postgres
    password: ${DB_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate.dialect: org.hibernate.dialect.PostgreSQLDialect

github:
  webhook:
    secret: ${GITHUB_WEBHOOK_SECRET}
    allowed-events:
      - push
      - pull_request

docker:
  host: unix:///var/run/docker.sock
  buildkit-enabled: true

artifact-store:
  base-path: /mnt/artifact-store
  retention-days: 90

build:
  default-timeout-seconds: 1800
  max-concurrent-builds: 2
  container-memory: 4g
  container-cpus: 2
```

### 6.2 GitHub Configuration

In repository settings:
```
Webhooks → Add webhook

Payload URL: https://your-domain/api/webhooks/github
Content type: application/json
Secret: ${GITHUB_WEBHOOK_SECRET}
Events:
  - Push
  - Pull request
Active: Yes
```

---

## 7. Testing Strategy

### 7.1 Unit Tests

```java
// Signature validation
@Test
void testValidGitHubSignature() { }

@Test
void testInvalidGitHubSignature() { }

// Project detection
@Test
void testDetectRustProject() { }

@Test
void testDetectGoProject() { }

// Version generation
@Test
void testVersionFromGitTag() { }

@Test
void testVersionFromCommitMessage() { }
```

### 7.2 Integration Tests

```java
// Webhook end-to-end
@Test
void testWebhookTriggersBuilds() { }

// Build execution
@Test
void testBuildRustProject() { }

@Test
void testBuildNodeProject() { }

// Artifact storage
@Test
void testArtifactStoredCorrectly() { }
```

### 7.3 Docker Build Testing

```bash
# Test each builder image
docker build -t builder-rust -f Dockerfile.rust .
docker run --rm builder-rust cargo --version

docker build -t builder-go -f Dockerfile.go .
docker run --rm builder-go go version
```

---

## 8. Deployment

### 8.1 Docker Compose (Phase 1 Dev)

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: supply_chain
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  orchestrator:
    build: .
    environment:
      DB_PASSWORD: ${DB_PASSWORD}
      GITHUB_WEBHOOK_SECRET: ${GITHUB_WEBHOOK_SECRET}
    ports:
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - artifact_store:/mnt/artifact-store
    depends_on:
      - postgres

volumes:
  postgres_data:
  artifact_store:
```

---

## 9. Success Criteria

- [ ] GitHub webhook receives and validates events
- [ ] Build tasks are queued and executed
- [ ] Builds execute in isolated Docker containers
- [ ] All 5 supported languages (Rust, Go, Python, Node, C++) build successfully
- [ ] Artifacts are stored with correct versioning
- [ ] Build logs are captured and queryable
- [ ] Database tracks all builds and artifacts
- [ ] System handles build failures gracefully
- [ ] Build completion time < 5 minutes for typical project
- [ ] Webhook response time < 500ms

---

## 10. Dependencies & Known Challenges

### 10.1 External Dependencies

- Java 21+
- Docker daemon
- PostgreSQL 15+
- GitHub API access

### 10.2 Known Challenges

**Challenge:** Detecting project type reliably
- **Solution:** Check for multiple marker files in priority order

**Challenge:** Language-specific build requirements (e.g., native dependencies)
- **Solution:** Use Docker images with pre-installed toolchains; buildkit.yml for customization

**Challenge:** Artifact extraction from container
- **Solution:** Use Docker COPY to mount artifacts directory; explicit path extraction

**Challenge:** Build timeout handling
- **Solution:** Docker API timeout configuration; graceful cleanup on timeout

---

## 11. Next Steps

1. Set up Spring Boot project skeleton
2. Implement GitHub webhook receiver and signature validation
3. Build in-memory build queue
4. Create Docker-based build executors for each language
5. Implement artifact storage and metadata generation
6. Set up PostgreSQL schema and repositories
7. Write integration tests
8. Test with real GitHub webhooks
9. Proceed to [Phase 2: Artifact Registry](02_artifact_registry.md)
