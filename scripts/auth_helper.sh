#!/usr/bin/env bash

# Helper to authenticate and save session cookie for integration test scripts
COOKIE_JAR=$(mktemp /tmp/brewery-cookie-XXXXXX)

# Clean up cookie file on exit
cleanup_auth() {
  rm -f "${COOKIE_JAR}"
}
trap cleanup_auth EXIT

# Credentials (default to admin / password, can be overridden via environment variables)
AUTH_USER="${BREWERY_AUTH_USER:-admin}"
AUTH_PASS="${BREWERY_AUTH_PASS:-password}"

# Perform login
LOGIN_RESP=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -c "${COOKIE_JAR}" -X POST \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${AUTH_USER}\",\"password\":\"${AUTH_PASS}\"}" \
  "http://localhost:8080/api/auth/login")

# Extract the HTTP status code
HTTP_STATUS=$(echo "$LOGIN_RESP" | tr -d '\r' | grep -o 'HTTP_STATUS:[0-9]*' | cut -d':' -f2 || echo "000")
# Extract the response body (remove status code suffix)
LOGIN_BODY=$(echo "$LOGIN_RESP" | sed 's/HTTP_STATUS:[0-9]*//g')

if [ "$HTTP_STATUS" -ne 200 ]; then
  echo "✗ Authentication failed for API scripts (HTTP Status: ${HTTP_STATUS})."
  echo "Response: ${LOGIN_BODY}"
  echo "Please ensure the server is running and default admin credentials are valid, or configure BREWERY_AUTH_USER / BREWERY_AUTH_PASS."
  exit 1
fi

# Export cookie jar variable for curl commands
export COOKIE_JAR
