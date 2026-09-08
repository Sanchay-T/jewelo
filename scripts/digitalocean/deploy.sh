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

# Fix-2 review M3: which app this file is allowed to configure.
#
# One `.env` served both environments and nothing compared it with the app being
# deployed, so `deploy.sh production main` from a laptop would have overwritten
# production's PROVIDER_MODE, SUPABASE_URL, OPENAI_API_KEY and
# OPERATOR_PASSPHRASE with staging values. The file must now declare
# `JEWELO_DEPLOY_TARGET=<environment>` and it must equal the environment
# argument; otherwise this refuses with exit 2 rather than shipping the wrong
# values. Deploying a branch into an environment whose file you do not have is
# still possible with DEPLOY_ENV_SYNC=0, which leaves the app's environment
# exactly as the platform has it, or by pointing JEWELO_ENV_FILE at that
# environment's own file. Only environment names are printed here, never a
# value from the file.
if [[ "${DEPLOY_ENV_SYNC:-1}" == "0" ]]; then
  echo "DEPLOY_ENV_SYNC=0: deploying the branch only; the app's environment is left as the platform has it" >&2
  env_sync=0
elif (( env_sync )); then
  declared_target="$(
    CONTRACT="$contract" ENV_FILE="$env_file" node -e '
      (async () => {
        const contract = await import(process.env.CONTRACT);
        const values = contract.readEnvFiles([process.env.ENV_FILE]);
        process.stdout.write(contract.deployTarget(values));
      })().catch((error) => {
        process.stderr.write(`${error.message}\n`);
        process.exit(1);
      });
    '
  )"
  if [[ -z "$declared_target" ]]; then
    echo "refusing to sync $env_file into $environment: it does not declare JEWELO_DEPLOY_TARGET" >&2
    echo "add JEWELO_DEPLOY_TARGET=$environment to that file, point JEWELO_ENV_FILE at the file that belongs to $environment, or set DEPLOY_ENV_SYNC=0 to deploy the branch only" >&2
    exit 2
  fi
  if [[ "$declared_target" != "$environment" ]]; then
    echo "refusing to sync $env_file into $environment: JEWELO_DEPLOY_TARGET is $declared_target" >&2
    echo "point JEWELO_ENV_FILE at the file that belongs to $environment, or set DEPLOY_ENV_SYNC=0 to deploy the branch only" >&2
    exit 2
  fi
fi

# The env sync, printed and nothing else. This is how a new or rotated variable
# is proved before it is shipped: names and scopes only, never a value, and no
# DigitalOcean call at all, so it runs on any machine.
if [[ "${DEPLOY_DRY_RUN:-0}" == "1" ]]; then
  (( env_sync )) || {
    if [[ "${DEPLOY_ENV_SYNC:-1}" == "0" ]]; then
      echo "DEPLOY_DRY_RUN=1: branch only, no environment would be merged"
      exit 0
    fi
    echo "DEPLOY_DRY_RUN: no environment file, nothing to merge" >&2
    exit 1
  }
  CONTRACT="$contract" ENV_FILE="$env_file" node -e '
    (async () => {
      const contract = await import(process.env.CONTRACT);
      const values = contract.readEnvFiles([process.env.ENV_FILE]);
      const envs = contract.appSecretEnvs(values);
      process.stdout.write(`merged env keys (${envs.length}), values never printed:\n`);
      // An empty value is a decision (TRUSTED_CLIENT_IP_HEADER= means trust no
      // header), so the dry run has to tell "set (empty)" apart from absent.
      for (const env of envs)
        process.stdout.write(
          `  ${env.key} ${env.scope} ${env.type} ${env.value === "" ? "set (empty)" : "set"}\n`,
        );
      const absent = contract.knownWebConfig.filter((key) => !envs.some((env) => env.key === key));
      if (absent.length) process.stdout.write(`absent from the environment file: ${absent.join(", ")}\n`);
      // P7-5: the alerts a deploy would write, so a new threshold can be read
      // before it is shipped. They come from the spec contract, not the file.
      process.stdout.write("merged alerts:\n");
      for (const alert of contract.appAlerts) process.stdout.write(`  app ${alert.rule}\n`);
      for (const alert of contract.serviceAlerts)
        process.stdout.write(
          `  web ${alert.rule} ${alert.operator} ${alert.value} ${alert.window}\n`,
        );
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
    const contract = await import(process.env.CONTRACT);
    // P7-5 / DS-9. The alerts travel with the spec, so a deploy is also how a
    // new alert reaches a live app. App-level rules (deployment, domain) sit on
    // the spec; utilisation and restart rules are properties of a component and
    // sit on `web`. The merge is by rule, so an alert someone added in the
    // console with its own notification channel survives untouched.
    app.spec.alerts = contract.mergeAlerts(app.spec.alerts, contract.appAlerts);
    web.alerts = contract.mergeAlerts(web.alerts, contract.serviceAlerts);
    process.stderr.write(
      `alerts: ${[...contract.appAlerts, ...contract.serviceAlerts].map((alert) => alert.rule).join(", ")}\n`,
    );
    // Merge the environment contract into the live spec: add a key the app has
    // never had, overwrite a rotated one, and leave every key the contract does
    // not know exactly as the platform returned it. Without this, a variable
    // added after bootstrap could never reach a live app - bootstrap refuses an
    // existing app, and this script used to rewrite only the branch - so a
    // fresh production app failed its smoke check with no way to fix it.
    if (process.env.ENV_SYNC === "1") {
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
