# CALEUMS handover

This file is the handover.
Its content is mirrored into the description of https://github.com/Sanchay-T/jewelo/pull/12 by `/handover` at the end of every session, so the pull request link is the only thing Sanchay needs.
Every section below is rewritten, not appended, so it always describes the current state.

## Status

| | |
| --- | --- |
| Live URL | https://jewelo-staging-gqumd.ondigitalocean.app/en/design/new |
| Deployed commit | `594d378` (DigitalOcean deployment `77c680bb`) |
| Branch head | `codex/overnight-launch-2026-09-08` |
| Provider mode | mock. Every shopper ends at "your preview is being prepared" with a contact form. Honest, not the product yet. |
| Phase | 0 of 7 closed. `P0-1` done. Next task: `P0-2` in `docs/TASKS.md`. |
| Sessions | 1 (7 September 2026) |

## What a shopper gets today

Types a name in English or Arabic, picks a look, sees a catalogue sample that changes with every relevant click, confirms the spelling, and is told the shop will send the photograph.
The request lands in the operator queue at `/en/operator` with the exact specification.
Nothing broken ever renders and no photo of a different design is shown as theirs.

## What a shopper will get when this is done

Four photographs of their own pendant, studio first within about two minutes, the others filling in, correctly spelled, one connected piece of gold, in the chosen look and metal.
Then a request the shop can act on from a phone.

## Done this session

- Everything the overnight agents built is on GitHub; five branches that existed only on `home-mini` are pushed.
- `pnpm lint` was red at handoff; fixed. Staging redeployed to a green-gate commit.
- The six style anchor images were found outside git and mirrored; phase 4 is now a publication job.
- Mission, mindset, task list, goal prompt and a 62-line `CLAUDE.md` written; tests and CI suspended on Sanchay's instruction; Playwright and agent-browser removed.
- Delegation model set: the Fable lead verifies and assigns, Opus 5 medium-effort subagents (`implementer`, `platform`, `image-lab`, `viewer`, `reviewer`, `adversarial-reviewer`, `plan-reviewer`) do the grind. Agent definitions rewritten (P0-1); proof: an `image-lab` dispatch returned `MODEL: claude-opus-5`, Runway authenticated, `gpt-image-2` available, 305,042 credits.
- Live audit: the backend pipeline completes end to end in mock; the layout defect at short desktop heights was measured (preview panel 295 px under the action bar at 1280x720 at rest).

## Evidence

- Dogfood screenshots and DOM measurements: `docs/goals/road-to-gold/dogfood-<date>/` (none yet for this session beyond the measurements in `PROGRESS.md`).
- Gap analyses and lab results: `docs/goals/overnight-launch/IMAGE-LAB.md`, `docs/goals/overnight-launch/reviews/`.
- Session log: `docs/goals/road-to-gold/PROGRESS.md`.

## Decisions taken by default

The agent takes the default written against each `DS-*` row in `docs/TASKS.md` and records it here with the task that used it.

- none yet

## Needs Sanchay

Only items an agent cannot do. Everything else is being worked around.

1. **Supabase billing, deadline 29 September 2026.** The Devonel org is at 52.5 GB of 5 GB egress; after the grace period every project returns 402 and the app stops. Upgrade the org to Pro or move `jewelo-caleums`.
2. **Repository is public.** Make `Sanchay-T/jewelo` private.
3. **Accounts, when their task arrives:** Sentry and PostHog projects (P7-5), a notification channel for new requests (P7-3), Inngest Cloud sign-in (P7-6), the production DigitalOcean app and Caleums domain (L-1).

## Open findings

Ranked, with owner. Closed findings are removed, not struck through.

- none logged yet; see `docs/TASKS.md` for the full defect list

## Rollback

`bash scripts/digitalocean/rollback.sh` returns staging to the previous deployment; `PROVIDER_MODE` stays mock until phase 5.
Database migrations are additive; none this session.

## Spend

- Runway credits: 305,042 at session start; 0 used this session.
- OpenAI: USD 0.
