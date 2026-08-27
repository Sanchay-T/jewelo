# Claude Code and Codex setup

## Clone

```bash
git clone --branch rebuild/v2-first-principles --single-branch \
  https://github.com/Sanchay-T/jewelo.git jewelo-v2
cd jewelo-v2
corepack enable
pnpm verify
```

## One-time workstation tools

Required:

- Git
- Node.js 24 LTS
- Corepack/pnpm
- GitHub CLI authenticated to the repository
- Claude Code or Codex

Not required:

- Docker
- local Postgres
- local object storage
- Kubernetes
- local GPU/model infrastructure

Check:

```bash
./scripts/doctor.sh --strict
```

## MCP control plane

The project `.mcp.json` contains DigitalOcean App Platform/Registry/Docs, Supabase, dev-only Trigger.dev, and fal model MCP definitions.

In Claude Code, open `/mcp` and authenticate the applicable servers. Scope Supabase to the Jewelo development project. Trigger remains dev-only until explicit production authorization.

fal authentication is read from `FAL_KEY` through environment-variable expansion in `.mcp.json`. The checked-in fallback is intentionally invalid; never commit the real key.

Service capabilities:

- GitHub/`gh`: branches, commits, PRs, checks.
- DigitalOcean MCP/`doctl`: apps, encrypted environment configuration, deployments, registry, and log inspection.
- Supabase MCP/CLI: project/branch/database/function/storage/debugging operations.
- Trigger MCP/CLI: initialize, deploy, trigger, inspect, cancel, debug, preview branches.
- fal MCP: search models/docs, inspect Seedance schemas/pricing, upload bounded test input, submit/check/cancel development jobs.
- OpenAI SDK/API: bounded GPT Image 2 evaluation and generation.
- fal JavaScript SDK/API: runtime Seedance queue/status/webhook integration.

MCP is an agent operating surface, not an application runtime dependency.

## Human actions

Goal 00 may stop to ask for one or more of:

1. authenticate the DigitalOcean MCP/`doctl` CLI;
2. authenticate Supabase and select/create the organization/project;
3. authenticate Trigger.dev;
4. set `FAL_KEY` and authorize the fal MCP locally;
5. supply development OpenAI/fal secrets through the approved environment/secret manager;
6. accept a paid plan required for preview branches, provider quota, or commercial deployment.

Later real-media goals additionally require:

- OpenAI project quota validated for four overlapping product calls and progressive worn calls;
- fal account concurrency verified at four or higher for preview-all mode;
- explicit bounded development spend authorization.

The agent must state the exact command/browser authorization or required setting and continue after confirmation.

## Run Goal 00

Create the goal branch/worktree:

```bash
./scripts/new-goal.sh 00
```

Then enter the printed path.

Claude Code:

```bash
claude
```

```text
/goal 00
```

Codex:

```bash
codex
```

Paste `docs/GOLD-PROMPT.md`.

## Safety

- Do not use dangerous permission-bypass modes.
- Start MCPs in read-only/dev-only mode where supported.
- Production secrets never enter `.env.example`, prompts, logs, or PRs.
- Provider keys are trusted web/jobs only and never browser-exposed.
- fal temporary output URLs are not durable storage and must not be placed in customer-visible records.
- Agents may deploy previews and development resources after authorization; production deploy/merge remains human-approved.
