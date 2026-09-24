# Decision register

**Updated:** 9 September 2026

| ID | Decision | Status | Revisit trigger |
| --- | --- | --- | --- |
| D-001 | Next.js 16.2/React 19 on DigitalOcean App Platform (`blr`) | accepted | measured hosting/runtime incompatibility |
| D-002 | pnpm workspace + Turborepo | accepted | repository remains one inseparable app after Goal 02 |
| D-003 | Supabase Mumbai as system of record, Auth, Realtime, Storage | accepted; project re-provisioned 7 Sep 2026 as `jewelo-caleums` (the old project belonged to a login this machine no longer has) | data residency, measured scale, or platform failure |
| D-004 | SQL migrations/RLS + generated Supabase types; no competing ORM migration source | accepted | proved developer/transaction limitation |
| D-005 | Trigger.dev Cloud for durable AI jobs and concurrency | **superseded by D-017 on 7 Sep 2026** (free credits exhausted until 1 October and the user chose not to continue); the durable-execution requirements it recorded still stand | - |
| D-006 | Direct OpenAI GPT Image 2 snapshot for product and worn stills | accepted default | jewelry evaluation gate fails or superior tested profile |
| D-007 | fal.ai as Seedance inference gateway | accepted | access, licensing, quota, or reliability gate fails |
| D-008 | Seedance 2.0 Fast for four 4-second previews | accepted showcase default | conversion/cost evidence favors selected-only or another tested profile |
| D-009 | Seedance 2.0 Standard for optional selected final motion | accepted | quality/cost/identity gate fails |
| D-010 | Deterministic canonical pendant identity precedes generation | accepted invariant | never; implementation may evolve |
| D-011 | Four product pipelines run concurrently; each independently unlocks worn + motion in parallel | accepted invariant | provider limitation forces a documented temporary queue policy |
| D-012 | Anonymous guest first, link identity for durable account/commerce | accepted | legal/fraud requirements |
| D-013 | Modular monolith with web + jobs deployables | accepted | tracing proves independent service boundary |
| D-014 | Managed remote dev/previews; no required Docker/local infra | accepted | explicit user reversal or vendor outage strategy |
| D-015 | No autonomous/open-source media-agent framework in production execution | accepted | a framework proves simpler without duplicating Trigger or adding another runtime |
| D-016 | Motion, Embla, react-zoom-pan-pinch, react-dropzone, native short MP4 video | accepted UI foundation | accessibility/performance evidence requires replacement |
| D-017 | Inngest is the durable job engine, self-hosted as a second DigitalOcean App Platform component; functions are served by `apps/web` at `/api/inngest`; Inngest Cloud is a one-variable switch (`INNGEST_BASE_URL`) | accepted 7 Sep 2026 on user instruction | Inngest Cloud account exists and its free tier suits the load, or a measured operability failure of the self-hosted server |
| D-018 | Runway MCP serving `gpt-image-2` is the bench for all prompt and stencil work; OpenAI stays the production still provider, wired fail-closed and called only at the phase 5 gate in `docs/ROAD-TO-GOLD.md` | accepted 7 Sep 2026 on user instruction | Runway stops serving the same model as production, so lab results no longer transfer |
| D-019 | The identity engine opens the pinned font file bytes and shapes them with HarfBuzz (`harfbuzzjs` in `packages/identity/src/shaping.ts`); no rendering library is ever asked for a font family name. The engine release identifier moves from `caleums-arabic-v3` to `caleums-identity-v4` | accepted 8 Sep 2026, DS-3 default B in `docs/TASKS.md` | HarfBuzz stops shaping a script the shop sells, or a measured stencil regression traces to the WASM build rather than to the fonts |
| D-020 | Jump-ring anchors are chosen at the outline level, before rasterisation: the left ring anchors on the largest contour of the first base glyph and the right ring on the largest contour of the last base glyph, at the outer top corner; marks and small contours (dots, tittles, hamza) are excluded by the font's own glyph data, never by a pixel-area threshold. The raster ruler stays as the independent check that ring metal touches no other ink. Both rings are chosen together, so the piece hangs level and neither end is cantilevered; when no pair of seats meets the level, overhang and span gates the run is routed to operator review with `identity_no_ring_seat` rather than shipped as a piece nobody would wear | accepted 8 Sep 2026 by Sanchay after adversarial reviews 2 and 3 showed the pixel heuristics fail outside their tuning corpus (Noor, Ali) | a font whose base glyphs carry dots as separate glyphs rather than contours, or a style whose first or last glyph has no contour wide enough for a ring |
| D-021 | The stencil is the truth for the whole physical piece, not only for the name. The construction the shopper approved is a shape input to the identity engine and part of the fingerprint: `framed-minimal` draws its rectangular frame and `diamond-rails` its two rails, from validated engine constants, with the two jump rings welded onto that structure and the name welded into it in two places per rail; `classical` and `origami-ribbon` stay the lettering alone, and the ribbon's folded facets are a finish the stencil never claims. `ringPlacement` gains `frame`, with `carrier.kind` as the detail | accepted 9 Sep 2026, P2-2b default decision in `docs/TASKS.md`, after the P2-2 contact sheet showed the registration comparing a bare name with a photograph of a framed pendant | Omran changes what a construction is, or a fifth construction is sold |
| D-022 | The atelier exposes every contract construction and lettering style without a deployment allowlist. `packages/config/src/sellable.ts` keeps that set deterministic and code-owned; the identity solver and verifier remain the authority for exact spelling and safe geometry on each name. | user override 10 Sep 2026; removed the custom deployment restriction while preserving the identity gates | a requested name cannot pass its identity gates, or a style/construction is removed from the contract |
| D-023 | The construction the shopper approved sets the letterform as well as the structure. `CONSTRUCTION_LETTERING` in `packages/identity/src/caleums-arabic-v3.ts` is the one table: `origami-ribbon`, `framed-minimal` and `diamond-rails` draw the Latin name in `cairo.ttf`, tightened by 60 font units per advance so the letters touch, and in capitals, at the weight the lab measured for each (`framed-minimal` 800, `origami-ribbon` 600 since the 24 Sep 2026 addendum, `diamond-rails` 500); their Arabic name is `NotoKufiArabic-Regular.ttf` at `wght=800` with no tracking, because Arabic joins. `classical` keeps the customer's own lettering unchanged. Capitals are a drawing transform: `approvedCharacters` stays exactly as approved and the report carries `drawnText` beside it. The face, the weight, the tracking and the drawn case are fingerprint inputs and the engine release moves to `caleums-identity-v5` | accepted 22 Sep 2026: the client approved the boxy capitals look, and the image lab showed the stencil rather than the prompt sets the letterform | the client approves another letterform, or a lab pass measures a weight or tracking that reads better in metal |

