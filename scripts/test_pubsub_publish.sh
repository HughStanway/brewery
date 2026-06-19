#!/usr/bin/env bash
set -euo pipefail

# Source the auth helper to get session cookies
source "$(dirname "$0")/auth_helper.sh"

# Load .env file from project root if it exists
if [ -f "$(dirname "$0")/../.env" ]; then
    export $(grep -v '^#' "$(dirname "$0")/../.env" | xargs)
fi
PROJECT_ID=${GCP_PROJECT_ID:-brewery-homelab}
TOPIC_NAME="brewery-jobs"
EMULATOR_URL="http://localhost:8085/v1/projects/${PROJECT_ID}/topics/${TOPIC_NAME}:publish"
REGISTRY_URL="http://localhost:8080/api/registry"
DEPS_URL="http://localhost:8080/api/dependencies"

echo "=== Testing Brewery Pub/Sub Ingestion and Dependency Resolution ==="

# 1. Register bcrypt dependency first so it can be resolved
echo "Registering bcrypt dependency..."
echo "dummy bcrypt" > bcrypt-4.0.1.jar
curl -s -b "${COOKIE_JAR}" --fail-with-body -X POST \
  -F "file=@bcrypt-4.0.1.jar" \
  -F "name=bcrypt" \
  -F "version=4.0.1" \
  -F "artifact_type=jar" \
  -F "build_id=fb060fe3-4529-4c1f-afb3-e7d386220372" \
  -F "repository=myteam/bcrypt" \
  -F "branch=main" \
  -F "commit=bc111" \
  "${REGISTRY_URL}/artifacts" > /dev/null
rm -f bcrypt-4.0.1.jar
echo "✓ bcrypt@4.0.1 registered."

# Get current git commit hash
COMMIT_SHA=$(git rev-parse HEAD)
SHORT_COMMIT=${COMMIT_SHA:0:7}
VERSION="0.0.0-${SHORT_COMMIT}"

# 2. Prepare JSON payload
PAYLOAD="{
  \"repository\": \"/Users/hughstanway/Projects/brewery\",
  \"commit\": \"${COMMIT_SHA}\",
  \"branch\": \"main\"
}"

echo "1. Payload to send:"
echo "${PAYLOAD}"
echo

# 3. Base64 encode the payload (required by Google Pub/Sub API)
if [[ "$OSTYPE" == "darwin"* ]]; then
    BASE64_PAYLOAD=$(echo -n "${PAYLOAD}" | base64)
else
    BASE64_PAYLOAD=$(echo -n "${PAYLOAD}" | base64 -w 0)
fi

# 4. Publish to Emulator
echo "2. Publishing message to Pub/Sub Emulator..."
# Note: Google Pub/Sub Emulator is not authenticated
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "{\"messages\": [{\"data\": \"${BASE64_PAYLOAD}\"}]}" \
    "${EMULATOR_URL}")

HTTP_STATUS=$(echo "${RESPONSE}" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "${RESPONSE}" | grep -v "HTTP_STATUS")

if [ "${HTTP_STATUS}" -ne 200 ]; then
    echo "✗ Failed to publish message. HTTP Status: ${HTTP_STATUS}"
    echo "Response: ${BODY}"
    exit 1
fi

echo "✓ Success! Message published."

# 5. Poll for built artifact metadata
echo "3. Polling for built artifact metadata at /api/registry/artifacts/brewery/${VERSION}..."
BUILT=false
for i in {1..30}; do
  RESPONSE_CODE=$(curl -s -b "${COOKIE_JAR}" -o /dev/null -w "%{http_code}" "${REGISTRY_URL}/artifacts/brewery/${VERSION}")
  if [ "$RESPONSE_CODE" -eq 200 ]; then
    BUILT=true
    echo "✓ Artifact built and registered successfully!"
    break
  fi
  echo "Still building... (attempt $i/30)"
  sleep 2
done

if [ "$BUILT" = false ]; then
  echo "✗ Timeout waiting for build to complete. Check spring boot/docker logs."
  exit 1
fi

# 6. Retrieve metadata and verify dependencies exist in it
echo -e "\n4. Fetching artifact metadata from registry..."
META=$(curl -s -b "${COOKIE_JAR}" "${REGISTRY_URL}/artifacts/brewery/${VERSION}")
echo "Metadata response:"
echo "${META}"

if echo "${META}" | grep -q "bcrypt"; then
  echo "✓ Success: 'bcrypt' dependency found in artifact metadata!"
else
  echo "✗ Failed: 'bcrypt' dependency NOT found in metadata."
  exit 1
fi

# 7. Resolve dependencies via the API
echo -e "\n5. Resolving dependencies via resolve API..."
RESOLVE_RESPONSE=$(curl -s -b "${COOKIE_JAR}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"include_transitive": true}' \
  "${DEPS_URL}/resolve/brewery/${VERSION}")
echo "Resolution response:"
echo "${RESOLVE_RESPONSE}"

if echo "${RESOLVE_RESPONSE}" | grep -q "bcrypt"; then
  echo "✓ Success: Dependency resolver resolved bcrypt dependency successfully!"
else
  echo "✗ Failed: Dependency resolver could not resolve bcrypt."
  exit 1
fi

# 8. Query forward dependency graph to verify DB records exist
echo -e "\n6. Verifying DB graph record propagation..."
GRAPH_RESPONSE=$(curl -s -b "${COOKIE_JAR}" "${DEPS_URL}/graph/brewery/${VERSION}?depth=2&direction=forward")
echo "Graph response:"
echo "${GRAPH_RESPONSE}"

if echo "${GRAPH_RESPONSE}" | grep -q "bcrypt"; then
  echo "✓ Success: DB dependency relations verified in forward dependency graph!"
else
  echo "✗ Failed: DB dependency relations missing from graph."
  exit 1
fi

echo -e "\n=== Pub/Sub Dependency Ingestion & Resolution Validation Completed Successfully! ==="

# 9. Register bcrypt dependency first so it can be resolved
echo "Registering new bcrypt dependency version..."
echo "dummy bcrypt" > bcrypt-4.0.2.jar
curl -s -b "${COOKIE_JAR}" --fail-with-body -X POST \
  -F "file=@bcrypt-4.0.2.jar" \
  -F "name=bcrypt" \
  -F "version=4.0.2" \
  -F "artifact_type=jar" \
  -F "build_id=fb060fe3-4529-4c1f-afb3-e7d386220372" \
  -F "repository=myteam/bcrypt" \
  -F "branch=main" \
  -F "commit=bc111" \
  "${REGISTRY_URL}/artifacts" > /dev/null
rm -f bcrypt-4.0.2.jar
echo "✓ bcrypt@4.0.2 registered."