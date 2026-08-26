#!/usr/bin/env bash
set -uo pipefail

strict=0
[[ "${1:-}" == "--strict" ]] && strict=1
failures=0
warnings=0

ok() { printf 'ok    %s\n' "$*"; }
warn() { printf 'warn  %s\n' "$*"; warnings=$((warnings + 1)); }
fail() { printf 'fail  %s\n' "$*"; failures=$((failures + 1)); }
check_cmd() {
  command -v "$1" >/dev/null 2>&1 && ok "$1: $(command -v "$1")" ||
    { [[ "$2" == required ]] && fail "$1 is missing" || warn "$1 is not installed yet"; }
}

printf 'Jewelo v2 environment doctor\n\n'
check_cmd git required
check_cmd node required
check_cmd corepack required
check_cmd pnpm optional
check_cmd gh optional
check_cmd claude optional
check_cmd codex optional

if command -v node >/dev/null 2>&1; then
  node_major="$(node -p 'process.versions.node.split(".")[0]')"
  [[ "$node_major" == "24" ]] &&
    ok "Node $(node --version) matches Node 24 LTS" ||
    warn "Node $(node --version) does not match the locked Node 24 major"
fi

if command -v pnpm >/dev/null 2>&1; then
  ok "pnpm: $(pnpm --version)"
fi
if command -v gh >/dev/null 2>&1; then
  gh auth status >/dev/null 2>&1 && ok "GitHub CLI authenticated" || warn "GitHub CLI is not authenticated"
fi
if command -v claude >/dev/null 2>&1; then
  ok "Claude Code: $(claude --version 2>/dev/null | head -n1 || echo installed)"
fi
if command -v codex >/dev/null 2>&1; then
  ok "Codex: $(codex --version 2>/dev/null | head -n1 || echo installed)"
fi

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  branch="$(git branch --show-current)"
  ok "Git branch: ${branch:-detached}"
  [[ -z "$(git status --porcelain)" ]] && ok "working tree clean" || warn "working tree has local changes"
fi

printf '\nNo Docker/local database/local storage check is required.\n'
printf 'Summary: %d failure(s), %d warning(s)\n' "$failures" "$warnings"
if (( failures > 0 )); then exit 1; fi
if (( strict == 1 && warnings > 0 )); then exit 2; fi
