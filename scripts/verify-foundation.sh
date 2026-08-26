#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

required=(
  README.md CLAUDE.md AGENTS.md package.json .mcp.json .env.example
  docs/START-HERE.md docs/PRODUCT-CONTRACT.md docs/FROZEN-UX.md
  docs/UX-AUDIT.md docs/FINAL-STACK.md docs/ARCHITECTURE.md
  docs/MEDIA-CONCURRENCY.md docs/COST-MODEL.md docs/DECISION-MATRIX.md
  docs/DECISION-REGISTER.md docs/AGENT-WORKFLOW.md docs/VERIFICATION.md
  docs/GOAL-ROADMAP.md docs/CLAUDE-CODE-SETUP.md docs/GOLD-PROMPT.md
  docs/ENTRY-PROMPT.md docs/PROMPT-PLAYBOOK.md docs/AI-MODEL-EVALUATION.md
  docs/REFERENCES.md docs/DIGITALOCEAN-DEPLOYMENT.md
  infra/digitalocean/spec-contract.json
  .github/workflows/digitalocean-staging.yml
  .github/workflows/digitalocean-production.yml
  .claude/skills/goal/SKILL.md
  .claude/skills/ship-pr/SKILL.md scripts/doctor.sh scripts/new-goal.sh
  scripts/open-pr.sh scripts/digitalocean/bootstrap-app.mjs
  scripts/digitalocean/check-env.mjs scripts/digitalocean/common.sh
  scripts/digitalocean/configure-github.sh scripts/digitalocean/env-contract.mjs
  scripts/digitalocean/deploy.sh scripts/digitalocean/doctl.sh
  scripts/digitalocean/rollback.sh scripts/digitalocean/smoke.sh
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

for obsolete in \
  docs/PROVISIONAL-STACK.md docs/STACK-DECISION.md docs/GOLD-PROMPTS.md \
  docs/AI-WORKFLOW.md docs/REPO-BLUEPRINT.md docs/PHASE-ROADMAP.md \
  docs/goals/00-research-architecture.md docs/goals/01-repo-foundation.md \
  docs/goals/02-ux-prototype.md docs/goals/03-domain-data-realtime.md \
  docs/goals/04-workflows-mocks.md docs/goals/05-image-identity.md \
  docs/goals/07-commerce.md scripts/run-goal.sh scripts/new-phase.sh \
  scripts/start-phase.sh; do
  [[ ! -e "$obsolete" ]] || { echo "obsolete artifact remains: $obsolete" >&2; exit 1; }
done

find .claude/skills -mindepth 1 -maxdepth 1 -type d \
  ! -name goal ! -name adversarial-review ! -name ship-pr -print -quit |
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
for script in scripts/digitalocean/*.sh; do bash -n "$script"; done
node --check scripts/digitalocean/bootstrap-app.mjs
node --check scripts/digitalocean/check-env.mjs
node --check scripts/digitalocean/env-contract.mjs

grep -q 'Supabase Postgres' docs/FINAL-STACK.md
grep -q 'Trigger.dev Cloud' docs/FINAL-STACK.md
grep -q 'gpt-image-2-2026-04-21' docs/FINAL-STACK.md
grep -q 'bytedance/seedance-2.0/fast/image-to-video' docs/FINAL-STACK.md
grep -q 'fal.ai' docs/FINAL-STACK.md
grep -q 'four product stills start concurrently' README.md
grep -q 'batch fan-out' docs/ARCHITECTURE.md
grep -q 'verified concurrency limit of at least four' docs/MEDIA-CONCURRENCY.md
grep -q 'FAL_KEY' .env.example
grep -q 'mcp.fal.ai/mcp' .mcp.json
grep -q 'four preview requests overlap' docs/goals/06-real-motion.md
grep -q 'DigitalOcean App Platform' docs/FINAL-STACK.md
node - <<'NODE'
const contract = require("./infra/digitalocean/spec-contract.json");
const production = contract.environments?.production;
if (production?.instanceCount !== 1 || production?.autoscaling) {
  throw new Error("production must use one fixed managed instance");
}
NODE

if grep -R -n \
  -E 'RUNWAYML_API_SECRET|gemini_omni_flash|Runway API|Runway adapter|selected-first Runway' \
  README.md CLAUDE.md AGENTS.md .env.example .mcp.json docs .claude package.json 2>/dev/null; then
  echo "obsolete Runway/Gemini motion instruction remains"
  exit 1
fi

if grep -R -n \
  --exclude='FINAL-STACK.md' --exclude='DECISION-MATRIX.md' \
  --exclude='DECISION-REGISTER.md' --exclude='REFERENCES.md' \
  -E 'Convex Cloud|Clerk operator|Cloudflare R2|research and finalize architecture' \
  README.md CLAUDE.md AGENTS.md docs .claude package.json 2>/dev/null; then
  echo "contradictory active stack instruction remains"
  exit 1
fi

if grep -R -n -E 'Docker is required|requires Docker|supabase start is required' \
  README.md CLAUDE.md AGENTS.md docs .claude package.json 2>/dev/null; then
  echo "hidden local infrastructure requirement remains"
  exit 1
fi

count="$(find docs/previews -maxdepth 1 -type f \( -name '*.png' -o -name '*.webp' \) 2>/dev/null | wc -l | tr -d ' ')"
[[ "$count" -ge 5 ]] || { echo "expected at least 5 UX previews, found $count" >&2; exit 1; }

echo "Jewelo Supabase/Trigger/OpenAI/fal concurrency foundation verified"
