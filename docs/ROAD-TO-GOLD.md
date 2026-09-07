# Road to gold

**Written:** 7 September 2026
**Status:** active mission document. The goal prompt in `docs/GOAL-PROMPT.md` points here.
**Supersedes:** the real-mode decision recorded at 11:55 in `docs/goals/overnight-launch/PROGRESS.md`.

This file is the storyline.
It says what the product must become, what is actually broken today, the order the work has to happen in, and the gate that ends each phase.
An agent starting cold reads this file plus the locked contracts in `CLAUDE.md` and needs nothing else to know what to do.

## The promise

A shopper types their name, picks a look, and sees four photographs of that exact pendant: studio, on skin, close up, dark.

Not a sample.
Not a lookalike.
Their name, correctly spelled, in one connected piece of gold.

Everything below is in service of that one sentence.

## The invariant that makes it a product

The model renders the name.
The model never decides the name.

```text
deterministic stencil  ->  prompt + style anchor  ->  generated still  ->  verifier  ->  shopper
   (code, exact)            (lab, Runway)             (gpt-image-2)      (must be real)
```

The stencil is the truth.
The prompt dresses it.
The verifier refuses anything that drifted.
If any link in that chain is fake, the shopper can be handed a pendant that is not theirs, and nothing in the system will catch it.

## The lab and the socket

This is the decision that reshapes the remaining work.

**Runway MCP is the lab.**
It serves `gpt-image-2`, the same model the production adapter calls, and the credits are effectively unlimited for this work.
Because the model is the same, a prompt proven on Runway is the prompt OpenAI will run.
`docs/goals/overnight-launch/IMAGE-LAB.md` already records this: the production identity renderer is invoked unmodified by the lab, so lab results transfer to the pipeline.

**OpenAI is the socket.**
`OpenAIStillAdapter` stays the production still provider.
It is wired, kept fail closed, and flipped on once at the end as a confirming smoke test.
It is never the iteration loop.

Consequence: cost is no longer a reason to stop short of real generation.
Only correctness is.
The overnight run stopped for cost and safety together; only the safety half survives.

This does not reopen the stack.
`CLAUDE.md` and `.claude/skills/goal/SKILL.md` forbid substituting Runway for a locked provider role.
Runway is not taking a provider role here.
It is a bench for prompt work whose output is a text prompt and a set of reference images, both provider neutral.
Recorded as D-018 in `docs/DECISION-REGISTER.md`.

## What is broken today, worst first

Each item is evidence, not opinion.
Cited from the overnight lab and from live probes on 7 September.

### 1. The identity stencil is wrong, and lies about being right

`apps/jobs/src/identity-anchor.ts`, English path:

- It does not render in Playfair Display.
  Output is the fontconfig fallback sans, despite `fc-match` resolving the pinned file correctly.
- The two jump rings are hard-coded 16 px circles at fixed coordinates, independent of the name.
  On "Asma" one lands inside the counter of the letter A.
  They are attached to nothing.
- The letters are never fused.
  Measured components: Asma 4, Noor 4, Layla 5, Muhammad 7.
  That is exactly the disconnected gold the product forbids.

The engine returns `exactCharactersPreserved: true`, `jumpRingCount: 2`, `passed: true` regardless.
Those three fields are literals in the return object, not measurements.

Arabic Kufi is a silent no-op: `solveArabicIdentity` reports the Kufi font file and correct checksum, but the rendered PNG is byte identical to the Naskh render for every name tested.

Evidence: `docs/goals/overnight-launch/IMAGE-LAB.md` section "Production pipeline gaps found".

### 2. The verifier is a mock

`apps/jobs/src/presentation.ts:1139` uses `MockStudioVerifier` on both the mock and the real branch.
Only the OpenAI name reader is real.
Nothing checks geometry: not component count, not ring count, not frame containment, not stone placement.

Plug the API in today and a wrong pendant reaches a shopper with nothing in the pipeline to stop it.

### 3. No look has passed a holdout name

Best result is framed minimal at 3/3 English, 2/3 Arabic, on names that were used during tuning.
Stage 2 holdout names were never generated.
73 lab images, 45 passed, 62% overall.

A shop only ever sees unseen names.
Until a look passes on names it was not tuned against, nothing is proven.

### 4. Style anchors were never published, but the images exist