## D-023 detail

Omran approved a boxy capitals look on 22 September 2026.
The first instinct was to ask the prompt for it, and the lab answered that: a prompt that says "boxy capitals" over a stencil drawn in Playfair lower case returns a photograph of the stencil, because the stencil is the piece and the model only lights it.
The letterform therefore has to move into the stencil, which is where D-021 already put the frame and the rails.

The numbers are the lab's, measured on a scratch copy of this engine over 12 cells that all passed every gate: `cairo.ttf` instanced at `wght=800`, 60 font units taken off every glyph advance, and the name drawn in capitals.
The tracking is what makes it one piece of gold rather than a row of letters on a bar: at 60 units the letters touch, so the bridging pass draws no bar between them and no visible bridge survives into the metal.
Arabic is given the same weight on its Kufi partner face and no tracking at all, because Arabic joins and tightening a joined script pulls a joining stroke through the letter before it.

Three things follow, and each is a gate rather than a convention.
The HarfBuzz face cache is keyed by the sha of the bytes *and* the weight, because two weights of a variable face are the same file and a cache keyed by the sha alone would have served the first caller's outlines to the second.
The drawn text is recorded next to the approved text rather than replacing it: the shopper approved their name, the metal spells it in capitals, and the name reader compares the two case-insensitively instead of being told the approved name was something else.
And the face, the weight, the tracking and the drawn case all enter the fingerprint, because the font sha cannot tell two weights apart, so without them a `classical` stencil and a `framed-minimal` stencil of the same name in the same style could have collided on one id.

`classical` is deliberately absent from the table.
It is the lettering the customer chose from the style tiles, and this decision changes nothing about it.

