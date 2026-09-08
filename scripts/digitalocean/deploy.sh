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
    // The app also runs an image-based `inngest` service that has no git
    // source, so the web service is selected by name, never by index.
    const web = app.spec.services.find((service) => service.name === "web");
    if (!web?.git) {
      process.stderr.write("app spec has no git-backed service named \"web\"\n");
      process.exit(1);
    }
    web.git.branch = process.env.SOURCE_REF;
    process.stdout.write(JSON.stringify(app.spec));
  });
' > "$spec_file"

doctl apps update "$app_id" \
  --spec "$spec_file" \
  --update-sources \
  --wait \
  --output json >/dev/null

# The writer ends its line, and the `read` is guarded with `|| true`: without
# both, `read` returns 1 at an unterminated EOF and `set -e` kills the script
# after a successful deploy, before the outputs are ever written.
read -r service_url deployment_id < <(
  doctl apps get "$app_id" --output json | node -e '
    let input = "";
    process.stdin.on("data", (chunk) => input += chunk);
    process.stdin.on("end", () => {
      const value = JSON.parse(input);
      const app = Array.isArray(value) ? value[0] : value;
      process.stdout.write(`${app.default_ingress} ${app.active_deployment?.id ?? "unknown"}\n`);
    });
  '
) || true

if [[ -z "${service_url:-}" ]]; then
  echo "deploy succeeded but the app URL could not be read from doctl" >&2
  exit 1
fi

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "service_url=$service_url"
    echo "deployment_id=$deployment_id"
  } >> "$GITHUB_OUTPUT"
fi
echo "service_url=$service_url"
echo "deployment_id=$deployment_id"
