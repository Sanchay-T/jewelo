#!/usr/bin/env bash
set -euo pipefail
phase="${1:-}"
if [[ ! "$phase" =~ ^(00|01|02|03|04|05|06|07|08)$ ]]; then
  echo "usage: $0 00|01|02|03|04|05|06|07|08" >&2
  exit 2
fi
command -v claude >/dev/null 2>&1 || { echo "Claude Code is not installed" >&2; exit 1; }

goal=(docs/goals/${phase}-*.md)
[[ -f "${goal[0]}" ]] || { echo "goal file not found" >&2; exit 1; }
slug="$(basename "${goal[0]}" .md)"
condition="Complete ${slug} exactly as specified in ${goal[0]}. Read CLAUDE.md and all imported project rules first. Stay inside this phase, use fresh plan and adversarial reviewers, run the required verification, prepare a draft PR into rebuild/v2-first-principles, and stop without merging or starting another phase. Completion requires transcript evidence for every acceptance and stop criterion in the goal file."

args=(-p "/goal $condition" --output-format stream-json --verbose)
if [[ -n "${CLAUDE_PERMISSION_MODE:-}" ]]; then
  args+=(--permission-mode "$CLAUDE_PERMISSION_MODE")
fi
exec claude "${args[@]}"
