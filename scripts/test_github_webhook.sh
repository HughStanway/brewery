#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PAYLOAD_FILE="${SCRIPT_DIR}/sample_webhook.json"
WEBHOOK_URL="${WEBHOOK_URL:-http://localhost:8080/api/jobs/init}"
EVENT_TYPE="${EVENT_TYPE:-push}"
DELIVERY_ID="${DELIVERY_ID:-local-test-delivery}"

if [[ ! -f "${PAYLOAD_FILE}" ]]; then
    echo "Payload file not found: ${PAYLOAD_FILE}" >&2
    exit 1
fi

curl --fail-with-body \
    --request POST \
    --url "${WEBHOOK_URL}" \
    --header "Content-Type: application/json" \
    --header "Accept: application/json" \
    --header "X-GitHub-Event: ${EVENT_TYPE}" \
    --header "X-GitHub-Delivery: ${DELIVERY_ID}" \
    --data "@${PAYLOAD_FILE}"

echo
