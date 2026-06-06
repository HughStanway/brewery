#!/usr/bin/env bash
set -e

echo "Creating Pub/Sub Topic and Subscription in Emulator..."
curl -s -X PUT "http://localhost:8085/v1/projects/brewery-homelab/topics/brewery-jobs"
curl -s -X PUT "http://localhost:8085/v1/projects/brewery-homelab/subscriptions/brewery-jobs-sub" \
  -H "Content-Type: application/json" \
  -d '{"topic":"projects/brewery-homelab/topics/brewery-jobs"}'
echo "Pub/Sub Emulator configured successfully!"
