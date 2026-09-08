# Storyline review 1: session 2 claims against the road map (`dbb73fb..d3dbd25`)

Fresh-context `adversarial-reviewer`, 2026-09-09, read-only, probes against the local dev server, the staging URL and the staging database.
Recorded by the lead from the agent's report. Fixes dispatched as storyline fix 1 (this pass) and carried into fix pass 7, P5-2 and the handover.

## Verdict

Directionally honest, arithmetic and several done marks do not survive.
`docs/TASKS.md` has 52 phase rows plus 4 launch rows, not 51; the evidence supports about 34 of 52 (65%) once rows verified only on localhost, or whose stated proof was replaced by a weaker one, are counted half.

## Blockers

- **B1 Staging broken by the v2 prompt publication.** `@v2` profiles were published to the shared staging database from the dev server at 22:25 UTC while staging ran `b1ea4b6d`, which cannot compile `{{construction}}`; run `7f8edc88` blocked `prompt_compile_failed` fifteen seconds later and every new run on staging stops pre-spend until the branch is deployed. Migration `20260909020000` was applied before it was committed. Fix: deploy `9e52bcc` or later at once (in progress); rule for the future: publish a prompt release only from a deployed build.
- **B2 The deliverable is stale.** `HANDOVER.md` mirrored into PR #12 still says session 1, phase 0. Nine done rows (P6-2, P6-5, P6-6, P6-7, P7-1, P7-2, P7-3, P7-5, landing) are committed but not on staging and were verified on localhost only. Fix: deploy, re-verify on the URL, `/handover`.
- **B3 P7-3 never announces on the replay path and nothing sweeps.** `apps/web/src/app/api/preview-requests/route.ts:43-48,72-77` return the existing row without `announceCapturedRequest`; the emit swallows failures; no job uses `preview_requests_unnotified`. Live: 13 requests, 0 announced (`NOTIFICATION_TO` unset, so the function returns `not_configured`). Fix: a two-minute sweeper over the unannounced index, and the emit on the replay path too.

## Major

- **M1 DS-4 is not what the code enforces.** `personalizedRun.ts:413-414` hardcodes `Classical`/`Classic` as renderable from stencil renderability; phase 3's proven look is `framed-minimal` at v4.3, which the UI refuses; Arabic lettering styles are not marked at all. Fix: the sellable set becomes validated configuration filled from P3-5's result before P5-2; recorded as the DS-4 default in the handover.
- **M2 P5-1 protection reverted.** `runtime_policy` is back at 6000 / 100 / 30, `studio_only false`; a `PROVIDER_MODE` flip today reserves 400 cents a run against 6000 with up to twelve images. Fix: a real-mode ceiling gate in the jobs worker (block pre-spend when the policy caps exceed `REAL_MODE_MAX_RESERVED_SPEND_CENTS`), after P2-2b releases `presentation.ts`; the cap UPDATE stays P5-2's first step.
- **M3 The fake gate is a denylist of one string.** `personalizedRun.ts:88` `PLACEHOLDER_PROVIDERS = {"mock"}`; any other provider string presents as the customer's piece. Fix: an allowlist `PRESENTABLE_PROVIDERS = ["openai"]`.
- **M4 CSP names `us.i.posthog.com` with the key empty** because `next-config.ts:26-40` adds the host origin independently of the key and `NEXT_PUBLIC_POSTHOG_HOST` is set. Fix: add the PostHog origin only when the key is set.
- **M5 Language switch carries the previous shopper's bag** (`deviceState.ts:81-82`); the same-locale, no-"New piece" path carries the name in the field. Fix in security fix 3 (M-2); staff runbook and an idle reset are follow-ups.
- **M6 No screenshots exist and the viewport ladder was never re-driven after Phase 6.** `dogfood-2026-09-08/` holds three markdown files and the mask overlays. Fix: the lead drives the ladder on the deployed URL and saves screenshots (owed before the handover).
- **M7 "Photograph it again" is a guaranteed no-op for deterministic refusals** (`identity_*`, `prompt_compile_failed`); the queue says "Sent back to be photographed again" and nothing changes. Fix: hide the retry for deterministic codes and show "make by hand" (after security fix 3 releases the queue file).

## Minor

- AR page `<title>` is English; `32 mm` in the step 04 summary; the P6-5 proof excluded the title and two-letter runs.
- `issue_quote` and `fulfillment_transition` still writable unvalidated (security fix 3 M-4).
- CSRF: `origin` compared with `x-forwarded-host`, both client-suppliable together (200 with both forged); compare with the configured app host (after security fix 3).
- P7-6 and P7-7 stated proofs were replaced by weaker ones (arithmetic plus a rolled-back synthetic attempt; SQL mirror instead of HTTP); rows rewritten to match, recorded.
- Arabic two-name refusal surfaces only after confirmation (`Atelier.tsx:1024-1031`).
- A failing stopped-run fetch empties the list silently (`PreviewRequestQueue.tsx:164-170`).
- 16 MB egress per four-view run, uncached, against the DS-1 deadline.

## Held

P4-1 rows, pipeline release state, P6-6, the `notified_at` race, operator session HMAC (401 on five routes), note cap, transition table, review-runs allowlist, `issueQuote` fail closed, landing redirect, no forbidden vocabulary in EN or AR customer text.
