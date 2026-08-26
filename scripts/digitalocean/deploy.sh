#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
source "$repo_root/scripts/digitalocean/common.sh"

[[ "${1:-}" == "--" ]] && shift

environment="${1:-}"
source_ref="${2:-}"
require_environment "$environment"
[[ "$source_ref" =~ ^[A-Za-z0-9._/-]+$ ]] || {
  echo "source ref contains unsupported characters" >&2
  exit 2
}

load_digitalocean_token
name="$(app_name "$environment")"
app_id="$(find_app_id "$name")" || {
  echo "$name does not exist; run pnpm do:bootstrap first" >&2
  exit 1
}

spec_file="$(mktemp)"
trap 'rm -f "$spec_file"' EXIT
chmod 600 "$spec_file"

doctl apps get "$app_id" --output json | SOURCE_REF="$source_ref" node -e '
  let input = "";
  process.stdin.on("data", (chunk) => input += chunk);
  process.stdin.on("end", () => {
    const value = JSON.parse(input);
    const app = Array.isArray(value) ? value[0] : value;
    app.spec.services[0].git.branch = process.env.SOURCE_REF;
    process.stdout.write(JSON.stringify(app.spec));
  });
' > "$spec_file"

doctl apps update "$app_id" \
  --spec "$spec_file" \
  --update-sources \
  --wait \
  --output json >/dev/null

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

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "service_url=$service_url"
    echo "deployment_id=$deployment_id"
  } >> "$GITHUB_OUTPUT"
fi
echo "service_url=$service_url"
echo "deployment_id=$deployment_id"
