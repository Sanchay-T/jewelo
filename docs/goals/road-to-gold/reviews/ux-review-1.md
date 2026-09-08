# Customer journey code review 1 (ux-verifier, on `dde9058`, 2026-09-08)

Code-derived, no browser (the lead drives the browser). Fold into Phase 6 (P6-1 to P6-4); B1 and B3 share the code path with defect 6 ("Preview my piece" makes no backend call) and must land in the same change.

| # | Severity | Finding | Owner |
| --- | --- | --- | --- |
| B1 | blocking | `usePersonalizedPreview.ts:271` calls `buildRequest` outside any try and `previewHandoff.ts:22` throws on validation; the confirm checkbox is rendered without a validation guard and step 02 stays reachable with an invalid draft (switch to two names, leave one blank). No `error.tsx`, so the page dies. | P6-4 (with defect 6) |
| B2 | blocking | Mobile `.photo { aspect-ratio: 1.16 }` with `object-fit: cover` crops a 9:16 dark still to about half; desktop got `4/5` + `contain`, mobile did not. `.photo[data-fit="full"]` is dead CSS. | P6-1 |
| B3 | blocking | `generate()` marks all four slots but captures only the sample family's views, so a camera the sample lacks shows "Photographing" and "Preview failed / Retry" at once, and Retry can only fail. | P6-4 (with defect 6) |
| B4 | blocking | Name validation errors, five notice strings, bag and zoom labels are English in the Arabic journey. | P6-3 |
| 1 | major | Run finishing after the 6 minute ceiling can never be shown, even after reload (`personalizedRun.ts:304,392-398`). | P6-3 (DS-5) |
| 2 | major | Reload during the approve round-trip resumes as degraded with `startedFor` set; re-confirm does nothing. | P6-3 |
| 3 | major | "Being prepared" is used for terminal failure (the contradiction seen on staging today). | P6-3 |
| 4 | major | `maxLength=30` truncates the name silently. | P6-4 |
| 5 | major | Two names of 30 can exceed the engine's fit ceiling (about 40 Latin) with no preflight refusal or copy. | P6-4 |
| 6 | major | English script accepts Arabic letters (`model.ts:188` one-directional). | P6-4 (security fix 1's schema covers the server side) |
| 7 | minor | Contact validated only server-side; the server's format guidance is discarded. | P6-3 |
| 8 to 19 | minor | `aria-live` over the whole section; "Sample coming" hidden from AT; zoom dialog label; two unmirrored arrows in RTL; no Arabic webfont; mixed numerals; mobile action bar hides its label; "Add to bag" drops the confirmation; strict-mode double mount unwatched (dev); full-size PNGs as 52 px thumbnails; reduced motion kills the spinner; weak selected-state affordance. | P6-1 to P6-3 |

Clean: no banned vocabulary in either language; price honesty; mock assets never presented; provenance labelling; one run per specification across reloads; capture requests persisted; timers and listeners cleaned up; signed-URL cache; keyboard and focus; tap targets; RTL plumbing; reduced motion in CSS and JS; contrast.

## Lead finding on the live URL (deployment `2e58159e`, 2026-09-08)

- `/` redirects to `/en`, and `apps/web/src/app/[locale]/page.tsx` renders an empty `<main>` (unchanged since `e8d3dc0`). A shopper who types the bare domain sees a blank cream page with no way into the atelier, which lives at `/en/design/new`. Owner: P6-4 (either redirect the locale root to `design/new` or give it a landing).
- CSP verified in the lead's browser on `/en/design/new`: no violations, fonts loaded, six example images, `/api/state` 200. The `/en/design` and `/ar/design` paths are 404 (no such route), not regressions.
