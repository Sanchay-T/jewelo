#!/usr/bin/env bash
set -euo pipefail

base_url="${1:-}"
if [[ "$base_url" != https://* ]]; then
  echo "usage: pnpm gcp:smoke -- https://SERVICE_URL" >&2
  exit 2
fi

response_file="$(mktemp)"
trap 'rm -f "$response_file"' EXIT

status="$(curl --silent --show-error --location \
  --connect-timeout 10 \
  --max-time 30 \
  --retry 5 \
  --retry-all-errors \
  --retry-delay 3 \
  --output "$response_file" \
  --write-out '%{http_code}' \
  "$base_url/api/health")"

if [[ "$status" != "200" ]]; then
  echo "health check failed with HTTP $status" >&2
  exit 1
fi

node -e '
  const fs = require("fs");
  const value = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  if (!value || typeof value !== "object") throw new Error("health response must be JSON");
' "$response_file"

echo "health check passed: $base_url/api/health"
