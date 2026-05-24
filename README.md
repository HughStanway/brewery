# Software Supply Chain Platform

A self-hosted, artifact-centric CI/CD platform designed for homelab environments.

## Project Structure

```
foundry/
├── common/              # Shared models, DTOs, exceptions
├── api/                 # REST API controllers and configs
├── core/                # Main Spring Boot application
├── build-engine/        # Phase 1: Docker-based build execution
├── registry/            # Phase 2: Artifact storage and metadata
├── dependency-resolver/ # Phase 3: Dependency graph and resolution
├── deployment-engine/   # Phase 6: Docker Compose deployments
├── plan/                # Detailed implementation plans for each phase
└── pom.xml              # Maven parent configuration
```

## Quick Start

### Prerequisites

- Java 21+
- Maven 3.8+
- Docker & Docker Compose
- PostgreSQL 15+

### Development Setup

1. **Start services:**
```bash
docker-compose up -d
```

2. **Build project:**
```bash
mvn clean install
```

3. **Run application:**
```bash
mvn spring-boot:run -pl core -Dspring-boot.run.arguments="--spring.profiles.active=dev"
```

4. **Access API:**
```
http://localhost:8080/api/health
```

## Architecture

The platform is built around **artifacts as the system of record**:

```
GitHub → Webhook Receiver → Build Engine → Artifact Registry
                                               ↓
                                    Dependency Resolver
                                               ↓
                                      Cascade Rebuilds
                                               ↓
                                      Deployment Engine
                                               ↓
                                          Dashboard
```

## Implementation Phases

See [plan/00_IMPLEMENTATION_ROADMAP.md](plan/00_IMPLEMENTATION_ROADMAP.md) for detailed specifications:

1. **Phase 1:** Webhook Receiver & Build Engine
2. **Phase 2:** Artifact Registry & Storage
3. **Phase 3:** Dependency Resolution Engine
4. **Phase 4:** Cascade Rebuild System
5. **Phase 5:** Dashboard & Web UI
6. **Phase 6:** Deployment Engine

## API Endpoints

- `GET /api/health` - System health check
- `POST /api/webhooks/github` - GitHub webhook receiver (Phase 1)
- `GET/POST /api/registry/artifacts` - Artifact registry (Phase 2)
- `GET /api/dependencies/*` - Dependency queries (Phase 3)
- `POST /api/cascade/trigger` - Cascade rebuild (Phase 4)

## Configuration

Application configuration is in `core/src/main/resources/application.yml`

Key environment variables:
- `DB_PASSWORD` - PostgreSQL password
- `GITHUB_WEBHOOK_SECRET` - GitHub webhook secret
- `DOCKER_HOST` - Docker daemon socket
- `SPRING_PROFILES_ACTIVE` - Profile (dev, test, prod)

## Development

### Build
```bash
mvn clean install
```

### Run Tests
```bash
mvn test
```

### Run with Docker Compose
```bash
docker-compose up
```

### Logs
```bash
# Follow logs from all services
docker-compose logs -f

# Follow logs from specific service
docker-compose logs -f foundry
```

## Database

PostgreSQL is used for persistent state. Database schema is managed by Liquibase.

Schema location: `core/src/main/resources/db/changelog/master.xml`

## Contributing

1. Follow the implementation plans in `plan/` directory
2. Create feature branches
3. Write tests for new functionality
4. Ensure code compiles without warnings

## License

Proprietary - Homelab use only

## RUN:

cd /Users/hughstanway/Projects/foundry
mvn spring-boot:run -pl core -Dspring-boot.run.profiles=dev
