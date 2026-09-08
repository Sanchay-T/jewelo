# Staging journey, deployment 08d63e17 (2026-09-08)

Driven by the lead in the in-app browser against `https://jewelo-staging-gqumd.ondigitalocean.app` (PROVIDER_MODE=mock).
The in-app browser cannot save screenshots to disk, so the record is DOM measurements plus what the lead saw.
The pane was hidden for part of the run; visual layout at 390x844 is therefore not trusted here, only the DOM numbers.

## 1440x900

- Landing, scroll 0: `sticky {top:339,bottom:1115}`, `actionBar {top:814,bottom:900}`. Same numbers as session 1; P6-1 stays open.
- Typed `Rania`, clicked "Preview my piece": no backend call (only `GET /api/state?designId=d305b6ac… 200`). Same as session 1 defect 6.
- Ticked "I confirm the spelling…": `POST /api/designs/drafts 201`, `POST /api/revisions/approve 201`, then 7 polls of `GET /api/state?designId=a141ebb2-8500-460c-9f40-e8030670831b 200` and polling stopped, i.e. the run reached a terminal state.
- Page after the run: the four tiles read "Being prepared", the caption reads "Rania · Being prepared", and the fallback copy "We could not photograph your piece here. Leave one way to reach you and we will send it." is shown with WhatsApp/Phone/Email fields.
- Every `<img>` on the page is an `asma-*.png` example (six images, natural width 1122). No mock asset is shown as the customer's piece. Honest degrade confirmed.
- No customer copy says AI, generate, prompt or magic.

## 390x844

- `scrollWidth 390 == innerWidth 390`, no horizontal overflow.
- Fallback copy top at 1970 px document offset; 8 leaf nodes read "Being prepared" (4 tiles + 4 strip labels).
- Same six example images, same alt text.

## Not done in this pass

- 1280x720, 1024x768, 768x1024, 390x600, 320x568, RTL, reduced motion: not driven this session. Phase 1 is an engine phase; the customer surface did not change since session 1, whose viewport pass stands. Full ladder is owed again when Phase 6 touches the surface.

## Database side of the Rania run (REST, service role from `.env`)

- run `b06061ca-ae95-41d7-9a0e-44c5f10c3bd1`: `status complete`, `pipeline_release_id caleums-final-media-v2`, `actual_spend_cents 0`, no operator review reason.
- four tasks (`studio`, `on_skin`, `close_up`, `dark`): `ready`, attempt 1, `terminal_error_code null`, `pipeline_release caleums-final-media-v2`.
- So the "Being prepared" tiles are the UI refusing the mock 1x1 assets of a completed run, which is the honest degrade documented for `PROVIDER_MODE=mock`.

## Deploy `f617a568` (branch tip `503e252`, code `f3f8775`), lead browser pass

In-app browser, `https://jewelo-staging-gqumd.ondigitalocean.app/en/design/new`, 1440x900 then 390x844.
Typed `Ali`, chose Classical, "Preview my piece", ticked the confirmation.
Network: `POST /api/designs/drafts` 201, `POST /api/revisions/approve` 201, `GET /api/state?designId=6d7574c4-…` 200 polling.
Console: no errors at either viewport.
Tiles went "Waiting to start" then "Being prepared"; after about 35 s the honest-degrade contact card appeared ("We could not photograph your piece here. Leave one way to reach you and we will send it.") with WhatsApp, Phone, Email, which is the mock-mode outcome: the run completes with fake assets the UI refuses to show.
At 390x844: `scrollWidth 390 == innerWidth`, no horizontal overflow, four view tiles at 76 px, contact card present.
Observation: at 1440x900 the review step scrolled so that a large empty band sat above the design summary (screenshot showed the summary starting mid-viewport). Pre-existing, related to the UX review B1/B2 rows; not a regression of this deploy.
The platform agent's API re-proof (runs `5d873850` Ali and `0975a48c` أمير complete, `verification_result` keys `passed, exactText, identityScore, notes` only, readiness 200 with a forged cookie, transliterate 429 on the 21st call with 21 distinct principals, `'''` and `محمد٠١` refused 422, `O’Neill` 201) is recorded in `PROGRESS.md`.
