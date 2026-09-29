#!/usr/bin/env bash
set -euo pipefail

# Source the auth helper to get session cookies
source "$(dirname "$0")/auth_helper.sh"

BREWERY_URL="${BREWERY_URL:-http://localhost:8080}"
KOMODO_URL="${KOMODO_BASE_URL:-http://localhost:9120}"

PASS="✓"
FAIL="✗"
ERRORS=0

echo "=== Full End-to-End (E2E) Brewery + Komodo Integration Test ==="
echo ""
echo "Brewery Target: ${BREWERY_URL}"
echo "Komodo Target:  ${KOMODO_URL}"
echo ""

# 1. Check health of Brewery Backend
echo "1. Checking Brewery API health..."
if curl -s -f "${BREWERY_URL}/api/health" > /dev/null; then
  echo "${PASS} Brewery API is reachable and healthy."
else
  echo "${FAIL} Unable to connect to Brewery API at ${BREWERY_URL}/api/health"
  echo "    Make sure Brewery is running (e.g. via 'make run-local' or 'make run-backend')."
  exit 1
fi

# 2. Check health/reachability of Komodo instance
echo ""
echo "2. Checking Komodo instance reachability..."
if curl -s "${KOMODO_URL}" > /dev/null 2>&1; then
  echo "${PASS} Komodo Core instance is reachable at ${KOMODO_URL}."
else
  echo "${FAIL} Cannot connect to Komodo Core at ${KOMODO_URL}"
  echo "    Please start a local Komodo container (e.g. docker run -d -p 9120:9120 moghtech/komodo-core)."
  ERRORS=$((ERRORS + 1))
fi

# 3. Register a Komodo Stack Mapping in Brewery
echo ""
echo "3. Registering Komodo stack mapping 'e2e-demo-stack' in Brewery..."
CREATE_RESP=$(curl -s -b "${COOKIE_JAR}" -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": "e2e-demo-stack",
    "komodoStackName": "demo-stack",
    "artifactName": "demo-web-service",
    "description": "End-to-end integration test stack mapping for Komodo"
  }' \
  "${BREWERY_URL}/api/deployments")

DEPLOYMENT_ID=$(echo "$CREATE_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")

if [ -n "$DEPLOYMENT_ID" ] && [ "$DEPLOYMENT_ID" != "null" ]; then
  echo "${PASS} Stack mapping created. ID: ${DEPLOYMENT_ID}"
else
  echo "${FAIL} Failed to create stack mapping. Response: ${CREATE_RESP}"
  ERRORS=$((ERRORS + 1))
  exit 1
fi

# 4. Simulate a Build & Register Artifact in Brewery Registry
VERSION="1.0.0"
echo ""
echo "4. Simulating build and registering artifact 'demo-web-service@${VERSION}'..."
MOCK_FILE="demo_service_${VERSION}.sh"
cat << 'EOF' > "${MOCK_FILE}"
#!/bin/sh
echo "Demo web service v1.0.0 running..."
EOF
chmod +x "${MOCK_FILE}"

BUILD_ID=$(uuidgen 2>/dev/null | tr 'A-Z' 'a-z' || echo "e2e-build-100")

UPLOAD_RESP=$(curl -s -b "${COOKIE_JAR}" -X POST \
  -F "file=@${MOCK_FILE}" \
  -F "name=demo-web-service" \
  -F "version=${VERSION}" \
  -F "artifact_type=docker" \
  -F "build_id=${BUILD_ID}" \
  -F "repository=myteam/demo-web-service" \
  -F "branch=main" \
  -F "commit=e2e-commit-100" \
  "${BREWERY_URL}/api/registry/artifacts")

rm -f "${MOCK_FILE}"

if [[ "$UPLOAD_RESP" == *"id"* ]]; then
  echo "${PASS} Artifact demo-web-service@${VERSION} registered in Brewery Artifact Registry!"
else
  echo "${FAIL} Failed to register artifact. Response: ${UPLOAD_RESP}"
  ERRORS=$((ERRORS + 1))
fi

# 5. Wait for Brewery's async DeploymentEventListener to trigger Komodo
echo ""
echo "5. Waiting for Brewery to automatically trigger Komodo deployment..."
sleep 3

# Query deployment status from Brewery
DEPLOYMENT_STATE=$(curl -s -b "${COOKIE_JAR}" "${BREWERY_URL}/api/deployments/${DEPLOYMENT_ID}")
STATUS=$(echo "$DEPLOYMENT_STATE" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")
DEPLOYED_VER=$(echo "$DEPLOYMENT_STATE" | grep -o '"deployedVersion":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")
KOMODO_LINK=$(echo "$DEPLOYMENT_STATE" | grep -o '"komodoUrl":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")

echo "    Current Status:   ${STATUS}"
echo "    Deployed Version: ${DEPLOYED_VER}"
echo "    Komodo UI Link:   ${KOMODO_LINK}"

if [ "$DEPLOYED_VER" == "${VERSION}" ]; then
  echo "${PASS} Brewery automatically updated deployed version to ${VERSION}."
else
  echo "${FAIL} Deployed version mismatch. Expected ${VERSION}, got ${DEPLOYED_VER}"
  ERRORS=$((ERRORS + 1))
fi

if [ "$STATUS" == "SUCCESS" ]; then
  echo "${PASS} Komodo API responded successfully with 2xx HTTP status!"
else
  echo "ℹ Note: Deployment status is '${STATUS}'. If Komodo API returned a non-200 (e.g. unauthenticated or stack not found inside Komodo UI), configure your API key in .env."
fi

# 6. Cleanup test deployment mapping
echo ""
echo "6. Cleaning up test deployment mapping..."
curl -s -b "${COOKIE_JAR}" -X DELETE "${BREWERY_URL}/api/deployments/${DEPLOYMENT_ID}" > /dev/null

echo ""
if [ "$ERRORS" -eq 0 ]; then
  echo "=== ${PASS} Full End-to-End Komodo Integration Test Passed! ==="
else
  echo "=== ${FAIL} End-to-End Test finished with ${ERRORS} errors ==="
  exit 1
fi
