#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

case "${1:-}" in
  dev|deploy) ;;
  *) echo "usage: $0 dev|deploy" >&2; exit 2 ;;
esac

if ! pnpm --filter @jewelo/jobs exec trigger whoami >/dev/null 2>&1; then
  echo "Trigger authorization missing: run 'pnpm --filter @jewelo/jobs exec trigger login' (or export TRIGGER_ACCESS_TOKEN), then retry." >&2
  exit 2
fi

if [[ "$1" == "dev" ]]; then
  pnpm --filter @jewelo/jobs exec trigger dev start --project-ref "$TRIGGER_PROJECT_REF" --skip-update-check
else
  pnpm --filter @jewelo/jobs exec trigger deploy --env prod --project-ref "$TRIGGER_PROJECT_REF" --external-id "$(git rev-parse HEAD)" --skip-update-check
fi
