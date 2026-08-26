#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"
source "$repo_root/scripts/digitalocean/common.sh"

[[ "${1:-}" == "--" ]] && shift
environment="${1:-}"
source_ref="${2:-}"
require_environment "$environment"
[[ "$source_ref" =~ ^[A-Za-z0-9._/-]+$ ]] || {
  echo "source ref contains unsupported characters" >&2
  exit 2
}

env_file="${JEWELO_ENV_FILE:-$repo_root/.env}"
env_files=("$env_file")
local_env_file="$(dirname "$env_file")/.env.local"
[[ -r "$local_env_file" ]] && env_files+=("$local_env_file")

load_digitalocean_token
JEWELO_SOURCE_REF="$source_ref" pnpm do:bootstrap -- "$environment" "${env_files[@]}"

name="$(app_name "$environment")"
app_id="$(find_app_id "$name")"
read -r service_url deployment_id < <(
  doctl apps get "$app_id" --output json | node -e '
    let input = "";
    process.stdin.on("data", (chunk) => input += chunk);
    process.stdin.on("end", () => {
      const value = JSON.parse(input);
      const app = Array.isArray(value) ? value[0] : value;
      process.stdout.write(`${app.default_ingress} ${app.active_deployment?.id ?? "unknown"}`);
    });
  '
)

echo "service_url=$service_url"
echo "deployment_id=$deployment_id"
