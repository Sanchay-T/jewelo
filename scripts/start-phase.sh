#!/usr/bin/env bash
set -euo pipefail
phase="${1:-}"
if [[ ! "$phase" =~ ^(00|01|02|03|04|05|06|07|08)$ ]]; then
  echo "usage: $0 00|01|02|03|04|05|06|07|08" >&2
  exit 2
fi
command -v claude >/dev/null 2>&1 || { echo "Claude Code is not installed" >&2; exit 1; }

root="$(git rev-parse --show-toplevel)"
goal=("$root"/docs/goals/${phase}-*.md)
slug="$(basename "${goal[0]}" .md | cut -d- -f2-)"
worktree="${JEWELO_WORKTREE_ROOT:-$(dirname "$root")}/jewelo-${phase}-${slug}"

"$root/scripts/new-phase.sh" "$phase"
printf 'launching Claude Code in %s\n' "$worktree"
cd "$worktree"
exec claude
