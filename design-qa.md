# Caleums reference UI — design QA

final result: passed

## Visual authority and comparison input

- Source: `docs/reference/caleums-name-studio.png` (1402 × 1122, exact supplied screenshot).
- Implementation captures: `/tmp/caleums-landing-1440x900.jpg`, `/tmp/caleums-config-1440x900.jpg`, `/tmp/caleums-studio-1440x900.jpg`, and `/tmp/caleums-commerce-1440x900.jpg`.
- Same-input comparison: `/tmp/caleums-design-comparison.jpg` (source and the four implementation states on one canvas, visually inspected at original resolution).
- Browser surface: Codex in-app Browser, local Next.js development server, DPR 1.

The matched comparison preserves the screenshot's warm ivory field, near-black actions, thin gold selection accents, editorial hierarchy, quiet borders, large pendant presentation, compact progress treatment, single Studio result, and three-column final-piece composition. Real project jewelry fixtures are used throughout; there are no visible placeholder media or CSS-drawn product assets.

## Matched viewport evidence

| Viewport   | State                  | Capture                                 | Result                                                                  |
| ---------- | ---------------------- | --------------------------------------- | ----------------------------------------------------------------------- |
| 1440 × 900 | configurator / name    | `/tmp/caleums-config-1440x900.jpg`      | Passed; persistent right preview and no horizontal overflow             |
| 1024 × 768 | configurator / name    | `/tmp/caleums-config-1024x768.jpg`      | Passed; usable split proportions and no clipping                        |
| 834 × 1112 | configurator / name    | `/tmp/caleums-config-834x1112.jpg`      | Passed; tablet split remains legible and actions visible                |
| 390 × 844  | configurator / name    | `/tmp/caleums-config-390x844.jpg`       | Passed; preview precedes controls and sticky actions remain visible     |
| 360 × 640  | configurator / name    | `/tmp/caleums-config-360x640.jpg`       | Passed; zero page overflow, 44 px targets, sticky actions visible       |
| 390 × 844  | landing / marquee      | `/tmp/caleums-landing-390x844.jpg`      | Passed; both real-image rows remain present below the hero              |
| 360 × 640  | Studio / ready         | `/tmp/caleums-studio-360x640-final.jpg` | Passed; primary and refinement actions fit without horizontal scrolling |
| 360 × 640  | commerce / final piece | `/tmp/caleums-commerce-360x640.jpg`     | Passed; image-first mobile composition and no page overflow             |

Programmatic viewport checks reported `documentElement.scrollWidth === documentElement.clientWidth` at all five required sizes. A mobile interactive-element audit found no visible button, link, input, select, or textarea smaller than 44 px in either dimension after the final fixes.

## Required interaction evidence

- Arabic progress labels read exactly: Name & language, Arabic style, Names & layout, Metal, Stones, Size & chain, Review. English intentionally omits only Arabic style and reports six steps.
- Both approved Arabic name fields accepted independent edits (`ليان`, `نور`), and the live identity preview exposed `Deterministic identity preview: ليان ♡ نور`.
- Arabic spelling is Luna-only: selecting Arabic showed “Generating…” and “Preparing Arabic spelling…” with spinners, kept Continue disabled, then populated `ليلى`, announced “AI-refined,” updated the deterministic pendant identity, and enabled Continue only after the server response. No approximate local transliteration was exposed and the browser reported no console errors.
- Live configurator state was verified end to end with `Omran`: Luna returned `عمران`; the exact approved spelling replaced the static Arabic-style samples, remained selected after moving forward and back, and reached Review with the chosen Minimal style. Layout, white gold, accent ruby, statement 36 mm, rolo chain, and 55 cm choices each updated the persistent preview and its live specification chips immediately.
- Progress-step buttons could not advance an incomplete specification; clearing the second Arabic spelling disabled both Continue and the next-stage jump.
- The initial result used the frozen run task/asset data. The tablist exposed one Studio tab and no On you or Motion tab.
- The development task audit exposed frozen failed and blocked states without presenting extra customer directions. Browser QA found one failed task, invoked Retry, and confirmed the retry control cleared while the live status announced completion.
- The active Studio task exposed Cancel task and invoked the existing `cancelTask` command. The UI now retains an explicit cancelled presentation state locally if the legacy mock timer advances the same task again, disables commerce continuation, and preserves ready sibling assets.
- Generation exposed durable progress and an `aria-live` status; ready, failed, blocked, cancelled, and retrying copy is state-derived.
- Quote request was disabled before spelling confirmation. Operator handoff appeared only after a development-mode quote request. The operator queue issued the quote. Quote acceptance was disabled until reconfirmation. Add to bag was absent before acceptance, enabled afterward, and produced the mock order confirmation.
- `/en/design/new` reported `lang="en" dir="ltr"`; `/ar/design/new` reported `lang="ar" dir="rtl"`. Both reported zero horizontal overflow.
- Visible focus styling is defined globally with a 2 px gold `:focus-visible` outline and 3 px offset; core interactions use native buttons, links, inputs, checkboxes, and tabs.
- Reduced motion disables marquee/transition animation and leaves the two marquee rows statically visible.

## Difference history and disposition

