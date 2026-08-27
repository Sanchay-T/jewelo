# Gold prompt — first implementation goal

This is historical Goal 00 bootstrap guidance. For final Caleums integration,
`docs/CALEUMS-FINAL-E2E-CONTRACT.md` is the authoritative media and provider
contract.

Paste the block below into Codex or Claude Code from the root of the `rebuild/v2-first-principles` checkout.

```text
You are the implementation lead for Jewelo v2.

The product manager has already researched and locked the product, stack, media providers, concurrency model, and verification contract. Do not reopen vendor selection and do not import the old backend.

Read, in order:

1. CLAUDE.md
2. AGENTS.md
3. docs/START-HERE.md
4. docs/PRODUCT-CONTRACT.md
5. docs/FROZEN-UX.md
6. docs/UX-AUDIT.md
7. docs/FINAL-STACK.md
8. docs/ARCHITECTURE.md
9. docs/MEDIA-CONCURRENCY.md
10. docs/COST-MODEL.md
11. docs/VERIFICATION.md
12. docs/goals/00-production-foundation.md

Execute Goal 00 exactly.

The fixed stack is Next.js 16.2/React 19 on DigitalOcean App Platform in Bangalore; pnpm/Turborepo; Supabase Mumbai for Postgres/Auth/Realtime/private Storage; Trigger.dev Cloud for durable jobs; direct OpenAI GPT Image 2 for stills; fal.ai for Seedance video inference; Seedance 2.0 Fast for four previews and Seedance 2.0 Standard for the selected final upgrade; Sentry/PostHog for observability.

The locked media pipeline is:

- batch-dispatch four independent variation pipelines;
- start four product-image calls concurrently within verified OpenAI quota;
- reveal each verified product immediately without waiting for the batch;
- immediately fan that variation into its worn-image task and 4-second Seedance Fast preview task concurrently;
- support four overlapping Seedance previews only after fal account concurrency >= 4 is verified;
- preserve truthful queued states when provider capacity is lower;
- keep Supabase as durable customer-visible truth and Trigger.dev as the workflow/concurrency engine;
- treat fal.ai only as the Seedance inference gateway;
- copy every successful provider output immediately into private Supabase Storage;
- use stable idempotency keys and prevent duplicate provider charges/assets.

Do not add Docker, local Postgres, local object-storage emulators, Kubernetes, self-hosting, Convex, Neon, Clerk, Firebase, Runway, another workflow/database stack, or an autonomous media-agent framework such as Genblaze.

Before material edits, inspect the repository, state the goal’s objective/stopping condition/evidence, produce a concrete file-level plan, and have the plan-reviewer challenge it. Then implement autonomously.

Use supported CLI/API/MCP surfaces. Ask me only when a specific account authorization, secret, billing acceptance, provider-quota purchase, or irreversible action is required; give me the smallest exact action. Once authorized, perform routine setup, deploys, migrations, logs, tests, and debugging yourself.

Goal 00 must establish typed configuration and provider ports for:

- OPENAI_IMAGE_CONCURRENCY and actual requests-per-minute policy;
- fal Seedance preview/final endpoints and concurrency policy;
- preview-all versus selected-only media profiles;
- per-run spend ceilings;
- Supabase/Trigger/OpenAI/fal environment boundaries;
- Motion, Embla, react-zoom-pan-pinch, and react-dropzone in the approved UI dependency plan.

Run every required check, prove a clean install/build/test/health path, inspect the preview where possible, use a fresh adversarial review, prepare the complete proof packet, commit, push the goal branch, and open a draft PR into rebuild/v2-first-principles.

Do not make paid media calls in Goal 00. Do not merge. Do not begin Goal 01. Stop only when Goal 00’s objective is objectively complete or a named external credential/approval is the sole remaining blocker.
```

Claude Code users may invoke the repository skill directly:

```text
/goal 00
```
