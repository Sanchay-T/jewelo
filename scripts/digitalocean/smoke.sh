#!/usr/bin/env bash
set -euo pipefail

[[ "${1:-}" == "--" ]] && shift
base_url="${1:-}"
[[ "$base_url" == https://* ]] || {
  echo "usage: pnpm do:smoke -- https://APP.ondigitalocean.app" >&2
  exit 2
}

response_file="$(mktemp)"
trap 'rm -f "$response_file"' EXIT
status="$(curl --silent --show-error --location \
  --connect-timeout 10 --max-time 30 --retry 5 --retry-all-errors --retry-delay 3 \
  --output "$response_file" --write-out '%{http_code}' "$base_url/api/health")"
[[ "$status" == "200" ]] || {
  echo "health check failed with HTTP $status" >&2
  exit 1
}
node -e '
  const value = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  if (!value || typeof value !== "object") throw new Error("health response must be JSON");
' "$response_file"
echo "health check passed: $base_url/api/health"
