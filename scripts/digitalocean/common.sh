#!/usr/bin/env bash
set -euo pipefail

JEWELO_DO_PROJECT_ID="${JEWELO_DO_PROJECT_ID:-8478845c-9f7b-4b68-89e6-3762b43a1119}"
JEWELO_DO_REGION="${JEWELO_DO_REGION:-blr}"
readonly JEWELO_DO_PROJECT_ID JEWELO_DO_REGION

require_environment() {
  case "${1:-}" in
    staging|production) ;;
    *)
      echo "environment must be staging or production" >&2
      exit 2
      ;;
  esac
}

app_name() {
  printf 'jewelo-%s\n' "$1"
}

load_digitalocean_token() {
  if [[ -n "${DIGITALOCEAN_ACCESS_TOKEN:-}" ]]; then
    export DIGITALOCEAN_ACCESS_TOKEN
    return
  fi

  local env_file="${JEWELO_ENV_FILE:-$(git rev-parse --show-toplevel)/.env}"
  [[ -r "$env_file" ]] || {
    echo "DIGITALOCEAN_ACCESS_TOKEN is unset and $env_file is unavailable" >&2
    exit 1
  }

  local key value
  while IFS='=' read -r key value; do
    if [[ "$key" == "DIGITALOCEAN_ACCESS_TOKEN" ]]; then
      DIGITALOCEAN_ACCESS_TOKEN="$value"
    fi
  done < "$env_file"

  [[ -n "${DIGITALOCEAN_ACCESS_TOKEN:-}" ]] || {
    echo "DIGITALOCEAN_ACCESS_TOKEN is missing from $env_file" >&2
    exit 1
  }
  export DIGITALOCEAN_ACCESS_TOKEN
}

find_app_id() {
  local name="$1"
  doctl apps list --output json | APP_NAME="$name" node -e '
    let input = "";
    process.stdin.on("data", (chunk) => input += chunk);
    process.stdin.on("end", () => {
      let apps;
      try {
        apps = JSON.parse(input);
      } catch (error) {
        console.error(`Could not parse DigitalOcean app list: ${error.message}`);
        process.exit(1);
      }
      const app = apps.find((value) => value.spec?.name === process.env.APP_NAME);
      if (!app) {
        console.error(
          `${process.env.APP_NAME} is not visible; visible apps: ${apps
            .map((value) => value.spec?.name)
            .filter(Boolean)
            .join(", ") || "none"}`,
        );
        process.exit(1);
      }
      process.stdout.write(app.id);
    });
  '
}
