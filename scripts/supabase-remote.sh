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

if ! projects_json="$(pnpm exec supabase projects list --output json 2>/dev/null)"; then
  echo "Supabase authorization missing: run 'pnpm exec supabase login' or export SUPABASE_ACCESS_TOKEN, then retry." >&2
  exit 2
fi

if ! JEWELO_PROJECTS_JSON="$projects_json" node scripts/verify-supabase-project.mjs "$SUPABASE_PROJECT_REF" "$target"; then
  echo "Supabase target verification failed; use a Mumbai project whose remote name explicitly contains development/dev or preview/branch/pr for the selected target." >&2
  exit 2
fi

if [[ "$action" == "types" ]]; then
  generated_types="$(mktemp packages/data/src/.database.types.XXXXXX.ts)"
  cleanup_types() { rm -f "$generated_types"; }
  trap cleanup_types EXIT
  pnpm exec supabase gen types typescript --project-id "$SUPABASE_PROJECT_REF" >"$generated_types"
  if [[ ! -s "$generated_types" ]] || ! grep -q 'export type Database' "$generated_types"; then
    echo "Supabase type generation returned invalid output; the checked-in database types were not changed." >&2
    exit 1
  fi
  mv "$generated_types" packages/data/src/database.types.ts
  trap - EXIT
  echo "Generated packages/data/src/database.types.ts from the ${target} Supabase branch."
  exit 0
fi

link_args=(link --project-ref "$SUPABASE_PROJECT_REF")
if [[ -n "${SUPABASE_DB_PASSWORD:-}" ]]; then
  link_args+=(--password "$SUPABASE_DB_PASSWORD")
fi
pnpm exec supabase "${link_args[@]}"
pnpm exec supabase db push --linked