All six `style_anchor_releases` rows are in state `missing`.
Real mode therefore fails closed with `style_anchor_missing:<sourceTaskId>`, which is correct behaviour and also means flipping the switch today produces no image at all.

The six anchor PNGs and their manifest do exist, outside every git repository: `~/.codex/state/jewelo/caleums-style-anchors/v1/` on `home-mini`, mirrored on 7 September to `~/hq/projects/devonel/caleums-private/style-anchors-v1/` on the laptop, 21 MB, checksums verified against the manifest.
Their source task ids match `docs/CALEUMS-FINAL-E2E-CONTRACT.md` exactly.
Phase 4 is therefore a publication job, not a generation job.

They are classified `private-brand-reference` and must never be committed: **the GitHub repository `Sanchay-T/jewelo` is public.**
Their durable home is private Supabase Storage as immutable `style_anchor_releases`, which is what phase 4 does.

### 5. The interface over-promises

`preflightRefusal` in `apps/web/src/features/atelier/personalizedRun.ts:344-360` skips the run for two-name Arabic, any construction other than Classical, and any English lettering other than Classic.
That is 3 of 4 constructions and 5 of 6 letterings.
The design stage presents all of them as equal choices.
The shopper discovers the refusal only after ticking the confirm box.

### 6. The primary button does not do what it says

"Preview my piece" (`apps/web/src/features/atelier/Atelier.tsx:1997`) calls `generate()`, which makes no backend call.
It validates locally, switches to the review stage, and shows catalogue stills.
The real run starts when the spelling checkbox is ticked.

### 7. Layout: the preview panel sits under the action bar

`.previewSticky` is capped at `min(940px, calc(100dvh - 124px))` (`apps/web/src/features/atelier/atelier.module.css:1473`), which does not account for the 86 px fixed `.actionBar`.
At 1440x900 the panel spans 339 to 1115 in a 900 px viewport at rest: 215 px below the fold, the bottom 86 px permanently behind the bar.
At 1024x768 the panel needs 676 px (280 px photo floor plus a 396 px dock) against a 558 px budget, so subtracting the bar height alone is not sufficient there.

## Phases, in order, with the gate that ends each

No phase starts before the one above it is closed.
Phases 1 to 4 spend nothing.

| # | Phase | Tool | Gate that ends it |
| --- | --- | --- | --- |
| 1 | Fix the identity engine | code only | Latin renders in real Playfair and fuses to exactly one 4-connected component for all test names; Kufi output differs from Naskh; rings are attached, name-aware and opt-out; every reported field is measured, no literals; the geometry report is produced by code that did not render the image |
| 2 | Build the real verifier | code, replayed on lab images | deterministic gates (component count, ring count and connection, frame containment, zero-coverage, stone-in-counter, exact NFC characters) plus the name reader; replayed against the 73 existing lab images it reproduces the human verdicts with no false passes |
| 3 | Prove the prompts | **Runway MCP, unlimited** | one look reaches 3/3 on both scripts, then **10 of 12 on holdout names never used during tuning**; generation and scoring done by different agents |
| 4 | Publish the anchors | code | four immutable `style_anchor_releases` with checksum, source task id and publication history; real mode stops failing closed |
| 5 | Plug in OpenAI | 1 to 2 paid calls | one real run per script produces an image that passes the phase 2 verifier and matches the Runway result; spend cap set in `runtime_policy` before the first call |
| 6 | Make the interface honest | code | the shopper can only choose what phase 3 proved, or is told plainly before confirming; the primary button does what its label says; the preview panel clears the action bar at every gated viewport |
| 7 | Close the shop loop | code | request queue and operator view usable by the shop; quote path defined; Shopify stays parked |

## The loop that produces gold

Phases are not finished when the code compiles.
Each phase closes only after this loop runs clean:

```text
implement
  -> it builds and deploys (pnpm build is the only mechanical check)
  -> the lead agent dogfoods the real journey in its own in-app browser
     at every gated viewport, screenshot and DOM measurement per step
  -> /code-review on the diff
  -> fresh adversarial-reviewer with no prior context
  -> fix every finding
  -> repeat from the top
until two consecutive passes produce no new finding above "minor"
  -> /handover: rewrite HANDOVER.md, mirror it into pull request #12, push, print the link
```

Rules for the loop:

