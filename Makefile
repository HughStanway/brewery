.PHONY: help test rebuild logs logs-brewery run run-local stop clean

# Variables
DOCKER_COMPOSE := docker compose
JAVA_HOME_21 := $(shell /usr/libexec/java_home -v 21 2>/dev/null || echo "")
MAVEN := $(if $(JAVA_HOME_21),JAVA_HOME="$(JAVA_HOME_21)" mvn,mvn)
PROFILE := dev

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(BLUE)Brewery - Software Supply Chain Platform$(NC)"
	@echo "$(BLUE)=========================================$(NC)"
	@echo ""
	@echo "$(GREEN)Available targets:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}'
	@echo ""

test: ## Run unit and integration tests
	@echo "$(BLUE)Running tests...$(NC)"
	$(MAVEN) test

logs: ## Follow logs from all docker compose services
	$(DOCKER_COMPOSE) logs -f

logs-brewery: ## Follow logs from brewery service container
	$(DOCKER_COMPOSE) logs -f brewery

run: ## Run full stack in Docker Compose in production mode
	@echo "$(BLUE)Building Docker image and starting containers in production mode...$(NC)"
	SPRING_PROFILES_ACTIVE=prod $(DOCKER_COMPOSE) up -d --build
	@echo "$(GREEN)✓ Application started in production mode$(NC)"

run-local: ## Run full-stack in Docker Compose in development mode (using Pub/Sub emulator)
	@echo "$(BLUE)Building Docker images and starting all containers in development mode...$(NC)"
	SPRING_PROFILES_ACTIVE=dev $(DOCKER_COMPOSE) --profile dev up -d --build
	@echo "$(BLUE)Waiting for services to boot...$(NC)"
	@sleep 5
	@echo "$(BLUE)Initializing Pub/Sub emulator topics/subscriptions...$(NC)"
	@./scripts/init-pubsub-emulator.sh
	@echo "$(GREEN)✓ Local development environment started in Docker (port 3000)$(NC)"

run-ui: ## Run Next.js dashboard UI locally
	@echo "$(BLUE)Starting Next.js dashboard UI...$(NC)"
	cd dashboard && ( [ -d node_modules ] || npm install ) && npm run dev

rebuild: ## Rebuild and reload the brewery app container
	@echo "$(BLUE)Rebuilding brewery image and restarting app container...$(NC)"
	$(DOCKER_COMPOSE) up -d --build brewery
	@echo "$(GREEN)✓ Brewery container reloaded$(NC)"

stop: ## Stop all Docker services
	@echo "$(BLUE)Stopping application and services...$(NC)"
	$(DOCKER_COMPOSE) --profile dev down
	@echo "$(GREEN)✓ Stopped$(NC)"

clean: ## Clean build and Docker artifacts
	@echo "$(BLUE)Cleaning build artifacts and Docker artifacts...$(NC)"
	$(MAVEN) clean
	$(DOCKER_COMPOSE) --profile dev down -v --rmi all
	@echo "$(GREEN)✓ Cleaned$(NC)"

.DEFAULT_GOAL := help
