# Larger preview - local and staging follow-up proof, 9 September 2026

**P6-11 internal preview pilot is open:** at 16:10:58.513 UTC on 9 September, four additional full-view runs were available for 3-4 teammates, one each by instruction with manual gold-design review. Real staging serves `48f81a4595d1669bc77cf95cbe83b49359a522ce`; deployment, smoke, registered concurrency 2 and policy readback passed. No agent consumed a team slot. Final pilot proof and limits are below.

Task P6-10's earlier preview/form and live-display proof was completed on `ba06a6605c8882ddb84af5af0a8f569dc44d7883`: the lead watched a real Arabic four-view result arrive without reload, inspected every view and checked enlarged inspection, then checked the completed page at all seven viewport sizes. Its 10/10 quota snapshot was the pre-pilot state; P6-11's later opening supersedes it.

The earlier local and mock-staging captures served `57189c5aa53a1ba7f525d1b48898a704629d7ebb`; the first English real image served `b5f9758`. They remain identified separately from the final `ba06a66` real-page evidence.

At 390x844 the main photograph is 436.8 px tall. Once the full panel scrolls away, an 81 px reminder stays at the top; its inspection button opens a 390x844 dialog. The name-first action focuses `pendant-name`, placing the input at y=305.9 px while the reminder is hidden. At the bottom of the desktop form, the corrected panel is y=16 px and h=583.3 px. RTL 390x844 and short mobile sizes 320x568/390x600 have separate captures below. Three additional initial captures at 1280x720, 1024x768 and 768x1024 were viewed on the built production server after the 13/13 build at `57189c5`; panel heights are 424, 472 and 728 px respectively. Mobile deliberately uses a scrolling full photograph: its whole dock need not fit above the fold on short screens.

`en-1440x900-bottom` is diagnostic **before the correction**: its panel begins at y=-166.7 px. `desktop-1440-bottom-fixed` is the replacement acceptance capture. Keep the earlier file only as reproduction evidence, never as a passing final check. The initial desktop capture predates that focused correction; the final bottom capture verifies the repaired boundary.

## Evidence index

Each row links the lead's original screenshot and measurement. JSON values are browser geometry and visible demonstration-page text; they contain no provider credentials or private reference URLs.

| State | Screenshot | DOM measurement |
| --- | --- | --- |
| Desktop bottom - corrected | [Screenshot](desktop-1440-bottom-fixed.png) | [Measurement](desktop-1440-bottom-fixed.json) |
| Desktop bottom - before fix, diagnostic only | [Screenshot](en-1440x900-bottom.png) | [Measurement](en-1440x900-bottom.json) |
| Desktop initial | [Screenshot](en-1440x900-initial.png) | [Measurement](en-1440x900-initial.json) |
| Mobile compact reminder and form | [Screenshot](en-390x844-compact-form.png) | [Measurement](en-390x844-compact-form.json) |
| Mobile enlarged inspection | [Screenshot](en-390x844-enlarged.png) | [Measurement](en-390x844-enlarged.json) |
| Mobile large initial photograph | [Screenshot](en-390x844-large-initial.png) | [Measurement](en-390x844-large-initial.json) |
| Mobile name action and focused input | [Screenshot](en-390x844-start-name-focus.png) | [Measurement](en-390x844-start-name-focus.json) |
| 320x568 compact reminder | [Screenshot](mobile-320x568-compact.png) | [Measurement](mobile-320x568-compact.json) |
| 320x568 initial photograph | [Screenshot](mobile-320x568-top.png) | [Measurement](mobile-320x568-top.json) |
| 390x600 initial photograph | [Screenshot](mobile-390x600-top.png) | [Measurement](mobile-390x600-top.json) |
| RTL compact reminder | [Screenshot](rtl-390x844-compact.png) | [Measurement](rtl-390x844-compact.json) |
| RTL initial photograph | [Screenshot](rtl-390x844-top.png) | [Measurement](rtl-390x844-top.json) |
| Built production server 1280x720 - initial | [Screenshot](built-1280x720.png) | [Measurement](built-1280x720.json) |
| Built production server 1024x768 - initial | [Screenshot](built-1024x768.png) | [Measurement](built-1024x768.json) |
| Built production server 768x1024 - initial | [Screenshot](built-768x1024.png) | [Measurement](built-768x1024.json) |
| Built review 390x600 - reduced motion | [Screenshot](built-review-390x600-reduced-motion.png) | [Measurement](built-review-390x600-reduced-motion.json) |
| Built review 390x600 - compact reminder and controls | [Screenshot](built-review-390x600-controls.png) | [Measurement](built-review-390x600-controls.json) |
| Built review 390x600 - complete enlarged photograph | [Screenshot](built-review-390x600-enlarged.png) | [Measurement](built-review-390x600-enlarged.json) |