- **No tests and no CI/CD until Sanchay says otherwise** (7 September 2026).
  Do not write unit tests, do not run the Vitest suites as a gate, do not add GitHub Actions, pre-commit hooks, or any pipeline between a commit and the deploy.
  The existing Vitest files stay in the repository untouched and unrun.
  The path is: edit, `pnpm build` passes, push the branch, `scripts/digitalocean/deploy.sh staging <branch>`, look at it.
  Nothing else sits between dev and prod.
- The dogfood pass is done by the lead agent itself, in its in-app browser, against the running URL: local for iteration, staging before handoff.
  It is not delegated and it is not scripted.
  There is no Playwright, no agent-browser CLI and no other browser automation in this repository; they were removed on 7 September 2026 on Sanchay's instruction.
- Every step gets a screenshot saved under `docs/goals/road-to-gold/dogfood-<date>/`, and every geometry claim gets a DOM measurement (`getBoundingClientRect`) written into the report, not eyeballed.
- A reviewer never fixes what it finds, and a fixer never reviews its own work.
- A finding is closed by evidence, not by an assertion that it was addressed.
- Anything left open is written into the handoff with an owner, never silently dropped.

Gated viewports for every UI pass: 1440x900, 1280x720, 1024x768, 768x1024, 390x844, 390x600, 320x568, plus RTL and reduced motion.
The sticky preview panel is tightest at the two short desktop heights; measure `previewSticky` bottom against `actionBar` top at scroll 0 and after scrolling, and record both numbers.

## What "ready for Omran" means

All seven phases closed, and:

1. A shopper on the live URL types a name that has never been generated before, in either script, and receives at least the studio photograph of their own pendant within a few minutes, with the other views filling in.
2. Nothing broken ever renders: no disconnected gold, no invented rings, no wrong spelling, no duplicate pendant, no chain that misses the rings.
3. Nothing dishonest ever renders: no borrowed photo of a different design, no fake progress, no dead end.
4. Every look the shopper can choose either works or says plainly that the shop will prepare it.
5. The request reaches the shop with the exact specification and the assets that were shown.
6. Two consecutive clean passes of the loop above, with evidence committed.

## Open product decisions

These are not engineering calls and must be answered before the phases that depend on them.

1. **The unphotographable majority.**
   If phase 3 proves only framed minimal plus Classic, does the shop sell only that, or do the other looks stay on the page labelled as prepared by the shop?
   Blocks phase 6.
2. **Wait or send.**
   Once generation is reliable, does the shopper hold the page for the couple of minutes, or does the send-it-to-you path stay the default?
   Blocks phase 6 and the copy.

## Hard external blocker

The Supabase Devonel organization is in a free-plan egress grace period at 52.5 GB against a 5 GB allowance, 1,049%, ending **29 September 2026**.
After that date every project in the organization returns 402 and the application stops.
Either upgrade to Pro or move `jewelo-caleums` to another organization.
This is Sanchay's action and no phase above can compensate for it.

## Where things are

| Thing | Where |
| --- | --- |
| The task list, ordered | `docs/TASKS.md` |
| The persona and the unstick procedure | `docs/MINDSET.md` |
| The paste-in prompt | `docs/GOAL-PROMPT.md` |
| Session-by-session progress | `docs/goals/road-to-gold/PROGRESS.md` |
| Dogfood evidence | `docs/goals/road-to-gold/dogfood-<date>/` |
| Customer UI | `apps/web/src/features/atelier/` |
| Identity engine | `apps/jobs/src/identity-anchor.ts`, `packages/identity/` |
| Pipeline execution | `apps/jobs/src/presentation.ts` |
| Still adapter | `packages/ai/src/studio.ts` |
| Lab results and defect evidence | `docs/goals/overnight-launch/IMAGE-LAB.md` |
| Overnight history | `docs/goals/overnight-launch/PROGRESS.md` |
| Adversarial findings | `docs/goals/overnight-launch/reviews/adversarial-review-1.md` |
| Live QA evidence | `docs/goals/overnight-launch/live-qa/` |
| Frozen contracts | `CLAUDE.md` and the documents it imports |
| Staging | `https://jewelo-staging-gqumd.ondigitalocean.app`, DO app `ec09c9fd-84e4-45c5-b60a-fd62277af322` |
| Supabase | project `jggalwuvpcqoenhirmnl`, ap-south-1 |
| Branch | `codex/overnight-launch-2026-09-08` |
