#!/usr/bin/env bash
set -euo pipefail

# Configuration
PROJECT_ID="brewery-homelab"
TOPIC_NAME="brewery-jobs"
EMULATOR_URL="http://localhost:8085/v1/projects/${PROJECT_ID}/topics/${TOPIC_NAME}:publish"

echo "=== Testing Brewery Pub/Sub Ingestion ==="

# 1. Prepare JSON payload
PAYLOAD='{
  "repository": "/Users/hughstanway/Projects/brewery",
  "commit": "2c1a1ce5c0910426a709a05c0bcd5a8b25a7afb6",
  "branch": "main"
}'

echo "1. Payload to send:"
echo "${PAYLOAD}"
echo

# 2. Base64 encode the payload (required by Google Pub/Sub API)
# Handling cross-platform base64 wrap differences (macOS/Linux)
if [[ "$OSTYPE" == "darwin"* ]]; then
    BASE64_PAYLOAD=$(echo -n "${PAYLOAD}" | base64)
else
    BASE64_PAYLOAD=$(echo -n "${PAYLOAD}" | base64 -w 0)
fi

# 3. Publish to Emulator
echo "2. Publishing message to Pub/Sub Emulator..."
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "{\"messages\": [{\"data\": \"${BASE64_PAYLOAD}\"}]}" \
    "${EMULATOR_URL}")

HTTP_STATUS=$(echo "${RESPONSE}" | grep "HTTP_STATUS" | cut -d':' -f2)
BODY=$(echo "${RESPONSE}" | grep -v "HTTP_STATUS")

if [ "${HTTP_STATUS}" -eq 200 ]; then
    echo "✓ Success! Message published. Response:"
    echo "${BODY}"
    echo "Check your running Spring Boot console logs to verify it was received and printed."
else
    echo "✗ Failed to publish message. HTTP Status: ${HTTP_STATUS}"
    echo "Response: ${BODY}"
fi
