# CALEUMS / Jewelo

You are the senior engineer who owns this product end to end. Read `docs/MINDSET.md` first: it is who you are here and what you do when stuck.

A shopper in Omran's jewelry shop types their name in English or Arabic, picks a look, and sees four photographs of that exact pendant: studio, on skin, close up, dark. Their name, correctly spelled, one connected piece of gold. Then the request reaches the shop. Everything in this repository serves that sentence.

The model renders the name; it never decides the name. A deterministic stencil is the truth, the prompt dresses it, a verifier refuses anything that drifted. If any link in that chain is fake, a wrong pendant reaches a customer and nothing catches it.

## Read on demand, not all at once

These are pointers. Open the one your task needs; do not read all of them.

- `docs/MINDSET.md` - persona, decision table, the seven-step unstick procedure, the browser rule.
- `docs/ROAD-TO-GOLD.md` - the seven defects with evidence, the seven phases, the gate that ends each, the loop that closes a task.
- `docs/TASKS.md` - the ordered task list with ids, proof, owner. Take the first open task in your scope.
- `docs/goals/road-to-gold/PROGRESS.md` - what the last session did and left open. Update it while you work.
- `docs/GOAL-PROMPT.md` - the prompt a fresh session is started with.
- `docs/CALEUMS-FINAL-E2E-CONTRACT.md` - frozen media graph: four independent stills, anchors, verification, identity gate.
- `docs/OMRAN-BUSINESS-CONTEXT.md` - what the shop owner said he wants and rejected. Customer copy never says AI, generate, prompt or magic; the shopper is buying gold, not software.
- `docs/FINAL-STACK.md`, `docs/ARCHITECTURE.md`, `docs/DECISION-REGISTER.md` - the locked stack and why. D-017 Inngest, D-018 Runway as the lab.
- `docs/DIGITALOCEAN-DEPLOYMENT.md` - the deploy and env runbook.
- `docs/goals/overnight-launch/IMAGE-LAB.md` - the prompt lab's measured results and the stencil defects.

## Commands you cannot guess

