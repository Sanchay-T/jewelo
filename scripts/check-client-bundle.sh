#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

static_dir="apps/web/.next/static"
[[ -d "$static_dir" ]] || { echo "Client bundle missing; run pnpm build first." >&2; exit 2; }

forbidden='SUPABASE_SERVICE_ROLE_KEY|SUPABASE_DB_PASSWORD|SUPABASE_ACCESS_TOKEN|TRIGGER_SECRET_KEY|TRIGGER_ACCESS_TOKEN|OPENAI_API_KEY|RUNWAYML_API_SECRET|SENTRY_AUTH_TOKEN|POSTHOG_PERSONAL_API_KEY'
if rg "$forbidden" "$static_dir"; then
  echo "Server-only environment key name leaked into the browser bundle." >&2
  exit 1
fi

echo "Client bundle contains no forbidden server-only environment key names."
