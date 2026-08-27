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
  push)
    pnpm exec supabase db push --project-ref "$SUPABASE_PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"
    ;;
  types)
    generated_types="$(mktemp packages/data/src/.database.types.XXXXXX.ts)"
    trap 'rm -f "$generated_types"' EXIT
    pnpm exec supabase gen types typescript --project-id "$SUPABASE_PROJECT_REF" >"$generated_types"
    if [[ ! -s "$generated_types" ]] || ! grep -q 'export type Database' "$generated_types"; then
      echo "Supabase type generation returned invalid output; checked-in types unchanged." >&2
      exit 1
    fi
    mv "$generated_types" packages/data/src/database.types.ts
    trap - EXIT
    echo "Generated packages/data/src/database.types.ts"
    ;;
  *)
    echo "usage: $0 push|types" >&2
    exit 2
    ;;
esac
