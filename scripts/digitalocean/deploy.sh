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

env_file="${JEWELO_ENV_FILE:-$repo_root/.env}"
contract="$repo_root/scripts/digitalocean/env-contract.mjs"
env_sync=1
[[ -r "$env_file" ]] || {
  echo "warning: $env_file is unreadable; deploying the branch without an environment sync" >&2
  env_sync=0
}

# The env sync, printed and nothing else. This is how a new or rotated variable
# is proved before it is shipped: names and scopes only, never a value, and no
# DigitalOcean call at all, so it runs on any machine.
if [[ "${DEPLOY_DRY_RUN:-0}" == "1" ]]; then
  (( env_sync )) || {
    echo "DEPLOY_DRY_RUN: no environment file, nothing to merge" >&2
    exit 1
  }
  CONTRACT="$contract" ENV_FILE="$env_file" node -e '
    (async () => {
      const contract = await import(process.env.CONTRACT);
      const values = contract.readEnvFiles([process.env.ENV_FILE]);
      const envs = contract.appSecretEnvs(values);
      process.stdout.write(`merged env keys (${envs.length}), values never printed:\n`);
      for (const env of envs) process.stdout.write(`  ${env.key} ${env.scope} ${env.type}\n`);
      const absent = contract.knownWebConfig.filter((key) => !envs.some((env) => env.key === key));
      if (absent.length) process.stdout.write(`absent from the environment file: ${absent.join(", ")}\n`);
    })().catch((error) => {
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    });
  '
  echo "DEPLOY_DRY_RUN=1: no apps update was called"
  exit 0
fi

load_digitalocean_token
name="$(app_name "$environment")"
app_id="$(find_app_id "$name")" || {
  echo "$name does not exist; run pnpm do:bootstrap first" >&2
  exit 1
}

spec_file="$(mktemp)"
trap 'rm -f "$spec_file"' EXIT
chmod 600 "$spec_file"

doctl apps get "$app_id" --output json |
  SOURCE_REF="$source_ref" \
  CONTRACT="$contract" \
  ENV_FILE="$env_file" \
  ENV_SYNC="$env_sync" \
  node -e '
  let input = "";
  process.stdin.on("data", (chunk) => input += chunk);
  process.stdin.on("end", () => {
    run(input).catch((error) => {
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    });
  });

  async function run(input) {
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
    // Merge the environment contract into the live spec: add a key the app has
    // never had, overwrite a rotated one, and leave every key the contract does
    // not know exactly as the platform returned it. Without this, a variable
    // added after bootstrap could never reach a live app - bootstrap refuses an
    // existing app, and this script used to rewrite only the branch - so a
    // fresh production app failed its smoke check with no way to fix it.
    if (process.env.ENV_SYNC === "1") {
      const contract = await import(process.env.CONTRACT);
      const desired = contract.appSecretEnvs(
        contract.readEnvFiles([process.env.ENV_FILE]),
      );
      const merged = new Map((web.envs ?? []).map((env) => [env.key, env]));
      for (const env of desired) merged.set(env.key, { ...merged.get(env.key), ...env });
      web.envs = [...merged.values()];
      process.stderr.write(`env sync: ${desired.map((env) => env.key).join(", ")}\n`);
    }
    process.stdout.write(JSON.stringify(app.spec));
  }
' > "$spec_file"
# The merged key names go to stderr from inside that script; the spec itself is
# never printed, because it carries values.

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
