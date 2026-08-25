#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

required=(
  README.md CLAUDE.md AGENTS.md package.json .mcp.json
  docs/START-HERE.md docs/PRODUCT-CONTRACT.md docs/FROZEN-UX.md
  docs/AGENT-WORKFLOW.md docs/VERIFICATION.md docs/PHASE-ROADMAP.md
  docs/CLAUDE-CODE-SETUP.md docs/ENTRY-PROMPT.md
  scripts/doctor.sh scripts/run-goal.sh scripts/new-phase.sh scripts/start-phase.sh scripts/open-pr.sh
)
for file in "${required[@]}"; do
  [[ -s "$file" ]] || { echo "missing or empty: $file" >&2; exit 1; }
done

for phase in 00 01 02 03 04 05 06 07 08; do
  goal=(docs/goals/${phase}-*.md)
  skill=".claude/skills/phase-${phase}/SKILL.md"
  [[ -s "${goal[0]}" ]] || { echo "missing phase goal: $phase" >&2; exit 1; }
  [[ -s "$skill" ]] || { echo "missing phase skill: $phase" >&2; exit 1; }
  grep -q '^disable-model-invocation: true$' "$skill" || { echo "unsafe/missing skill invocation guard: $skill" >&2; exit 1; }
done

for agent in plan-reviewer adversarial-reviewer ux-verifier security-reviewer; do
  [[ -s ".claude/agents/$agent.md" ]] || { echo "missing reviewer: $agent" >&2; exit 1; }
done

legacy=(convex src/components src/app)
for path in "${legacy[@]}"; do
  [[ ! -e "$path" ]] || { echo "legacy implementation path present in clean foundation: $path" >&2; exit 1; }
done

node -e 'const p=require("./package.json"); if(!p.private || !p.packageManager?.startsWith("pnpm@")) process.exit(1)'
node scripts/list-goals.mjs >/dev/null

for script in scripts/*.sh; do bash -n "$script"; done

count="$(find docs/previews -maxdepth 1 -type f \( -name '*.png' -o -name '*.webp' \) 2>/dev/null | wc -l | tr -d ' ')"
[[ "$count" -ge 5 ]] || { echo "expected at least 5 UX preview images, found $count" >&2; exit 1; }

echo "foundation verification passed"
