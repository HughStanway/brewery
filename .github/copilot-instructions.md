# Copilot Instructions for Foundry

## Project Overview

This is a multi-module Maven project for a self-hosted Software Supply Chain Platform.

## Structure

- **common**: Shared utilities, models, and exceptions
- **api**: REST API layer and controllers
- **core**: Main Spring Boot application
- **build-engine**: Phase 1 - Docker-based builds
- **registry**: Phase 2 - Artifact registry
- **dependency-resolver**: Phase 3 - Dependency graphs
- **deployment-engine**: Phase 6 - Deployments

## Build & Compile

```bash
mvn clean install
```

## Development Server

```bash
docker-compose up -d
mvn spring-boot:run -pl core
```

## Testing

```bash
mvn test
```

## Key Technologies

- Java 21
- Spring Boot 3.2+
- Spring Data JPA
- PostgreSQL
- Liquibase
- Docker
- Maven

## Database

PostgreSQL with Liquibase migrations. Start with Docker Compose.

## Phase Descriptions

Detailed architectural plans are in `plan/` directory:

- `01_webhook_and_build_engine.md` - GitHub webhooks + containerized builds
- `02_artifact_registry.md` - Versioned artifact storage
- `03_dependency_resolution.md` - Dependency graphs
- `04_cascade_rebuilds.md` - Automatic rebuild propagation
- `05_dashboard_ui.md` - Next.js web dashboard
- `06_deployment_engine.md` - Docker Compose deployments