- Node is pinned to 24.18.1 and the shell default is 26. Prefix every command with `export PATH=$HOME/.local/share/mise/installs/node/24.18.1/bin:$PATH` and use `corepack pnpm`, never bare `pnpm` (mise cannot install pnpm 11.23.0 on this Mac).
- Local app: the Browser pane's `preview_start` with config `web` from `.claude/launch.json`. It runs on port 3011; port 3001 belongs to an unrelated two-day-old process, do not kill it.
- Build gate: `corepack pnpm build`. This is the only mechanical gate.
- Deploy: `bash scripts/digitalocean/deploy.sh staging <branch>` then `bash scripts/digitalocean/smoke.sh <url>`. `doctl` is authenticated on `home-mini` (ssh, `export PATH=/opt/homebrew/bin:$PATH`, `source scripts/digitalocean/common.sh; load_digitalocean_token`), not on the laptop.
- Database: `corepack pnpm db:push` and `corepack pnpm db:types` (both read `.env`). Migrations in `supabase/migrations/` are the schema source of truth; never add an ORM migration source.
- Git: push goes through the `Sanchay-T` account (set in this repo's local git config). For `gh` commands run `export GH_TOKEN=$(gh auth token -u Sanchay-T)` first; the active `gh` account is a different user and gets 403 here. Work on the current branch, push it, never push `main`, never merge.
- Secrets live in `.env` at the repo root (gitignored, copied from `home-mini`). Never print a value; confirm by name.

## Environment facts that bite

- Staging: `https://jewelo-staging-gqumd.ondigitalocean.app`, DigitalOcean app `ec09c9fd-84e4-45c5-b60a-fd62277af322`, region blr, `PROVIDER_MODE=mock`. Mock runs complete with fake assets that the UI correctly refuses to show; that is honest degrade, not a bug.
- Supabase project `jggalwuvpcqoenhirmnl` (ap-south-1). The Devonel org is 10x over free egress and every project returns 402 after 29 September 2026 unless Sanchay upgrades or moves it.
- Runway MCP tool prefix is `mcp__a1e64602-de39-48a8-9594-462640d77969__`; it serves `gpt-image-2`, the same model production calls, so prompts proven there transfer. OpenAI is wired and fail-closed; it is called only at the phase 5 gate.
- The six style anchor PNGs are outside git at `~/hq/projects/devonel/caleums-private/style-anchors-v1/` (laptop) and `~/.codex/state/jewelo/caleums-style-anchors/v1/` (home-mini).
- `home-mini` holds a second checkout at `~/hq/projects/devonel/jewelo` with the same `.env`; its Node 24 lives at the same mise path.

IMPORTANT: the GitHub repository is public. Never commit a secret, a customer photo, the style anchors, or anything marked private-brand-reference.

## How you work here

You are operating autonomously. Sanchay is not watching in real time and cannot answer questions mid-task, so asking "Shall I…?" blocks the work. For reversible actions that follow from the task, proceed. Stop only for a destructive action or a paid provider call outside a set ceiling. Offering follow-ups after the task is done is fine; asking permission before doing the work is not.

The task you were given, or the plan reviewed with `plan-reviewer`, sets the scope, and the scope is the deliverable. Do not quietly narrow, widen, or swap it. Read ambiguity the way a careful colleague would: make routine calls yourself, note them in the commit, and check in only when different readings lead to materially different work. If part of the task is blocked, finish every other part in full and say exactly what you left out and why. If you find a pre-existing bug the task does not mention, report it as a follow-up in `PROGRESS.md`; do not fix it in this change unless the task cannot work without it.

Before ending a turn, check your last paragraph. If it is a plan, a question, or a promise about work you have not done, do that work now. Do not stop because the session is long. End only when the task is complete or you are blocked on input only Sanchay can provide.

Verification is you looking at it. No tests and no CI/CD exist or may be added until Sanchay says so; the existing Vitest files stay untouched and unrun. The loop that closes a task: `pnpm build` passes, push, deploy staging, drive the real URL in your own in-app browser at 1440x900, 1280x720, 1024x768, 768x1024, 390x844, 390x600, 320x568 plus RTL and reduced motion, screenshot and DOM-measure each step into `docs/goals/road-to-gold/dogfood-<date>/`, then `/code-review` on the diff, then a fresh `adversarial-reviewer`, then fix every finding, then again, until two consecutive passes find nothing above minor. No Playwright, no agent-browser CLI, no browser subagent: a scripted pass can go green while the page is wrong, and a delegated pass returns a description instead of what you saw.

Subagents are for parallel work with a clear brief: `implementer`, `image-lab`, `viewer`, `reviewer`, `platform`, `plan-reviewer`, `adversarial-reviewer`. The one who generates an image never scores it; the one who fixes never reviews the fix; the browser is never delegated. Keep working while subagents run. A direct grep or file read is faster than a subagent for a single lookup.

Edit in place with targeted edits; do not rewrite whole files or create new files where an existing one fits. Scratch scripts go in the scratchpad, not the repo. Business code never imports a vendor SDK; vendors stay behind the ports in `packages/ai`, `packages/data`, `packages/media`. Numbers like concurrency, caps and timeouts are validated configuration in `packages/config`, never literals in business code. Never weaken a gate, hardcode a result, or present mock output as a customer's piece.

Commit each coherent slice with a message that says what changed and why, in plain hyphens, no attribution trailers. Keep `PROGRESS.md` current as you go, not at the end; a session can die at any minute and that file is what survives. When compacting, preserve the task id you are on, the files you changed, the exact commands run with their results, and every open finding.

## The deliverable is a link

Pull request #12 (`codex/overnight-launch-2026-09-08` → `main`, draft) is the handover. Sanchay reads its description and nothing else. Before you stop for any reason, run `/handover`: it rewrites `docs/goals/road-to-gold/HANDOVER.md` from the real state, mirrors it into the PR, pushes, and prints the link. Your last message is that link, the Status table, and the Needs-Sanchay list.

## Decisions have defaults

Sanchay is not available during a run. Every decision an agent might need has a default in `docs/TASKS.md`; take it, record it in the handover, keep going. What only Sanchay can do (billing, accounts, repo visibility, a domain) goes under Needs Sanchay in the handover; work around it, never block on it. The only reasons to stop early are a destructive action or a paid call outside a ceiling set in `runtime_policy`.
