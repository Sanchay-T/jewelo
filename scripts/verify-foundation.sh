#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

required=(
  README.md CLAUDE.md AGENTS.md package.json .mcp.json .env.example
  docs/START-HERE.md docs/STACK-DECISION.md docs/ARCHITECTURE.md
  docs/RESEARCH-EVIDENCE.md docs/DECISION-REGISTER.md docs/PRODUCT-CONTRACT.md
  docs/FROZEN-UX.md docs/UX-AUDIT.md docs/AGENT-WORKFLOW.md
  docs/AGENT-CONTROL-PLANE.md docs/VERIFICATION.md docs/GOAL-ROADMAP.md
  docs/CLAUDE-CODE-SETUP.md docs/GOLD-PROMPTS.md docs/ENTRY-PROMPT.md
  docs/OPERATING-ASSUMPTIONS.md docs/REPOSITORY-STRUCTURE.md
  docs/PROMPT-PLAYBOOK.md docs/AI-MODEL-EVALUATION.md docs/REFERENCES.md
  .claude/skills/goal/SKILL.md .claude/skills/ship-pr/SKILL.md
  scripts/doctor.sh scripts/new-goal.sh scripts/open-pr.sh
)
for file in "${required[@]}"; do
  [[ -s "$file" ]] || { echo "missing or empty: $file" >&2; exit 1; }
done

for id in 00 01 02 03 04 05 06 07 08; do
  shopt -s nullglob
  goals=(docs/goals/${id}-*.md)
  shopt -u nullglob
  [[ "${#goals[@]}" -eq 1 && -s "${goals[0]}" ]] || {
    echo "expected exactly one goal for ${id}, found ${#goals[@]}" >&2
    exit 1
  }
done

grep -q '^name: goal$' .claude/skills/goal/SKILL.md || { echo "missing /goal skill name" >&2; exit 1; }
grep -q '^disable-model-invocation: true$' .claude/skills/goal/SKILL.md || { echo "/goal must be user invoked" >&2; exit 1; }
grep -q 'Do not ask the human to choose the stack' .claude/skills/goal/SKILL.md || { echo "/goal still delegates PM decision" >&2; exit 1; }

obsolete=(
  docs/PROVISIONAL-STACK.md docs/FINAL-STACK.md docs/AI-WORKFLOW.md
  docs/GOLD-PROMPT.md docs/REPO-BLUEPRINT.md docs/PHASE-ROADMAP.md
  docs/goals/00-research-architecture.md docs/goals/01-repo-foundation.md
  docs/goals/02-ux-prototype.md docs/goals/03-domain-data-realtime.md
  docs/goals/04-workflows-mocks.md docs/goals/05-image-identity.md
  docs/goals/07-commerce.md scripts/run-goal.sh scripts/new-phase.sh scripts/start-phase.sh
)
for path in "${obsolete[@]}"; do
  [[ ! -e "$path" ]] || { echo "obsolete artifact remains: $path" >&2; exit 1; }
done

find .claude/skills -mindepth 1 -maxdepth 1 -type d ! -name goal ! -name adversarial-review ! -name ship-pr -print -quit |
  grep -q . && { echo "stale phase skill remains" >&2; exit 1; } || true

for agent in plan-reviewer adversarial-reviewer ux-verifier security-reviewer; do
  [[ -s ".claude/agents/$agent.md" ]] || { echo "missing reviewer: $agent" >&2; exit 1; }
done

for legacy in convex src/app src/components docker-compose.yml; do
  [[ ! -e "$legacy" ]] || { echo "legacy/local-infra path present before Goal 00: $legacy" >&2; exit 1; }
done

node - <<'NODE'
const p = require("./package.json");
if (!p.private) throw new Error("package must be private");
if (p.packageManager !== "pnpm@11.23.0") throw new Error("unexpected pnpm pin");
if (p.engines?.node !== ">=24 <25") throw new Error("Node 24 must be pinned");
if (p.scripts?.goal || p.scripts?.["phase:new"] || p.scripts?.["phase:start"]) {
  throw new Error("obsolete wrapper script remains");
}
if (p.scripts?.["goal:new"] !== "bash scripts/new-goal.sh") {
  throw new Error("goal:new helper missing");
}
NODE

node scripts/list-goals.mjs >/dev/null
for script in scripts/*.sh; do bash -n "$script"; done

grep -q 'Supabase + Trigger' docs/STACK-DECISION.md
grep -q 'Supabase PostgreSQL' docs/ARCHITECTURE.md
grep -q 'Trigger.dev v4 Cloud' docs/ARCHITECTURE.md
grep -q 'gpt-image-2-2026-04-21' docs/ARCHITECTURE.md
grep -q 'Runway' docs/ARCHITECTURE.md
grep -q 'Goal 00 is repository and managed-development foundation implementation' docs/START-HERE.md
grep -q 'Do not research or renegotiate the stack' docs/ENTRY-PROMPT.md

if grep -R -n --exclude='STACK-DECISION.md' --exclude='RESEARCH-EVIDENCE.md' \
  -E 'Convex Cloud|Clerk operator|Cloudflare R2|research and finalize architecture' \
  README.md CLAUDE.md AGENTS.md docs .claude package.json 2>/dev/null; then
  echo "contradictory active stack instruction remains" >&2
  exit 1
fi

count="$(find docs/previews -maxdepth 1 -type f \( -name '*.png' -o -name '*.webp' \) 2>/dev/null | wc -l | tr -d ' ')"
[[ "$count" -ge 5 ]] || { echo "expected at least 5 UX previews, found $count" >&2; exit 1; }

echo "PM-owned Supabase/Trigger foundation verified"
