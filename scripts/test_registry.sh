#!/usr/bin/env bash
set -euo pipefail

REGISTRY_URL="http://localhost:8080/api/registry"
echo "=== Phase 2: Testing Artifact Registry APIs ==="

# 1. Create a dummy artifact file to upload
echo "Creating dummy artifact file..."
echo "this is a dummy built library jar file content" > dummy-lib-1.0.0.jar

# Generate mock UUIDs
BUILD_ID="fb060fe3-4529-4c1f-afb3-e7d386220372"

# 2. Upload the artifact
echo -e "\n1. Uploading artifact..."
UPLOAD_RESPONSE=$(curl -s --fail-with-body \
  -X POST \
  -F "file=@dummy-lib-1.0.0.jar" \
  -F "name=dummy-lib" \
  -F "version=1.0.0" \
  -F "artifact_type=jar" \
  -F "build_id=${BUILD_ID}" \
  -F "repository=myteam/dummy-lib" \
  -F "branch=main" \
  -F "commit=abc123commit" \
  -F "dependencies=[{\"name\":\"core-crypto\",\"version_range\":\"^2.0.0\",\"resolved_version\":\"2.1.0\"}]" \
  -F "tags=stable" \
  "${REGISTRY_URL}/artifacts")

echo "Response:"
echo "${UPLOAD_RESPONSE}"

# 3. List versions
echo -e "\n2. Listing versions of 'dummy-lib'..."
LIST_RESPONSE=$(curl -s --fail-with-body "${REGISTRY_URL}/artifacts/dummy-lib")
echo "Response:"
echo "${LIST_RESPONSE}"

# 4. Get metadata for 1.0.0
echo -e "\n3. Retrieving metadata for 'dummy-lib' version '1.0.0'..."
META_RESPONSE=$(curl -s --fail-with-body "${REGISTRY_URL}/artifacts/dummy-lib/1.0.0")
echo "Response:"
echo "${META_RESPONSE}"

# 5. Download the artifact
echo -e "\n4. Downloading artifact 'dummy-lib' version '1.0.0'..."
curl -s --fail-with-body -o downloaded-dummy.jar "${REGISTRY_URL}/artifacts/dummy-lib/1.0.0/download"
echo "Downloaded file content:"
cat downloaded-dummy.jar

# 6. Search registry
echo -e "\n5. Searching for 'dummy-lib'..."
SEARCH_RESPONSE=$(curl -s --fail-with-body "${REGISTRY_URL}/search?q=dummy&tag=stable")
echo "Response:"
echo "${SEARCH_RESPONSE}"

# 7. Add tags
echo -e "\n6. Adding tag 'production' to 'dummy-lib' version '1.0.0'..."
TAG_RESPONSE=$(curl -s --fail-with-body \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"tags": ["production"]}' \
  "${REGISTRY_URL}/artifacts/dummy-lib/1.0.0/tags")
echo "Response:"
echo "${TAG_RESPONSE}"

# 8. Create version alias
echo -e "\n7. Creating alias 'latest' mapping to version '1.0.0'..."
ALIAS_RESPONSE=$(curl -s --fail-with-body \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"name": "dummy-lib", "alias": "latest", "target_version": "1.0.0"}' \
  "${REGISTRY_URL}/aliases")
echo "Response:"
echo "${ALIAS_RESPONSE}"

# 9. Get alias resolution
echo -e "\n8. Resolving alias 'latest'..."
RESOLVE_RESPONSE=$(curl -s --fail-with-body "${REGISTRY_URL}/aliases/dummy-lib/latest")
echo "Response:"
echo "${RESOLVE_RESPONSE}"

# 10. Delete the artifact
echo -e "\n9. Deleting artifact 'dummy-lib' version '1.0.0'..."
DELETE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "${REGISTRY_URL}/artifacts/dummy-lib/1.0.0")
echo "HTTP Status Code: ${DELETE_RESPONSE}"
if [ "${DELETE_RESPONSE}" -ne 204 ]; then
  echo "✗ Failed to delete artifact, status: ${DELETE_RESPONSE}"
  exit 1
fi
echo "✓ Artifact deleted successfully (status 204)"

# 11. Verify deletion (retrieve metadata should fail with 404)
echo -e "\n10. Verifying deletion of 'dummy-lib' version '1.0.0'..."
VERIFY_GET_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${REGISTRY_URL}/artifacts/dummy-lib/1.0.0")
echo "HTTP Status Code for GET: ${VERIFY_GET_STATUS}"
if [ "${VERIFY_GET_STATUS}" -ne 404 ]; then
  echo "✗ Expected 404 for deleted artifact metadata, got: ${VERIFY_GET_STATUS}"
  exit 1
fi
echo "✓ Confirmed artifact is deleted from database"

# 12. Clean up local files
rm -f dummy-lib-1.0.0.jar downloaded-dummy.jar

echo -e "\n=== Registry API Verification Completed Successfully! ==="