The lead also personally checked the built review step at 390x600: reduced-motion playback stopped, the compact reminder measured 81 px while review controls remained accessible, and enlarged inspection showed the complete photograph in a 390x600 modal. These are local browser observations; the reduced-motion behavior was observed by the lead, while the linked DOM files record geometry and visible text.

## Staging checkpoint - served source 57189c5

Mock deployment `0e64cfea-2da0-4905-8bde-b1c462ec86b7` reached ACTIVE at source `57189c5aa53a1ba7f525d1b48898a704629d7ebb`. Deployment and smoke exited 0; health and protected readiness passed. Evidence: `/tmp/jewelo-staging-plan/mock-deployment-57189c5.json`. The remote dirty checkout was preserved; deployment used a clean separate worktree.

The lead personally inspected staging at all seven viewport sizes: 1440x900, 1280x720, 1024x768, 768x1024, 390x844, 390x600 and 320x568. Both Design and Review were personally checked at all seven sizes. Additional captures cover desktop bottom, mobile focus/compact/enlarged inspection, Arabic name entry and RTL short-screen review/confirmation with reduced motion. The spelling confirmation remained unchecked; these checks initiated no paid runs. This is the observed coverage, not every possible form state at every size. The deployed desktop bottom panel is y=16 px, h=583.3 px; 390x844 photograph h=436.8 px; 320x568 compact reminder h=81 px, with a complete 320x568 inspection dialog. Name focus hides the compact row.

| Staging state | Screenshot | DOM measurement |
| --- | --- | --- |
| 1024x768 | [Screenshot](staging-1024x768.png) | [Measurement](staging-1024x768.json) |
| 1280x720 | [Screenshot](staging-1280x720.png) | [Measurement](staging-1280x720.json) |
| 1440x900 bottom | [Screenshot](staging-1440x900-bottom.png) | [Measurement](staging-1440x900-bottom.json) |
| 1440x900 top | [Screenshot](staging-1440x900-top.png) | [Measurement](staging-1440x900-top.json) |
| 320x568 compact | [Screenshot](staging-320x568-compact.png) | [Measurement](staging-320x568-compact.json) |
| 320x568 enlarged | [Screenshot](staging-320x568-enlarged.png) | [Measurement](staging-320x568-enlarged.json) |
| 320x568 name focus | [Screenshot](staging-320x568-name-focus.png) | [Measurement](staging-320x568-name-focus.json) |
| 320x568 top | [Screenshot](staging-320x568-top.png) | [Measurement](staging-320x568-top.json) |
| 390x600 top | [Screenshot](staging-390x600-top.png) | [Measurement](staging-390x600-top.json) |
| 390x844 top | [Screenshot](staging-390x844-top.png) | [Measurement](staging-390x844-top.json) |
| 768x1024 | [Screenshot](staging-768x1024.png) | [Measurement](staging-768x1024.json) |
| review 1440x900 | [Screenshot](staging-review-1440x900.png) | [Measurement](staging-review-1440x900.json) |
| rtl 390x600 confirmation | [Screenshot](staging-rtl-390x600-confirmation.png) | [Measurement](staging-rtl-390x600-confirmation.json) |
| rtl 390x600 review reduced motion | [Screenshot](staging-rtl-390x600-review-reduced-motion.png) | [Measurement](staging-rtl-390x600-review-reduced-motion.json) |
| rtl 390x844 | [Screenshot](staging-rtl-390x844.png) | [Measurement](staging-rtl-390x844.json) |
| rtl name entry | [Screenshot](staging-rtl-name-entry.png) | [Measurement](staging-rtl-name-entry.json) |
| Review 1024x768 | [Screenshot](staging-review-1024x768.png) | [Measurement](staging-review-1024x768.json) |
| Review 1280x720 | [Screenshot](staging-review-1280x720.png) | [Measurement](staging-review-1280x720.json) |
| Review 320x568 | [Screenshot](staging-review-320x568.png) | [Measurement](staging-review-320x568.json) |
| Review 390x600 | [Screenshot](staging-review-390x600.png) | [Measurement](staging-review-390x600.json) |
| Review 390x844 | [Screenshot](staging-review-390x844.png) | [Measurement](staging-review-390x844.json) |
| Review 768x1024 | [Screenshot](staging-review-768x1024.png) | [Measurement](staging-review-768x1024.json) |

