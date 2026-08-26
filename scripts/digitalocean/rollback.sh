#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
source "$repo_root/scripts/digitalocean/common.sh"

[[ "${1:-}" == "--" ]] && shift

environment="${1:-}"
deployment_id="${2:-}"
require_environment "$environment"
[[ "$deployment_id" =~ ^[0-9a-f-]{36}$ ]] || {
  echo "usage: pnpm do:rollback -- staging|production EXACT_DEPLOYMENT_ID" >&2
  exit 2
}

load_digitalocean_token
name="$(app_name "$environment")"
app_id="$(find_app_id "$name")"
spec_file="$(mktemp)"
trap 'rm -f "$spec_file"' EXIT
chmod 600 "$spec_file"

doctl apps get-deployment "$app_id" "$deployment_id" --output json | node -e '
  let input = "";
  process.stdin.on("data", (chunk) => input += chunk);
  process.stdin.on("end", () => {
    const value = JSON.parse(input);
    const deployment = Array.isArray(value) ? value[0] : value;
    if (!deployment.spec) process.exit(1);
    process.stdout.write(JSON.stringify(deployment.spec));
  });
' > "$spec_file"

doctl apps update "$app_id" --spec "$spec_file" --update-sources --wait --output json >/dev/null
echo "$name restored from deployment $deployment_id"
