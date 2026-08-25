#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

required=(
  README.md CLAUDE.md AGENTS.md package.json .mcp.json .env.example
  docs/START-HERE.md docs/PRODUCT-CONTRACT.md docs/FROZEN-UX.md docs/UX-AUDIT.md
  docs/FINAL-STACK.md docs/ARCHITECTURE.md docs/DECISION-MATRIX.md docs/COST-MODEL.md
  docs/AGENT-WORKFLOW.md docs/VERIFICATION.md docs/GOAL-ROADMAP.md
  docs/CLAUDE-CODE-SETUP.md docs/GOLD-PROMPT.md docs/ENTRY-PROMPT.md
  .claude/skills/goal/SKILL.md
  scripts/doctor.sh scripts/new-goal.sh scripts/open-pr.sh
)
for file in "${required[@]}"; do
  [[ -s "$file" ]] || { echo "missing or empty: $file" >&2; exit 1; }
done

for id in 00 01 02 03 04 05 06 07 08; do
  goal=(docs/goals/${id}-*.md)
  [[ -s "${goal[0]}" ]] || { echo "missing modular goal: $id" >&2; exit 1; }
done

grep -q '^name: goal$' .claude/skills/goal/SKILL.md || { echo "Claude /goal skill missing name" >&2; exit 1; }
grep -q '^disable-model-invocation: true$' .claude/skills/goal/SKILL.md || { echo "Claude /goal must be user invoked" >&2; exit 1; }
grep -q 'architecture is locked' .claude/skills/goal/SKILL.md || { echo "goal skill does not enforce stack lock" >&2; exit 1; }

for obsolete in \
  docs/PROVISIONAL-STACK.md \
  docs/PHASE-ROADMAP.md \
  docs/goals/00-research-architecture.md \
  scripts/run-goal.sh scripts/new-phase.sh scripts/start-phase.sh; do
  [[ ! -e "$obsolete" ]] || { echo "obsolete planning artifact remains: $obsolete" >&2; exit 1; }
done

if find .claude/skills -maxdepth 1 -type d -name 'phase-*' | grep -q .; then
  echo "redundant phase-* skills remain" >&2
  exit 1
fi

for agent in plan-reviewer adversarial-reviewer ux-verifier security-reviewer; do
  [[ -s ".claude/agents/$agent.md" ]] || { echo "missing reviewer: $agent" >&2; exit 1; }
done

for legacy in convex src/components src/app docker-compose.yml; do
  [[ ! -e "$legacy" ]] || { echo "legacy/local-infra path present: $legacy" >&2; exit 1; }
done

node - <<'NODE'
const p = require("./package.json");
if (!p.private) throw new Error("package must be private");
if (!p.packageManager?.startsWith("pnpm@")) throw new Error("pnpm must be pinned");
if (p.engines?.node !== ">=24 <25") throw new Error("Node 24 must be locked");
for (const dead of ["phase:new", "phase:start", "goal"]) {
  if (p.scripts?.[dead]) throw new Error(`obsolete script remains: ${dead}`);
}
NODE

node scripts/list-goals.mjs >/dev/null
for script in scripts/*.sh; do bash -n "$script"; done

grep -q 'Supabase' docs/FINAL-STACK.md
grep -q 'Trigger.dev' docs/FINAL-STACK.md
grep -q 'gpt-image-2-2026-04-21' docs/FINAL-STACK.md
grep -q 'gemini_omni_flash' docs/FINAL-STACK.md

count="$(find docs/previews -maxdepth 1 -type f \( -name '*.png' -o -name '*.webp' \) 2>/dev/null | wc -l | tr -d ' ')"
[[ "$count" -ge 5 ]] || { echo "expected at least 5 UX previews, found $count" >&2; exit 1; }

echo "implementation-ready foundation verification passed"
