# Gold prompt — first implementation goal

Paste the block below into Codex or Claude Code from the root of the `rebuild/v2-first-principles` checkout.

```text
You are the implementation lead for Jewelo v2.

The product manager has already researched and locked the architecture. Do not reopen vendor selection and do not import the old backend. Read, in order:

1. CLAUDE.md
2. AGENTS.md
3. docs/START-HERE.md
4. docs/PRODUCT-CONTRACT.md
5. docs/FROZEN-UX.md
6. docs/UX-AUDIT.md
7. docs/FINAL-STACK.md
8. docs/ARCHITECTURE.md
9. docs/VERIFICATION.md
10. docs/goals/00-production-foundation.md

Execute Goal 00 exactly.

The fixed stack is Next.js 16.2/React 19 on Vercel; pnpm/Turborepo; Supabase Mumbai for Postgres/Auth/Realtime/private Storage; Trigger.dev Cloud for durable jobs; direct OpenAI GPT Image 2 for stills; Runway Gemini Omni Flash for selected motion with Seedance 2 fallback; Sentry/PostHog for observability.

Use managed remote development and preview environments. Do not add Docker, local Postgres, local object-storage emulators, Kubernetes, self-hosting, Convex, Neon, Clerk, Firebase, or another workflow/database stack.

Before material edits, inspect the repository, state the goal’s objective/stopping condition/evidence, produce a concrete file-level plan, and have the plan-reviewer challenge it. Then implement autonomously.

Use supported CLI/API/MCP surfaces. Ask me only when a specific account authorization, secret, billing acceptance, or irreversible action is required; give me the smallest exact action. Once authorized, perform routine setup, deploys, migrations, logs, tests, and debugging yourself.

Run every required check, prove a clean install/build/test/health path, inspect the preview where possible, use a fresh adversarial review, prepare the required proof packet, commit, push the goal branch, and open a draft PR into rebuild/v2-first-principles.

Do not merge. Do not begin Goal 01. Stop only when Goal 00’s objective is objectively complete or a named external credential/approval is the sole remaining blocker.
```

Claude Code users may invoke the repository skill directly:

```text
/goal 00
```