The lab of 22 September shot the four constructions against the reference and moved two numbers off the first table.
`diamond-rails` draws its Latin name at `wght=500` rather than 800: the two rails already carry a lot of metal and at 800 the piece closed up.
And the tracking is a floor rather than a fixed value.
At 60 units a long Latin name still leaves gaps - `MUHAMMAD` at `wght=800` leaves four - the bridging pass joins them with a capsule, and the capsule survives as a visible nub on the top edge of the word, which is a bar between two letters on a piece that is supposed to be made without one.
So the drawn tracking starts at the table's value and is tightened in steps of `IDENTITY_LETTERING_TRACKING_STEP` only while the raster is still more than one island, and never past `IDENTITY_LETTERING_MAX_TRACKING`.
Measured on the fixed engine: `ASMA` and `SARA` settle at 90, `MUHAMMAD` and `NOOR` at 120, and every one of them renders with zero bridges.
The effective value, not the table's, is what the report carries and what the fingerprint hashes, because it is what the metal was drawn at.
Arabic never enters that loop: its tracking is 0 by rule and its islands are nuqta and hamza, which tightening cannot join and must not move.

Two things the lab found are gates rather than lettering, and they are recorded under D-020 and D-021 where they belong: the ring post cap that let `أسماء` hang its left ring on a slanted stalk, and the rail weld that landed inside the bowl of a `U`.

## D-022 detail

The set mirrors `PREVIEW_REQUEST_CONSTRUCTIONS` and
`PREVIEW_REQUEST_LETTERING`, so all four constructions and six lettering styles
are available in both locales. There is no deployment override to get out of
sync with the prompt or identity engine. The solver still fails closed on a
name whose spelling, glyph connectivity, ring seats, or component geometry
does not pass, and the verifier must accept the encoded bytes before a run is
ready.

## D-021 detail

P2-2 registered every lab still against the stencil of its own name and could not separate a correct pendant from a wrong one: the ledger stencils for `framed-minimal`, `diamond-rails` and `origami-ribbon` are bare names while the photograph carries a frame, a rail or a ribbon, so the studio-pass IoU had no separation to give.
The stencil was the truth for the name and silent about the piece, and a verifier cannot gate what the stencil never describes.

What is drawn comes from the look briefs the image lab already proved (`docs/goals/overnight-launch/lab/compile.mjs:57-84`), not from a fresh design.
`framed-minimal`: one thin plain rectangular frame with softly rounded corners, cast as a single piece with the letters, the word welded into it at no fewer than two separate places with the baseline merging into the bottom bar, and the two jump rings cast into the two top corners of the frame and nowhere else.
`diamond-rails`: the lettering held between two straight parallel rails, one along the top and one along the bottom, cast as a single piece with the letters that touch them, and the two rings cast into the two outer ends of the rails.
The brief's rails are two, so the engine draws two; a single bar above the name would be a third product nobody photographed.
The rings go on the top rail, which is the end the chain pulls on.

`classical` and `origami-ribbon` are untouched.
The ribbon is a folded-facet finish rather than geometry, so the stencil describes the same outline as `classical` and the verifier reports the look without claiming it.

Three things this decision does not do.
It does not reintroduce the top rail D-020 deleted: that was a fallback drawn over a name with no seat, this is the pendant the shopper chose and it is welded into the name rather than laid across it.
It does not weaken a gate: one component, exactly two ring holes, zero name pixels punched or under ring metal, the hole floor, the span, tilt and overhang gates all run on the encoded bytes exactly as before, and the rings being level by construction is a reason to keep measuring the tilt rather than to stop.
And it does not claim the ribbon, the stone setting or that no letter ends in mid-air inside the frame - two welds per rail is what the engine draws and all it says.

The numbers live in `packages/identity/src/shaping.ts` beside `IDENTITY_RING_OUTER`, not in `@jewelo/config`.
They take part in the fingerprint and they are the drawing, so a frame thickness that could be changed from a deployment console would be a pendant nobody verified; `@jewelo/config` keeps what an operator may legitimately set, which for constructions is `IDENTITY_RINGLESS_CONSTRUCTIONS` alone.

