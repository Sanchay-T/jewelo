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

Check:

```bash
./scripts/doctor.sh --strict
```

## MCP control plane

The project `.mcp.json` contains Vercel, Supabase, and dev-only Trigger.dev definitions.

In Claude Code, open `/mcp` and authenticate each server. Scope Supabase to the Jewelo development project when it exists. Trigger remains dev-only until explicit production authorization.

Service capabilities:

- GitHub/`gh`: branches, commits, PRs, checks.
- Vercel MCP/CLI: projects, previews, env, deploy/log inspection.
- Supabase MCP/CLI: project/branch/database/function/storage/debugging operations.
- Trigger MCP/CLI: initialize, deploy, trigger, inspect, cancel, debug, preview branches.
- OpenAI/Runway SDKs: bounded provider evaluation and generation.

## Human actions

Goal 00 may stop to ask for one or more of:

1. authenticate the Vercel MCP/CLI;
2. authenticate Supabase and select/create the organization/project;
3. authenticate Trigger.dev;
4. supply development secrets through the chosen secret manager/Vercel;
5. accept a paid plan required for preview branching or commercial deployment.

The agent must state the exact command or browser authorization and continue after confirmation.

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
- Agents may deploy previews and development resources after authorization; production deploy/merge remains human-approved.
