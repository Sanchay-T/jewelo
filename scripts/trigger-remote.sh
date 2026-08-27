#!/usr/bin/env bash
set -euo pipefail
repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

action="${1:-}"
case "$action" in
  dev|deploy-development|deploy-production) ;;
  *) echo "usage: $0 dev|deploy-development|deploy-production" >&2; exit 2 ;;
esac

trigger_env_file="${TRIGGER_ENV_FILE:-$repo_root/.env.local}"
if [[ ! -f "$trigger_env_file" ]]; then
  echo "Trigger environment file missing: $trigger_env_file" >&2
  exit 2
fi
set -a
# shellcheck disable=SC1090
source "$trigger_env_file"
set +a
target="${JEWELO_CLOUD_TARGET:-}"
if [[ "$target" != "development" && "$target" != "production" ]]; then
  echo "Refusing Trigger command: set JEWELO_CLOUD_TARGET=development or production." >&2
  exit 2
fi

if ! pnpm --filter @jewelo/jobs exec trigger whoami >/dev/null 2>&1; then
  echo "Trigger authorization missing: run 'pnpm --filter @jewelo/jobs exec trigger login', then retry (or provide TRIGGER_ACCESS_TOKEN non-interactively)." >&2
  exit 2
fi

if [[ "$action" == "dev" ]]; then
  if [[ "$target" != "development" || -z "${TRIGGER_PROJECT_REF:-}" || -z "${TRIGGER_DEV_BRANCH:-}" ]]; then
    echo "Development requires JEWELO_CLOUD_TARGET=development, TRIGGER_PROJECT_REF and TRIGGER_DEV_BRANCH." >&2
    exit 2
  fi
  pnpm --filter @jewelo/jobs exec trigger dev start --branch "$TRIGGER_DEV_BRANCH" --project-ref "$TRIGGER_PROJECT_REF" --env-file "$trigger_env_file" --skip-update-check
elif [[ "$action" == "deploy-development" ]]; then
  if [[ "$target" != "development" || -z "${TRIGGER_PROJECT_REF:-}" ]]; then
    echo "Cloud development requires the dedicated development TRIGGER_PROJECT_REF." >&2
    exit 2
  fi
  external_id="${TRIGGER_DEPLOYMENT_ID:-$(git rev-parse HEAD)}"
  pnpm --filter @jewelo/jobs exec trigger deploy --env prod --project-ref "$TRIGGER_PROJECT_REF" --env-file "$trigger_env_file" --external-id "$external_id" --skip-promotion --skip-update-check
else
  if [[ "$target" != "production" || -z "${TRIGGER_PRODUCTION_PROJECT_REF:-}" || -z "${TRIGGER_DEPLOYMENT_ID:-}" ]]; then
    echo "Production requires JEWELO_CLOUD_TARGET=production, TRIGGER_PRODUCTION_PROJECT_REF and a pinned TRIGGER_DEPLOYMENT_ID." >&2
    exit 2
  fi
  pnpm --filter @jewelo/jobs exec trigger deploy --env prod --project-ref "$TRIGGER_PRODUCTION_PROJECT_REF" --env-file "$trigger_env_file" --external-id "$TRIGGER_DEPLOYMENT_ID" --skip-promotion --skip-update-check
fi