Two costs, recorded rather than hidden.
The name is laid out before the construction exists, so the structure takes its room from the name: the name is cropped, Lanczos-resampled and re-centred the way `recentre` treats any overflowing piece, `carrier.nameScale` reports the applied scale, and below `IDENTITY_CARRIER_MIN_NAME_SCALE` the piece is refused with `identity_carrier_no_room`.
And a pendant is now two artifacts where it used to be one: the construction id is a fingerprint input, so the same name in `classical` and in `framed-minimal` no longer collides, and every fingerprint minted before this change differs from the one the same specification mints now.

### The weld goes to a stem foot (image lab, 22 September 2026)

A rail weld used to leave from the most extreme ink of its window, and on `MUHAMMAD` the lowest ink of the left window is the bottom of the `U`'s bowl.
The bar dropped from there runs out of the middle of the letter, so the `U` reads as a `Ψ`: a misspelling on the stencil, which is upstream of the verifier and of everything else.
The weld column is now a stem foot or a stem head: the ink at that column, measured unbroken from the rail, has to carry at least `IDENTITY_CARRIER_WELD_MIN_STEM_FRACTION` of the name's own height.
A column under a bowl, at the vertex of a `V`, in the fork of a `Y` or in the gap between two letters carries one stroke and then counter; a stem carries the whole letter.
The run length tells them apart without the engine knowing anything about letter shapes.

Two rails made that not enough.
Welding both rails to one upright builds a bar the full height of the word, and on `diamond-rails` `MUHAMMAD` came out `MIUHAMMIAD` because the `U`'s left stem was carried to both.
So each window is scanned from the outer end of the name inward, and the top rail may not use an upright the bottom rail already used: four tiers, first that exists wins - a free stem, then the same stem both rails must share (`أسماء` has one alef in each outer window, and an alef taken to both rails is a longer alef), then the longest free run for a name whose outer letters have no upright at all (`ASMA` begins and ends on the diagonals of an `A`), then the longest run so a piece is always held at two points.

`diamond-rails` also caps its tightening at 90 units rather than 120: at `wght=500` the letters are narrower, the loop spent the whole allowance, and the double `M` of `MUHAMMAD` ran together into one block.
A bar inside a letter body is a finish; two letters run together is a different word.

### Addendum: `origami-ribbon` Latin at `wght=600` measured and not taken (image lab, 23 September 2026, reverted 24 September 2026)

The origami lab held the prompt byte-identical and moved only the stencil weight, which is the review condition D-023 itself wrote down: "a lab pass measures a weight or tracking that reads better in metal".
Measured on the returned photographs, stroke width over letter height: `LOVE` 0.267 at 800 and 0.192 at 600, `ASMA` 0.347 at 800 and 0.220 at 600.
Both of `ASMA`'s A counters came back as open holes for the first time in eleven attempts, because the counter in the stencil roughly doubles (3879 px at 800, 7678 px at 600) and the model stops reading it as a seam to fill.
`wght=500` was measured in the same round and is not taken: it removes only 6 percent more ink than 600, it did not read slimmer on `ASMA` at all, and it produced the round's single spelling defect, an `M` right stem that merged into the following `A`.
Evidence: `docs/goals/road-to-gold/lab-2026-09-23-origami/verdicts-round3.md` and `ledger.md`.

The photographs read better at 600, but the stencil does not hold together at 600.
At 800 the tightening settles by 90 units and 1 of 48 Latin names needs a bridge bar (`ZOË`, for its diaeresis); at 600 the lighter letters spend the whole 120-unit allowance and 25 names still need bars, `MUHAMMAD` among them with 3 bars and 835 px of bar metal.
D-023 calls a bar across the word the defect, so the stencil geometry outranks the photograph measurement.
Every lighter option was measured on the 48 Latin names of the `render-stencils` geometry sweep, `origami-ribbon` only, rings on:

| Option | Names needing a bar | Total bar px | Refused | `MUHAMMAD` |
| --- | --- | --- | --- | --- |
| `wght=800` (kept) | 1 (`ZOË`) | 2370 | 0 | one piece, no bar, M M distinct |
| `wght=700` | 2 (`NIKI` new) | 3210 | 1 (`ABDULRAHMAN`, pinhole) | one piece, no bar, M M distinct |
| `wght=700`, `trackingMax` 90 | 29 | 18294 | 0 | 3 bars, 810 px |
| `wght=600`, `trackingMax` 90 | 42 | 41808 | 0 | 3 bars, 1185 px |
| `wght=600` | 25 | 19204 | 0 | 3 bars, 835 px |

