# Context index — where the truth lives

Start here when you have no context. Last updated 3 September 2026.

## Read in this order

| # | Document | What it settles |
| --- | --- | --- |
| 1 | `CLAUDE.md` | Agent contract, locked stack, non-negotiable engineering rules |
| 2 | `docs/planning/ITERATION-BRIEF-2026-09-03.md` | **Living brief.** What we are doing wrong, what Omran asked for, now/next/later |
| 3 | `docs/goals/09-declutter-entry-and-feedback.md` | The goal being worked right now (G-13 in the brief) |
| 4 | `docs/FROZEN-UX.md`, `docs/PRODUCT-CONTRACT.md` | Frozen customer outcome and UX gates |
| 5 | `docs/FINAL-STACK.md`, `docs/ARCHITECTURE.md` | Locked vendors and boundaries |
| 6 | `docs/DECISION-REGISTER.md` | Decisions promoted out of the brief and code-locked |

The brief is authoritative for *plans*; the decision register is authoritative
for *locked* decisions; goal files are authoritative for *scope and stopping
conditions*. When they disagree, the goal file wins for the goal in flight.

## Stale documents — do not follow blindly

- `CLAUDE.md` rule 3 (PRs to `rebuild/v2-first-principles`) and the PR template:
  the owner moved to committing on **`main`** on 3 Sep 2026.
- `CLAUDE.md` rules 13–15 and the Motion binding decision: **void**, image-only
  since 3 Sep 2026.
- `docs/DIGITALOCEAN-DEPLOYMENT.md`: describes CI/deploy machinery that does not
  exist on `main`.
- `docs/FINAL-STACK.md` says Supabase Mumbai; the project is actually in
  `ap-northeast-2` (Seoul).

## Goal files on disk

`docs/goals/` — 00 production foundation, 01 product studio, 02 supabase domain,
03 durable generation, 04 identity prompt QA, 05 real still generation,
07 commerce operator, 08 hardening launch, **09 declutter entry and feedback**.

Brief §5 uses G-numbers (G-09…G-16) which do **not** line up with the filenames.
Goal 09 on disk is G-13 in the brief.

## Evidence folders

| Path | Contents |
| --- | --- |
| `docs/evidence/2026-09-03-gpt-image-2-proof/` | Paid proof run, $0.2183, `gpt-image-2-2026-04-21`, name-check read "Layla" exactly |
| `docs/evidence/2026-09-03-browser-walkthrough/` | Screenshots that produced brief defects 19–26 (local == live, commit `2f13776`) |
| `docs/evidence/2026-09-03-declutter-entry/` | Goal 09 desktop/mobile/RTL verification |
| `docs/evidence/journey-2026-08-27/`, `docs/evidence/mobile-2026-08-27/` | Earlier journey and mobile passes |

## Partner intake — outside this public repo, on purpose

`~/hq/projects/personal/devonel.com/jewelo-intake/whatsapp-jewelry-ai/`

| Path | Contents |
| --- | --- |
| `chat.json` | "Jewelry AI" group, 31 messages, 12 Apr → 2 Sep |
| `media/` | 12 reference images from Omran (6 cream concept cards, 6 dark Caleums spec sheets) |
| `transcripts/ALL.txt` | 6 Scribe transcripts of the 30 Aug voice notes, plus per-note JSON |
| `omran-dm.json`, `pull-and-transcribe.sh` | DM thread and the refresh script |

**Never copy partner media into this repo.** Licence on the 12 concept cards is
still an open question with Omran. The brief §3.1/§3.2 carries the transcribed
substance so agents can plan without the files.

WhatsApp access: `wacli`, authenticated as `919136820958@s.whatsapp.net`, chat
`120363424060454271@g.us`.

## Commits and releases worth knowing

| Ref | What |
| --- | --- |
| `046818b` | Remove video/motion generation — image-only pipeline |
| `2bace7b` | Fix six stale tests that outlived their contracts (115/115) |
| `697a8cd` | Docs: record the image-only decision |
| `7d9dd70` | Image-only schema types + the 3 Sep iteration brief |
| `7ca5272` | Fold Omran's reference images and voice-note transcripts into the brief |
| Trigger prod `20260903.1` | 3 tasks: `presentation-task-v1`, `outbox-recovery-v1`, `stale-media-recovery-v1` |
| Migration `20260903000000_image_only_remove_video.sql` | Applied to remote Supabase |

## Live environment

- DigitalOcean app `jewelo-staging`, id `ec09c9fd-84e4-45c5-b60a-fd62277af322`, region `blr`.
- Known-good rollback deployment `9c4eb261-c3f0-4636-bad9-8265c8298b19`.
- Deploys are **manual** — there is no `deploy_on_push` and no CI gate on `main` (G-10).

## Standing human actions

Tracked in brief §7: extra meeting notes, concept-card licence, fal billing
reconciliation, ElevenLabs key rotation (shared in chat), Supabase region
decision, provider keys on the web tier, and confirming the layout set
(3 vs frame/vertical/horizontal/square).
