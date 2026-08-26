#!/usr/bin/env bash
set -euo pipefail
if command -v hq-gh >/dev/null 2>&1; then
  gh_command=(hq-gh)
elif command -v gh >/dev/null 2>&1; then
  gh_command=(gh)
else
  echo "GitHub CLI is required" >&2
  exit 1
fi
branch="$(git branch --show-current)"
[[ "$branch" == goal/* ]] || { echo "run from a goal/* branch" >&2; exit 1; }
base="${JEWELO_PR_BASE:-rebuild/v2-first-principles}"

git status --short
if [[ -n "$(git status --porcelain)" ]]; then
  echo "commit or stash changes before opening a PR" >&2
  exit 1
fi

git push -u origin "$branch"
if "${gh_command[@]}" pr view "$branch" >/dev/null 2>&1; then
  "${gh_command[@]}" pr view "$branch" --web
else
  "${gh_command[@]}" pr create --draft --base "$base" --head "$branch" --fill
fi
