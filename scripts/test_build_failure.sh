#!/usr/bin/env bash
set -euo pipefail

# Load .env file from project root if it exists
if [ -f "$(dirname "$0")/../.env" ]; then
    export $(grep -v '^#' "$(dirname "$0")/../.env" | xargs)
fi
PROJECT_ID=${GCP_PROJECT_ID:-brewery-homelab}
TOPIC_NAME="brewery-jobs"
EMULATOR_URL="http://localhost:8085/v1/projects/${PROJECT_ID}/topics/${TOPIC_NAME}:publish"
REGISTRY_URL="http://localhost:8080/api/registry"
BUILDS_URL="http://localhost:8080/api/builds"

PASS="✓"
FAIL="✗"
ERRORS=0

echo "=== Testing Build Failure on Test Step Failure ==="
echo ""

# 1. Create a temporary Git repository to simulate a failing codebase (inside shared /tmp/brewery-builds)
mkdir -p /tmp/brewery-builds
TEMP_REPO_DIR=$(mktemp -d /tmp/brewery-builds/brewery-failing-repo-XXXXXX)
echo "Creating temporary git repository at ${TEMP_REPO_DIR}..."

cd "${TEMP_REPO_DIR}"
git init
git checkout -b main || true
git config user.email "test@example.com"
git config user.name "Test User"

# Create build.yaml with a failing test step
cat <<EOF > build.yaml
metadata:
  name: "failing-lib"
build:
  image: "alpine:latest"
  timeoutSeconds: 60
steps:
  setup: |
    echo "Running setup..."
  build: |
    echo "Running build..."
    mkdir -p dist
    echo "dummy-content" > dist/failing-lib.jar
  test: |
    echo "Running tests..."
    echo "Simulating test failure!"
    exit 1
artifacts:
  - pattern: "dist/*.jar"
    type: "jar"
EOF

git add build.yaml
git commit -m "initial commit with failing test step"

COMMIT_SHA=$(git rev-parse HEAD)
SHORT_COMMIT=${COMMIT_SHA:0:7}
VERSION="0.0.0-${SHORT_COMMIT}"

# 2. Prepare JSON payload
PAYLOAD="{
  \"repository\": \"${TEMP_REPO_DIR}\",
  \"commit\": \"${COMMIT_SHA}\",
  \"branch\": \"main\"
}"

echo "Payload to send:"
echo "${PAYLOAD}"
echo

# 3. Base64 encode the payload
if [[ "$OSTYPE" == "darwin"* ]]; then
    BASE64_PAYLOAD=$(echo -n "${PAYLOAD}" | base64)
else
    BASE64_PAYLOAD=$(echo -n "${PAYLOAD}" | base64 -w 0)
fi

# 4. Publish to Pub/Sub Emulator to trigger the build
echo "Publishing trigger message to Pub/Sub Emulator..."
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
    rm -rf "${TEMP_REPO_DIR}"
    exit 1
fi

echo "✓ Message published."

# 5. Find the build in the builds list
echo "Polling builds list for the new build..."
BUILD_ID=""
for i in {1..15}; do
  BUILDS_RESP=$(curl -s "${BUILDS_URL}")
  
  # Filter correctly for our repo
  MATCHING_BUILD=$(echo "${BUILDS_RESP}" | grep -o '{"id":"[^"]*","repository":"'"${TEMP_REPO_DIR}"'"[^}]*}' || true)
  if [ -n "${MATCHING_BUILD}" ]; then
    BUILD_ID=$(echo "${MATCHING_BUILD}" | grep -o '"id":"[^"]*"' | head -n 1 | cut -d'"' -f4)
    echo "✓ Found build ID: ${BUILD_ID}"
    break
  fi
  sleep 1
done

if [ -z "${BUILD_ID}" ]; then
  echo "✗ Failed to find triggered build in system."
  rm -rf "${TEMP_REPO_DIR}"
  exit 1
fi

# 6. Poll for build failure
echo "Polling build status..."
FINISHED=false
STATUS=""
ERROR_MSG=""
for i in {1..30}; do
  BUILD_INFO=$(curl -s "${BUILDS_URL}/${BUILD_ID}")
  STATUS=$(echo "${BUILD_INFO}" | grep -o '"status":"[^"]*"' | cut -d'"' -f4 || true)
  if [ "${STATUS}" = "failed" ] || [ "${STATUS}" = "success" ]; then
    FINISHED=true
    ERROR_MSG=$(echo "${BUILD_INFO}" | grep -o '"errorMessage":"[^"]*"' | cut -d'"' -f4 || true)
    break
  fi
  echo "Current status: ${STATUS} (attempt $i/30)"
  sleep 2
done

# Clean up temp repository
rm -rf "${TEMP_REPO_DIR}"

if [ "${FINISHED}" = false ]; then
  echo "✗ Timeout waiting for build to complete."
  exit 1
fi

# 7. Assertions
echo -e "\n=== Assertions ==="

if [ "${STATUS}" = "failed" ]; then
  echo "${PASS} Build status is 'failed'."
else
  echo "${FAIL} Build status is '${STATUS}' (expected 'failed')."
  ERRORS=$((ERRORS + 1))
fi

if echo "${ERROR_MSG}" | grep -iq "exited with non-zero exit code"; then
  echo "${PASS} Error message indicates non-zero exit code: '${ERROR_MSG}'."
else
  echo "${FAIL} Error message does not indicate exit code failure (got: '${ERROR_MSG}')."
  ERRORS=$((ERRORS + 1))
fi

# Verify artifact is NOT registered in the registry
echo "Checking if artifact was registered..."
REG_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${REGISTRY_URL}/artifacts/failing-lib/${VERSION}")
if [ "${REG_STATUS}" -eq 404 ]; then
  echo "${PASS} Artifact was NOT registered in the registry (returned 404)."
else
  echo "${FAIL} Artifact was registered in the registry! (status code: ${REG_STATUS})"
  ERRORS=$((ERRORS + 1))
fi

echo ""
if [ "${ERRORS}" -eq 0 ]; then
  echo "✓ Test passed successfully!"
  exit 0
else
  echo "✗ Test failed with ${ERRORS} errors."
  exit 1
fi