The daily policy was tightened with one compare-and-set update and read back: global/per-principal ledger caps 800 cents, provider attempt budget 1, studio_only true, global generation limit 10 and per-principal limit 2. Usage was not reset or edited: 8 runs, 100 cents actual and 100 cents reserved remained unchanged. Evidence: `/tmp/jewelo-staging-plan/runtime-policy-executed.json`. These are ledger values, not an exact provider invoice guarantee.

After the canonical compiler deployment was ACTIVE, four compatible v3 prompt releases were created, published and read back: image.packshot `f2ba654a-3454-4ec0-86ec-a4281a411145`, image.worn `ee9a0920-7bf5-4958-a912-053b1c46b200`, image.macro_gift `b702d84c-cd8e-4b89-b58a-34a289408379`, image.dark_editorial `f9b83ec1-5f67-4bed-8b89-09059904c5a2`. Frozen hashes match the canonical templates; old immutable releases remain. Evidence: `/tmp/jewelo-staging-plan/canonical-publication-executed.json`.

Newer pushed source `b5f9758d60feaf7db75a1f66ac57bcc5b2641cf1` caps the paid name reader's response at a validated 2,048 output tokens. Its full build passed 13/13, exit 0, and two independent source reviews were clean. Real-mode deployment `927ac5b1-564a-47f8-bf01-0b6849160d40` reached ACTIVE at 12:04:16 UTC. Deployment exited 0; health and protected readiness passed. The initial staging layout captures above still served the earlier mock source; the real API captures below served `b5f9758`. Private deployment evidence: `/tmp/jewelo-staging-plan/real-deployment-b5f9758.json`.

**Verification boundary:** existing real-mode dependencies deliberately use `MockStudioVerifier` plus a paid `OpenAINameReader`. Independent visual review by agents checks photograph geometry; the running application's paid gate reads the name. It is not a complete automatic geometry/attachment verifier. The token cap does not add provider-cost reconciliation. No four-photo production readiness is claimed.

## First real API photograph - English studio

The lead submitted the synthetic lab name Asma through the deployed English form. One studio task reached ready on its first OpenAI attempt. The application name-reading gate passed, and an independent reviewer who did not generate this API image passed all six visual criteria: correct name, recognizable stencil geometry, connected metal, two fused eyelets, both chain ends threaded through the holes, and plausible polished-gold studio photography. This is one successful English still, not Arabic or four-view acceptance.

| Exact parity evidence | SHA-256 |
| --- | --- |
| Deployed compiled prompt - same as qualified English C | `04ee836ea3df77b420d26728ff6b4741e0044ce9cf93d85ee2eae17725d9011c` |
| Deployed identity PNG - same as actual production stencil used in qualification | `7d73154755d55dacf611266bc8865d10f1ca93a4f2bef637272698d05d7040b4` |
| OpenAI returned PNG - same checkpoint and persisted asset | `e41cec49bf2749248190de8ca5c890605b2f008190831275971448ad51bb4328` |

The asset identifies exact model `gpt-image-2-2026-04-21`, canonical studio release v3 `f2ba654a-3454-4ec0-86ec-a4281a411145`, and attempt 1. The ledger booked 20 cents for this image using the adapter's estimate; that is not the provider invoice and excludes name-reader usage. At 12:08:31 UTC the preserved daily totals were 9 runs, 100 cents reserved and 120 cents actual in the ledger. The other three English tasks were cancelled at attempt 0 by the studio-only policy, with no provider calls. Private readback: `/tmp/jewelo-staging-plan/en-live-observation.json`; original API PNG and independent verdict remain private under `/tmp/jewelo-api-proof/`.

