# CALEUMS handover

This file is the handover.
Its content is mirrored into the description of https://github.com/Sanchay-T/jewelo/pull/12 by `/handover` at the end of every session, so the pull request link is the only thing Sanchay needs.
Every section below is rewritten, not appended, so it always describes the current state.

## The whole story, in plain paragraphs

CALEUMS is a pendant studio for Omran's jewelry shop in the UAE, brokered by Umayr.
A shopper at the counter types their name in English or Arabic, picks a look and a metal, and is meant to see four photographs of that exact pendant: studio, on skin, close up, dark.
The name has to be spelled exactly, as one connected piece of gold, and then the request has to reach the shop so someone can make it and call the customer.
Everything in this repository serves that one sentence, and the seven-phase plan in `docs/ROAD-TO-GOLD.md` is the route from where the overnight agents left it to a shop tablet that can be trusted.

The core idea is that the image model never decides the name.
A deterministic engine turns the typed name into a black-and-white stencil of the pendant, with the letters bridged into one piece and two ring holes for the chain.
That stencil is the truth; the prompt only dresses it in gold and light, and a verifier refuses any photograph that drifted from it.
Phase 1 replaced the old Pango-based engine, which rendered differently on every machine, with a HarfBuzz engine that opens the pinned font bytes directly and gives byte-identical output everywhere.
That engine is done and deployed, and it measures its own output: every stencil is decoded back and checked for one component, exactly two ring holes, no ink punched by a ring, correct characters.
What is still moving is how the rings attach.
Six adversarial review passes have each found a way the rings could be wrong: inside a letter, on a dot, not level, both in one corner, welded onto a long post that reads as an extra letter.
Fix pass 7 answers the last of those (rings on the shoulder of the outer letter, post length capped and gated) and is half written on its own branch.
Until two consecutive adversarial passes find nothing above minor, task P1-5 stays open and a few names still refuse honestly rather than ship a wrong pendant.

Phase 2 is the verifier and the vision readers, and phase 3 is the prompt lab: the prompts were proven on Runway against the lab stencils, are versioned in the database, and now carry the construction (classical, framed minimal, diamond rails) so the model draws the frame the stencil drew.
Phase 4 published the six style anchor images that give every photograph the same house look; they live outside git because the repository is public.
Phase 5 is the first paid run: everything is wired to OpenAI and fail-closed, the spend caps are proven to block, and the worker now refuses to spend a cent in real mode until the daily ceiling is set to the launch values.
It is waiting only on Sanchay saying yes to the spend.
Phase 6 is the shopper's page: honest sample labelling so nobody mistakes a catalogue photo for their piece, Arabic typography and right-to-left layout, the tablet forgetting the previous shopper, a landing redirect, and Umayr's feedback on the button wording.
Phase 7 is the shop side: an operator queue with contacted, fulfilled, cancelled and note, notification of every new request by e-mail once an address is set, nightly database backups on `home-mini`, error tracking behind empty keys, and the in-process job runner accepted with an eight-to-ten minute recovery of any lost run.

Right now staging runs in mock mode: the whole pipeline completes, the fake photographs are refused by the page, and the shopper is told the shop will send the real one.
Two review rounds tonight (a security review and a storyline review, then a review of those fixes) closed twenty findings and found one live blocker: a permissions tightening had silently broken the request capture for every shopper on staging for about two hours.
That is fixed at the database, but the anonymous request/replay proof still remains open.
This session also closed a Mac mini-only development failure: requests through `127.0.0.1:3011` and the Tailscale address were server-rendered but did not hydrate because Next rejected their dev HMR origins; the port-3011 service now has explicit origins and its own Turbopack cache/lock.
After that the order is: deploy the four pushed commits, finish fix pass 7 and run adversarial pass 7, close the remaining review minors, drive the seven-viewport ladder with screenshots, and then, on Sanchay's yes, the first real photograph.

## Status

| | |
| --- | --- |
| Live URL | https://jewelo-staging-gqumd.ondigitalocean.app/en/design/new |
| Deployed commit | `f63b3e3` (DigitalOcean deployment `e04b835e`, ACTIVE 8 Sep 23:16 UTC). Later product commits remain pushed and not yet deployed; `8852445` is local development plumbing only. |
| Branch head | `codex/overnight-launch-2026-09-08` at `8852445`; `JEWELO_DEV_DIST_DIR=.next-build-verify corepack pnpm build` passed 13 of 13 |
| Side branch | `codex/fix-pass-7-wip` (`93c22af`): P1-5 fix pass 7, half written, unproven, do not deploy |
| Provider mode | mock. Runs complete with fake stills the UI refuses to show; the shopper is told the shop will send the photograph. |
| Phase | 0 closed; 40 of 56 task rows done, 36 of 56 storyline steps proved (65%). Next task ids: `P1-5` (fix pass 7 then adversarial pass 7), then `P2-3`. |
| Sessions | 4 (7, 8, 9 and 10 September 2026) |

