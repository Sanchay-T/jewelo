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

- Progress labels read exactly: Name & script, Inspiration, Metal, Stones, Size & chain, Review.
- Both approved Arabic name fields accepted independent edits (`ليان`, `نور`), and the live identity preview exposed `Deterministic identity preview: ليان ♡ نور`.
- Progress-step buttons could not advance an incomplete specification; clearing the second Arabic spelling disabled both Continue and the next-stage jump.
- Inspiration search (`fine`), Minimal filtering, template selection, removal, and Inspire Me all updated the selected reference state.
- An uploaded fixture survived a page reload via IndexedDB. After Remove, a second reload showed no restored preview and Continue remained disabled in Upload mode (`initiallyUploaded: 1`, `restored: 1`, `afterDeletion: 0`).
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

## Finishing pass — icons, clarity, and visibility

- Latest full comparison input: `/tmp/caleums-polish-comparison.jpg`.
- Source pixels: 1402 × 1122. Implementation desktop captures: 1440 × 900 CSS pixels at DPR 1. Mobile capture: 390 × 844 CSS pixels at DPR 1.
- Latest captures: `/tmp/caleums-polish-landing-full-1440.jpg`, `/tmp/caleums-polish-after-config-top-1440x900.jpg`, `/tmp/caleums-polish-studio-1440x900.jpg`, `/tmp/caleums-polish-commerce-1440x900.jpg`, `/tmp/caleums-polish-operator-1440x900.jpg`, and `/tmp/caleums-polish-config-390x844.jpg`.
- Full-view comparison: the warm ivory palette, editorial type hierarchy, split preview proportions, restrained borders, gold selection language, and single-result composition remain aligned with the source.
- Focused-region comparison: configurator progress, preview controls, landing trust strip, Studio action rail, commerce confirmation/quote states, and operator actions were inspected at readable scale because icon weight and supporting-copy legibility are too small to judge reliably from the full comparison alone.
- Icon fidelity: all added interface symbols use the existing Phosphor family with consistent 15–20 px optical sizing. No custom SVG, CSS-drawn icon, emoji, or placeholder art was introduced.
- Typography and visibility: small summaries, option labels, status labels, input text, and operator metadata received modest size increases while preserving the source density. Muted text retains visual hierarchy without dropping below practical contrast.
- Interaction states: header tools and navigation now have visible hover/focus treatment; selected preview controls retain the thin gold treatment; quote, retry, regenerate, and operator actions carry state-specific symbols.
- Responsive evidence: the 390 × 844 configurator reported zero page-level overflow and no visible interactive target below 44 × 44 px. The preview remains above controls and sticky actions remain fully visible.
- Browser console: zero errors across configurator, landing, Studio, commerce, and operator captures.

### Finishing comparison history

| Severity | Finding                                                                | Fix                                                                                                           | Post-fix evidence                                                   |
| -------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| P2       | Important text-only controls required extra reading effort             | Added restrained, action-specific Phosphor icons to preview, Studio, quote, generation, and operator controls | Desktop configurator, Studio, commerce, and operator captures above |
| P2       | Six-stage progress was accurate but visually low-information on mobile | Added compact numbered/completed markers while preserving the gold line treatment and guarded jumps           | `/tmp/caleums-polish-config-390x844.jpg`                            |
| P2       | Trust claims lacked the icon layer present in the visual authority     | Added one consistent icon per trust promise and removed a redundant footer symbol after rendered inspection   | `/tmp/caleums-polish-footer-1440.jpg`                               |
| P2       | Several supporting labels were optically too small                     | Increased only the affected summary, state, option, input, and operator metadata sizes                        | Latest full comparison and focused captures above                   |

No actionable P0, P1, or P2 findings remain after the finishing comparison. Final result remains passed.
