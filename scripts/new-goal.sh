#!/usr/bin/env bash
set -euo pipefail
goal_id="${1:-}"
if [[ ! "$goal_id" =~ ^(00|01|02|03|04|05|06|07|08)$ ]]; then
  echo "usage: $0 00|01|02|03|04|05|06|07|08" >&2
  exit 2
fi

root="$(git rev-parse --show-toplevel)"
cd "$root"
base="rebuild/v2-first-principles"
goal=(docs/goals/${goal_id}-*.md)
[[ -f "${goal[0]}" ]] || { echo "goal file not found for $goal_id" >&2; exit 1; }
slug="$(basename "${goal[0]}" .md | cut -d- -f2-)"
branch="goal/${goal_id}-${slug}"
worktree="${JEWELO_WORKTREE_ROOT:-$(dirname "$root")}/jewelo-goal-${goal_id}-${slug}"

git fetch origin "$base"

if git worktree list --porcelain | awk -v target="$worktree" '$1=="worktree" && $2==target {found=1} END{exit !found}'; then
  printf 'worktree: %s\nbranch:   %s\n' "$worktree" "$branch"
  exit 0
fi

if git show-ref --verify --quiet "refs/heads/$branch"; then
  git worktree add "$worktree" "$branch"
elif git ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1; then
  git worktree add --track -b "$branch" "$worktree" "origin/$branch"
else
  git worktree add -b "$branch" "$worktree" "origin/$base"
fi

printf 'worktree: %s\nbranch:   %s\n\n' "$worktree" "$branch"
printf 'Claude Code: cd %q && claude, then run /goal %s\n' "$worktree" "$goal_id"
printf 'Codex:       cd %q && codex, then set native /goal against %s\n' "$worktree" "${goal[0]}"