**P6-10 readiness race - reproduced, corrected and runtime-verified:** the real browser first showed the final shop-follow-up contact state even though the studio photograph completed. Source inspection found readiness was committed before the asset insertion; parallel state reads could also combine a ready task with an older asset list. Reloading the same page displayed the existing photograph without making another paid call. The premature fallback capture is failure evidence, not a passing pending state.

Pushed correction `ba06a6605c8882ddb84af5af0a8f569dc44d7883` adds migration `20260909030000_complete_presentation_atomically.sql` and changes only jobs presentation completion and the state route. A service-role-only transaction validates the current attempt, cancellation fence, ownership, checkpoint and identity lineage, then publishes the immutable asset, settles the attempt once, marks ready, releases dependents and records the ready audit together. Reconciliation keeps its existing booking-date calculations and gains matching task/run lock order. The state route reads assets after tasks, closing the mixed-snapshot window without weakening the UI's real-provider rule. No identity-engine files or acceptance gates changed.

Full build passed **13 successful, 13 total**, exit 0, on `ba06a66`; two fresh independent source reviews were clean above minor. Migration `20260909030000` was applied and read back (38 applied migrations), and real deployment `12e1be30-154e-4845-b02a-2cac87c27b54` is ACTIVE at `ba06a6605c8882ddb84af5af0a8f569dc44d7883`; deploy and health/protected-readiness smoke passed. The following Arabic run demonstrated the studio and all three dependent photographs arriving without a page reload. The existing `MockStudioVerifier` limitation described above remains open; this transaction change does not add a geometry verifier.

| Real API browser state | Screenshot | DOM measurement |
| --- | --- | --- |
| Desktop while the studio photograph was being made | [Screenshot](api-en-studio-pending.png) | [Measurement](api-en-studio-pending.json) |
| Mobile premature final fallback - race reproduction | [Screenshot](api-en-mobile-premature-fallback.png) | [Measurement](api-en-mobile-premature-fallback.json) |
| Mobile existing studio photograph after same-page reload | [Screenshot](api-en-studio-ready-after-reload.png) | [Measurement](api-en-studio-ready-after-reload.json) |
| Mobile enlarged API photograph | [Screenshot](api-en-studio-enlarged.png) | [Measurement](api-en-studio-enlarged.json) |
| Unrequested on-skin view remains honest | [Screenshot](api-en-unrequested-view-honest.png) | [Measurement](api-en-unrequested-view-honest.json) |

These public browser captures contain only the approved synthetic Asma demonstration and visible app UI. The raw API photograph, private reference images and signed asset URLs are not committed. On mobile the ready photograph measured 350 by 436.8 px, and enlarged inspection occupied the complete 390 by 844 px dialog. Selecting the unrequested English on-skin view retained its shop-follow-up placeholder instead of presenting the studio photograph as that view. The completed Arabic four-view proof follows.

## Completed Arabic four-view API proof

On deployed `ba06a66`, the lead submitted the approved fictional fixture أسماء through the Arabic form. All four real OpenAI photographs appeared in the existing page without reload. The lead selected Studio, On skin, Close-up and Dark, opened enlarged inspection, and inspected the originals. An independent reviewer who did not generate these images passed all four against six visual criteria and recognized the same pendant across views. Each task had exactly one paid attempt and one final asset; no manual retry or agent worker restart was used.

| View | Ready at UTC, 9 September 2026 | Returned PNG SHA-256 |
| --- | --- | --- |
| Studio | 12:47:21.838542 | `290b764a2bbbfa3a20e60055cf5f1faf368105a31945f8005f082fda78777f4d` |
| On skin | 12:54:32.926108 | `7580bb9a14986d69415287d80c536a4d0a40f695f341901a34acbcb518658b8e` |
| Close-up | 12:54:43.672497 | `ac65beef5444909c98efe166a66b347b354d7a0c1d79c5214810e43dd3b5f5e7` |
| Dark | 12:54:33.720171 | `08675c2d8f78d2e4455c91e029e165c3cc6aaaea6d9f57839b8033c0bd98d504` |

