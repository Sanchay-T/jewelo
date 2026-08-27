# Evidence: API acceptance + browser journey, 2026-08-27 (local, mock worker, hosted Supabase)

## API script (`pnpm e2e`, BASE=http://localhost:41960)
PASS, 0 failed assertions, 46 steps, 224s (incl. a deliberate 3-attempt MOCKFAIL walk).
Key results: approve 201 accepted 4/4 in 2.3s; 4 stills ready ~9s later; motion task auto-created and cancelled alone (run stays `complete`); estimate 201 from `estimate_revision`; request_quote 201 with total = round((low+high)/2); replay 200 same quote; accept before issue 409 `state_conflict`; operator session/prompts/issue_quote 200; accept after issue 200; checkout fails closed; negatives 401/404/422/409 with `code`; reservations return to 0.

## Browser journey (agent-browser, remote data mode, real rows)
landing -> configurator (name, Arabic AI-refined "ليلى", 6 styles with SUPPORTED/ATELIER REVIEW, one/two names, 3 metals, 4 coverages, 6 stones, 3 sizes, 4 chains, 4 lengths) -> review + spelling gate -> approve -> crafting "0 of 4" -> "4 of 4 ready" from DB rows -> studio (4 signed images via next/image, Save/Share/Download x4/Refine/Regenerate) -> commerce (server estimate AED 3,335) -> request quote -> operator login -> issue quote (AED 2,973) -> customer accept -> ADD TO BAG -> "Checkout is not available yet" (Shopify paused, 503 checkout_unavailable).
Viewports 1440x900, 1024x768, 834x1112, 390x844, 360x640: no horizontal overflow on configure/studio/commerce. `/ar` -> `dir=rtl lang=ar`. Console: no errors.

## Defects found and status
- Language buttons hidden under the sticky action bar at short viewports (~720px tall) -> not clickable. Open (frontend).
- `next/image` warning: fixture preview image uses `fill` inside a `position: sticky` parent. Open (frontend, cosmetic).
- checkout returned 500 `internal` when Shopify is unconfigured -> fixed (503 `checkout_unavailable`).
- request_quote returned 500 after committing (empty 201 body parsed as JSON) -> fixed.

Screenshots: numbered files in this folder; `vp-*` are the viewport matrix.
