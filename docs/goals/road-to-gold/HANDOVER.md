# CALEUMS handover

This file is the handover. Its content is mirrored into the description of
https://github.com/Sanchay-T/jewelo/pull/21 (draft, base `main`); that pull request is the deliverable.
Pull request #12 was merged into `main` on 11 September; everything below is new since then.

## The whole story, in plain paragraphs

CALEUMS is a pendant studio for Omran's jewelry shop in the UAE.
A shopper types an English or Arabic name, chooses a look and metal, and should receive four photographs of that exact pendant: studio, on skin, close up, and dark.
The deterministic stencil owns the name and geometry; the image model only dresses it, and verification refuses drift.

On the 22 September call Omran asked for calmer, less stylized pieces that match his own reference photographs, sharp folded edges on origami, a boxy capitals look, and a list of site changes.
This session answered all of it.
The styles were re-proven on the Runway MCP with `gpt-image-2.5-sunburst`, the same model production calls: one short style-first prompt, where styles differ only by swapped parameters, plus a text-free crop of Omran's photo sent as a texture-only reference.
The boxy look comes from the stencil, not the words: origami, framed and diamond-rails now draw Cairo capitals (weight 800, rails 500) and the identity engine was reworked so ring posts and rail welds never read as letters.
Production compiles the exact lab prompt byte for byte (20/20), so what passed on Runway is what production sends.
The site changes are live on staging and I drove them myself.

No OpenAI API call was made; all image proof ran on Runway credits.
Staging runs the real provider but every dispatch is refused before spend by the runtime spend cap, so no customer photograph is produced there yet.

## Status

| | |
| --- | --- |
| Live URL | https://jewelo-staging-gqumd.ondigitalocean.app/en/design/new |
| Active deployed commit | `dff61022cefc2fba205e6214f20cf0ce9a5cdf16` (`dff6102`), DigitalOcean deployment `d4d3f1b8-5144-4e6e-8a7b-f983f0061846` (ACTIVE); smoke health and readiness passed |
| Branch head | `codex/overnight-launch-2026-09-08`, the `Handover:` commit after `dff6102` (docs only) |
| Provider mode | Staging `real` (forced by `NODE_ENV=production`); spend blocked pre-dispatch by `runtime_policy` (`global_max_reserved_spend_cents` 1900 above the 800 real-mode ceiling). Local stays mock. |
| Build | `corepack pnpm build` exit 0, 13/13, on the handed-over tree |
| Prompt proof | `lab-diff.mts`: 20/20 production-compiled studio prompts byte-identical to the Runway lab prompts |
| Reviews | Seven fresh-context review rounds; rounds 6 and 7 found nothing above minor, and their minors are fixed |
| Database | Migrations `20260922000000` and `20260922010000` applied; private `look-references` bucket holds 4 checksum-verified crops |
| Sessions | 8 (this one: 22 to 23 September 2026) |

## What a shopper gets today

Seen in my own agent-browser session on staging (`dff6102`), screenshots in `docs/goals/road-to-gold/dogfood-2026-09-23/`:

- Sections read Size, Name, Style, Gold and stones; no italic text anywhere (0 italic elements measured).
- No chain picker; every piece is cable 45 cm.
- Up to three stones; a fourth is disabled, with the note "Choose up to 3 stones." / "اختر حتى ٣ أحجار.".
- The review step photo is larger than on the design step: 857 vs 704 px wide at 1440, 643 vs 459 at 1024, 478 vs 341 at 768; on phones the photo comes first at full width.
- Add to bag asks for contact first (email is the default channel); from the design step it moves to review, focuses the contact box and says "Where should we send it?".
- Final pass: contact for design A, edit to design B, add from the design step, double click: two database rows (one per design), one bag item, carrying B's reference; A shows as "Your earlier request".
- Saved designs list newest first.
- No horizontal scroll at 1440x900, 1280x720, 1024x768, 768x1024, 390x844, 390x600, 320x568; Arabic RTL and reduced motion pass.
- The photographs shown are labelled shop samples; the personalized run is refused before spend on staging, and the panel asks where to send the piece.

## Done this session

- Omran's site feedback: upright type, size first, one chain, up to three stones, newest first, email-first capture, larger results (`b1268fc`).
- Add from design step and duplicate saves (`6c0189d`).
- Identity engine v5: per-construction lettering (boxy capitals), ring post cap 0.45 of height and 120 px, rail welds only on real stems; D-023 (`a1a7d87`).
- Minimal style-first still prompt v2, look references, quality and size as config, two migrations (`834505d`).
- Runway lab record, origami variants, v5 proof sheets (`04fdf18` and later).
- Private client folder ignored; reviewer agents no longer create worktrees (`f6e777b`).
- Stencil-cased name in every template, stale-snapshot refusal, uppercase length guard, cost floor, stone placement (`bbf7e7a`).
- Staging record and generated types (`469ba4b`); staging-found double-click fix (`353b99d`).
- Every chosen stone kept, contact headline, deployable cost floor, compiler v3 (`b1ae140`, `2c1f59b`).
- Capture tied to its design, reservation floor on the booked `studio_reservation_cents` (`706e274`, `a6cf1b6`).
- Contact panel edges (`f5edcd1`, `d29e0fc`); close-out notes (`dff6102`).
- Look references published (4/4, re-hashed from signed URLs) and `LOOK_REFERENCES` set on staging; runbook section added.