Every asset used `gpt-image-2-2026-04-21` and the same production identity artifact, whose PNG hash is `aeca9c818776974f5dbae0679753ba92bba9c37cb2c79eaf79121ac76e464e56`. The Arabic studio prompt hash exactly matches qualified C: `faa714b789764e17b81d54b401def343f2405346daac2902650a5743b57883c6`. Each dependent asset references the completed Studio asset as its input. All four name-reader transcripts exactly equalled the approved text. Asset, ready audit and terminal settlement timestamps match within each atomic completion.

Private evidence: `/tmp/jewelo-staging-plan/real-deployment-ba06a66.json`, `jewelo-ba06-migration-readback.json`, `ar-live-observation.json`, `ar-all-verification-metadata.json`, `ar-child-executor-followup.json`; independent visual summary `/tmp/jewelo-api-proof/ar-four-view-summary.json`. Raw photographs, credentials, private references and signed URLs remain outside this public repository. Approved browser screenshots below show only the fictional fixture and app UI.

The final real completed page was personally checked at 1440x900, 1280x720, 1024x768, 768x1024, 390x844, 390x600 and 320x568 on `ba06a66`. The 390x844 proof includes the four-ready state, selection of each photograph and enlarged Dark inspection. Earlier staging Design/Review, RTL and reduced-motion captures remain above; this final ladder concerns the completed real result.

| Final real Arabic state | Screenshot | DOM measurement |
| --- | --- | --- |
| close up ready | [Screenshot](api-ar-close-up-ready.png) | [Measurement](api-ar-close-up-ready.json) |
| complete 1024x768 | [Screenshot](api-ar-complete-1024x768.png) | [Measurement](api-ar-complete-1024x768.json) |
| complete 1280x720 | [Screenshot](api-ar-complete-1280x720.png) | [Measurement](api-ar-complete-1280x720.json) |
| complete 1440x900 | [Screenshot](api-ar-complete-1440x900.png) | [Measurement](api-ar-complete-1440x900.json) |
| complete 320x568 | [Screenshot](api-ar-complete-320x568.png) | [Measurement](api-ar-complete-320x568.json) |
| complete 390x600 | [Screenshot](api-ar-complete-390x600.png) | [Measurement](api-ar-complete-390x600.json) |
| complete 768x1024 | [Screenshot](api-ar-complete-768x1024.png) | [Measurement](api-ar-complete-768x1024.json) |
| dark enlarged | [Screenshot](api-ar-dark-enlarged.png) | [Measurement](api-ar-dark-enlarged.json) |
| dark ready | [Screenshot](api-ar-dark-ready.png) | [Measurement](api-ar-dark-ready.json) |
| four ready without reload | [Screenshot](api-ar-four-ready-without-reload.png) | [Measurement](api-ar-four-ready-without-reload.json) |
| full pending | [Screenshot](api-ar-full-pending.png) | [Measurement](api-ar-full-pending.json) |
| on skin ready | [Screenshot](api-ar-on-skin-ready.png) | [Measurement](api-ar-on-skin-ready.json) |
| studio ready without reload | [Screenshot](api-ar-studio-ready-without-reload.png) | [Measurement](api-ar-studio-ready-without-reload.json) |

Final readback at **13:05:59 UTC** (`/tmp/jewelo-staging-plan/final-live-state.json`) confirmed ACTIVE `ba06a66`, no pending deployment, zero active tasks, exactly five successful new OpenAI attempts and five assets, all attempt 1, and no duplicates. Daily usage remained 10 runs, 100 cents reserved and 200 cents recorded actual. The new-request quota restriction below is inferred from this read-only policy/usage readback; no extra request was submitted to provoke a rejection.

## Pre-pilot limits and follow-ups - 13:05:59 UTC snapshot

**At this pre-pilot snapshot, new requests were blocked by the validation quota:** the global daily allowance was 10 and all 10 runs were used on 9 September UTC. No quota increase or usage reset had yet been made. The later P6-11 section supersedes this allowance; usage was preserved. Existing completed photographs remain available in their owning sessions. `studio_only` was switched to false before the Arabic run; both 800-cent ledger caps, one-attempt budget and per-principal limit 2 remain.