## What a shopper gets today

Seen in the lead's own browser on staging in the prior dogfood session.
`/` and `/en` land on the design page.
The shopper types a name in English or Arabic, picks a look, sees a catalogue sample marked as the shop's sample and not their piece, gets a one-line note when two Arabic names are typed, confirms the spelling, and is told the shop will send the photograph.
The request lands in the operator queue at `/en/operator` with the exact specification, a phone or WhatsApp link, and the commands contacted, fulfilled, cancelled and note.
Arabic renders in IBM Plex Sans Arabic, right to left, with the page title in Arabic.
The capture step was broken on staging between the column-grant migration (8 Sep, security fix 3) and `d358b81` (9 Sep 00:05 UTC): every request answered 403.
It is fixed at the database, which staging shares, and the proof of a request landing again on staging is the first item under open findings.

## What a shopper will get when this is done

Four photographs of their own pendant, studio first within about two minutes, the others filling in, correctly spelled, one connected piece of gold, in the chosen look and metal.
Then a request the shop can act on from a phone.

## Done this session

Session 3 (8 to 9 September). Session 2's rows and shas are in `docs/TASKS.md` and `PROGRESS.md`.

- P3-3 six Kufi rings-off stencils; P6-1, P6-3, P6-4 rows closed (`dfebd7a`).
- Bar routing removed: `identity_no_ring_seat` is the honest pre-spend block, `IDENTITY_BAR_FALLBACK_REVIEW` gone (`5b3f065`).
- P6-2 samples say whose they are and `data-not-photographed` is derived from the refusal (`69c88ad`).
- P6-6 unknown task and run statuses map to stopped, never silently ready (`6a1992b`).
- P6-5 Arabic typography and dictionary (`c653c88`).
- P7-1 operator queue commands and the stopped-pieces list (`56608df`).
- P6-7 tablet record scoped by locale, cleared on hand-over (`f98155b`).
- P7-2 operator experience, quote path fail-closed (`37fe327`).
- P7-3 request notification behind a port, log transport by default, SMTP without a dependency (`b805a26`).
- P4-1 style anchors publish script, idempotent (`79c56b6`); P4-2 signed anchor URLs (`eb316c9`).
- P7-7 nightly `pg_dump` on `home-mini` with a masked restore drill (`2b7e849`).
- P5-1 caps proved at 800 / 2 / 2 then restored to 30 / 6000 / 100 (`1fd4b99`); DS-6 `studio_only` switch (`1cf7313`).
- P7-6 Inngest self-hosted proof and runbook (`2a1a7c5`).
- P7-5 Sentry and PostHog behind `packages/observability`, empty keys by default (`7b58635`).
- Landing redirect to `/<locale>/design/new`, unknown locale 404 (`d3dbd25`).
- P3-7 prompt registry v4.3 with the construction slot, `@v2` published (`9e52bcc`).
- P2-2b framed-minimal and diamond-rails carriers in the stencil, D-021 (`f0bb7cd`).
- Security review 2 fixed, 13 findings (`ec45a3e`); storyline review 1 fixed (`7789d31`); fix review 3 BL-1 fixed (`d358b81`); storyline fix 2 (`200bcfe`).
- Three staging deployments proved by hand: `b1ea4b6d`, `7db85045`, `f19f6b0c`; `e04b835e` is live now.
- Session 4 local hydration fix (`8852445`): development HMR origins explicitly allow `localhost`, `127.0.0.1` and `100.102.144.100`; port 3011 uses `.next-3011` so it cannot share the Turbopack lock with the unrelated port-3001 process. Local health was 200 on loopback and Tailscale, React fibers were present after restart, the 390x844 `02 Style` accordion changed from collapsed/hidden to expanded/visible, and the isolated build passed 13/13. This was not deployed because it only affects the local development service.

## Evidence

- `docs/goals/road-to-gold/dogfood-2026-09-08/staging-journey.md`: every staging deployment this session with the probes run against it.
- Session 4 local development proof is recorded in `docs/goals/road-to-gold/PROGRESS.md` and commit `8852445`; the LaunchAgent change is outside the repository at `/Users/sanchay/Library/LaunchAgents/com.jewelo.dev-web.plist`.
- `docs/goals/road-to-gold/reviews/`: `identity-engine-adversarial-4` to `-6`, `security-review-2`, `storyline-review-1`, `fix-review-3`, `fix-2-review-1`, `fix-3-review-1`, `security-tooling-fix-review-1`, `ux-review-1`.
- `docs/goals/overnight-launch/IMAGE-LAB.md`: the v4.3 prompts and the construction slot.
- Session log: `docs/goals/road-to-gold/PROGRESS.md`.
- The viewport ladder (1440x900 to 320x568, RTL, reduced motion) with screenshots is not recorded for this session: the Browser pane became unreachable from the session in its last hour. The local hydration proof used the pane's default desktop size plus a 390x844 viewport check; no staging ladder was run.

## Decisions taken by default

