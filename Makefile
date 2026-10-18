.PHONY: help test build import secrets deploy restart apply status logs run-ui clean

# Variables
IMAGE_NAME := brewery/software-supply-chain-platform:latest
NAMESPACE := brewery
DEPLOYMENT := brewery-orchestrator
ENV_FILE := .env
KUBECTL := sudo k3s kubectl
CTR := sudo k3s ctr
JAVA_HOME_21 := $(shell /usr/libexec/java_home -v 21 2>/dev/null || echo "")
MAVEN := $(if $(JAVA_HOME_21),JAVA_HOME="$(JAVA_HOME_21)" mvn,mvn)

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(BLUE)Brewery - Software Supply Chain Platform (K3s)$(NC)"
	@echo "$(BLUE)==============================================$(NC)"
	@echo ""
	@echo "$(GREEN)Available targets:$(NC)"
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}'
	@echo ""

test: ## Run unit and integration tests
	@echo "$(BLUE)Running tests...$(NC)"
	$(MAVEN) test

build: ## Build Brewery Docker image (Next.js UI + Spring Boot JAR)
	@echo "$(BLUE)Building Docker image $(IMAGE_NAME)...$(NC)"
	docker build -t $(IMAGE_NAME) .
	@echo "$(GREEN)✓ Built $(IMAGE_NAME)$(NC)"

import: ## Import built Docker image into K3s containerd
	@echo "$(BLUE)Importing $(IMAGE_NAME) into K3s containerd...$(NC)"
	docker save $(IMAGE_NAME) | $(CTR) images import -
	@echo "$(GREEN)✓ Imported image into K3s$(NC)"

secrets: ## Sync K3s brewery-secrets Secret from local .env file
	@echo "$(BLUE)Syncing K3s secret/brewery-secrets from $(ENV_FILE)...$(NC)"
	$(KUBECTL) create namespace $(NAMESPACE) --dry-run=client -o yaml | $(KUBECTL) apply -f -
	$(KUBECTL) create secret generic brewery-secrets -n $(NAMESPACE) --from-env-file=$(ENV_FILE) --dry-run=client -o yaml | $(KUBECTL) apply -f -
	@echo "$(GREEN)✓ Secret brewery-secrets synced from $(ENV_FILE)$(NC)"

restart: ## Rolling restart Brewery orchestrator deployment in K3s
	@echo "$(BLUE)Restarting deployment/$(DEPLOYMENT) in namespace $(NAMESPACE)...$(NC)"
	$(KUBECTL) rollout restart deployment/$(DEPLOYMENT) -n $(NAMESPACE)
	$(KUBECTL) rollout status deployment/$(DEPLOYMENT) -n $(NAMESPACE)
	@echo "$(GREEN)✓ Rollout complete$(NC)"

deploy: secrets build import restart ## Sync secrets from .env, build image, import into K3s, and roll out update
	@echo "$(GREEN)✓ Brewery deployed to K3s$(NC)"

apply: secrets ## Sync secrets from .env and apply K8s manifests and ingresses to K3s
	@echo "$(BLUE)Applying K3s manifests...$(NC)"
	$(KUBECTL) apply -f k8s/brewery-manifests.yaml
	$(KUBECTL) apply -f k8s/ingresses.yaml
	@echo "$(GREEN)✓ Manifests applied$(NC)"

status: ## Show K3s pod, service, ingress, and PVC status for Brewery
	@echo "$(BLUE)Brewery K3s status (namespace: $(NAMESPACE)):$(NC)"
	$(KUBECTL) get pods,svc,ingress,pvc -n $(NAMESPACE)

logs: ## Follow logs from the Brewery orchestrator pod in K3s
	$(KUBECTL) logs -f deployment/$(DEPLOYMENT) -n $(NAMESPACE)

run-ui: ## Run Next.js dashboard UI locally
	@echo "$(BLUE)Starting Next.js dashboard UI...$(NC)"
	cd dashboard && ( [ -d node_modules ] || npm install ) && npm run dev

clean: ## Clean Maven and Next.js build artifacts
	@echo "$(BLUE)Cleaning build artifacts...$(NC)"
	$(MAVEN) clean
	rm -rf dashboard/.next dashboard/out
	@echo "$(GREEN)✓ Cleaned$(NC)"

.DEFAULT_GOAL := help

