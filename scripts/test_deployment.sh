#!/usr/bin/env bash
set -euo pipefail

# Source the auth helper to get session cookies
source "$(dirname "$0")/auth_helper.sh"

DEPLOYMENTS_URL="http://localhost:8080/api/deployments"
REGISTRY_URL="http://localhost:8080/api/registry"

PASS="✓"
FAIL="✗"
ERRORS=0

echo "=== Phase 6: Testing Komodo Deployment Integration Engine ==="
echo ""

# 1. Register a new Komodo Stack Mapping
echo "1. Registering Komodo stack mapping 'komodo-integration-test'..."
CREATE_RESP=$(curl -s -b "${COOKIE_JAR}" -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": "komodo-integration-test",
    "komodoStackName": "test-komodo-stack",
    "artifactName": "komodo-test-bin",
    "description": "Integration test stack for Komodo deployment engine"
  }' \
  "${DEPLOYMENTS_URL}")

DEPLOYMENT_ID=$(echo "$CREATE_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")

if [ -n "$DEPLOYMENT_ID" ] && [ "$DEPLOYMENT_ID" != "null" ]; then
  echo "${PASS} Komodo stack mapping registered successfully. Deployment ID: ${DEPLOYMENT_ID}"
else
  echo "${FAIL} Failed to register Komodo stack mapping. Response: ${CREATE_RESP}"
  ERRORS=$((ERRORS + 1))
  exit 1
fi

# 2. Verify mapping retrieval
echo ""
echo "2. Querying registered deployment mapping..."
GET_RESP=$(curl -s -b "${COOKIE_JAR}" "${DEPLOYMENTS_URL}/${DEPLOYMENT_ID}")
STACK_NAME=$(echo "$GET_RESP" | grep -o '"komodoStackName":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")
ARTIFACT_NAME=$(echo "$GET_RESP" | grep -o '"artifactName":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")

if [ "$STACK_NAME" == "test-komodo-stack" ] && [ "$ARTIFACT_NAME" == "komodo-test-bin" ]; then
  echo "${PASS} Retrieved deployment mapping matches expected stack (${STACK_NAME}) and artifact (${ARTIFACT_NAME})"
else
  echo "${FAIL} Retrieved deployment mapping mismatch. Response: ${GET_RESP}"
  ERRORS=$((ERRORS + 1))
fi

# 3. Trigger manual deployment rollout
echo ""
echo "3. Triggering Komodo deployment rollout for 'komodo-integration-test'..."
DEPLOY_RESP=$(curl -s -b "${COOKIE_JAR}" -X POST "${DEPLOYMENTS_URL}/${DEPLOYMENT_ID}/deploy")
STATUS=$(echo "$DEPLOY_RESP" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")
KOMODO_URL=$(echo "$DEPLOY_RESP" | grep -o '"komodoUrl":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")

if [ -n "$STATUS" ] && [ -n "$KOMODO_URL" ]; then
  echo "${PASS} Rollout triggered. Status: ${STATUS}, Komodo UI Link: ${KOMODO_URL}"
else
  echo "${FAIL} Deployment trigger failed. Response: ${DEPLOY_RESP}"
  ERRORS=$((ERRORS + 1))
fi

# 4. Clean up test deployment mapping
echo ""
echo "4. Cleaning up test deployment mapping..."
DELETE_RESP=$(curl -s -b "${COOKIE_JAR}" -X DELETE "${DEPLOYMENTS_URL}/${DEPLOYMENT_ID}")

if [[ "$DELETE_RESP" == *"success"* ]]; then
  echo "${PASS} Test deployment mapping deleted successfully"
else
  echo "${FAIL} Failed to delete deployment mapping. Response: ${DELETE_RESP}"
  ERRORS=$((ERRORS + 1))
fi

echo ""
if [ "$ERRORS" -eq 0 ]; then
  echo "=== ${PASS} Komodo Deployment Integration Test Succeeded! ==="
else
  echo "=== ${FAIL} Komodo Deployment Integration Test Failed with ${ERRORS} errors ==="
  exit 1
fi
