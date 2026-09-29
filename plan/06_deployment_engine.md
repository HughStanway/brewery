# Phase 6: Komodo Deployment Integration Engine

**Focus:** Delegation of stack container deployments to Komodo via REST API (`DeployStack`)  
**Deliverables:** Komodo API Client, Stack Mapping Registry, Automatic Cascade Deployment Triggering, UI Deep Links

---

## 1. Architecture Overview

```
                                  BREWERY                                      │           KOMODO
                                                                               │
 ┌────────────────┐     ┌────────────────┐     ┌─────────────────────┐         │     ┌─────────────────┐
 │ GitHub Webhook │ ──> │ Build Engine & │ ──> │ Dependency Resolver │         │     │ Komodo Core API │
 │ Receiver       │     │ Registry       │     │ & Cascade Rebuilds  │         │     └────────┬────────┘
 └────────────────┘     └────────────────┘     └──────────┬──────────┘         │              │
                                                          │                    │              ▼
                                                          ▼                    │     ┌─────────────────┐
                                               ┌─────────────────────┐         │     │ Komodo          │
                                               │ Komodo Deployment   │ ───────┼───> │ Periphery       │
                                               │ Client              │  HTTP  │     │ Agents / Nodes  │
                                               └─────────────────────┘  API    │     └─────────────────┘
```

Brewery delegates container execution, process monitoring, log streaming, and node management to **Komodo**. Brewery maintains the software supply chain provenance, artifact registry, and dependency cascade graph.

---

## 2. Configuration (`application.yml`)

```yaml
brewery:
  deployment:
    provider: komodo
    komodo:
      base-url: ${KOMODO_BASE_URL:http://localhost:9120}
      api-key: ${KOMODO_API_KEY:}
      api-secret: ${KOMODO_API_SECRET:}
      timeout-seconds: 30
```

---

## 3. Data Model (`deployments` Table)

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `name` | VARCHAR(255) | Deployment Mapping Name (Unique) |
| `komodo_stack_name` | VARCHAR(255) | Target Komodo Stack identifier |
| `artifact_name` | VARCHAR(255) | Target Brewery artifact name |
| `deployed_version` | VARCHAR(255) | Currently deployed SemVer version |
| `status` | VARCHAR(50) | `PENDING`, `DEPLOYING`, `SUCCESS`, `FAILED` |
| `komodo_url` | VARCHAR(512) | Deep link URL to Komodo UI stack page |
| `deployed_at` | TIMESTAMP | Last deployment trigger timestamp |
| `completed_at` | TIMESTAMP | Deployment completion timestamp |

---

## 4. API Endpoints

* `GET /api/deployments` - List all registered Komodo stack mappings
* `GET /api/deployments/{id}` - Get deployment mapping details
* `POST /api/deployments` - Register or update a Komodo stack mapping (`name`, `komodoStackName`, `artifactName`, `description`)
* `POST /api/deployments/{id}/deploy` - Manually trigger a Komodo deployment
* `DELETE /api/deployments/{id}` - Delete a deployment mapping
