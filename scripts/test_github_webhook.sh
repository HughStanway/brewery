#!/usr/bin/env bash
set -euo pipefail

WEBHOOK_URL="http://localhost:8080/api/webhooks/github"
SECRET="${BREWERY_GITHUB_WEBHOOK_SECRET:-dev_secret}"

PASS="✓"
FAIL="✗"
ERRORS=0

echo "=== Testing Direct GitHub Webhook Endpoint ==="
echo ""

# 1. Test Ping event
echo "1. Testing GitHub ping event..."
PAYLOAD='{"zen":"Design for failure."}'
SIG=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print "sha256=" $2}')

RESP=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: ping" \
  -H "X-Hub-Signature-256: ${SIG}" \
  -d "$PAYLOAD" \
  "${WEBHOOK_URL}")

if [[ "$RESP" == *"pong"* ]]; return 0 2>/dev/null || [[ "$RESP" == *"pong"* ]]; then
  echo "${PASS} Ping event returned pong"
else
  echo "${FAIL} Ping event failed: ${RESP}"
  ERRORS=$((ERRORS + 1))
fi

# 2. Test invalid signature rejection
echo ""
echo "2. Testing invalid signature rejection..."
BAD_RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -H "X-Hub-Signature-256: sha256=invalid" \
  -d "$PAYLOAD" \
  "${WEBHOOK_URL}")

if [ "$BAD_RESP" == "401" ]; then
  echo "${PASS} Invalid signature rejected with 401 Unauthorized"
else
  echo "${FAIL} Expected 401 Unauthorized, got ${BAD_RESP}"
  ERRORS=$((ERRORS + 1))
fi

# 3. Test Push event
echo ""
echo "3. Testing GitHub push event..."
PUSH_PAYLOAD='{
  "ref": "refs/heads/main",
  "after": "1ae63d7123456789abcdef",
  "repository": {
    "full_name": "myteam/myrepo"
  }
}'
PUSH_SIG=$(echo -n "$PUSH_PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print "sha256=" $2}')

PUSH_RESP=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -H "X-Hub-Signature-256: ${PUSH_SIG}" \
  -d "$PUSH_PAYLOAD" \
  "${WEBHOOK_URL}")

if [[ "$PUSH_RESP" == *"Accepted"* ]]; then
  echo "${PASS} Push event accepted and build enqueued. Response: ${PUSH_RESP}"
else
  echo "${FAIL} Push event trigger failed: ${PUSH_RESP}"
  ERRORS=$((ERRORS + 1))
fi

echo ""
if [ "$ERRORS" -eq 0 ]; then
  echo "=== ${PASS} GitHub Webhook Integration Test Succeeded! ==="
else
  echo "=== ${FAIL} GitHub Webhook Integration Test Failed with ${ERRORS} errors ==="
  exit 1
fi
