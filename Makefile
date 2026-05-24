.PHONY: help test logs logs-brewery run stop clean

# Variables
DOCKER_COMPOSE := docker compose
MAVEN := mvn
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

test:
	@echo "$(BLUE)Running tests...$(NC)"
	$(MAVEN) test

logs:
	$(DOCKER_COMPOSE) logs -f

logs-brewery:
	$(DOCKER_COMPOSE) logs -f brewery

run:
	@echo "$(BLUE)Building Docker image and starting container...$(NC)"
	$(DOCKER_COMPOSE) up -d --build
	@echo "$(GREEN)✓ Application started$(NC)"
	@echo "  - API: http://localhost:8080/api/health"

stop:
	@echo "$(BLUE)Stopping application and services...$(NC)"
	$(DOCKER_COMPOSE) down
	@echo "$(GREEN)✓ Stopped$(NC)"

clean:
	@echo "$(BLUE)Cleaning build artifacts and Docker artifacts...$(NC)"
	$(MAVEN) clean
	$(DOCKER_COMPOSE) down -v --rmi all
	@echo "$(GREEN)✓ Cleaned$(NC)"

.DEFAULT_GOAL := help
