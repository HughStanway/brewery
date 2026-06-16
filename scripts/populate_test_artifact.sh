#!/usr/bin/env bash
set -euo pipefail

# Configuration
REGISTRY_URL="http://localhost:8080/api/registry"
NAME="mock-server-bin"
VERSION="1.0.0"

if [ $# -eq 1 ]; then
  if [[ "$1" =~ ^[0-9]+ ]]; then
    VERSION="$1"
  else
    NAME="$1"
  fi
elif [ $# -eq 2 ]; then
  NAME="$1"
  VERSION="$2"
fi

TYPE="binary"

echo "=== Brewery Test Artifact Populator ==="
echo "Artifact Name: ${NAME}"
echo "Version:       ${VERSION}"
echo "Type:          ${TYPE}"
echo ""

# 1. Create a dummy executable script that acts as the artifact
echo "1. Creating mock service file..."
MOCK_FILE="${NAME}_mock_${VERSION}.sh"
cat << EOF > "${MOCK_FILE}"
#!/bin/sh
echo "=== Mock Service [${NAME}] version [${VERSION}] starting... ==="
echo "Artifact path: \${0}"
while true; do
  echo "Heartbeat from ${NAME}@${VERSION} - \$(date)"
  sleep 3
done
EOF
chmod +x "${MOCK_FILE}"

# 2. Upload the artifact to the registry
echo "2. Uploading artifact to registry..."
BUILD_ID=$(uuidgen 2>/dev/null | tr 'A-Z' 'a-z' || python3 -c "import uuid; print(uuid.uuid4())" 2>/dev/null || echo "fb060fe3-4529-4c1f-afb3-e7d386220379")

UPLOAD_RESP=$(curl -s -X POST \
  -F "file=@${MOCK_FILE}" \
  -F "name=${NAME}" \
  -F "version=${VERSION}" \
  -F "artifact_type=${TYPE}" \
  -F "build_id=${BUILD_ID}" \
  -F "repository=myteam/${NAME}" \
  -F "branch=main" \
  -F "commit=mc-rev-${VERSION}" \
  "${REGISTRY_URL}/artifacts")

if [[ "$UPLOAD_RESP" == *"id"* ]]; then
  echo "✓ Artifact registered successfully!"
else
  echo "✗ Failed to register artifact. Response: ${UPLOAD_RESP}"
  rm -f "${MOCK_FILE}"
  exit 1
fi

# 3. Create/update version alias 'latest' to point to this version
echo "3. Updating 'latest' alias to point to version ${VERSION}..."
ALIAS_RESP=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"${NAME}\", \"alias\": \"latest\", \"target_version\": \"${VERSION}\"}" \
  "${REGISTRY_URL}/aliases")

if [[ "$ALIAS_RESP" == *"alias"* ]]; then
  echo "✓ Alias 'latest' successfully mapped to ${VERSION}"
else
  echo "✗ Failed to update alias. Response: ${ALIAS_RESP}"
fi

# Clean up local mock file copy (the server has its own copy in the artifact store now)
rm -f "${MOCK_FILE}"

echo ""
echo "=== Setup Complete! ==="
echo "You can now use this artifact to define and run deployments in the web UI."
echo ""
echo "Sample Deployment YAML configuration:"
echo "--------------------------------------------------------"
echo "version: 1"
echo "deployment:"
echo "  name: \"test-deploy-stack\""
echo "  description: \"Local deployment testing stack\""
echo "services:"
echo "  web-app:"
echo "    artifact: \"${NAME}@latest\""
echo "    type: \"${TYPE}\""
echo "    healthCheck:"
echo "      command: \"echo 'healthy'\""
echo "      interval: 3s"
echo "      timeout: 1s"
echo "--------------------------------------------------------"
echo ""
echo "If you have a running deployment configured with '${NAME}@latest' (or a SemVer range matching this update),"
echo "uploading a new version using this script will automatically trigger a rolling rollout!"
