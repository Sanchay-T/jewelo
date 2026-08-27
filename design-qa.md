# Caleums customer and operator UI — final design QA

final result: passed

## Visual truth and normalized comparison evidence

- Source visual truth: `docs/reference/caleums-name-studio.png` — 1402 × 1122 px, supplied storyboard, DPR 1.
- Current browser surface: Codex in-app Browser at `http://127.0.0.1:3211`, Next.js development build, DPR 1.
- Configurator implementation: `/tmp/caleums-final-audit/root-current/stones-icons.png` — 1242 × 889 px/CSS px.
- Studio implementation: `/tmp/caleums-final-audit/studio-repair/viewport-1440x900.png` — 1440 × 900 px/CSS px.
- Commerce implementation: `/tmp/caleums-final-audit/commerce-operator-repair/04-commerce-1440x900.jpg` — 1440 × 900 px/CSS px.
- Same-input scene 06 comparison: `/tmp/caleums-final-audit/root-current/scene06-comparison.png` — 1440 × 900 px.
- Same-input scene 09 comparison: `/tmp/caleums-final-audit/root-current/scene09-comparison.png` — 1440 × 900 px.
- Same-input scene 10 comparison: `/tmp/caleums-final-audit/root-current/scene10-comparison.png` — 1440 × 900 px.

The source is a multi-scene storyboard rather than a single browser viewport. For each focused comparison, the corresponding source scene was cropped without distortion and contained beside the browser-rendered implementation on one 1440 × 900 canvas. Scene 06 verifies form density, selected gold accents, gemstone/coverage icon clarity, and the persistent preview. Scene 09 verifies four simultaneous portrait presentation views. Scene 10 verifies the three-part final-piece composition. These focused comparisons were required because the source’s individual UI text is not readable in a full-storyboard comparison.

## Required fidelity surfaces

- Fonts and typography: Instrument Sans is served locally for UI text; the restrained serif display hierarchy matches the editorial source. Weights, line heights, uppercase kickers, and small metadata remain readable across the five required viewports.
- Spacing and layout rhythm: desktop keeps controls/summary left and the visual surface right; Studio uses four columns, tablet uses 2 × 2, and mobile uses one column. Thin borders, compact progress, small selection accents, and the three-column commerce composition match the source’s density.
- Colors and tokens: warm ivory/paper surfaces, near-black CTAs, muted copy, thin beige rules, and restrained gold selection/focus accents are consistently tokenized.
- Image quality and asset fidelity: all visible jewellery media uses real local fixture assets. The dark presentation is a real dark-background jewellery image. No visible product photograph is simulated with CSS or a placeholder. Sample assets are explicitly marked `no provider call`.
- Icons: interactive and product-option icons use the existing Phosphor icon family. Stone coverage and gemstone controls no longer use text-symbol or CSS-circle substitutes.
- Copy and content: the public brand is Caleums. Six construction stages use accurate labels; Review is an unnumbered Live Editor step. Estimate copy accurately identifies the displayed value as the estimate upper bound before the final atelier quote.

## Input → live-preview acceptance matrix

| Input or action                | Required preview/state result                                                                                                        | Final evidence                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Name 1 / Name 2                | Exact active text; clearing either required name suppresses the invalid identity immediately                                         | Passed; no stale name, connector, or malformed `♡ Name 2`            |
| English / Arabic               | English skips only the inapplicable Arabic-style screen; Arabic waits for the server-refined spelling                                | Passed; fixed Step 1–6 numbering and conditional Step 2              |
| AI Arabic result / manual edit | AI result is authoritative after loading; user edit is preserved across Continue, progress navigation, locale navigation, and reload | Passed; `AI refined` and `Edited by you` provenance remain distinct  |
| Arabic styles                  | Classic, Minimal, Diwani, Thuluth inspired, Kufi, Signature update style metadata and treatment                                      | Passed for all six                                                   |
| One / two names                | One name uses single-name identity; two names exposes the six layout choices                                                         | Passed; an incomplete two-name design remains repairable             |
| Layout                         | Side by side, connected heart, stacked, stacked + heart, infinity, interlocked update identity/connector                             | Passed; user-approved stacked-heart geometry preserved unchanged     |
| Metal                          | 18K yellow, white, rose update preview metal identity and summary                                                                    | Passed for all three                                                 |
| Coverage                       | None, accent, partial pavé, full pavé update the coverage badge without decorating/underlining the name                              | Passed for all four                                                  |
| Gemstone                       | Lab/natural diamond, ruby, emerald, blue/pink sapphire update icon color and exact badge                                             | Passed for all six                                                   |
| Size                           | Delicate/classic/statement update scale and 22/30/36 mm summary                                                                      | Passed for all three                                                 |
| Chain                          | Cable/rolo/box/fine-curb update the top chain treatment and summary                                                                  | Passed for all four                                                  |
| Length                         | 40/45/50/55 cm update both chain labels                                                                                              | Passed for all four                                                  |
| Zoom / Front / Side            | Zoom toggles; Front/Side are exclusive and update the preview transform                                                              | Passed; Rotate is absent and all controls remain straight by default |
| Back / Continue / progress     | Only valid targets are reachable; missing Name 2 can always be repaired at Names & layout                                            | Passed; no invalid-progress deadlock                                 |
| Mandatory spelling approval    | Approval is required before design creation and is invalidated by specification edits                                                | Passed                                                               |
| Successful creation            | Versioned session draft clears and development opens the marked four-card mock journey                                               | Passed                                                               |