- DS-3 B: HarfBuzz engine, D-019 (P1-2).
- DS-4: the sellable set is configuration, `NEXT_PUBLIC_SELLABLE_*`, defaults equal today's behaviour, D-022 (storyline fix 1); to be filled from P3-5 before P5-2.
- DS-6: studio-only smoke, `runtime_policy.studio_only` (`1cf7313`).
- DS-8: e-mail via a dependency-free SMTP sender, log transport until `NOTIFICATION_TO` is set (P7-3).
- DS-9: SDKs wired behind empty keys (P7-5).
- DS-10: in-process loss accepted; sweeper 480 s plus a 2-minute cron recovers a lost run to `operator_review` in 8 to 10 minutes (P7-6).
- D-020: rings welded at the shoulder of the outer letter, honest refusal when no seat meets the gates; D-021: the stencil carries the construction.
- Lead call: staging caps stay at 30 / 6000 / 100 while the provider is mock; the cap UPDATE is P5-2's first step and the worker now refuses a real-mode dispatch until it is done (`spend_ceiling_not_set`).
- Rule: publish prompt releases only from a deployed build (staging was down 22:25 to 22:56 UTC on 8 Sep when `@v2` was published before `c9265aa` was live).
- The 13 old test requests stay unannounced.

## Needs Sanchay

1. **Supabase billing, deadline 29 September 2026.** After the grace period every project returns 402 and the app stops. Upgrade the Devonel org to Pro or move `jewelo-caleums`.
2. **Paid OpenAI spend for P5-2.** Say yes to the first real run; the order is written in the runbook (caps UPDATE, `studio_only = true`, flip, smoke, `studio_only = false`) and the worker refuses to spend until the caps are set.
3. **Notification address.** Set `NOTIFICATION_TO` and an SMTP sending account on the staging app, and `INNGEST_CRON_ENABLED=1`; without them no request is announced and the two-minute sweeper never runs (fix review 3 MJ-2).
4. **Sentry and PostHog projects** and a DigitalOcean alert e-mail (P7-5, P7-4).
5. **Repository is public.** Make `Sanchay-T/jewelo` private.
6. **Laptop disk.** It hit 100% this session; the 13 GB turbo cache was deleted and 9.8 GiB is free. `.tmp/rnd-stills` (2 GB, 4 Sep) is yours to keep or drop.
7. **`home-mini` tmux `hq-claude2:2.1`** is parked on an out-of-credits prompt.
8. DigitalOcean token expires 25 November 2026.
9. Product calls waiting: the long-post look on Latin names, whether refused names go to the shop for a hand review, an off-machine copy of the backup.

## Open findings

Ranked, with owner.

1. **BL-1 staging proof** (lead, then `platform`): post a request on staging with an anonymous session and show 200, replay shows the same row. The grant is applied; the end-to-end proof was interrupted.
2. **P1-5 fix pass 7** (`implementer`, branch `codex/fix-pass-7-wip`): run the letters and names matrices, open `sara-en-classic`, `hasan`, `A`, `yazan`, `kawthar-ar-minimal`, `K`, `aisha`, `li-ar-minimal`, then adversarial pass 7. Two consecutive clean passes close P1-5.
3. **Fix review 3 MJ-1** (`implementer`): `preview_request.note` writes no audit row; extend the trigger to `operator_note` changes.
4. **Fix review 3 minors 1 to 7** (`implementer`): scope-mismatch clears everything and tells the shopper; unknown order id answers 404 with a from-status gate; login POST same-origin; DOM breadcrumbs dropped; `NOTIFICATION_SWEEP_FLOOR`; chunked-body bound noted.
5. **Deploy `5753ae7` to staging** (`platform`) and re-run the journey; then the viewport ladder with screenshots into `dogfood-2026-09-09/` (lead only).
6. P3-6 dependent reference rule wording; P3-5 paid Runway grid after the stencils settle; P2-3 to P2-7; P5-2, P5-3; P7-4, P7-8; L-1 to L-4.

## Rollback

- App: on `home-mini`, `bash scripts/digitalocean/rollback.sh staging f19f6b0c-...` (the previous ACTIVE deployment id from `doctl apps list-deployments ec09c9fd-84e4-45c5-b60a-fd62277af322`); `PROVIDER_MODE` stays mock.
- Database: every migration this session is additive (`20260909000000` notified_at, `010000` studio_only, `020000` prompt construction variable, `021000` column grants, `022000` request_key grant). To undo the grants: `grant select on table public.preview_requests to authenticated;`.
- Prompts: `@v1` releases remain; republishing them requires the pre-P3-7 worker, so do not roll the app back past `c9265aa` while `@v2` is active.

## Spend

- Runway credits: 305,042 at session 2 start; 0 used since.
- OpenAI: USD 0; `PROVIDER_MODE=mock` everywhere; real-mode ceiling 800 cents a day and 3 attempts enforced by the worker.
- DigitalOcean: unchanged app spec, one staging app.
