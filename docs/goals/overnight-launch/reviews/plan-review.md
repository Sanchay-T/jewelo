# Plan review (fresh-context plan-reviewer, 03:15 IST 7 Sep 2026)

Verdict: conditional GO for W1, W2, W3 and the honest-degrade half of W4; NO-GO on self-hosted Inngest (W0) and real-mode W4/W5 until the blockers are resolved.

## Blockers and how the lead resolved them

- B1 Inngest `idempotency: event.data.taskId` would drop legitimate re-dispatches (operator retry, stale sweeper). Resolution: no function-level idempotency; event id = outbox dispatch key. Sent to W0b.
- B2 Daily spend cap is per anonymous principal, not global. Resolution: new migration adding a global daily sum cap in runtime_policy, enforced in the same trigger/RPC path; global 6000 cents for tonight. Sent to W0a.
- B3 `create_prompt_release` requires exactly the fixed 14-variable set, so a slotted universal prompt cannot be published without a migration relaxing the check plus packages/ai and contracts changes (construction, lettering). Resolution: owned by the W4 implementer once W2 reports the winning slot contract.
- B4 Six agents in one worktree race on package.json, lockfile, manifests and .next. Resolution: lead is the only committer; W0b told to re-read package.json and run one install; builds for W5 run after agents finish.

## Other findings adopted

- Studio view does not need style anchors (presentation.ts passes none for studio); real-mode dry runs can proceed with anchors missing, producing Studio ready and three dependent views blocked. W4 must render that mixed state honestly.
- Anchor releases must use the seeded source task IDs verbatim and bucket `style-anchors`.
- Cron guard: outbox-recovery and stale-media-recovery register only when INNGEST_CRON_ENABLED=1 so a local dev server never claims live tasks.
- readiness/smoke/env-contract/deploy.sh all reference Trigger; W0b rewrites them in the same slice.
- Stencils come from renderIdentityAnchor, not a lab renderer. Sent to W2.
- Reorder: the honest-degrade build is the first deployable state; real personalization is an upgrade on top. W0 self-host time-boxed to 09:00 IST.
- Anonymous session persistence is not wired in the atelier; W4 must store/refresh the Supabase session for reload and bag.
- daily_generation_limit=6 per principal per UTC day needs an honest "try again tomorrow" state.
- Adding a DO component is recurring spend; record its monthly cost in the handoff.