## Evidence

- Lab: `docs/goals/road-to-gold/lab-2026-09-22/` - `ledger.md`, `final/*.txt` (the 20 proven prompts), `sheets/` including `v5-engine-proof.png` (10/10 on the new stencils, sunburst) and `origami-boxy-variants.png` (variants A, B, C).
- Browser: `docs/goals/road-to-gold/dogfood-2026-09-22/` and `dogfood-2026-09-23/` (viewport sweep, RTL, final save flow).
- Engine sweeps (scratchpad, not in git): framed-minimal and diamond-rails 576/576 clean with no refusals, classical 547/576, letters 411/624; refusals are the refuse-rather-than-rod trade.
- Reviews: findings and fixes are in the commit messages listed above.

## Decisions taken by default

- Origami boxy variant A (Cairo 800) is the default; variant B (950, heavier) is Omran's call. C (one crease per stroke) was indistinguishable from A.
- Classical keeps its own lettering (Playfair), not capitals; classical and framed share the framed look crop, as proven in the lab.
- Ring posts capped at 120 px: five of 48 lab names (mostly ليلى) now go to operator review instead of hanging on a rod.
- A name whose capitals would change its letter count (Weiß) is drawn as typed.
- Framed with three stones fills four corners, so the first stone repeats at bottom left.
- Cable 45 cm is the house chain.
- Earlier defaults still stand: DS-3/D-019 HarfBuzz engine, D-022 full contract look set, DS-6 studio-only smoke, DS-8 SMTP/log notification, DS-9 observability, DS-10 sweeper.

## Needs Sanchay

1. Rotate `DIGITALOCEAN_ACCESS_TOKEN` in home-mini's `.env`: it returns 401, so `deploy.sh` fails for anyone without doctl's own login (tonight's deploys used that).
2. Resolve Supabase billing before 29 September 2026 (upgrade Devonel or move the project), or the app gets 402 responses.
3. SMTP account and `NOTIFICATION_TO` so saved-design emails reach the shop; until then captures are stored but nobody is emailed.
4. Remove the skin-tone titles in the Shopify theme; they are not in this repository.
5. Show Omran `lab-2026-09-22/sheets/origami-boxy-variants.png` and ask A or B; confirm cable as the chain; confirm the Studio photo first is what he meant by "hover shows the piece first".
6. Approve the first paid real run when ready: it needs the spend cap in `runtime_policy` set on purpose; nothing here raises it.
7. Free laptop disk space (about 5 GB free of 460 GB); a tool call already failed with no space left.

## Open findings

1. Major, pre-existing: a bag row can show a substitute sample photograph (another construction or script) under "YOUR DESIGN" with no substitution label (`Atelier.tsx` bag row, from `7b76e5a`). Owner: implementer.
2. Minor: origami shop sample photos still show the old stylized mixed-case look. Owner: image-lab, then implementer.
3. Minor: classical ring tab on "Asma" and "Sara" still reads like an accent; fixing it means seating the ring outside the name (wider piece). Owner: lab decision.
4. Minor: stones prose safe only up to `GEMSTONE_MAX=3`; classical "a middle letter" for two-letter names; `visualFields` stale (chain, gems); `look_rule` not in the variable snapshot. Owner: implementer.
5. Minor: the reservation floor only applies at quality max, xhigh or auto; at the default `high` the spend cap is the only guard. Owner: platform, when quality is raised.
6. Observed once: a `/api/preview-requests` POST returned 504 on staging with nothing in the logs; the retry succeeded without a duplicate row. Owner: platform, watch.
7. Carried over: P1-5 identity proof sign-off, fix-review-3 MJ-1 and minors, Vitest literals (frozen by repo rule), P2-3 to P2-7, P3-5, P3-6, P5-2, P5-3, P7-4, P7-8, L-1 to L-4.

## Rollback

- App, from home-mini: `bash scripts/digitalocean/rollback.sh staging 5e0b190b-a25d-4985-8b25-500b317a7c04` (`f5edcd1`); the pre-session target is `c7193dc3-f0f5-4402-bf9b-0f75ac34b708` (`b734e57`). Check `doctl apps list-deployments ec09c9fd-84e4-45c5-b60a-fd62277af322` first.
- Database: both new migrations are additive (a private bucket and two `create or replace function` bodies); no rollback is needed to run older code.
- Look references: remove `LOOK_REFERENCES` from the env file and redeploy; the bucket objects can stay.

## Spend

- OpenAI API: USD 0; no API image call was made.
- Runway: 342 credits in the metered batches (162 for the origami variants, 180 for the v5 proof); the earlier 49-generation lab and single proofs were not metered separately. Balance 209,845.
- DigitalOcean: six staging deployments of the one app; no new resources.
- Supabase: two migrations and four storage objects in the existing project.
