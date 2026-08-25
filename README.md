# Jewelo v2 — implementation-ready rebuild

This branch is the clean-room source of truth for rebuilding Jewelo from first principles. The product journey, UX behavior, production architecture, service boundaries, model strategy, and modular implementation goals are already decided.

**Current status:** architecture locked; implementation has not started.

## Locked production stack

- Next.js 16.2 + React 19 + strict TypeScript
- pnpm workspace + Turborepo
- Vercel for web and preview deployments
- Supabase Mumbai for Postgres, Auth, Realtime, and private Storage
- Trigger.dev Cloud for durable, parallel AI workflows
- OpenAI GPT Image 2 snapshot for product and worn stills
- Runway API with `gemini_omni_flash` for selected 9:16 motion; `seedance2` is the fallback profile
- Sentry + PostHog for reliability and product analytics

Read `docs/FINAL-STACK.md` and `docs/ARCHITECTURE.md` before changing implementation decisions.

## Start

```bash
git clone --branch rebuild/v2-first-principles --single-branch \
  https://github.com/Sanchay-T/jewelo.git jewelo-v2
cd jewelo-v2
corepack enable
pnpm verify
```

### Claude Code

```bash
claude
```

Then run:

```text
/goal 00
```

### Codex

Open Codex in this checkout and paste the complete prompt from:

```text
docs/GOLD-PROMPT.md
```

Both paths execute `docs/goals/00-production-foundation.md`. The agent implements the decided stack; it does not reopen architecture research.

## Human API boundary

The agent owns routine engineering: files, tests, migrations, preview deploys, provider test calls, logs, debugging, draft PRs, and proof packets.

The human is required only for:

- first-time account creation or OAuth authorization;
- supplying development/production secrets;
- accepting billing, legal, privacy, retention, and manufacturing claims;
- irreversible production actions;
- merging and launch approval.

Normal development must not require Docker, a local database, local object-storage emulators, Kubernetes, or self-hosting.

## Goal branches

```text
main
  └── rebuild/v2-first-principles
        ├── goal/00-production-foundation
        ├── goal/01-product-studio
        ├── goal/02-supabase-domain
        ├── goal/03-durable-generation
        ├── goal/04-identity-prompt-qa
        ├── goal/05-real-still-generation
        ├── goal/06-real-motion
        ├── goal/07-commerce-operator
        └── goal/08-hardening-launch
```

A goal normally runs in an isolated worktree and ends in a draft PR into `rebuild/v2-first-principles`. The umbrella PR to `main` remains draft until Goal 08 passes.

## Repository map

- `CLAUDE.md` — always-loaded coding-agent contract.
- `AGENTS.md` — tool-neutral agent rules.
- `.claude/skills/goal/SKILL.md` — Claude Code `/goal` skill.
- `docs/PRODUCT-CONTRACT.md` — frozen business journey.
- `docs/FROZEN-UX.md` and `docs/UX-AUDIT.md` — approved experience and corrections.
- `docs/FINAL-STACK.md` — binding technology choices.
- `docs/ARCHITECTURE.md` — system boundaries, data flow, and scaling behavior.
- `docs/DECISION-MATRIX.md` — why the selected stack won.
- `docs/COST-MODEL.md` — dated unit economics and safeguards.
- `docs/GOLD-PROMPT.md` — copy-paste first implementation prompt.
- `docs/goals/` — bounded implementation goals.
