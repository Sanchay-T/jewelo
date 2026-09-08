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

## Deploy `b1ea4b6d` (`5b3f065`)

Branch tip `65a93ad`, code `5b3f065` (P1-5 fix pass 6 `dbb73fb` plus the bar routing cleanup).
Deployed from `home-mini`, `deploy.sh staging codex/overnight-launch-2026-09-08`, exit 0; `deployment_id=b1ea4b6d-300b-4924-b427-0937b54dc8de`, `doctl apps list-deployments ec09c9fd-84e4-45c5-b60a-fd62277af322` reports `ACTIVE 9/9`.
`DEPLOY_DRY_RUN=1` first: 14 env keys merged, values never printed, and `IDENTITY_BAR_FALLBACK_REVIEW` is not among them - the key left the contract with the bar routing.
`INNGEST_BASE_URL`, `INNGEST_CRON_ENABLED` and `TRUSTED_CLIENT_IP_HEADER` are absent from the environment file, as before.
`bash scripts/digitalocean/smoke.sh https://jewelo-staging-gqumd.ondigitalocean.app` exit 0: health 200, readiness 200 bound to a prod Inngest signing key.

Four runs driven by API against the deployed app (anonymous principal, `POST /api/designs/drafts` 201, `POST /api/revisions/approve` 201, classic lettering, 32 mm, no stones; an Arabic name carries `arabicStyle: "contemporary"`).
`PROVIDER_MODE=mock`, so every `provider_attempts` row is a mock attempt with `actual_cost_cents 0`.

- `آية` classic, run `989ca554-3f4a-4453-b340-0554243177cb` (design `4e1f532c`, revision `40b43b8b`): `status complete`, `actual_spend_cents 0`, `operator_review_reason null`, four tasks (`studio`, `on_skin`, `close_up`, `dark`) `ready` at attempt 1 with `terminal_error_code null`, four assets, four provider attempts all `succeeded` at `actual_cost_cents 0`.
  Identity artifact `bb6487a0`: `validation_report.claimed.ringPlacement welded`, `measured.ringTilt 0`, `measured.ringOverhang 0.050059594755661505`, `measured.componentsFinal 1`, `claimed.glyphPixelsUnderRingMetal 0`, `claimed.glyphPixelsPunchedByRings 0`, rings on glyphs 1 and 5, `engineRelease caleums-identity-v4`, `pipelineRelease caleums-final-media-v2`.
  On `d4bb713f` the same name landed in `operator_review` with `identity_bar_fallback`; with the pass 6 engine it welds and completes.
- `علي` classic, run `0f4e18a4-12c9-45e7-97c1-be58af08c6d6` (revision `923365cb`): `complete`, four `ready` tasks, four assets, `ringPlacement welded`, `ringTilt 0`, `ringOverhang 0.04111842105263158`, `componentsFinal 1`, rings on glyphs 1 and 3.
- `Ali` classic, run `9a3be903-1808-43b5-8418-027a5725bed4` (revision `6b6b1d64`): `complete`, four `ready` tasks, four assets, `ringPlacement welded`, `ringTilt 0`, `ringOverhang 0.04550438596491228`, `componentsFinal 1`, rings on glyphs 0 and 2.
- `Bartholomewsonlongest` classic, run `33424925-c497-4b61-8392-f1ffec3d9ead`: `status operator_review`, `operator_review_reason identity_no_ring_seat:left=6,right=6,steps=420888`, studio task `blocked` at attempt 0 with `terminal_error_code identity_no_ring_seat:left=6,right=6,steps=420888`, the other three `blocked` with `dependency_blocked`, zero `provider_attempts` rows, zero assets, no identity artifact.
  The refusal happens before spend, which is what the pre-spend block is for.

Stencil readback: the `آية` PNG downloaded from the private `identity-anchors` bucket with the service role (`principal/51bc8a4a-…/revision/40b43b8b-…/identity-5aaac376….png`, 10921 bytes), sha256 `dc13f0b9294d60bbd527cef50b54f8920f548f681259e2f9da2ce14415897bdc` equal to `identity_artifacts.png_sha256`.

```
corepack pnpm --filter @jewelo/jobs exec tsx scripts/measure-stencils.mts <scratch>/stencils render-report.json
SINGLE-PIECE 1/1
MATCH 1/1
CLAIM 1/1
```

The PNG and its `render-report.json` stay in the session scratchpad (`deploy-5b3f065/stencils/`); the earlier deploy sections kept their downloads out of the tree too.

Endpoint checks: `GET /api/state?designId=4e1f532c-…` with no session answers 401 `{"error":"Unauthorized","code":"unauthenticated"}`; `GET /api/readiness` without the token answers 200 `{"status":"ready"}`; with `x-readiness-token` it answers 200 with `supabase configured`, `inngest keyEnvironment prod`, `transport self_hosted`, `cronsRegistered true`, `openai configured`, `trustedClientIpHeader valid`.

Two notes against the brief: the contract is 14 keys, not 13 (`IDENTITY_BAR_FALLBACK_REVIEW` was never in the environment file, so removing it from the contract did not change the count), and `deploy.sh` did print `deployment_id` over non-interactive ssh this time.