The two validation runs produced five new images, one attempt each. They booked 100 cents total at the adapter's 20-cent-per-image estimate. Current daily ledger totals are 10 runs, 100 cents reserved and 200 cents recorded actual, including 100 cents from earlier work. These are estimates recorded by the application, not a provider invoice; paid name-reader usage is not reconciled into those amounts.

The requested preview/form, shared-prompt transfer and bounded live photo validation scope is complete. This does not establish readiness for unrestricted customer use:

- Real dependencies still use `MockStudioVerifier` plus paid name reading. Independent agent visual acceptance is recorded here; a complete automatic geometry/attachment gate remains a pre-existing follow-up.
- Inngest reported “Unable to reach SDK URL” during the long dependent-view preparation, yet the original handlers completed with one paid attempt per child. No current active task remained in the observation. The cause is not established; stencil preparation and executor connection lifetime need profiling. No out-of-memory diagnosis is claimed.
- Shop contact delivery and checkout were not exercised in this work.
- Before P6-11 the Arabic Reset label was slightly clipped. The fix is now deployed and checked at the four pilot viewports below.
- The API model is the verified 2026-04-21 Image 2 snapshot. The built-in image tool's version is unexposed; Image 2.5 is not verified.

## Build, review and remaining proof

The lead reports full `corepack pnpm build`: **13 successful, 13 total**, exit 0, through `ba06a66`; two final independent reviews of the atomic completion correction were clean above minor. The mock staging layout captures served `57189c5`; the first English real-photo captures served `b5f9758`. The Arabic four-view captures verify `ba06a66` at runtime. No tests ran or changed. The follow-up adds the dictionary key `Start with your name` / `ابدأ باسمك`.

