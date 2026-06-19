#!/usr/bin/env bash
set -euo pipefail

# Source the auth helper to get session cookies
source "$(dirname "$0")/auth_helper.sh"

REGISTRY_URL="http://localhost:8080/api/registry"
DEPS_URL="http://localhost:8080/api/dependencies"

PASS="✓"
FAIL="✗"
ERRORS=0

assert_contains() {
    local desc="$1"
    local haystack="$2"
    local needle="$3"
    if echo "$haystack" | grep -q "$needle"; then
        echo "${PASS} ${desc}"
    else
        echo "${FAIL} ${desc} (expected '${needle}' in response)"
        echo "  Response: ${haystack}"
        ERRORS=$((ERRORS + 1))
    fi
}

echo "=== Testing Dependency Cycle Detection ==="
echo ""

BUILD_ID="fb060fe3-4529-4c1f-afb3-e7d386220379"

# Create dummy jar files
echo "Creating dummy jar files..."
echo "dummy cycle-A 1.0.0" > cycle-a-1.0.0.jar
echo "dummy cycle-B 1.0.0" > cycle-b-1.0.0.jar
echo "dummy cycle-C 1.0.0" > cycle-c-1.0.0.jar

# ─── Step 1: Register cycle-C@1.0.0 (depends on cycle-A ^1.0.0) ──────────────
echo ""
echo "1. Registering cycle-C@1.0.0 (depends on cycle-A ^1.0.0)..."
RESP=$(curl -s -b "${COOKIE_JAR}" -X POST \
  -F "file=@cycle-c-1.0.0.jar" \
  -F "name=cycle-C" \
  -F "version=1.0.0" \
  -F "artifact_type=jar" \
  -F "build_id=${BUILD_ID}" \
  -F "repository=myteam/cycle-c" \
  -F "branch=main" \
  -F "commit=cc100" \
  -F 'dependencies=[{"name":"cycle-A","version_range":"^1.0.0"}]' \
  "${REGISTRY_URL}/artifacts")
assert_contains "cycle-C@1.0.0 registered" "$RESP" "cycle-C"

# ─── Step 2: Register cycle-B@1.0.0 (depends on cycle-C ^1.0.0) ──────────────
echo ""
echo "2. Registering cycle-B@1.0.0 (depends on cycle-C ^1.0.0)..."
RESP=$(curl -s -b "${COOKIE_JAR}" -X POST \
  -F "file=@cycle-b-1.0.0.jar" \
  -F "name=cycle-B" \
  -F "version=1.0.0" \
  -F "artifact_type=jar" \
  -F "build_id=${BUILD_ID}" \
  -F "repository=myteam/cycle-b" \
  -F "branch=main" \
  -F "commit=bb100" \
  -F 'dependencies=[{"name":"cycle-C","version_range":"^1.0.0"}]' \
  "${REGISTRY_URL}/artifacts")
assert_contains "cycle-B@1.0.0 registered" "$RESP" "cycle-B"

# ─── Step 3: Register cycle-A@1.0.0 (depends on cycle-B ^1.0.0) ──────────────
echo ""
echo "3. Registering cycle-A@1.0.0 (depends on cycle-B ^1.0.0)..."
RESP=$(curl -s -b "${COOKIE_JAR}" -X POST \
  -F "file=@cycle-a-1.0.0.jar" \
  -F "name=cycle-A" \
  -F "version=1.0.0" \
  -F "artifact_type=jar" \
  -F "build_id=${BUILD_ID}" \
  -F "repository=myteam/cycle-a" \
  -F "branch=main" \
  -F "commit=aa100" \
  -F 'dependencies=[{"name":"cycle-B","version_range":"^1.0.0"}]' \
  "${REGISTRY_URL}/artifacts")
assert_contains "cycle-A@1.0.0 registered" "$RESP" "cycle-A"

# Clean up temp jar files
rm -f cycle-a-1.0.0.jar cycle-b-1.0.0.jar cycle-c-1.0.0.jar

# ─── Step 4: Resolve dependencies on cycle-A@1.0.0 ────────────────────────────
echo ""
echo "4. Triggering dependency resolution on cycle-A@1.0.0..."
RESOLVE_RESP=$(curl -s -b "${COOKIE_JAR}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"include_transitive": true}' \
  "${DEPS_URL}/resolve/cycle-A/1.0.0")

assert_contains "Cycle A -> B -> C -> A detected in resolve response" \
  "$RESOLVE_RESP" \
  "Circular dependency detected: cycle-A@1.0.0 -> cycle-B@1.0.0 -> cycle-C@1.0.0 -> cycle-A@1.0.0"

# ─── Step 5: Verify conflicts table in DB ─────────────────────────────────────
echo ""
echo "5. Verifying conflicts lists in database..."
CONFLICTS_RESP=$(curl -s -b "${COOKIE_JAR}" "${DEPS_URL}/conflicts")

assert_contains "Cycle logged in database conflicts" \
  "$CONFLICTS_RESP" \
  "Circular dependency detected: cycle-A@1.0.0 -> cycle-B@1.0.0 -> cycle-C@1.0.0 -> cycle-A@1.0.0"

echo ""
if [ "${ERRORS}" -eq 0 ]; then
  echo "✓ Cycle detection test passed successfully!"
  exit 0
else
  echo "✗ Cycle detection test failed with ${ERRORS} errors."
  exit 1
fi
