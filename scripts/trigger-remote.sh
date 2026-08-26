#!/usr/bin/env bash
set -euo pipefail
repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

action="${1:-}"
case "$action" in
  dev|deploy-preview) ;;
  *) echo "usage: $0 dev|deploy-preview" >&2; exit 2 ;;
esac

target="${JEWELO_CLOUD_TARGET:-}"
if [[ "$target" != "development" && "$target" != "preview" ]]; then
  echo "Refusing Trigger command: set JEWELO_CLOUD_TARGET=development or preview; production is never a Goal 00 default." >&2
  exit 2
fi

if [[ -z "${TRIGGER_PROJECT_REF:-}" ]]; then
  echo "Trigger project missing: export TRIGGER_PROJECT_REF for the Jewelo development/preview project." >&2
  exit 2
fi

if [[ "$action" == "deploy-preview" && ( "$target" != "preview" || -z "${TRIGGER_PREVIEW_BRANCH:-}" ) ]]; then
  echo "Preview deployment requires JEWELO_CLOUD_TARGET=preview and TRIGGER_PREVIEW_BRANCH=<goal-branch>." >&2
  exit 2
fi

if ! pnpm --filter @jewelo/jobs exec trigger whoami >/dev/null 2>&1; then
  echo "Trigger authorization missing: run 'pnpm --filter @jewelo/jobs exec trigger login', then retry (or provide TRIGGER_ACCESS_TOKEN non-interactively)." >&2
  exit 2
fi

if [[ "$action" == "deploy-preview" ]]; then
  pnpm --filter @jewelo/jobs exec trigger deploy --env preview --branch "$TRIGGER_PREVIEW_BRANCH" --project-ref "$TRIGGER_PROJECT_REF" --skip-update-check
else
  trigger_env_file="${TRIGGER_ENV_FILE:-$repo_root/.env.local}"
  if [[ ! -f "$trigger_env_file" ]]; then
    echo "Trigger development env missing: $trigger_env_file" >&2
    exit 2
  fi
  pnpm --filter @jewelo/jobs exec trigger dev start --project-ref "$TRIGGER_PROJECT_REF" --env-file "$trigger_env_file" --skip-update-check
fi
