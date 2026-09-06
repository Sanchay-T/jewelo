> Customer UI reset: see `docs/START-HERE.md`. The local customer surface is blank; old customer instructions below describe removed functionality, not an approved design.

# Jewelo v2 — implementation-ready rebuild

This branch is the clean-room source of truth for rebuilding Jewelo from first principles. The product journey, UX behavior, production architecture, concurrency contract, model strategy, and modular implementation goals are already decided.

**Current status:** architecture locked; implementation has not started.

## Locked production stack

- Next.js 16.2 + React 19 + strict TypeScript
- pnpm workspace + Turborepo
- DigitalOcean App Platform in Bangalore for staging and production web deployments
- Supabase Mumbai for Postgres, Auth, Realtime, and private Storage
- Trigger.dev Cloud for durable, parallel AI workflows
- direct OpenAI `gpt-image-2-2026-04-21` for product and worn stills
- fal.ai for video inference
- Seedance 2.0 Fast for four 4-second motion previews
- Seedance 2.0 Standard for an optional selected final motion
- Sentry + PostHog for reliability and product analytics
- Motion + Embla + `react-zoom-pan-pinch` + `react-dropzone` for the progressive media experience

Read `docs/FINAL-STACK.md`, `docs/ARCHITECTURE.md`, and `docs/MEDIA-CONCURRENCY.md` before changing implementation decisions.

## Fast-result contract

```text
four product stills start concurrently
  each verified product appears immediately
    each independently unlocks:
      worn still + fast Seedance preview concurrently
```

There is no “wait for the entire batch” barrier. A slow or failed sibling cannot delay a successful variation.

Provider quotas remain honest:

- OpenAI concurrency/IPM is validated before real launch;
- fal preview-all mode requires a verified account concurrency limit of at least four;
- below a provider limit, Trigger queues excess work and the UI shows `queued` rather than fake progress.

## Open-source framework decision

No autonomous media-agent framework sits in the production path. Genblaze was the strongest open-source pipeline candidate reviewed, but it would add Python and duplicate Trigger.dev’s durable workflow responsibilities. Jewelo keeps deterministic typed workflows and borrows only provenance ideas.

fal.ai is the managed inference gateway for Seedance—not the business workflow engine. Trigger.dev owns fan-out, retries, idempotency, fairness, cancellation, and recovery. Supabase owns durable customer-visible truth.

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
- purchasing/approving OpenAI and fal quota or billing;
- accepting legal, privacy, retention, and manufacturing claims;
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
- `docs/OMRAN-BUSINESS-CONTEXT.md` — attributed feedback for a fresh UI brainstorm.
- `docs/FINAL-STACK.md` — binding technology choices.
- `docs/ARCHITECTURE.md` — system boundaries, data flow, and scaling behavior.
- `docs/MEDIA-CONCURRENCY.md` — four-way fan-out, quotas, costs, and progressive UI contract.
- `docs/DECISION-MATRIX.md` — why the selected stack won.
- `docs/COST-MODEL.md` — dated unit economics and safeguards.
- `docs/DIGITALOCEAN-DEPLOYMENT.md` — hosting, secrets, CI, deployment, and rollback runbook.
- `docs/GOLD-PROMPT.md` — copy-paste first implementation prompt.
- `docs/goals/` — bounded implementation goals.
