# Identity engine adversarial review 3 (on `b2ebea4`, 2026-09-08)

Fresh-context adversarial-reviewer over fix pass 3. Verdict: adversarial-2 F-1 is still not closed; fix pass 3 also regressed five name and style combinations.
The lead confirmed HIGH 1 by eye on the reviewer's render of "Ali" in Playfair: the right ring is welded onto the tittle of the i.

| # | Severity | Finding | Owner |
| --- | --- | --- | --- |
| 1 | high | `ringAnchorCarrier` admits any pre-bridge island at least 10% of the largest. In Latin every letter is its own island, so the ratio is to the first letter: the tittle of i is 13.5% in "Ali", 10.5% in "Niki", 14.5% in "Li"; `nunu` ar classic 10.3%. The 9.9% to 11.3% gap existed only over the 21-name sweep. | fix pass 4: mark classifier by shape and position, margin measured over a 35-name x 6-style union corpus |
| 2 | high | `countGlyphPixelsUnderRingMetal` scans only the annulus, so ink under the weld fillet outside the ring is unmeasured, and its two exemption capsules cover 30.8% of the annulus (old 46 px disc: 36.7%; larger than before on 6 of 32 rings). A detached 18x13 mark in the corridor is fully covered by drawn metal and reports welded 0, passed true. | fix pass 4: scan ring plus fillet, exempt exactly the pixels `drawBar` writes |
| 3 | high | Five combinations render under `6d7382b` and throw under `b2ebea4`: Maji kufi (welded 38), أمير kufi (punched 12), قق classic, diwani, signature (welded 217). The search keeps the least-bad seat and the gate then refuses the customer's piece. | fix pass 4: widen the search (inward shift, next anchor candidate, larger lift) |
| 4 | medium | `materializePromptSnapshot` failure is left to the stale sweeper, but the RPC raises deterministically for prompt length, release pin and checksum, and the sweeper has no attempt cap on the queued branch and bumps `updated_at`: an outbox row every two minutes forever. | fix pass 4: classify deterministic raises as terminal |
| 5 | medium | `render-stencils` reads welded and punched from `rendered.construction`, which the solver already throws on, so `MATRIX WELDED-GLYPH 0/216` can only print 0; `aboveAnchor` is arithmetic on claimed centres. | fix pass 4: measure from the decoded PNG |
| 6 | medium | `CLAIM` in `measure-stencils` never reads the script's own decode; five of six assertions are already-thrown gates; a claimed centre 20 px off would still print ok. | fix pass 4: feed the decoded mask and holes; tamper proof |
| 7 | low | The x clamp collapses all 25 shifts to one candidate for edge rings and can only move inward. | fix pass 4 |
| 8 | low | `identity-gates.md` states 18% (measured 36.7%), "the weld and nothing else", and the 10% gap. | fix pass 4: corrected |

Not falsified: the 232-cell sweep is script-produced and reproduces byte for byte (16 production PNGs identical to a fresh render); downscale numbers reproduce, worst scale 0.895; F-7 (release compared before render) and F-4 (three pre-spend sites plus the identity catch go through `blockPreSpendTerminally`) are closed; no customer text in any error string.
