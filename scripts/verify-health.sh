#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

port="${JEWELO_HEALTH_PORT:-3210}"
log_file="$(mktemp -t jewelo-health.XXXXXX.log)"
pnpm --dir apps/web exec next start -p "$port" >"$log_file" 2>&1 &
server_pid=$!
cleanup() {
  kill "$server_pid" 2>/dev/null || true
  wait "$server_pid" 2>/dev/null || true
  rm -f "$log_file"
}
trap cleanup EXIT

ready=0
for _ in {1..30}; do
  if curl --fail --silent "http://127.0.0.1:${port}/api/health" >/dev/null; then
    ready=1
    break
  fi
  sleep 1
done
if [[ "$ready" != "1" ]]; then
  echo "Next.js health server did not become ready:" >&2
  sed -n '1,160p' "$log_file" >&2
  exit 1
fi

health="$(curl --fail --silent "http://127.0.0.1:${port}/api/health")"
readiness_file="$(mktemp -t jewelo-readiness.XXXXXX.json)"
readiness_status="$(curl --silent --output "$readiness_file" --write-out '%{http_code}' "http://127.0.0.1:${port}/api/readiness")"
readiness="$(<"$readiness_file")"
rm -f "$readiness_file"
node -e '
const health = JSON.parse(process.argv[1]);
const readiness = JSON.parse(process.argv[2]);
const readinessStatus = process.argv[3];
if (health.status !== "ok" || health.service !== "jewelo-web") throw new Error("invalid health contract");
if (readinessStatus !== "503" || readiness.status !== "not_ready" || readiness.connectivityChecked !== false) throw new Error("invalid readiness contract");
for (const forbidden of ["secret", "token", "password", "key"]) {
  if (JSON.stringify({ health, readiness }).toLowerCase().includes(forbidden)) throw new Error(`health surface leaked ${forbidden}`);
}
' "$health" "$readiness" "$readiness_status"

echo "HTTP health proof passed on port ${port}."
