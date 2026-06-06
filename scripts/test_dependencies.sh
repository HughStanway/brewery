#!/usr/bin/env bash
set -euo pipefail

REGISTRY_URL="http://localhost:8080/api/registry"
DEPS_URL="http://localhost:8080/api/dependencies"

echo "=== Phase 3: Testing Dependency Resolution Engine ==="

# 1. Create dummy jar files
echo "Creating dummy library jar files..."
echo "dummy bcrypt" > bcrypt-4.0.1.jar
echo "dummy jwt" > jwt-lib-1.6.0.jar
echo "dummy crypto 2.0" > core-crypto-2.0.0.jar
echo "dummy crypto 2.1" > core-crypto-2.1.0.jar
echo "dummy auth" > auth-lib-1.4.2.jar
echo "dummy api" > api-server-0.5.0.jar

BUILD_ID="fb060fe3-4529-4c1f-afb3-e7d386220372"

# 2. Upload bcrypt
echo -e "\n1. Uploading bcrypt@4.0.1..."
curl -s --fail-with-body -X POST \
  -F "file=@bcrypt-4.0.1.jar" \
  -F "name=bcrypt" \
  -F "version=4.0.1" \
  -F "artifact_type=jar" \
  -F "build_id=${BUILD_ID}" \
  -F "repository=myteam/bcrypt" \
  -F "branch=main" \
  -F "commit=bc111" \
  "${REGISTRY_URL}/artifacts" > /dev/null

# 3. Upload jwt-lib
echo -e "\n2. Uploading jwt-lib@1.6.0..."
curl -s --fail-with-body -X POST \
  -F "file=@jwt-lib-1.6.0.jar" \
  -F "name=jwt-lib" \
  -F "version=1.6.0" \
  -F "artifact_type=jar" \
  -F "build_id=${BUILD_ID}" \
  -F "repository=myteam/jwt" \
  -F "branch=main" \
  -F "commit=jwt111" \
  "${REGISTRY_URL}/artifacts" > /dev/null

# 4. Upload core-crypto@2.0.0 (depends on bcrypt@^4.0.0)
echo -e "\n3. Uploading core-crypto@2.0.0..."
curl -s --fail-with-body -X POST \
  -F "file=@core-crypto-2.0.0.jar" \
  -F "name=core-crypto" \
  -F "version=2.0.0" \
  -F "artifact_type=jar" \
  -F "build_id=${BUILD_ID}" \
  -F "repository=myteam/core-crypto" \
  -F "branch=main" \
  -F "commit=cc200" \
  -F "dependencies=[{\"name\":\"bcrypt\",\"version_range\":\"^4.0.0\"}]" \
  "${REGISTRY_URL}/artifacts" > /dev/null

# 5. Upload core-crypto@2.1.0 (depends on bcrypt@^4.0.0)
echo -e "\n4. Uploading core-crypto@2.1.0..."
curl -s --fail-with-body -X POST \
  -F "file=@core-crypto-2.1.0.jar" \
  -F "name=core-crypto" \
  -F "version=2.1.0" \
  -F "artifact_type=jar" \
  -F "build_id=${BUILD_ID}" \
  -F "repository=myteam/core-crypto" \
  -F "branch=main" \
  -F "commit=cc210" \
  -F "dependencies=[{\"name\":\"bcrypt\",\"version_range\":\"^4.0.0\"}]" \
  "${REGISTRY_URL}/artifacts" > /dev/null

# 6. Upload auth-lib@1.4.2 (depends on core-crypto@^2.0.0 and jwt-lib@>=1.5.0)
echo -e "\n5. Uploading auth-lib@1.4.2..."
curl -s --fail-with-body -X POST \
  -F "file=@auth-lib-1.4.2.jar" \
  -F "name=auth-lib" \
  -F "version=1.4.2" \
  -F "artifact_type=jar" \
  -F "build_id=${BUILD_ID}" \
  -F "repository=myteam/auth-lib" \
  -F "branch=main" \
  -F "commit=auth142" \
  -F "dependencies=[{\"name\":\"core-crypto\",\"version_range\":\"^2.0.0\"},{\"name\":\"jwt-lib\",\"version_range\":\">=1.5.0\"}]" \
  "${REGISTRY_URL}/artifacts" > /dev/null

# 7. Upload api-server@0.5.0 (depends on core-crypto@>=2.0.0)
echo -e "\n6. Uploading api-server@0.5.0..."
curl -s --fail-with-body -X POST \
  -F "file=@api-server-0.5.0.jar" \
  -F "name=api-server" \
  -F "version=0.5.0" \
  -F "artifact_type=jar" \
  -F "build_id=${BUILD_ID}" \
  -F "repository=myteam/api" \
  -F "branch=main" \
  -F "commit=api050" \
  -F "dependencies=[{\"name\":\"core-crypto\",\"version_range\":\">=2.0.0\"}]" \
  "${REGISTRY_URL}/artifacts" > /dev/null


# 8. Resolve dependencies for auth-lib@1.4.2
echo -e "\n7. Resolving dependencies for auth-lib@1.4.2 (transitive)..."
RESOLVE_RESPONSE=$(curl -s --fail-with-body \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"include_transitive": true}' \
  "${DEPS_URL}/resolve/auth-lib/1.4.2")
echo "Response:"
echo "${RESOLVE_RESPONSE}"

# 9. Get dependency graph
echo -e "\n8. Getting forward dependency graph for auth-lib@1.4.2..."
GRAPH_RESPONSE=$(curl -s --fail-with-body "${DEPS_URL}/graph/auth-lib/1.4.2?depth=3&direction=forward")
echo "Response:"
echo "${GRAPH_RESPONSE}"

# 10. Get reverse dependency graph (dependents)
echo -e "\n9. Getting reverse dependency graph for core-crypto@2.1.0..."
REVERSE_RESPONSE=$(curl -s --fail-with-body "${DEPS_URL}/reverse/core-crypto/2.1.0?depth=2")
echo "Response:"
echo "${REVERSE_RESPONSE}"

# 11. Check conflicts
echo -e "\n10. Checking conflicts for auth-lib@1.4.2 and api-server@0.5.0..."
CONFLICT_RESPONSE=$(curl -s --fail-with-body \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"artifacts": [{"name": "auth-lib", "version": "1.4.2"}, {"name": "api-server", "version": "0.5.0"}]}' \
  "${DEPS_URL}/conflicts")
echo "Response:"
echo "${CONFLICT_RESPONSE}"

# 12. Compatibility matrix
echo -e "\n11. Querying compatibility matrix for auth-lib and core-crypto..."
MATRIX_RESPONSE=$(curl -s --fail-with-body "${DEPS_URL}/compatibility-matrix?artifacts=auth-lib,core-crypto")
echo "Response:"
echo "${MATRIX_RESPONSE}"

# 13. Clean up
rm -f bcrypt-4.0.1.jar jwt-lib-1.6.0.jar core-crypto-2.0.0.jar core-crypto-2.1.0.jar auth-lib-1.4.2.jar api-server-0.5.0.jar

echo -e "\n=== Dependency Engine Verification Completed Successfully! ==="
