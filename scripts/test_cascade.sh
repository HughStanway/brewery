#!/usr/bin/env bash
set -euo pipefail

REGISTRY_URL="http://localhost:8080/api/registry"
CASCADE_URL="http://localhost:8080/api/cascade"

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

assert_not_empty() {
    local desc="$1"
    local value="$2"
    if [ -n "$value" ] && [ "$value" != "null" ]; then
        echo "${PASS} ${desc}: ${value}"
    else
        echo "${FAIL} ${desc} (got empty/null value)"
        ERRORS=$((ERRORS + 1))
    fi
}

echo "=== Phase 4: Testing Cascade Rebuild System ==="
echo ""

BUILD_ID="fb060fe3-4529-4c1f-afb3-e7d386220373"

# Create dummy jar files
echo "Creating dummy jar files..."
echo "dummy bcrypt 4.0.0" > bcrypt-4.0.0.jar
echo "dummy bcrypt 4.0.1" > bcrypt-4.0.1.jar
echo "dummy auth-lib" > auth-lib-1.0.0.jar

# ─── Step 1: Register bcrypt@4.0.0 (leaf dependency, no deps) ────────────────
echo ""
echo "1. Registering bcrypt@4.0.0..."
RESP=$(curl -s -X POST \
  -F "file=@bcrypt-4.0.0.jar" \
  -F "name=bcrypt" \
  -F "version=4.0.0" \
  -F "artifact_type=jar" \
  -F "build_id=${BUILD_ID}" \
  -F "repository=myteam/bcrypt" \
  -F "branch=main" \
  -F "commit=bc400" \
  "${REGISTRY_URL}/artifacts")
assert_contains "bcrypt@4.0.0 registered" "$RESP" "bcrypt"

# ─── Step 2: Register auth-lib@1.0.0 with dependency on bcrypt ^4.0.0 ────────
echo ""
echo "2. Registering auth-lib@1.0.0 (depends on bcrypt ^4.0.0)..."
RESP=$(curl -s -X POST \
  -F "file=@auth-lib-1.0.0.jar" \
  -F "name=auth-lib" \
  -F "version=1.0.0" \
  -F "artifact_type=jar" \
  -F "build_id=${BUILD_ID}" \
  -F "repository=myteam/auth-lib" \
  -F "branch=main" \
  -F "commit=auth100" \
  -F 'dependencies=[{"name":"bcrypt","version_range":"^4.0.0"}]' \
  "${REGISTRY_URL}/artifacts")
assert_contains "auth-lib@1.0.0 registered" "$RESP" "auth-lib"

# Explicitly resolve dependencies for auth-lib@1.0.0 to create reverse dependencies instantly
echo ""
echo "Forcing synchronous dependency resolution for auth-lib@1.0.0..."
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"include_transitive": true}' \
  "http://localhost:8080/api/dependencies/resolve/auth-lib/1.0.0" > /dev/null

# ─── Step 3: Register bcrypt@4.0.1 (trigger - new version) ──────────────────
echo ""
echo "3. Registering bcrypt@4.0.1 (trigger artifact)..."
RESP=$(curl -s -X POST \
  -F "file=@bcrypt-4.0.1.jar" \
  -F "name=bcrypt" \
  -F "version=4.0.1" \
  -F "artifact_type=jar" \
  -F "build_id=${BUILD_ID}" \
  -F "repository=myteam/bcrypt" \
  -F "branch=main" \
  -F "commit=bc401" \
  "${REGISTRY_URL}/artifacts")
assert_contains "bcrypt@4.0.1 registered" "$RESP" "bcrypt"

# Give the event listener a moment to trigger the cascade
sleep 2

# ─── Step 4: Extract chain_id of the automatically triggered cascade ─────────
echo ""
echo "4. Extracting automatically triggered cascade chain_id..."
CHAIN_ID=$(curl -s "${CASCADE_URL}/chains" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
assert_not_empty "chain_id extracted" "$CHAIN_ID"

# ─── Step 6: GET /api/cascade/chains/{chain_id} ──────────────────────────────
echo ""
echo "5. Getting chain status for chain ${CHAIN_ID}..."
CHAIN_RESP=$(curl -s "${CASCADE_URL}/chains/${CHAIN_ID}")
echo "Chain status: ${CHAIN_RESP}"
assert_contains "Chain status returns tasks" "$CHAIN_RESP" "tasks"
assert_contains "auth-lib appears in chain tasks" "$CHAIN_RESP" "auth-lib"

# ─── Step 7: GET /api/cascade/impact/bcrypt/4.0.1 ───────────────────────────
echo ""
echo "6. Getting cascade impact for bcrypt@4.0.1..."
IMPACT_RESP=$(curl -s "${CASCADE_URL}/impact/bcrypt/4.0.1")
echo "Impact response: ${IMPACT_RESP}"
assert_contains "Impact analysis returns affected_artifacts" "$IMPACT_RESP" "affected_artifacts"
assert_contains "Impact shows auth-lib as affected" "$IMPACT_RESP" "auth-lib"
assert_contains "Impact is dry_run" "$IMPACT_RESP" "dry_run"

# ─── Step 8: Wait up to 30s for tasks to move out of pending/building ────────
echo ""
echo "7. Waiting up to 30s for cascade tasks to complete..."
WAIT_SECS=0
FINAL_STATUS=""
while [ $WAIT_SECS -lt 30 ]; do
    POLL_RESP=$(curl -s "${CASCADE_URL}/chains/${CHAIN_ID}")
    # Check if there are any pending or building tasks
    PENDING_COUNT=$( (echo "$POLL_RESP" | grep -o '"pending"' || true) | wc -l | tr -d ' ')
    BUILDING_COUNT=$( (echo "$POLL_RESP" | grep -o '"building"' || true) | wc -l | tr -d ' ')
    if [ "$PENDING_COUNT" -eq 0 ] && [ "$BUILDING_COUNT" -eq 0 ]; then
        FINAL_STATUS="$POLL_RESP"
        echo "Tasks completed after ${WAIT_SECS}s."
        break
    fi
    sleep 5
    WAIT_SECS=$((WAIT_SECS + 5))
done

# ─── Step 9: Final status check ──────────────────────────────────────────────
echo ""
echo "8. Final chain status check..."
FINAL_RESP=$(curl -s "${CASCADE_URL}/chains/${CHAIN_ID}")
echo "Final chain status: ${FINAL_RESP}"
assert_contains "Final response has chain_id" "$FINAL_RESP" "chain_id"
assert_contains "Final response has task_count" "$FINAL_RESP" "task_count"

# ─── Cleanup ──────────────────────────────────────────────────────────────────
rm -f bcrypt-4.0.0.jar bcrypt-4.0.1.jar auth-lib-1.0.0.jar

echo ""
echo "======================================"
if [ $ERRORS -eq 0 ]; then
    echo "${PASS} All assertions passed!"
else
    echo "${FAIL} ${ERRORS} assertion(s) failed."
    exit 1
fi
echo "=== Cascade Rebuild System Verification Complete ==="
