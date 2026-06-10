#!/usr/bin/env bash
set -e

# Load .env file from project root if it exists
if [ -f "$(dirname "$0")/../.env" ]; then
    export $(grep -v '^#' "$(dirname "$0")/../.env" | xargs)
fi
PROJECT_ID=${GCP_PROJECT_ID:-brewery-homelab}

echo "Creating Pub/Sub Topic and Subscription in Emulator for project ${PROJECT_ID}..."
curl -s -X PUT "http://localhost:8085/v1/projects/${PROJECT_ID}/topics/brewery-jobs"
curl -s -X PUT "http://localhost:8085/v1/projects/${PROJECT_ID}/subscriptions/brewery-jobs-sub" \
  -H "Content-Type: application/json" \
  -d "{\"topic\":\"projects/${PROJECT_ID}/topics/brewery-jobs\"}"
echo "Pub/Sub Emulator configured successfully!"
