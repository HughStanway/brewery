#!/usr/bin/env bash
set -euo pipefail

REGISTRY_URL="http://localhost:8080/api/registry"
DEPLOYMENTS_URL="http://localhost:8080/api/deployments"

PASS="✓"
FAIL="✗"
ERRORS=0

echo "=== Phase 6: Testing Deployment Engine ==="
echo ""

# 1. Create a dummy server script to compile/deploy
echo "1. Creating dummy mock server script..."
cat << 'EOF' > mock_server.sh
#!/bin/sh
echo "=== Mock Server Started ==="
while true; do
  echo "Server heartbeat: $(date)"
  sleep 5
done
EOF
chmod +x mock_server.sh

# 2. Register mock_server.sh as an artifact in registry
echo ""
echo "2. Registering mock-server-bin@1.0.0 in the registry..."
BUILD_ID="fb060fe3-4529-4c1f-afb3-e7d386220379"
RESP=$(curl -s -X POST \
  -F "file=@mock_server.sh" \
  -F "name=mock-server-bin" \
  -F "version=1.0.0" \
  -F "artifact_type=binary" \
  -F "build_id=${BUILD_ID}" \
  -F "repository=myteam/mock-server" \
  -F "branch=main" \
  -F "commit=mc100" \
  "${REGISTRY_URL}/artifacts")

if [[ "$RESP" == *"id"* ]]; then
  echo "${PASS} mock-server-bin registered successfully"
else
  echo "${FAIL} Failed to register mock-server-bin"
  ERRORS=$((ERRORS + 1))
  exit 1
fi

# 3. Create or update deployment stack configuration in database via REST API
echo ""
echo "3. Creating deployment stack 'integration-test-stack' in the database..."
SPEC_YAML="version: 1
deployment:
  name: \"integration-test-stack\"
  description: \"Integration test deployment using mock-server-bin\"
services:
  web-server:
    artifact: \"mock-server-bin@latest\"
    type: \"binary\"
    healthCheck:
      command: \"echo 'mock-server is running'\"
      interval: 2s
      timeout: 1s
"

# Escape YAML string for JSON body
JSON_SPEC=$(echo "$SPEC_YAML" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | awk '{printf "%s\\n", $0}' | tr -d '\r')

CREATE_RESP=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"integration-test-stack\", \"specYaml\": \"${JSON_SPEC}\"}" \
  "${DEPLOYMENTS_URL}")

DEPLOYMENT_ID=$(echo "$CREATE_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$DEPLOYMENT_ID" ] && [ "$DEPLOYMENT_ID" != "null" ]; then
  echo "${PASS} Stack configured. Deployment ID: ${DEPLOYMENT_ID}"
else
  echo "${FAIL} Failed to create deployment configuration"
  ERRORS=$((ERRORS + 1))
  exit 1
fi

# 4. Trigger deployment rollout
echo ""
echo "4. Triggering deployment rollout for integration-test-stack..."
DEPLOY_RESP=$(curl -s -X POST "${DEPLOYMENTS_URL}/${DEPLOYMENT_ID}/deploy")

if [[ "$DEPLOY_RESP" == *"healthy"* || "$DEPLOY_RESP" == *"deploying"* ]]; then
  echo "${PASS} Rollout triggered successfully"
else
  echo "${FAIL} Rollout trigger failed. Response: ${DEPLOY_RESP}"
  ERRORS=$((ERRORS + 1))
fi

# 5. Wait a few seconds and run health checks
echo ""
echo "5. Waiting for container startup and polling health check..."
sleep 5

# Force health check check
curl -s -X POST "${DEPLOYMENTS_URL}/${DEPLOYMENT_ID}/health/check" > /dev/null

# Get deployment status
STATUS_RESP=$(curl -s "${DEPLOYMENTS_URL}/${DEPLOYMENT_ID}")
FINAL_STATUS=$(echo "$STATUS_RESP" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ "$FINAL_STATUS" == "healthy" ]; then
  echo "${PASS} Deployment stack state is HEALTHY"
else
  echo "${FAIL} Deployment stack is in state: ${FINAL_STATUS}"
  ERRORS=$((ERRORS + 1))
fi

# Get health check list
HEALTH_RESP=$(curl -s "${DEPLOYMENTS_URL}/${DEPLOYMENT_ID}/health")
echo "Active health metrics: ${HEALTH_RESP}"

# 6. Clean up docker container on host to avoid cluttering
echo ""
echo "6. Cleaning up docker stack on host..."
docker compose -p integration-test-stack -f "/tmp/brewery-builds/deployments/deploy-${DEPLOYMENT_ID}/docker-compose.yml" down -v --remove-orphans > /dev/null 2>&1 || true

# Clean up local files
rm -f mock_server.sh

echo ""
if [ "$ERRORS" -eq 0 ]; then
  echo "=== ${PASS} Deployment Engine Integration Test Succeeded! ==="
else
  echo "=== ${FAIL} Deployment Engine Integration Test Failed with ${ERRORS} errors ==="
  exit 1
fi
