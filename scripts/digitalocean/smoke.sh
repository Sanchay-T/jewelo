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

# The dependency block behind `/api/readiness` is no longer public: it is shown
# only to an operator session or to a probe presenting `READINESS_PROBE_TOKEN`
# in `x-readiness-token`. The value is read from `.env` with the same quote
# stripping `common.sh` and `env-contract.mjs` use, and is never printed.
if [[ -z "${READINESS_PROBE_TOKEN:-}" ]]; then
  env_file="${JEWELO_ENV_FILE:-$(git rev-parse --show-toplevel)/.env}"
  if [[ -r "$env_file" ]]; then
    while IFS='=' read -r key value; do
      if [[ "$key" == "READINESS_PROBE_TOKEN" ]]; then
        if [[ "$value" == \"*\" || "$value" == \'*\' ]] && (( ${#value} >= 2 )); then
          value="${value:1:${#value}-2}"
        fi
        READINESS_PROBE_TOKEN="$value"
      fi
    done < "$env_file"
  fi
fi

[[ -n "${READINESS_PROBE_TOKEN:-}" ]] || {
  echo "READINESS_PROBE_TOKEN is unset; readiness would return status only and the check cannot see keyEnvironment" >&2
  exit 1
}

readiness_status="$(curl --silent --show-error --location \
  --connect-timeout 10 --max-time 30 \
  --header "x-readiness-token: $READINESS_PROBE_TOKEN" \
  --output "$response_file" --write-out '%{http_code}' "$base_url/api/readiness")"
[[ "$readiness_status" == "200" ]] || { echo "readiness failed with HTTP $readiness_status" >&2; exit 1; }
grep -q '"keyEnvironment":"prod"' "$response_file" || { echo "readiness is not bound to a prod Inngest signing key" >&2; exit 1; }
grep -q '"provider":"real"' "$response_file" || { echo "readiness did not prove the production provider is real" >&2; exit 1; }
echo "readiness check passed: $base_url/api/readiness"