## Generation, Studio, commerce, and operator acceptance

- Crafting renders four portrait skeleton cards and advances each through queued → generating → verifying → ready before automatically opening Studio.
- The explicit demonstration route is marked `Mock workflow · no provider call`, `Sample generation replay`, and `Sample presentation assets · no provider call`.
- Normal task truth remains available without sample mode: ready, queued, generating, verifying, retrying, failed, blocked, cancelled, and unavailable states; task Retry/Cancel; persisted local cancellation; and all backend tasks in the development audit.
- Studio renders `01 Studio`, `02 On model`, `03 Close up`, and `04 Dark mood` together. Optional sibling failure does not block commerce; primary failure/cancellation does.
- Save, Share, four Downloads, Replay, Refine, Regenerate, and commerce navigation were exercised. Refine created a new run, restored AED 2,450 within 300 ms, kept Continue enabled, and reached four ready cards by 600 ms.
- Commerce preserves AED 2,450 as the estimate upper bound, gates quote request on spelling/asset/estimate, and clearly transitions requested → issued AED 2,290 → accepted → Add to bag/order. The final quote persists through the order.
- Operator same-tab login now performs a clean session navigation. Filters, Issue quote, customer return, and fulfillment advancement respond immediately. English and Arabic queue surfaces use locale-aware copy and structural LTR/RTL.

## Responsive, accessibility, and runtime evidence

| Viewport   | Configurator                                     | Crafting / Studio | Commerce / operator                  | Result |
| ---------- | ------------------------------------------------ | ----------------- | ------------------------------------ | ------ |
| 1440 × 900 | split controls + persistent preview              | 4 columns         | source-like final-piece / wide queue | passed |
| 1024 × 768 | all actions and preview controls inside viewport | 2 × 2             | no clipping                          | passed |
| 834 × 1112 | all actions inside viewport                      | 2 × 2             | topbar starts at y=0                 | passed |
| 390 × 844  | preview above controls; sticky actions           | 1 column          | sticky 52 px purchase action         | passed |
| 360 × 640  | preview above controls; sticky actions           | 1 column          | no overlap or horizontal clipping    | passed |

- Every audited viewport has zero page-level horizontal overflow.
- All visible customer controls and operator controls/links are at least 44 px in both practical hit dimensions. Operator wordmark and login return links measure 44 px tall.
- Visible keyboard focus uses a 2 px gold outline with 3 px offset. Native buttons, links, textboxes, checkboxes, and fieldsets preserve keyboard semantics.
- English routes expose structural `lang=en dir=ltr`; Arabic routes expose `lang=ar dir=rtl`.
- Status changes use live regions; action confirmations are separate from task-status announcements.
- Reduced motion disables long decorative motion and compresses replay/skeleton transitions without hiding content.
- Fresh browser runs reported zero console errors and zero warnings after the image-priority correction.
- Screenshot evidence cannot prove full WCAG conformance; keyboard, focus, target size, direction, live-region, motion, and overflow risks were exercised directly.

## P0/P1/P2 comparison history

| Severity | Earlier finding                                                                                  | Fix                                                                                                        | Post-fix result                            |
| -------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| P1       | Two-name validation could deadlock the user away from the missing Name 2 field                   | Split primary-name validity from complete identity validity; Names & layout stays repairable               | passed                                     |
| P1       | Edited Arabic could be overwritten on reload and generated text could be labelled as user-edited | Persisted exact spelling plus provenance and suppressed the restoration/refinement race                    | passed                                     |
| P1       | Crafting stayed four cramped columns at 1024 px                                                  | Moved crafting to the 1100 px tablet breakpoint                                                            | passed, 2 × 2                              |
| P1       | Refine could leave estimate stuck at Calculating                                                 | Reset estimate requests per run/revision, wait for selectable primary direction, and retry failed attempts | passed                                     |
| P1       | Operator controls were inert immediately after login                                             | Completed login with a unique full session navigation                                                      | passed in the same tab                     |
| P2       | Clearing Name 1 could show malformed `♡ Name 2`                                                  | Suppressed identity output until all required names are valid                                              | passed                                     |
| P2       | Preview/actions extended below the initial 1024 and 834 viewports                                | Corrected desktop/tablet shell height accounting                                                           | passed; maximum bottoms 754 px and 1096 px |
| P2       | Stone controls used text glyphs and CSS gem circles                                              | Replaced them with aligned Phosphor Sparkle, Minus, and Diamond icons                                      | passed                                     |
| P2       | Worn fixture generated an image-priority console warning                                         | Prioritized the two likely above-fold LCP images                                                           | passed; clean console                      |
| P2       | Operator links were smaller than 44 px                                                           | Added 44 px inline-flex hit targets                                                                        | passed                                     |
| P2       | UI called the displayed upper bound an exact estimate                                            | Changed copy to estimate/estimate upper bound and retained final-quote distinction                         | passed                                     |

No actionable P0, P1, or P2 differences remain. The approved stacked-heart placement was explicitly locked by the user and remained unchanged during this repair pass.