The earlier seven-item UI acceptance, full dictionary changes and broader local layout matrix remain in [Umayr UI proof](../umayr-ui/README.md). Those earlier captures do not substitute for the newer staging observations above. Mock staging UI coverage, canonical publication, real deployment/smoke, the English API studio photograph and the Arabic four-view API result are complete. The atomic readiness correction and Arabic four-view API flow are now runtime-verified; the operational limits and untouched flows are listed above. The current prompt qualification is recorded in [Image lab](../../../overnight-launch/IMAGE-LAB.md#9-september-follow-up---shared-still-compiler-and-studio-candidate-c).

The separate uncommitted identity-engine and stencil-renderer script work in the original checkout remains excluded. PROGRESS.md and HANDOVER.md are unchanged under the original brief's explicit boundary.

## P6-11 - internal preview pilot open

Deployed source `48f81a4595d1669bc77cf95cbe83b49359a522ce` contains two targeted changes: `1af429f` gives the Arabic Reset label its natural width, and `48f81a4` lets dependent views reuse the verified immutable Studio stencil rather than rerendering it. Both fresh independent reviews were clean above minor. The clean `48f81a4` build passed **13 successful, 13 total**, exit 0 (11 cached, 1m33.618s; `/tmp/jewelo-four-person-pilot-build.log`). Real deployment `6a6a39e8-b7af-4036-a23f-b58d22519368` is ACTIVE at that exact source, with no pending deployment; deployment and health/protected-readiness smoke exited 0.

The lead personally checked the Reset fix locally at RTL 320x568 and 390x844: the full label measured 90.078 by 44 px, stayed inside the toolbar, and zoom/reset/close worked. The other zoom controls retain their 44 px minimum targets.

| Local pilot check | Screenshot | DOM measurement |
| --- | --- | --- |
| RTL 320x568 Reset | [Screenshot](pilot-local-rtl-reset-320x568.png) | [Measurement](pilot-local-rtl-reset-320x568.json) |
| RTL 390x844 Reset | [Screenshot](pilot-local-rtl-reset-390x844.png) | [Measurement](pilot-local-rtl-reset-390x844.json) |

Read-only reuse proof downloaded the actual existing Arabic Studio identity PNG and ran the new helper against clean identity dependencies in 1,818.28 ms. PNG hash matched stored `aeca9c818776974f5dbae0679753ba92bba9c37cb2c79eaf79121ac76e464e56`; fingerprint and validation metadata passed. This check performed zero database writes and zero provider calls. It did not execute the child identity-binding write or a full child dispatch and is not a measured end-to-end speedup. Evidence: `/tmp/jewelo-staging-plan/p6-11-reuse-read-proof.json`.

The verified pilot policy opens **four additional runs**, not four total today: global daily limit 10→14 and per-principal daily limit 2→3. A principal that already used two runs can therefore use one more; the one-run-per-person rule is a manual team instruction, not an enforced allocation per person. Keep full four-view mode, one provider attempt, 100-cent reservation per image and the 800-cent per-principal spend cap. The global image ledger cap is now 1,900 cents: 300 cents already recorded/reserved plus 1,600 cents for four new four-image runs. An additional 100-cent reader allowance makes the selected total allowance US$20. This is not a provider-enforced invoice cap; the adapter still records its fixed image estimate and does not reconcile reader usage.

The deployed overlay uses the intended validated settings: `PROVIDER_MODE=real`, `REAL_MODE_MAX_RESERVED_SPEND_CENTS=1900`, `OPENAI_STILL_CONCURRENCY_LIMIT=2`. The concurrency limit applies to actively executing presentation steps, including identity preparation and the provider call inside the same step; it does not limit all queued/sleeping function runs or guarantee latency. Models remain unchanged.

**Opening sequence completed:** code was deployed while the old 10/10 quota prevented new runs. The first Inngest readback still registered concurrency 4 despite the new environment; an internal `PUT http://web:8080/api/inngest` returned HTTP 200 with `modified: true`, and the live presentation function then registered limit 2. This updated registration only and sent no job event. Future deployments that change function configuration must include this internal SDK resync and verify registration; automating that is a deployment follow-up, not a script change in this task.

Only after ACTIVE/smoke/live-limit verification, one compare-and-set policy update opened the pilot. Readback at **16:10:58.513 UTC** confirmed global runs 14, used 10, **four slots available**, principal limit 3, global image cap 1,900 cents, principal cap 800 cents, reservation 100 cents per image, provider attempts 1 and full four-view mode. Usage remained 100 cents reserved and 200 cents recorded actual; active tasks 0. Usage writes 0, agent provider calls 0, team slots consumed by agents 0, new migrations 0 (38 remain applied). The four-slot calculation applies to 9 September UTC and must be reassessed across a UTC date change.

Final readbacks: `/tmp/jewelo-staging-plan/pilot-live-readback.json`, `jewelo-pilot-deployment-readback-48.json` and `jewelo-pilot-concurrency-readback-48.json`. The earlier prepared arithmetic remains in `pilot-budget-plan.json`.

The lead reloaded the saved Arabic four-photo result on the live pilot deployment, confirmed all four remained ready, and checked zoom/reset/close. Valid new RTL/reduced-motion captures cover **320x568, 390x600, 390x844 and 768x1024 only**. At each, Reset measured 90.078 by 44 px, its full label was visible, and there was no overflow. The attempted new desktop capture was malformed and excluded; the earlier seven-size evidence belongs to the prior deployment and is not claimed as a new full pilot matrix.

| Live pilot check | Screenshot | DOM measurement |
| --- | --- | --- |
| RTL 320x568 Reset | [Screenshot](pilot-live-rtl-reset-320x568.png) | [Measurement](pilot-live-rtl-reset-320x568.json) |
| RTL 390x600 Reset | [Screenshot](pilot-live-rtl-reset-390x600.png) | [Measurement](pilot-live-rtl-reset-390x600.json) |
| RTL 390x844 Reset | [Screenshot](pilot-live-rtl-reset-390x844.png) | [Measurement](pilot-live-rtl-reset-390x844.json) |
| RTL 768x1024 Reset | [Screenshot](pilot-live-rtl-reset-768x1024.png) | [Measurement](pilot-live-rtl-reset-768x1024.json) |

**Needs Sanchay:** share the existing preview link internally, ask each teammate to use one new run, and review the photographed spelling and gold connections manually. No billing action is required for this bounded pilot. No invitation or message was sent by the agent.

Pilot scope is preview and manual design review for 3-4 internal teammates. It does not establish shop contact delivery, checkout, a complete automatic geometry gate or unrestricted customer readiness. Existing `MockStudioVerifier` and executor-connection follow-ups remain; stencil reuse has read-only helper evidence, not new live-dispatch performance proof yet.
