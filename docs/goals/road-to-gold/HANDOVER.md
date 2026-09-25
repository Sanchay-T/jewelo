# CALEUMS handover

This file is the handover. Its content is mirrored into the description of
https://github.com/Sanchay-T/jewelo/pull/21 (draft, base `main`); that pull request is the deliverable.

## The whole story, in plain paragraphs

CALEUMS is a pendant studio for Omran's jewelry shop in the UAE.
A shopper types an English or Arabic name, chooses a look, metal and stones, and gets a photograph of that pendant.

On 25 September Sanchay cut the image pipeline down to what worked in the lab: no stencil, no reference images, no name or piece reader, no rechecking, no rule text, no Python helpers.
The shopper's approved choices become one sentence written the way you would brief a jeweller, and that sentence goes straight to `gpt-image-2.5-sunburst`.
For Arabic the sentence adds how a jeweller's nameplate is made (dots bridged to their letters, non-joining letters linked on the baseline), which made every lab piece one connected casting.
About 23,500 lines left the repository with it.

In the Runway lab the jeweller wording spelt 9 of 12 Arabic names right on the four styles the shop sells.
On live staging it spelt the English name right and both Arabic names wrong.
With no reader, nothing stops a misspelt Arabic piece reaching the shopper; that is the trade this simplification makes.

## Status

| | |
| --- | --- |
| Live URL | https://jewelo-staging-gqumd.ondigitalocean.app/en/design/new |
| Active deployed commit | `d1b3cbc7`, DigitalOcean deployment `7e00b6f6-695e-4084-bcea-e9cb7014b516` (ACTIVE); health and readiness passed |
| Branch head | `codex/overnight-launch-2026-09-08`, the `Handover:` commit after `81d82bde` (docs only) |
| Provider mode | Staging `real`, `gpt-image-2.5-sunburst-2026-09-08` at max quality, OpenAI images generations, no input images; `runtime_policy.studio_only` true (one photograph per run), caps unchanged |
| Build | `corepack pnpm build` exit 0, 12/12 tasks |
| Reviews | Two fresh `reviewer` passes (SIMPLE-1, SIMPLE-1b); every blocker and major fixed in `7f355ef0` and `d1b3cbc7` |
| Next task | Sanchay's call on Arabic spelling (Needs Sanchay 1) |

## What a shopper gets today

Seen in my own agent-browser session on staging at `d1b3cbc7`, evidence in `docs/goals/road-to-gold/dogfood-2026-09-25/`:

- Design, review, spelling confirmation, then "Your photograph is being made. About two minutes."; the studio photograph arrived in 80 to 90 seconds each time.
- On skin, close-up and dark say "We will photograph it in the shop and send it".
- Omar, English, diamond rails, white gold, accent, at 390x844: spelt right, white gold, rails with bezel diamonds, one piece.
- زينب, Arabic, framed minimal, rose gold, accent, at 1440x900: rose gold, frame and diamonds right; spelling wrong (final ب drawn as ن, medial ن has no dot).
- قاسم, Arabic, classical, yellow gold, no stones, at 1440x900: the bail drops into an extra tall stroke, reads close to قالسم.

## Done this session

- SIMPLE-1 (`c7670158`): one prompt in `packages/ai/src/prompt.ts`; OpenAI adapter moved from edits to generations; deleted the identity package, readers, prompt registry and snapshots, style anchors, look references, operator prompt library, identity diagnostics, transliteration, lab scripts and pipeline Python; migration `20260925000000` completes a task without verification fields.
- SIMPLE-1b (`7f355ef0`): the prompt carries metal, lettering, stones, chain, width and both names; an unmapped construction ends before spend; migration `20260925010000` makes `studio_only` default true.
- SIMPLE-1c (`d1b3cbc7`): every "gold" names the chosen colour; Stacked says one name above the other.
- Lab record (`c7670158`): `docs/goals/road-to-gold/lab-2026-09-25-text-only/ledger.md`.
- Live evidence and progress (`822502fe`, `81d82bde`).

## Evidence

- Lab: `docs/goals/road-to-gold/lab-2026-09-25-text-only/ledger.md` (three text-only rounds, 18 images each, and the jeweller wording round).
- Browser: `docs/goals/road-to-gold/dogfood-2026-09-25/` (design, review, run, result; three live photographs).

## Decisions taken by default

- The app keeps its four styles (classical, origami ribbon, framed minimal, diamond rails); faceted origami and diamond constellation stay lab-only.
- Only the studio photograph is made; the other three views say the shop will photograph them.
- Framed and rails carry stones only when the shopper picks stones.
- `scripts/webp.py` and `scripts/atelier/build-geometry.py` stay: evidence tooling and UI geometry, not the image pipeline.
- Video code left in place, still off.

## Needs Sanchay

1. Arabic spelling: live 0/2, lab 9/12, and no reader. Keep it as is, or allow one step back (the one-line mark list in the lab ledger fixed most dot errors).
2. Supabase billing before 29 September 2026 (upgrade Devonel or move the project).
3. The redesigned landing page with the hero films lives in the separate `caleums` app (`caleums-xp8xk.ondigitalocean.app`, repo `Sanchay-T/caleums`, last deployed 15 Sep); this repository's staging URL redirects `/` to the design studio. Decide whether the landing links into this studio or the two merge.
4. Spend cap is 2000 cents and 16 runs a day; say when to go back to 800 and 4.
5. Resend (or SMTP) and `NOTIFICATION_TO` so captured requests email the shop.

## Open findings

1. Not run: the seven-viewport sweep and two adversarial passes the repo asks for on prompt changes; only 1440x900 and 390x844 were driven. Owner: lead, next session.
2. Minor: an unknown chain, stone or connector id drops its phrase silently; only construction refuses. Unreachable today because the contracts schema validates at approval. Owner: implementer.
3. Minor: `unknown_construction` on a resumed attempt with a checkpoint falls to the generic failure path. Unreachable today for the same reason. Owner: implementer.
4. Major, pre-existing: a bag row can show a substitute sample photograph under "YOUR DESIGN" with no label (`Atelier.tsx` bag row). Owner: implementer.
5. Observed once earlier: a `/api/preview-requests` POST returned 504 on staging; the retry succeeded. Owner: platform, watch.

## Rollback

- App: `bash scripts/digitalocean/rollback.sh staging 2f576e65-38fe-47c6-aa57-8a64782615fa` (the deployment before SIMPLE-1). Check `doctl apps list-deployments ec09c9fd-84e4-45c5-b60a-fd62277af322` first.
- Database: both new migrations only loosen `complete_presentation_task` and set `studio_only`; older code runs against them. To make four photographs again, set `studio_only = false` on `runtime_policy`.

## Spend

- OpenAI API: three studio photographs on staging (one attempt each), inside `runtime_policy`.
- Runway: 288 credits for the jeweller wording round (16 per image, 18 images), balance 196,605; earlier text-only rounds this session not metered separately.
- DigitalOcean: three staging deployments of the one app; no new resources.
- Supabase: two migrations in the existing project.
