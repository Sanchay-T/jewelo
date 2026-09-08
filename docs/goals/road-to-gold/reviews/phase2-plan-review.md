# Phase 2 plan review (plan-reviewer, 2026-09-08, before any Phase 2 brief)

Verdict: no-go on rows P2-1 to P2-7 as written, go on the rewritten rows now in `docs/TASKS.md`.
The reviewer prototyped the P2-2 recipe over the 49 human-passed lab stills rather than arguing about it.

## Blockers found

- B0 "working tree does not build": that was fix pass 3 (adversarial-2 F-1) mid-edit on the shared checkout, not a plan defect. Closed by the fix pass 3 commit.
- B1 P2-2's recipe (Sobel, Otsu on the gradient, close r=3, fill, largest component, opening at 1.5% of width) reaches IoU 0.85 on 0 of 49 passes; best 0.50, median about 0.20; the opening empties 2 masks and is wider than a Playfair hairline. Registration was never specified. The close-up brief is a three-quarter macro, so orthographic-stencil IoU cannot reach 0.85 there.
- B2 Four of six gates are wrong by construction on on-skin, close-up and dark (chain leaves the frame, one ring in shot, bbox at the edge). Gate sets must be per view; dependents compare against the verified studio master.
- B3 G3 "round holes == rings" inverts `VIEWER-RUBRIC.md:41`: a passing ring has a chain link in the hole, an empty hole is the defect.
- B4 Corpus numbers: 73 with a verdict (79 after merging `lab/stage2/verdicts-*.jsonl`), 49 passes (54 after), 13 defect rows of which 7 are geometry; not 80/55/15. All four stage 4 stone rows have empty notes. The verdict merge moves from P3-1 to Phase 2.
- B5 `packages/ai/tsconfig.json` has no test exclusion and `index.test.ts` constructs `OpenAIStudioVerifier`; retiring it breaks `pnpm build`.
- B6 The verifier port receives a signed URL, not bytes; an expired link would buy a paid regeneration. The port takes bytes.
- B7 DS-11's ceiling in `runtime_policy` is enforced by a trigger on `principal_daily_usage`, which a script never writes; the replay owns its own budget.
- B8 P2-1's proof reads `terminal_error_code` on a retrying task, which is empty by definition; and mock cannot inject a bad still.
- B9 Nothing in Phase 2 runs on staging (mock verifier stays); `MOCK_STILL_FIXTURE_DIR` makes the real verifier run for zero spend.
- B10 Routing gate failures into the three-attempt regenerate loop lets a systematic gate bug burn the whole reservation; deterministic failures get one retry then `operator_review`.

## Majors

M1 `identityTextMatches` accepts any single edit on 5+ Latin characters (Layla/Kayla). M2 the name-read prompt contains the answer. M3 G1 compares two bookkeeping fields, and NFC versus raw would false-fail combining marks. M4 `scripts/*.mts` are typechecked by nothing. M5 P2-5 and P2-6 contradict on ordering; report standalone and composed recall. M6 ledger stencils are pre-Phase-1; thresholds re-measured against v4 in P3. M7 thresholds need schema floors. M8 `ROAD-TO-GOLD.md` phase 2 gate names 91 images; 79 carry a verdict. M9 no `wrong-spelling` or stone-in-counter positives exist; tamper fixtures. M10 G5 is downstream of the mask.

## Decisions taken by default

- DS-11 ceiling is enforced by the replay script (call counter, per-call estimate, hard stop), not by `runtime_policy`.
- Phase 2 order: P2-0 tsconfig, P2-1 harness and baseline, P2-2 mask with measured threshold, P2-3 gates per view, P2-4 replay, P2-5 contract and wiring with fixture path, P2-6 name reader, P2-7 attachment reader (paid, last).
