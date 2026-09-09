# Larger preview - local and staging follow-up proof, 9 September 2026

Task P6-10. Integrated source: `57189c5aa53a1ba7f525d1b48898a704629d7ebb`, pushed on `codex/overnight-launch-2026-09-08`. The lead drove both the local page and the deployed staging page in their own in-app browser. Local, mock staging and the later real API checkpoint are distinguished below. The initial staging layout captures use mock mode; the English API photograph checkpoint is recorded separately.

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

**Verification boundary:** existing real-mode dependencies deliberately use `MockStudioVerifier` plus a paid `OpenAINameReader`. Human lab scoring checks photograph geometry; the running application's paid gate reads the name. It is not a complete automatic geometry/attachment verifier. The token cap does not add provider-cost reconciliation. No four-photo production readiness is claimed.

## First real API photograph - English studio

The lead submitted the synthetic lab name Asma through the deployed English form. One studio task reached ready on its first OpenAI attempt. The application name-reading gate passed, and an independent reviewer who did not generate this API image passed all six visual criteria: correct name, recognizable stencil geometry, connected metal, two fused eyelets, both chain ends threaded through the holes, and plausible polished-gold studio photography. This is one successful English still, not Arabic or four-view acceptance.

| Exact parity evidence | SHA-256 |
| --- | --- |
| Deployed compiled prompt - same as qualified English C | `04ee836ea3df77b420d26728ff6b4741e0044ce9cf93d85ee2eae17725d9011c` |
| Deployed identity PNG - same as actual production stencil used in qualification | `7d73154755d55dacf611266bc8865d10f1ca93a4f2bef637272698d05d7040b4` |
| OpenAI returned PNG - same checkpoint and persisted asset | `e41cec49bf2749248190de8ca5c890605b2f008190831275971448ad51bb4328` |

The asset identifies exact model `gpt-image-2-2026-04-21`, canonical studio release v3 `f2ba654a-3454-4ec0-86ec-a4281a411145`, and attempt 1. The ledger booked 20 cents for this image using the adapter's estimate; that is not the provider invoice and excludes name-reader usage. At 12:08:31 UTC the preserved daily totals were 9 runs, 100 cents reserved and 120 cents actual in the ledger. The other three English tasks were cancelled at attempt 0 by the studio-only policy, with no provider calls. Private readback: `/tmp/jewelo-staging-plan/en-live-observation.json`; original API PNG and independent verdict remain private under `/tmp/jewelo-api-proof/`.

**P6-10 readiness race - implemented correction, runtime proof pending:** the real browser first showed the final shop-follow-up contact state even though the studio photograph completed. Source inspection found readiness was committed before the asset insertion; parallel state reads could also combine a ready task with an older asset list. Reloading the same page displayed the existing photograph without making another paid call. The premature fallback capture is failure evidence, not a passing pending state.

Pushed correction `ba06a6605c8882ddb84af5af0a8f569dc44d7883` adds migration `20260909030000_complete_presentation_atomically.sql` and changes only jobs presentation completion and the state route. A service-role-only transaction validates the current attempt, cancellation fence, ownership, checkpoint and identity lineage, then publishes the immutable asset, settles the attempt once, marks ready, releases dependents and records the ready audit together. Reconciliation keeps its existing booking-date calculations and gains matching task/run lock order. The state route reads assets after tasks, closing the mixed-snapshot window without weakening the UI's real-provider rule. No identity-engine files or acceptance gates changed.

Full build passed **13 successful, 13 total**, exit 0, on `ba06a66`; two fresh independent source reviews were clean above minor. Migration and deployment are underway at this checkpoint. The next Arabic run must demonstrate the real photograph appearing without reload before this correction is called runtime-verified. The existing `MockStudioVerifier` limitation described above remains open; this transaction change does not add a geometry verifier.

| Real API browser state | Screenshot | DOM measurement |
| --- | --- | --- |
| Desktop while the studio photograph was being made | [Screenshot](api-en-studio-pending.png) | [Measurement](api-en-studio-pending.json) |
| Mobile premature final fallback - race reproduction | [Screenshot](api-en-mobile-premature-fallback.png) | [Measurement](api-en-mobile-premature-fallback.json) |
| Mobile existing studio photograph after same-page reload | [Screenshot](api-en-studio-ready-after-reload.png) | [Measurement](api-en-studio-ready-after-reload.json) |
| Mobile enlarged API photograph | [Screenshot](api-en-studio-enlarged.png) | [Measurement](api-en-studio-enlarged.json) |
| Unrequested on-skin view remains honest | [Screenshot](api-en-unrequested-view-honest.png) | [Measurement](api-en-unrequested-view-honest.json) |

These public browser captures contain only the approved synthetic Asma demonstration and visible app UI. The raw API photograph, private reference images and signed asset URLs are not committed. On mobile the ready photograph measured 350 by 436.8 px, and enlarged inspection occupied the complete 390 by 844 px dialog. Selecting the unrequested on-skin view retained its shop-follow-up placeholder instead of presenting the studio photograph as that view. Arabic and its dependent photographs remain pending.

## Build, review and remaining proof

The lead reports full `corepack pnpm build`: **13 successful, 13 total**, exit 0, through `ba06a66`; two final independent reviews of the atomic completion correction were clean above minor. The mock staging layout captures served `57189c5`; the first English real-photo captures served `b5f9758`. None yet verifies `ba06a66` at runtime. No tests ran or changed. The follow-up adds the dictionary key `Start with your name` / `ابدأ باسمك`.

The earlier seven-item UI acceptance, full dictionary changes and broader local layout matrix remain in [Umayr UI proof](../umayr-ui/README.md). Those earlier captures do not substitute for the newer staging observations above. Mock staging UI coverage, canonical publication, real deployment/smoke, and the first English API studio photograph are complete at this checkpoint. Runtime verification of the implemented readiness-race correction and Arabic four-view API proof remain pending. The current prompt qualification is recorded in [Image lab](../../../overnight-launch/IMAGE-LAB.md#9-september-follow-up---shared-still-compiler-and-studio-candidate-c).

The separate uncommitted identity-engine and stencil-renderer script work in the original checkout remains excluded. PROGRESS.md and HANDOVER.md are unchanged under the original brief's explicit boundary.