The rule was the lightest option that adds no bar and no refusal over 800 and keeps the two `M`s of `MUHAMMAD` apart; only 800 qualifies, so `origami-ribbon` Latin stays at 800 with `framed-minimal`.
`wght=700` misses by one name each way: `NIKI` gains two bars and `ABDULRAHMAN` squeezes a counter under the pinhole floor at 120 units.
A per-name weight ladder was not built: it would make the letterform depend on the name, and one weight per construction is what D-023 fingerprints and reviews.
Arabic stays at 800 on every construction and `diamond-rails` stays at 500.
The engine release stays `caleums-identity-v5`: the weight is a fingerprint input, so a stencil cut at 600 while the change was live mints a different fingerprint and is never served for an 800 revision.
`validateStoredIdentityAnchor` refuses such a stencil with `identity_reuse_lettering_mismatch`, which is now a deterministic refusal: the operator is told to start the request again instead of being offered a retry that cannot work.

Six of those deterministic refusals are final only for the deployment that wrote them: `task_prompt_release_mismatch`, `prompt_snapshot_lineage_mismatch`, `identity_pipeline_release_mismatch`, `prompt_snapshot_compiler_stale`, `identity_reuse_font_mismatch` and `identity_reuse_lettering_mismatch` compare a task's pinned row against what is currently deployed - the pinned release, the compiler version this build ships (`STILL_COMPILER_VERSION`, `apps/jobs/src/presentation.ts`), the bytes of the font file this build ships and the face and lettering the construction pins (`apps/jobs/src/identity-anchor.ts`) - so republishing a prompt release, rolling the code back to the pinned pipeline or compiler version, or restoring the earlier font file makes them retryable again, and the operator has to re-open those requests in the database because the queue will never offer them a retry button.

## D-020 detail

