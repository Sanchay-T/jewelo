#!/usr/bin/env bash
set -euo pipefail
phase="${1:-}"
if [[ ! "$phase" =~ ^(00|01|02|03|04|05|06|07|08)$ ]]; then
  echo "usage: $0 00|01|02|03|04|05|06|07|08" >&2
  exit 2
fi

root="$(git rev-parse --show-toplevel)"
cd "$root"
base="rebuild/v2-first-principles"
goal=(docs/goals/${phase}-*.md)
slug="$(basename "${goal[0]}" .md | cut -d- -f2-)"
branch="phase/${phase}-${slug}"
worktree="${JEWELO_WORKTREE_ROOT:-$(dirname "$root")}/jewelo-${phase}-${slug}"

git fetch origin "$base"
if git show-ref --verify --quiet "refs/heads/$branch"; then
  git worktree add "$worktree" "$branch"
elif git ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1; then
  git worktree add --track -b "$branch" "$worktree" "origin/$branch"
else
  git worktree add -b "$branch" "$worktree" "origin/$base"
fi

printf 'worktree: %s\nbranch:   %s\nnext:     cd %q && claude\n' "$worktree" "$branch" "$worktree"