| Severity | Difference found                                                                  | Fix                                                                                                 | Final  |
| -------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------ |
| P0       | None                                                                              | —                                                                                                   | Passed |
| P1       | Progress labels described obsolete panels                                         | Replaced with the six real stages and guarded every jump                                            | Passed |
| P1       | Suggested Arabic spelling was not editable for both names                         | Added independent editable fields and functional pencil focus controls                              | Passed |
| P1       | Preview stayed on a static Layla identity                                         | Added deterministic approved-text/layout/metal/stone overlay; fixture is presentation backdrop only | Passed |
| P1       | Studio exposed hard-coded future views                                            | Derived tab visibility from enabled run task data; only Studio appears                              | Passed |
| P1       | Task retry/cancel and blocked/failed status were not testable                     | Restored task commands, live state copy, and a development-only frozen-task audit                   | Passed |
| P1       | Removing an upload only hid the component                                         | Deleted `draft-reference` from IndexedDB and verified removal across reload                         | Passed |
| P2       | 360 px Studio footer clipped actions and the scenario trigger overlapped feedback | Compacted the sticky footer and moved the development trigger above transient status                | Passed |
| P2       | Mobile progress/header controls included sub-44 px targets                        | Raised their minimum dimensions to 44 px and re-audited                                             | Passed |

No open P0, P1, or P2 visual differences remain in the scoped reference comparison.

## Isolated configurator-step correction — 2026-08-27

- Source visual truth: `docs/reference/caleums-name-studio.png` (1402 × 1122, DPR 1 source screenshot).
- Browser-rendered implementation: `/tmp/caleums-isolated/01-name-language-final.jpg`, `/tmp/caleums-isolated/02-arabic-style-final.jpg`, and `/tmp/caleums-isolated/03-names-layout-final.jpg` at a 1440 × 900 CSS viewport, DPR 1.
- Same-input full-view comparison: `/tmp/caleums-isolated/reference-vs-isolated.jpg` (2300 × 1508), inspected at original resolution.
- Focused evidence: the first three source configurator scenes and their corresponding rendered screens were readable in the combined comparison; no additional crop was needed.

The earlier implementation combined name count, language, Arabic style, and layout into one panel. The revised flow isolates every visible choice group from the reference: Name & language, Arabic style, Names & layout, Metal, Stones, Size & chain, and Review. English skips only the inapplicable Arabic-style step. Forward progress remains limited to the next valid panel, while completed panels remain revisitable.

Required fidelity surfaces passed: Instrument Sans/editorial serif hierarchy remains unchanged; the control/preview split, ivory/gold/near-black palette, real jewelry imagery, thin selected borders, labels, and action copy stay consistent with the source. The responsive audit at 1440 × 900, 1024 × 768, 834 × 1112, 390 × 844, and 360 × 640 reported zero page-level horizontal overflow and zero visible interactive targets below 44 px. Mobile uses an internal, scrollbar-free progress rail for the isolated steps.

| Severity | Difference found                                                                                                 | Fix                                                                                                       | Post-fix evidence                                                                     |
| -------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| P1       | Arabic style and names/layout were combined into the first panel instead of isolated as in the source storyboard | Split them into dedicated conditional screens with independent progress labels and validation             | `/tmp/caleums-isolated/reference-vs-isolated.jpg`                                     |
| P2       | Mobile progress targets compressed below 44 px                                                                   | Changed the mobile progress rail to 44 px columns with internal horizontal scrolling and no page overflow | `/tmp/caleums-isolated/02-arabic-style-390x844.jpg`; all five viewport metrics passed |

No open P0, P1, or P2 differences remain for the isolated-step correction.

## Reference-step alignment — Inspiration removal — 2026-08-27

- Source visual truth: `docs/reference/caleums-name-studio.png` (1402 × 1122).
- Browser-rendered implementation: `/tmp/caleums-no-inspiration/implementation-1440x900.png` at 1440 × 900 CSS pixels, DPR 1.
- Mobile evidence: `/tmp/caleums-no-inspiration/implementation-390x844.png` at 390 × 844 CSS pixels, DPR 1.
- Same-input comparison: `/tmp/caleums-no-inspiration/reference-vs-implementation.png` (2880 × 900), visually inspected at original resolution.
- State: configurator Step 1, English script selected; source storyboard and rendered progress sequence visible together.

The supplied storyboard contains Name & language, conditional Arabic style, Names & layout, Metal, Stones, Size & chain, and Live editor/review. The extra Inspiration panel was therefore a P1 information-architecture mismatch. It and its search/filter/template/upload state were removed. New designs submit through the existing `fresh` source contract without adding or changing shared contracts.

Browser interaction exercised the full English sequence and observed these headings in order: “Let’s start with your name”, “One name or two?”, “Choose your metal”, “Add your light”, “Make it yours to wear”, and “Every detail, exactly right”. English reports Step 1 of 6; Arabic reports Step 1 of 7 and inserts only Arabic Style. At 390 × 844 the document width remained exactly 390 px with the six English progress labels and no page-level horizontal overflow.

Required fidelity surfaces passed: typography, spacing, ivory/gold/near-black tokens, real jewelry fixture quality, and source-aligned copy remain unchanged. The comparison was structural because the source is a multi-state storyboard rather than a single matching viewport; focused evidence was not needed because the progress labels and first reference panel remained readable in the combined input.

| Severity | Difference found                                           | Fix                                                                  | Post-fix evidence                                                       |
| -------- | ---------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| P1       | Inspiration appeared as a standalone configurator step     | Removed the panel, state, imports, persistence UI, and progress item | `/tmp/caleums-no-inspiration/reference-vs-implementation.png`           |
| P2       | Removed UI left unreachable inspiration-specific CSS rules | Deleted the orphaned desktop/tablet/mobile presentation rules        | Formatting, lint, typecheck, tests, boundary checks, and build all pass |

No open P0, P1, or P2 differences remain for reference-step alignment.
