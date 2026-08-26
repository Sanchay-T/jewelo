#!/usr/bin/env bash
set -euo pipefail
command -v gh >/dev/null 2>&1 || { echo "GitHub CLI is required" >&2; exit 1; }
branch="$(git branch --show-current)"
[[ "$branch" == phase/* ]] || { echo "run from a phase/* branch" >&2; exit 1; }
base="${JEWELO_PR_BASE:-rebuild/v2-first-principles}"

git status --short
if [[ -n "$(git status --porcelain)" ]]; then
  echo "commit or stash changes before opening a PR" >&2
  exit 1
fi

git push -u origin "$branch"
if gh pr view "$branch" >/dev/null 2>&1; then
  gh pr view "$branch" --web
else
  gh pr create --draft --base "$base" --head "$branch" --fill
fi