Three fix passes tuned raster rules (erosion size, island-area ratio, exemption zones) and each adversarial pass found a name outside the corpus where the ring landed on a dot.
HarfBuzz already returns each glyph's contours and GDEF class, so the choice of carrier stroke is a property of the font data, not a guess about blobs.
Alternative recorded and not taken: a fixed bar or bail behind the name (a product change that needs Omran's view and would change the proven look).

### What GDEF actually decides, and where it decides nothing

The first statement of D-020 said marks and small contours are excluded "by the font's own glyph data, never by a pixel-area threshold".
That is true on four of the six live faces and false on the rest, and adversarial pass 4 (major 4) was right to call it.
Measured over the 48-name matrix corpus, per face, counting shaped glyphs that carry an outline:

| face | style | glyphs | GDEF class 3 |
| --- | --- | --- | --- |
| `NotoNaskhArabic-Regular` | classic, diwani, signature | 286 | 85 |
| `NotoKufiArabic-Regular` | kufi (Arabic) | 286 | 85 |
| `ScheherazadeNew-Regular` | minimal | 207 | 7 |
| `rakkas` | thuluth-inspired | 196 | 0 |
| `cairo` | kufi (Latin) | 259 | 0 (class 0 for every glyph: the face classifies nothing) |
| `PlayfairDisplay-SemiBold` | Latin everywhere else | 259 | 0 (a Latin name shapes no separate mark) |

On `cairo`, `rakkas` and `ScheherazadeNew` the nuqta is drawn inside the base contour, so class 3 never applies to a dot there and the exclusion is contour geometry alone.
What does the work in that case is not a threshold but the tie-break: the carrier is the largest contour by area of the glyph, and a dot is never that.
The two fractions only refuse a glyph whose largest contour is not letter-like, and their margin was measured rather than assumed: the smallest height fraction any real letter body reached across all six faces is 0.435 (`PlayfairDisplay`, the `w` of the longest stress name), which cleared the 0.4 floor by 3.5 points.
That is thin, so fix pass 5 lowered the glyph-relative floor to 0.3, where real bodies clear it by 13.5 points and the tallest dot contour measured on the faces where a dot is its own contour (`cairo` 0.129, `NotoKufiArabic` 0.108) is still 17 points below it.
A standalone dot glyph is a different case and is held out by the run-relative floor, which fix pass 5 also changed: it is measured against the tallest *base* glyph now, not against the run's ink box, because a madda or a damma used to raise that box and disqualify the very letters the ring hangs from.

### What the weld may cover

The seat search and the post-draw gate both refuse a ring whose weld fillet covers pre-ring ink belonging to any contour other than the carrier it is welding to.
Before fix pass 5 the whole fillet capsule was exempt - 39 px wide and up to 165 px long on a lifted ring - so a stem run straight across a mark reported `welded 0`, and the independent harness repeated the same exemption, so the two agreed by construction rather than by measurement.
The harness re-derives ownership from the rings-off render and the carrier the report names, by point-in-polygon on outlines it shapes itself.
Ink that belongs to no contour at all - a bridging bar, the pixel of skin the thickening pass grows outside every outline - belongs to neither plane and is not held against the ring.

### Two rings, two ends

The left ring is sought from the leftmost base glyph inward and the right ring from the rightmost inward; they may never settle on the same glyph while another eligible base glyph exists, and the left glyph must sit left of the right glyph on the canvas.
`identity_ring_span_too_narrow` measures the result on the encoded bytes: the two ring hole centroids must sit at least `IDENTITY_RING_MIN_SPAN_FRACTION` of the finished piece's own ink width apart.
A one-letter name is the one shape that has no second glyph to move to, and it is held to its own floor, `IDENTITY_RING_SHARED_GLYPH_MIN_SPAN_FRACTION`, because the general floor was measured against multi-letter pieces.

### The rail is gone

Fix pass 5 caught a name with no clean seat in a fallback: a rail across the top of the lettering with a ring at each of its ends.
Adversarial pass 5 (major 3) measured the rail and it was not a load path.
On `قق` it touched the name along 11% of its span and the whole pendant hung from the two nuqta of the final qaf through a 24 px bridge; on `آية` in `classic` it covered 37.6% of the madda; on `تسنيم` in `minimal` it touched 11%; and no gate scanned the ink under it.

Making it honest means bridging the rail down to every base glyph and scanning under the rail exactly as a fillet is scanned - the weld machinery a second time, with weaker evidence - and the result is a different physical product, a nameplate on a bar, that the shop has never approved.
Whether such a piece is sellable is a question for Omran (adversarial pass 5, major 4) and it is not answered by building one.
So the rail is deleted. `ringPlacement` has two values, `welded` and `none`, and `none` means the construction carries its own suspension, never a failure.
A name that cannot seat two rings under the gates raises `identity_no_ring_seat`: the solver refuses it inside the identity render, so the run is blocked pre-spend - before the attempt budget, before any reservation, before any provider call - terminal, with a code and no customer text, and the request reaches the shop for review rather than the shopper.
That is the same routing and the same outcome the bar path used to reach through `identity_bar_fallback`, without a piece that pretends to be one.
The flag that made that routing optional, `IDENTITY_BAR_FALLBACK_REVIEW`, was removed on 8 September 2026 together with its schema in `@jewelo/config`, its entry in the DigitalOcean env contract and the `ringPlacement === "bar"` gate in `apps/jobs/src/presentation.ts`: with no rail to build, there is nothing for it to let through.

### Level, and balanced

Fix pass 5 chose the left seat and then the right seat independently, and nothing measured the shape the two of them made.
Adversarial pass 5 measured it: over 547 welded cells the line through the two holes was p50 4.7 degrees off horizontal, p90 15.3 and max 64.7 - `لي` in `minimal` hung almost sideways - and `عائشة` in `classic` put both rings in the right-hand third with two thirds of the piece cantilevered off one corner.

Three things answer it.
The anchor is a ladder rather than a point: every rung is a column of the carrier's load-bearing metal and the top of that column, starting at the outer edge of the stroke and walking inward, so a letter with dots above it - the ta marbuta, the final qaf, the shin - is welded on its outer shoulder from above instead of surrendering its ring to the next letter inward.
A seat search returns not one seat but every row above it that is also clean, so a ring can be raised to meet its partner.
And the two sides are then chosen jointly: every allowed pair of carriers is scored on the finished shape and the best pair wins.

Two gates measure the result on the encoded bytes, not on what the search believed.
`identity_ring_tilt_too_steep` is the angle of the line through the two hole centroids, against `IDENTITY_RING_MAX_TILT_DEGREES`; that line is the line the chain makes, so its angle is the angle the name reads at on the neck.
`identity_ring_overhang_too_wide` is the ink outside the nearer hole on the worse side, against `IDENTITY_RING_MAX_OVERHANG_FRACTION`.
Its ruler is the *name's own* ink box, taken before any ring was drawn and carried into the frame of the encoded piece by the recentre transform (adversarial pass 6, minor 6: the piece box put a ring radius into the numerator and the denominator both, which floored the whole distribution at a constant 0.041 and made every reading a few points lenient).
Span alone cannot see a piece whose two rings are far apart but both in one half.

### On the shoulder, not on a post

Fix pass 6 answered level and balance and left the suspension unmeasured, and adversarial pass 6 measured it: the post between the anchor and the centre of the ring hole ran p50 203 px, p95 346, with 67 of 568 cells carrying a post longer than the whole name was tall, and 56% of the anchors sat in the bottom half of the lettering against a D-020 that says "at the outer top corner".
On the 32 mm pendant that is a 1.2 mm wire up to 10.9 mm long joined to the letter at one point, and on a Latin face the eye reads it as a stroke: `Sara` in `classic` came out `iSarai`, upstream of the verifier and of anything that would have caught it.

Three changes, and the first is the point of the other two.
The anchor ladder is cut to the shoulder of the carrier: the outermost columns of the contour that lie in the top `IDENTITY_RING_ANCHOR_MAX_DEPTH_FRACTION` of the contour's own height, scanned for rather than stepped into, so a face whose outer edge is the middle of a bowl still offers its shoulder instead of collapsing onto the lab anchor in the middle of the letter.
The post is capped at the smaller of `IDENTITY_RING_MAX_POST_FRACTION` of the name's ink height and `IDENTITY_RING_MAX_POST_PX`: the seat search cannot evaluate a seat outside that cap, and `identity_ring_post_too_long` states it again on the finished account, the way `identity_ring_punched_ink` states the punch the search already avoided.
And the score key charges for it. The order is: the two gate violations and the post violation; the tilt to the whole degree; the balance counted in ring radii, which is the overhang a ring seated on the end letter cannot avoid; then the post; then the exact angle, the distance from the top line of the name and the exact balance.
The two quantised terms are there because a tenth of a degree and a fraction of a ring's own width are below what an eye on a neck can resolve and a rod is not: inside those resolutions the shorter post wins, and outside them a pair may not buy level or balance with a rod.
The pass-6 key put continuous overhang above everything below it and left the lift last, so a pair a fraction of a point better balanced beat a pair whose posts were 300 px shorter.

### The cap has to bind (image lab, 22 September 2026)

Fix pass 7 set the two post bounds at 2.0 of the ink height and 400 px, which on a 1024 px canvas is not a bound at all: over the fix-7 letters matrix the post still ran p95 310 px and max 399, and the image lab then photographed exactly what that allows.
`أسماء` in the letters-alone constructions hung its left ring on a 185 px slanted stalk beside the hamza, which reads as an extra stroke of the name - the same class of defect as `iSarai`, one script over.
The search only ever spends a rod to buy level, because `floor(tilt)` sits above the post in the score key, and nothing below 400 px stopped it.
The bound that does the work is now 0.45 of the name's own ink height, against a shoulder weld of 49 px; the 185 px stalk was 0.8 of `أسماء`'s height, and the fraction refuses it while leaving that name a 103 px cap it comfortably meets.
The absolute ceiling beside it was measured rather than guessed: over the four lab names in both scripts and all six styles, 120 px refused five cells for tilt - `ليلى` has a tall lam and a low final ya and cannot be brought level inside 120 px - and 240 px refuses none of the forty-eight without loosening a single short name, because the fraction is what binds those.
So the ceiling only ever catches a name tall enough to earn a rod by being tall.
A pair that cannot be level *and* welded has to step inward to a taller letter or be refused and looked at, and that order is the right one: a refusal costs a review, a rod costs a customer the wrong name.

The preferred ring column is also pulled back inside the name's own ink where there is room for it, bounded by the ring's radius, by half the overhang gate and by half the post cap.
A ring whose body stays inside the name's box costs the piece no width, which is what adversarial pass 6 major 4 was about: 450 of 568 pass-6 cells had a ring against the canvas margin, so the piece measured 1020 px against a 912 px recentre box and the lettering was resampled down to 0.894 for nothing.

### Pinholes

An enclosed region of a few pixels is a casting pinhole, not a counter and not a ring hole.
Measured per pass, they are made by the ring pass - the fillet meeting the stroke - and not by thickening or bridging, so they are closed on the finished raster and `identity_stencil_pinhole` refuses any that survive into the encoded bytes.

A counter is not one of them, and adversarial pass 5 (minor 1) caught the engine filling counters: thirty `e` in Kufi came out with the small ones welded solid before the gate could look at them.
Each small region is now traced back through the recentre transform to the raster as the rasteriser painted it.
A region that still holds at least `IDENTITY_STENCIL_COUNTER_REMNANT_FRACTION` of the counter it came from, scaled, is that counter and is left open, so the gate refuses the piece - a 13 px counter is a letter that did not cast, and welding it shut is not the fix.
A region below that is what is left after the thickening closed a counter outright, which is a sliver of void and is filled.

## D-019 detail

The engine used to name a font family and let the renderer find it.
sharp's bundled Pango never consults fontconfig on macOS, so "Playfair Display" became the system sans and "Noto Kufi Arabic" and "Noto Naskh Arabic" both resolved to the same fallback face: Kufi and Naskh produced byte-identical stencils (`268f77d4...` for نور, `dbb5dccf...` for أسماء) and the report still said the characters were exact.
A name is the product, so a stencil that depends on which fonts a machine happens to have installed is not a product.

Option A was to keep Pango and only prove stencils on Linux, which makes every laptop result meaningless and leaves the family-name lookup in place.
Option B, taken here, is to read the bytes of one pinned file, hash exactly those bytes into `fontSha256Measured`, and shape them with HarfBuzz with an explicit script, direction and language.
Joining forms, marks and ligatures then come from that file's own GSUB and GPOS tables, and the same bytes shape the same way on the laptop, on `home-mini` and in the DigitalOcean buildpack.
`exactCharactersPreserved` stopped being a literal and became a measurement: no glyph id 0 in the shaped buffer, and every NFC code point covered by a cluster and present in the font.

The release identifier moves to `caleums-identity-v4` because the engine now serves both scripts and no longer depends on any installed font.
The fingerprint already hashes the engine release, so every artifact fingerprint changes and no old stencil can be mistaken for a new one; the fonts directory keeps its `caleums-arabic-v3` name so no font file has to move.
Font and WASM assets resolve from `import.meta.url`, never `process.cwd()`, so the deployed buildpack reads the same file whatever directory it starts in.

## D-018 detail

Runway is not taking a locked provider role, so this does not reopen D-006.
It serves the same model the production adapter calls, and the lab already invokes
the production identity renderer unmodified, so a prompt proven on Runway is the
prompt OpenAI runs. The lab's output is a text prompt plus reference images, both
provider neutral. Credits are effectively unlimited for this work, which removes
cost as a reason to stop short of real generation and leaves only correctness.
Iterating against the paid OpenAI endpoint is now a mistake, not a shortcut.

## D-017 detail

- Chosen because Inngest Cloud was not signed in when the replacement had to
  ship. The fallback in the goal document is what was built.
- Self-hosted server: Docker Hub `inngest/inngest:v1.44.0-amd64`, `inngest start`,
  `internal_ports: [8288]`, one instance, no public ingress route.
- Persistence: `--postgres-uri` on the Supabase IPv4 **session** pooler with
  `search_path=inngest`. Queue and run state are in-process (in-memory Redis
  with SQLite snapshots) and App Platform has no persistent volume, so a restart
  loses in-flight run state. That is tolerable only because Supabase plus the
  outbox and the two-minute stale sweeper remain the durable truth, and it is
  the main reason to move to Cloud or add `--redis-uri` later.
- Exactly-once: the outbox `dispatch_idempotency_key` is sent as the Inngest
  event id. No function-level `idempotency` key, so a legitimate re-dispatch
  under a new key still runs.
- `INNGEST_CRON_ENABLED=1` is set on exactly one environment, because the cron
  functions claim work from the shared outbox with service-role credentials.

## Capacity gates

- OpenAI project quota must support the intended four-way GPT Image 2 fan-out and progressive worn work.
- fal account concurrency must be verified at four or higher before `preview_all` is launch-ready.
- Provider limits and model-spend ceilings remain configuration with measured evidence.
