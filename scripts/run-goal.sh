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
[[ -f "${goal[0]}" ]] || { echo "goal file not found" >&2; exit 1; }
slug_short="$(basename "${goal[0]}" .md | cut -d- -f2-)"
branch="phase/${phase}-${slug_short}"
worktree="${JEWELO_WORKTREE_ROOT:-$(dirname "$root")}/jewelo-${phase}-${slug_short}"

# Running from the integration checkout automatically re-execs inside the
# isolated phase worktree. This prevents an autonomous goal loop from editing
# the long-lived integration branch directly.
if [[ "$(git branch --show-current)" != "$branch" ]]; then
  "$root/scripts/new-phase.sh" "$phase"
  cd "$worktree"
  exec ./scripts/run-goal.sh "$phase"
fi

slug="$(basename "${goal[0]}" .md)"
condition="Complete ${slug} exactly as specified in docs/goals/${slug}.md. Read CLAUDE.md and all imported project rules first. Stay inside this phase, use fresh plan and adversarial reviewers, run the required verification, prepare a draft PR into rebuild/v2-first-principles, and stop without merging or starting another phase. Completion requires transcript evidence for every acceptance and stop criterion in the goal file."

args=(-p "/goal $condition" --output-format stream-json --verbose)
if [[ -n "${CLAUDE_PERMISSION_MODE:-}" ]]; then
  args+=(--permission-mode "$CLAUDE_PERMISSION_MODE")
fi
exec claude "${args[@]}"
