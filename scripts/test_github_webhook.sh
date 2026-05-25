#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PAYLOAD_FILE="${SCRIPT_DIR}/sample_webhook.json"
WEBHOOK_URL="${WEBHOOK_URL:-http://localhost:8080/api/jobs/init}"
EVENT_TYPE="${EVENT_TYPE:-push}"
DELIVERY_ID="${DELIVERY_ID:-f5502094-580f-11f1-83f6-58396824dbc7}"
SIGNATURE_256="${SIGNATURE_256:-sha256=630e4208ac2e83a2c8eedbcb27996279337ec4a387497e1b1cac9a77c104b8c9}"
SIGNATURE_1="${SIGNATURE_1:-sha1=a672e60cc6b76b0daa802ae3c90f341558e2a6d0}"
HOOK_INSTALLATION_TARGET_TYPE="${HOOK_INSTALLATION_TARGET_TYPE:-repository}"
HOOK_INSTALLATION_TARGET_ID="${HOOK_INSTALLATION_TARGET_ID:-1247089725}"
HOOK_ID="${HOOK_ID:-630446601}"
USER_AGENT_VALUE="${USER_AGENT_VALUE:-GitHub-Hookshot/72ee67d}"
HOST_HEADER="${HOST_HEADER:-bigiron.dev}"

if [[ ! -f "${PAYLOAD_FILE}" ]]; then
    echo "Payload file not found: ${PAYLOAD_FILE}" >&2
    exit 1
fi

curl --fail-with-body \
    --request POST \
    --url "${WEBHOOK_URL}" \
    --header "Content-Type: application/json" \
    --header "Accept: */*" \
    --header "User-Agent: ${USER_AGENT_VALUE}" \
    --header "Host: ${HOST_HEADER}" \
    --header "X-Hub-Signature-256: ${SIGNATURE_256}" \
    --header "X-Hub-Signature: ${SIGNATURE_1}" \
    --header "X-GitHub-Hook-Installation-Target-Type: ${HOOK_INSTALLATION_TARGET_TYPE}" \
    --header "X-GitHub-Hook-Installation-Target-ID: ${HOOK_INSTALLATION_TARGET_ID}" \
    --header "X-GitHub-Hook-ID: ${HOOK_ID}" \
    --header "X-GitHub-Event: ${EVENT_TYPE}" \
    --header "X-GitHub-Delivery: ${DELIVERY_ID}" \
    --data "@${PAYLOAD_FILE}"

echo
