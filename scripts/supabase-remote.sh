#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

action="${1:-}"
case "$action" in
  push|types) ;;
  *) echo "usage: $0 push|types" >&2; exit 2 ;;
esac

target="${JEWELO_CLOUD_TARGET:-}"
if [[ "$target" != "development" && "$target" != "preview" ]]; then
  echo "Refusing Supabase command: set JEWELO_CLOUD_TARGET=development or preview; production is never a Goal 00 default." >&2
  exit 2
fi

if [[ -z "${SUPABASE_PROJECT_REF:-}" ]]; then
  echo "Supabase project missing: export SUPABASE_PROJECT_REF for the Jewelo ${target} project/branch; do not use production." >&2
  exit 2
fi

if ! pnpm exec supabase projects list --output json >/dev/null 2>&1; then
  echo "Supabase authorization missing: run 'pnpm exec supabase login' or export SUPABASE_ACCESS_TOKEN, then retry." >&2
  exit 2
fi

if [[ "${SUPABASE_PROJECT_REF}" =~ (prod|production) ]]; then
  echo "Refusing Supabase project ref that appears to target production." >&2
  exit 2
fi

if [[ "$action" == "types" ]]; then
  pnpm exec supabase gen types typescript --project-id "$SUPABASE_PROJECT_REF" > packages/data/src/database.types.ts
  echo "Generated packages/data/src/database.types.ts from the ${target} Supabase branch."
  exit 0
fi

link_args=(link --project-ref "$SUPABASE_PROJECT_REF")
if [[ -n "${SUPABASE_DB_PASSWORD:-}" ]]; then
  link_args+=(--password "$SUPABASE_DB_PASSWORD")
fi
pnpm exec supabase "${link_args[@]}"
pnpm exec supabase db push --linked
