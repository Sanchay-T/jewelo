# Jewelo UI extraction spike — design QA

## Comparison inputs

- Legacy brand source: `/tmp/jewelo-ui-audit.rGX2tR/legacy/audit/screenshots/01-landing-desktop-1440x900.jpg`
- Frozen v2 studio source: `docs/previews/jewelo-v2-preview-generation.webp`
- Final implementation captures: `apps/web/qa/screenshots/01-landing-desktop-1440x900.jpg` through `06-studio-short-phone-360x640.jpg`
- Side-by-side boards: `apps/web/qa/comparisons/landing-legacy-vs-spike.jpg` and `apps/web/qa/comparisons/studio-v2-contract-vs-spike.jpg`

## Capture conditions

- Browser: Codex in-app Chromium browser connected to `http://127.0.0.1:3200`
- Density: 1× CSS-pixel review; requested viewports 1440×900, 1024×768, 834×1112, 390×844, and 360×640
- State: English, customer role, approved immutable Layla revision, partial run with ready/generating/failed/blocked/queued/unavailable representations
- Review surfaces: full landing, full studio shell, inspection canvas, filmstrip/run rail, sticky action bar, mobile configuration/run-history disclosure, compare, Product/Worn/Motion, zoom controls, Arabic server HTML, and short-height behavior

## Findings and resolution history

1. P1 — the scenario drawer intercepted the primary CTA at 360×640. Fixed by closing it after scenario selection; verified in the short-phone flow.
2. P1 — canonical identity and configuration/run controls disappeared below 1024px. Fixed with persistent compact identity proof plus accessible mobile compare and configuration/run-history disclosure.
3. P1 — the mobile filmstrip forced the inspection grid to a 960px intrinsic width. Fixed with bounded grid children and a contained horizontal carousel; final document width equals viewport width.
4. P1 — persisted state initially caused server/client hydration mismatch. Fixed with deterministic server/client seed followed by post-hydration storage restoration; a fresh browser tab reports zero errors or warnings.
5. P1 — arbitrary approved identities could be paired with verified Layla media. Fixed so only the exact English Layla fixture may pass verification; other immutable identities produce unavailable tasks with failed exact-text verification.
6. P1 — selection, estimate, quote, and order snapshots could drift across revisions or runs. Fixed by invalidating unaccepted commercial drafts, locking issued quotes, and creating orders from the accepted quote snapshot.
7. P1 — four-direction fixture coverage was incomplete. Added four distinct 1:1 product directions, four matching 4:5 worn views, a 9:16 motion poster, and the local 9:16 motion clip.
8. P2 — zoom controls, reduced-motion evidence, motion state synchronization, progress semantics, server-rendered Arabic metadata, logical RTL borders, and ordered audit coverage were incomplete. Implemented and covered by unit/browser assertions.

## Final checks

- Brand fidelity: legacy cream/gold palette, display/body typography, restrained borders, real product imagery, and navigation hierarchy preserved.
- Studio fidelity: large frozen inspection canvas, configuration rail, task/run rail, representation switching, compare, lineage, independent retry/cancel, and sticky selection hierarchy preserved.
- Responsiveness: no page-level horizontal overflow; 44px minimum interactive targets; sticky actions remain visible; filmstrip is separately scrollable; short-phone canvas yields space to primary actions.
- Accessibility: visible focus, keyboard activation, live-region updates, reduced motion, native motion scrubbing plus synchronized play/pause, explicit zoom/reset, meaningful alt text, and server-rendered English/Arabic `lang`/`dir`.
- Runtime: fresh in-app-browser session reports zero console errors/warnings; Playwright rejects forbidden Convex/provider/payment/production network calls.

final result: passed
