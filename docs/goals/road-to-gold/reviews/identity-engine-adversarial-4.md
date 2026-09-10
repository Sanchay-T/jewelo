# Adversarial pass 4: identity engine after D-020 (`f221b44`)

Fresh-context `adversarial-reviewer` in its own worktree at `d1464ba`, 2026-09-08.
Recorded by the lead from the agent's report (the reviewer definition cannot write files).
Lead confirmation by eye: `ali-ar-classic.png` shows both rings side by side on the lam ascender; `aya-ar-classic.png` and `alaa-ar-kufi.png` show the madda fused into the ring fillet.
Probes and renders under the session scratchpad `adv4/` (`matrix/matrix/*.png`, `matrix.log`, `gdef.mts`, `fillet3.mts`, `edge.mts`, `carriers.mts`).

## Verdict

Two blockers and three majors. P1-5 is not closed.
The mechanical evidence of `f221b44` is honest and reproduces exactly (576/576, byte-identical production PNGs, build 13/13); the gates measure the wrong region.

## Blocker 1. The weld fillet swallows marks, and both the engine gate and the harness are blind to it by identical construction

`packages/identity/src/caleums-arabic-v3.ts:1789` (`if (underFillet) continue;`) exempts every pre-ring pixel under the whole fillet, a 39 px wide capsule up to 165 px long on a lifted ring.
`findSeat` (`:1545`) uses the same function, so the seat search does not avoid running the stem over a mark.
`apps/jobs/scripts/render-stencils.mts:514` repeats the identical exemption, so `MATRIX WELDED-GLYPH 0/576` is not independent on this dimension.

Probe `fillet3.mts` attributes exempted pre-ring pixels to glyph contours by point-in-polygon on `identityStencilSvg().glyphs`:

```
أمير ar kufi     ring1 filletLen=148 preInkUnderFillet=3178 owners[4:0:cls3=1540 5:0:cls1=761]
آلاء ar kufi     ring1 filletLen=104 preInkUnderFillet=3256 owners[3:0:cls3=1434 ...]
آية  ar kufi     ring1 filletLen=109 preInkUnderFillet=3612 owners[4:0:cls3=1637 ...]
أسماء ar kufi    ring1 filletLen=89  preInkUnderFillet=2010 owners[4:0:cls3=564 ...]
مُحَمَّدٌ ar kufi  ring0 filletLen=70  preInkUnderFillet=2893 owners[0:0:cls3=1309 ...]
آية  ar classic  both rings: ring0 owners[0:0:cls3=1942] ring1 owners[4:0:cls3=1695]
```

`cls3` is the font's own GDEF mark class: the hamza, the madda, the damma.
`asma-ar-kufi.png` is also a committed production proof artifact.
Every CELL line reports `punched 0 welded 0`.

Customer scenario: a shopper types `آية` or `آلاء`, the madda is not on the pendant, `report.passed` is true, the verifier has nothing to refuse.

Fix direction: the seat search must reject a seat whose fillet crosses any contour other than its own carrier, and both scanners must exempt only fillet pixels that lie on the carrier contour.

## Blocker 2. Both rings land on one letter stroke, 81 to 150 px apart, on 18 of 576 cells

`carrierContourOf` (`caleums-arabic-v3.ts:1291-1315`) with `IDENTITY_RING_CARRIER_MIN_RUN_HEIGHT_FRACTION = 0.34` (`shaping.ts:600`) and `carrierAnchor` (`:1449-1470`).
`minH = max(0.4 * glyphBox, 0.34 * runH)`: a mark raises the run box, which raises the floor, which disqualifies the base letters; the candidate list becomes one glyph for both sides and both anchors land on its topmost row.

```
 81 niki-ar-minimal 1:0,1:0     85 ali-ar-classic 2:0,2:0 (anchors 561,197 and 562,197)
 81 tasneem-ar-minimal          85 ali-ar-diwani, ali-ar-signature
 83 li-ar-classic/diwani/signature, taim-ar-minimal
 84 maji-ar-classic/diwani/signature
 87 taim-ar-thuluth-inspired    90 titi-ar-thuluth-inspired (anchors 493,427 and 499,427)
 94 tasneem-ar-thuluth-inspired 121 amir-ar-minimal, titi-ar-minimal   150 shams-ar-minimal
```

`أمير` minimal misses the floor by two pixels (261 against 263); `امير` without the hamza passes and hangs correctly (span ratio 0.78 against 0.16).
Nothing measures ring separation, symmetry, or that each ring sits near its own end of the name.

Customer scenario: `علي` or `أمير` in minimal or signature hangs from two rings a centimetre apart at one corner and rotates to near vertical on a chain; every gate is green.

## Major 3. `ringPlacement: "bar"` is unreachable and unproved

It never runs: 0/576 plus about 200 edge cells.
By construction the ink box top is at or below y=164 for every input, and `findSeat` evaluates `candidateY = 44` where the annulus occupies rows 2 to 86, so a seat is always returned; `placement = "bar"` (`:1636`) is reachable only with no carrier candidates, which no input produced.
It was never proved: `identity-gates.md` presents probes (c) and (d) as the bar's evidence and both threw.
`drawBarSuspension` clamps `ringY` to `lowest`, so a piece whose ink starts above y=86 would die on `identity_ring_welded_to_glyph`.
Downstream reading: at `d1464ba` nothing read the field; commit `acb2706` (after this pass began) routes a bar construction to operator review pre-spend, which closes the routing half.

## Major 4. The GDEF mark rule is inert on three of six live styles

Probe `gdef.mts`: `cairo.ttf` (English face of `kufi`) returns class 0 for every glyph; ScheherazadeNew (`minimal`) and Rakkas (`thuluth-inspired`) draw the nuqta inside the base glyph (`n=1`), so class 3 never applies to a dot there.
For those combinations the only defence is the contour area and height fractions, which `docs/DECISION-REGISTER.md:26` and the engine manifest say the rule replaced.
Not exploitable today (the largest-contour tie-break picks the body), but the stated invariant is false and the margin is untuned.

## Major 5. The default `measure-stencils` invocation greens a stale pre-D-020 directory

`apps/jobs/scripts/measure-stencils.mts:44` `DEFAULT_DIR = "docs/goals/overnight-launch/lab/stencils/lab"`, last written in `7b76e5a`, with the pre-fix hole sizes (1186 to 1424 against 1810).
Bare `measure-stencils` prints `MATCH 16/16` and `CLAIM -/-` with the cross-check silently off.

## Minor

1. `apps/jobs/src/identity-anchor.test.ts:3` imports the removed `identityAnchorSvg` (tests untouched by instruction).
2. One-pixel enclosed regions are counted as holes and never floored (`muhammad-ar-classic` `[…,1]`, `noor-ar-classic` `[…,1,1]`).
3. Leading or trailing punctuation (`-Ali-`, `Al-`) steps the ring inward correctly, but the report does not record which candidate index was used, so it is indistinguishable from the blocker 2 collapse.
4. `findSeat` is O(lift x columns x fillet box), about 1.9e8 pixel tests per ring worst case; unbounded because `IDENTITY_RING_MAX_LIFT = IDENTITY_CANVAS`.

## Not falsified

The sweep is real and reproducible; the punch count is a global measurement; `measureRingHoles` measures the decoded PNG with both recentre axes; the fingerprint hashes `pngSha256` so no pre-D-020 stencil can be served; no customer text in any error; no dual implementation remains; build 13/13.
