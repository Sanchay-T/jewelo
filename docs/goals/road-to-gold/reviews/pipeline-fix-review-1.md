# Review of pipeline fix 1 (reviewer, on `b7590a4`, 2026-09-08)

Verified on staging: the four migrations are deployed (`pg_proc` bodies), the sweeper index is used (`EXPLAIN`), sharp 0.35.4 decodes all 16 production stencils byte-identically to 0.34.5.

| # | Severity | Finding | Owner |
| --- | --- | --- | --- |
| 1 | major | `presentation.ts:554-563`: an approved text with no letters gives `expectedLetters ""`, `latinExpected true`, and `identityTextMatches` compares `""` to `""`, so the gate passes any letterless still (`expected "1234"`, read `"9999"` passes). The old class failed closed. Reachable today with a name of `-` or `'` (schema allowed them until security fix 2). | pipeline fix 2: hard reject when the normalised approved text is empty |
| 2 | major | Only image generation has `AbortSignal.timeout`; `OpenAIStillVerifier.verify` and `OpenAINameReader.read` (`studio.ts:187,339`) have none, and `verifying` is the longest un-bumped gap. The 300 s window can still fire on a live verification, a second worker re-runs and pays for the checkpoint branch, and the two race on `complete`/`fail`. | pipeline fix 2: timeouts on both vision calls from `pipelineLimits`, window derived from generation plus two vision timeouts plus upload |
| 3 | minor | `expand_final_media_run` books the up-front reservation on `current_date`; reconcile releases on the attempt date; a run expanded at 23:58 strands its reservation on day D. | pipeline fix 2: store the reservation's `usage_date` on the task |
| 4 | minor | `encodeURIComponent` does not encode `.` or `..`; the comment claims it does. | pipeline fix 2: reject dot segments in `signedStorageUrl`, fix the comment |
| 5 | minor | `REFERENCE_ASSET_ID` duplicated in `presentation.ts` instead of imported from `@jewelo/contracts`. | pipeline fix 2 |
| 6 | minor | `api/state/route.ts:164` keeps `expiresIn: 300`, the customer-facing signer. | pipeline fix 2 |
| 7 | minor | `errorClass` keeps Latin letters and the original `reason` is concatenated into `terminal_error_code`; the pre-existing `name_mismatch:${readText}` writes read text into that column, which the state payload exposes. | pipeline fix 2: codes and counts only, never read text |
| 8 | minor | `providerAttemptBudget` doc promises a config fallback on a policy read failure; `#request` throws instead. | pipeline fix 2: make the doc true or the code true |
| 9 | minor | `outbox_pending` index superseded by `outbox_claimable`. | pipeline fix 2: drop it in a migration |
| 10 | minor | Two comments still say "two-minute stale sweeper". | pipeline fix 2 |
| 11 | minor | `record.nameCheck.scriptOk` and `modelReportedMatch` reach the browser through the `verification_result` denylist projection; `modelReportedMatch` names the model in a shopper payload. | pipeline fix 2: allowlist projection in `api/state` |

Pre-existing, recorded: fal submit and poll calls are timeout-free (video off); `identityTextMatches` one-edit tolerance (P2-6); an Arabic read returned in presentation forms (U+FBxx, U+FExx) is now unrecoverable without `reading.matches` (P2-6 should fold presentation forms before comparing).

Clean: sweeper window is a parameter passed by the cron; attempt budget off-by-one agrees across all five readers and a missing policy row fails closed; explicit-null patch callers pass only keys they mean; reserve and reconcile agree on UTC; spend-cap trigger short-circuits on releases; lockfile fully on sharp 0.35.4 including Next; no secret or customer media; `signedIdentityUrl` release stamping intact.
