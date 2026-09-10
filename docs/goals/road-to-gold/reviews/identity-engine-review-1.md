# Identity engine review 1 (P1-2 to P1-4, range 79592b7..af13e2b)

Reviewer: fresh-context `reviewer` subagent, 8 September 2026.
Close-out (session 2, commit after `998ca82`): findings 1, 2, 4, 7, 9, 11 fixed by a separate implementer and reproved by the lead (`identity_ring_punched_ink` fires on an injected block; per-codepoint coverage with a reshape probe for ligature-swallowed indices; no customer text in any error message; `identity_fit_overflow` at 45 characters; `ENVELOPE_BOUNDARY`; `pathExists` from `existsSync`). Findings 5, 6, 10, 13 go to P1-6; 3 closed by P1-5; 8, 12, 14 recorded.

Verdict: the HarfBuzz port is sound (direction constants, path grammar, Bezier extremes, distance transform, Pillow LANCZOS, fit math, lab constants all verified against the sources); two gates are weaker than they claim.

## Major

1. Ink-preservation assertion is vacuous: it is checked between thicken and bridge, where `drawBar` never clears ink, while `addJumpRings` runs after it and `drawDisk(..., 0)` clears ink unconditionally (`caleums-arabic-v3.ts:293-308,823`). Owner: P1-5 fix pass. Fix: recompute the invariant after rings against the pre-ring glyph mask; a ring may only clear pixels that were not glyph ink.
2. `exactCharactersPreserved` cluster coverage is an endpoint range check (`shaping.ts:262-269`); a mark dropped mid-name by GSUB passes. Owner: P1-5 fix pass. Fix: `buffer.setClusterLevel(2)` (characters) and require every codepoint index in the cluster set.
3. `addJumpRings(mask, 560)` is a dead literal; the named ring constants are unused; erosion, outward offset and weld fillet are missing (`caleums-arabic-v3.ts:308`). Owner: P1-5 (in flight).
4. `approvedText` is interpolated into `IdentitySolverError.message`, which `presentation.ts:861,1092-1103` stores into `p_error_class` and `terminal_error_code` (PII in a category column). Owner: P1-5 fix pass. Fix: code only in the message, name-derived detail behind the revision id.

## Minor

5. Report types still pin `jumpRingCount: 2`, `componentsFinal: 1`, `passed: true`; `measure-stencils.mts:126` checks `holes >= jumpRings` only. Owner: P1-6.
6. `render-stencils.mts` writes `componentsFinal` from the ruler's own measurement, so re-measuring is self-confirming. Owner: P1-6 (independent claim must come from the solver).
7. `IDENTITY_MIN_FONT_SIZE` clamp silently overflows the body box for runs wider than about 22 em; letters clip. Owner: P1-5 fix pass. Fix: throw when the fitted width exceeds `IDENTITY_BODY_WIDTH`.
8. Bridge tie-breaking differs from the Python `argmin` order on exact ties; deterministic either way. Owner: none, recorded.
9. `FAR_AWAY = 1e15` doubles as the parabola boundary sentinel; margin is a factor of 2. Owner: P1-5 fix pass. Fix: strictly larger boundary sentinel.
10. `recentre` offsets are rounded to three decimals while the transform is not; exact only while scale is 1. Owner: P1-6 (report the unrounded values).
11. Diagnostics route reports `pathExists: false` when shaping fails on an existing file; discloses absolute paths behind operator auth. Owner: P1-5 fix pass (separate the two fields).
12. `serverExternalPackages` lists only sharp; harfbuzz wasm survives by Turbopack tracing, proven on staging. Watch item for P1-7.
13. Raw buffer assumed one channel with no assertion (`identity-anchor.ts:130-137`). Owner: P1-6.
14. `bridgeAll` allocates a full distance transform per bar, up to 64 bars. Watch item.
