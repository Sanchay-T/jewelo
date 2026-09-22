# Reference visual spec - CALEUMS specification sheets and the original shipped-look renders

Read-only extraction pass, 2026-09-22, no code changed and no image generated.

Scope: `context/whatsapp/media/38..43` (Omran's high-fidelity CALEUMS specification sheets) plus `01`, `03`, `15` and `18` (the broad-exploration renders that the four shipped constructions were named after).

Every file below was opened with the Read tool and looked at.
Pixel measurements were taken with `python3` + Pillow in the session scratchpad; no script was added to the repository.

## Measuring method

Two masks were used, and the report says which one produced each number.

For the four cream-background renders (`01`, `03`, `15`, `18`) a saturated-gold mask `R - B > 70` was scanned row by row and column by column, which excludes the cream sweep and the grey contact shadow but keeps the metal, and edge positions were read from the run boundaries.
Where a specular highlight split one bar into two runs the bar was measured from the first run's start to the last run's end, so a quoted bar thickness is the full outer-edge-to-outer-edge metal.
Bar thickness was always sampled on at least three columns clear of any letter, and the quoted value is the median.

For the six navy specification sheets the pavé is dense enough that a threshold scan returns noise, so stated dimensions are transcribed verbatim from the sheet's own specification block and only gross proportions were checked by eye against those numbers.

Production geometry was measured the same way on `docs/goals/overnight-launch/lab/stencils/asma-en-classic-norings.png`, which gives the name ink box as 888 x 264 px on the 1024 px engine canvas, and the carrier ratios were then computed from the `IDENTITY_CARRIER_*` constants in `packages/identity/src/shaping.ts`.

## File 38 - ASMA Drop Origami

The sheet shows a vertical cascading monogram where A, S, M and A interlock downward as folded planes, presented in four named angles: FRONT, RIGHT 3/4, LEFT 3/4 and SIDE.

The SIDE view is an edge-on strip that exists only to show metal thickness and the recessed sapphires set into the side walls, and it shows a single tapered trapezoid bail at the top, with the chain passing through that one bail and no jump ring anywhere.

Stated materials: "18K YELLOW GOLD PENDANT", "HANDCRAFTED IN 18K GOLD".

Stated stones, transcribed verbatim from the STONE SUMMARY block: ENTRY STONE "1. Natural Diamond (Bezel Set) 0.18 ct | VS | F+"; NORTH STAR STONE "1. Blue Sapphire (Round) 0.22 ct | VVS | Royal Blue"; PERSONAL ACCENT "1. Pink Sapphire (Round) 0.18 ct | VVS | Medium Pink"; EXIT STONE "1. Blue Sapphire (Marquise) 0.28 ct | VVS | Royal Blue"; HIDDEN SAPPHIRES "10. Blue Sapphires (Recessed) ~0.06 ct total | VVS | Royal Blue".

Stone placement is explicitly sequential and meaning-bearing: the round diamond is bezel-set at the top entry point, the round blue sapphire sits at the upper fold, the round pink sapphire sits at the right of the lower M, the marquise blue sapphire hangs at the very bottom as a drop below the last A, and ten sapphires are recessed into the side walls where only the wearer sees them.

There is a BACKPLATE ENGRAVING panel showing the reverse as a solid plate engraved with the Caelum constellation and the word "Caelum", with the recessed sapphires appearing as small blue dots along the plate's edge.

No linear dimensions are printed on this sheet.

Shipped-construction evidence: this is `origami-ribbon` fidelity evidence for the folded-facet finish only, and it is not evidence for any shipped attachment, because the piece hangs from one centre bail and the four shipped constructions all assume two rings.

Measured proportions, by eye against the sheet's own SIDE view: the side profile is roughly one seventh of the front view's width, so the metal reads as about 0.14 of the face width, which is far thicker than a flat nameplate.

The marquise drop hangs below the last A on its own short link, so the pendant is two articulated components, not one casting.

## File 39 - ASMA Open-Frame Suspended Origami

The sheet shows an elongated octagonal open frame with ASMA suspended inside it, presented in three named angles: FRONT, SIDE and REAR ANGLE.

The body copy states the construction in words: "Each letter is a folded ribbon of 18k yellow gold, suspended in space and anchored at intentional points within a delicate architectural frame."

The letters are connected to the frame by short runs of two or three chain links, not by cast welds, and this is visible at the A's upper left, the S's left shoulder and the M's lower left in the front view.

Stated stones, transcribed verbatim from the STONE SUMMARY block: "1 x Round Diamond Entry Stone 0.10 ct (approx.)"; "2 x Blue Sapphires North Star (Round 0.16 ct) Exit Stone (Marquise 0.25 ct)"; "1 x Pink Sapphire Personal Accent 0.12 ct (approx.)"; "Hidden Blue Sapphires 4 x 1.0 mm (approx.) Recessed in folds"; and the closing line "All stones natural. Set in 18k yellow gold."

The 1.0 mm hidden-sapphire callout is the only linear dimension printed anywhere on this sheet.

The entry diamond is bezel-set into the frame's top apex, directly under a single tapered trapezoid bail, and the chain again passes through that one bail.

The north-star sapphire sits in an eight-point star-burst setting that is itself a structural node of the frame, and the marquise exit sapphire hangs bezel-set at the frame's bottom apex.

The REAR ANGLE view shows the frame is a flat ribbon of metal standing on edge, so the frame's depth is several times its face width.

Shipped-construction evidence: this is the strongest `framed-minimal` reference on the sheets, and it disagrees with production on three structural points at once, because the frame is an octagon rather than a rounded rectangle, the letters are suspended on links rather than welded to the rails, and the piece hangs from one centre bail rather than two corner rings.

Measured proportions, by eye against the FRONT view: the frame's outer box is about 1 unit wide to 2.1 units tall, so this is a portrait frame, which is the transpose of every shipped `framed-minimal` render.

The clear gap between the letters' ink and the frame's inner edge is roughly 0.10 to 0.15 of the frame's inner width on the left and right and close to zero at the M, where the letter crosses in front of the frame rail.

## File 40 - ASMA Stacked Origami

The sheet shows a two-tier monogram, AS above and MA below, in four named angles: FRONT, RIGHT 3/4, LEFT 3/4 and SIDE.

Stated materials and stones, transcribed verbatim from the METAL & STONE SUMMARY block: "Metal 18K Yellow Gold"; "Finish Satin & Polished"; "Diamond (Entry) 1 x 0.12ct Round Brilliant"; "Blue Sapphire (North Star) 1 x 0.18ct Round"; "Pink Sapphire (Accent) 1 x 0.10ct Round"; "Blue Sapphire (Exit) 1 x 0.20ct Marquise"; "Hidden Sapphires 6 x 1.0mm Round"; "Total Weight (Est.) 8.2 - 9.2g".

The total-weight figure and the 1.0 mm hidden-stone size are the only numbers on the sheet; there is no width, height or thickness callout.

The SIDE view is again an edge-on strip showing a tapered trapezoid bail at the top and a column of recessed sapphires down the side wall, and it confirms a single centre bail with no jump ring.

The BACKPLATE ENGRAVING panel shows a solid shield-shaped reverse engraved "Caelum / FIDE . VIA . LUX" with the constellation, and a CAELUM CONSTELLATION detail disc beside it.

The stated finish is the important line: "Satin & Polished" means two finishes on one piece, with the fold faces satin and the fold edges polished, and that is exactly what makes the facets read in the hero image.

Shipped-construction evidence: this is `origami-ribbon` fidelity evidence for the facet treatment and for the two-finish rule, and it is not evidence for any shipped attachment.

Measured proportions, by eye against the FRONT view: the piece is about 1 unit wide to 1.6 units tall, and the SIDE view's metal reads as roughly 0.12 of the front view's width.

## File 41 - ASMA Art Deco

This is the most useful sheet in the set, because it is the only one whose subject is a horizontal framed nameplate with two end attachments, which is the shipped `framed-minimal` and `diamond-rails` topology.

Views: a large front-on hero, then ANGLED VIEW, SIDE PROFILE, HERO SCALE ON CHAIN, four macro STONE DETAILS tiles and a BACKPLATE ENGRAVING view.

Stated dimensions, transcribed verbatim from the PENDANT SPECIFICATIONS block:

```
Width:      58.0 mm
Height:     22.5 mm (excluding bails)
Thickness:  3.8 mm
Bail Opening: 4.0 mm
Finish:     High Polish / Satin Accents
Weight (Est.): 15.5 - 16.5 grams
```

Stated materials and stones, transcribed verbatim from the STONE & METAL SUMMARY block: "18K YELLOW GOLD High polish with fine satin accents"; "ROUND BRILLIANT 28 pcs / ~0.40 ct tw G-H Color / VS Clarity"; "BAGUETTE CUT 32 pcs / ~0.55 ct tw G-H Color / VS Clarity"; "ROYAL BLUE SAPPHIRES 3 pcs / ~0.25 ct tw Natural, Heated".

Attachment geometry: there are two elongated tapered bails, one at each end of the frame's top edge, each bail pavé-set with round diamonds along its length, and each bail is closed by its own small round link through which the chain passes.

The bails are not round jump rings; they are flat tapered tubes whose long axis is vertical and whose stated aperture is 4.0 mm, which is 0.18 of the stated 22.5 mm pendant height and 1.05 of the stated 3.8 mm metal thickness.

The SIDE PROFILE view shows the piece is a solid slab with recessed sapphires set into the side wall and a visible stepped edge, not a flat cut-out.

Shipped-construction evidence: this is direct `framed-minimal` fidelity evidence for outer aspect, metal thickness and end-attachment placement, and it is secondary `diamond-rails` evidence for the stepped top and bottom rails.

Measured proportions, from the stated numbers: outer width to outer height is 58.0 / 22.5 = 2.58; thickness to height is 3.8 / 22.5 = 0.169; thickness to width is 3.8 / 58.0 = 0.066; bail opening to thickness is 4.0 / 3.8 = 1.05.

Measured by eye on the hero: the frame's outer bar is about 0.12 of the letter cap height, the stepped inner border adds a second line at about the same weight, and the clear gap between the cap line and the inner border is about 0.10 of the cap height.

Corner geometry: the frame corners are square with a stepped Art Deco shoulder, and there is no rounding anywhere on the outer profile.

## File 42 - ASMA Celestial / Constellation

Views: front-on hero, then ANGLED VIEW, SIDE PROFILE, FRONT VIEW, four macro GEMSTONE DETAILS tiles and a BACKPLATE ENGRAVING view.

Stated dimensions, transcribed verbatim from the PENDANT SPECIFICATIONS block:

```
Width:      58.0 mm
Height:     28.5 mm (excluding bails)
Thickness:  4.2 mm
Bail Opening: 4.5 mm
Finish:     High Polish / Satin Accents
Weight (Est.): 16.5 - 18.5 grams
```

Stated materials and stones, transcribed verbatim: "18K YELLOW GOLD High polish with fine satin accents"; "ROUND BRILLIANT 18 pcs / ~0.40 ct tw G-H Color / VS Clarity"; "BAGUETTE CUT 32 pcs / ~0.55 ct tw G-H Color / VS Clarity"; "BLUE SAPPHIRE NORTH STAR 1 pc / ~0.25 ct tw Natural, Heated"; "PINK SAPPHIRE PERSONAL STAR 1 pc / ~0.18 ct tw Natural, Heated"; "BLUE SAPPHIRE EXIT STONE 1 pc / ~0.22 ct tw Natural, Heated".

The name ASMA is a solid baguette-pavé nameplate; the celestial web of thin round wires, orbital ellipses and bezel star nodes is a separate outer structure that crosses in front of and behind the letters.

Attachment geometry is the same two-bail arrangement as file 41, with each pavé bail at one end of the piece and a small round link between bail and chain, and the bails attach to the outer wire cage rather than to the nameplate itself.

The SIDE PROFILE view shows a flat slab with recessed sapphires in the side wall, matching file 41.

Shipped-construction evidence: this is `diamond-rails` fidelity evidence in spirit, because the letters are carried by thin linear metal running past them and terminating in the two end attachments, and it is also the reference for the "floating bezel accents along the rails" language in file 18.

Measured proportions, from the stated numbers: outer width to outer height is 58.0 / 28.5 = 2.04; thickness to height is 4.2 / 28.5 = 0.147; thickness to width is 4.2 / 58.0 = 0.072; bail opening to thickness is 4.5 / 4.2 = 1.07.

Measured by eye on the hero: the orbital wires are about 0.06 of the letter cap height, roughly a third to a half of the weight of the nameplate's own border, and the wires overhang the letters by about 0.25 of the name's width on each side.

## File 43 - ASMA Ribbon Flow

Views: front-on hero, then ANGLED VIEW, SIDE PROFILE, HERO SCALE ON CHAIN, four macro GEMSTONE DETAILS tiles and a BACKPLATE ENGRAVING view.

Stated dimensions, transcribed verbatim from the PENDANT SPECIFICATIONS block:

```
Width:      58.0 mm
Height:     22.5 mm (excluding bails)
Thickness:  4.2 mm
Bail Opening: 4.0 mm
Finish:     High Polish / Satin Accents
Weight (Est.): 15.5 - 16.5 grams
```

Stated materials and stones, transcribed verbatim: "18K YELLOW GOLD High polish with fine satin accents"; "ROUND BRILLIANT (ENTRY) 1 pc / ~0.10 ct tw G-H Color / VS Clarity"; "NORTH STAR BLUE SAPPHIRE 1 pc / ~0.20 ct tw Natural, Heated"; "PINK SAPPHIRE (ACCENT) 1 pc / ~0.08 ct tw Natural, Heated"; "BLUE SAPPHIRE (MARQUISE EXIT) 1 pc / ~0.18 ct tw Natural, Heated".

The piece is a flowing script ASMA cast as a rounded ribbon with no frame and no rails, and its cross-section is round rather than flat, which the SIDE PROFILE view confirms.

Attachment geometry is different from 41 and 42 and is the closest of all six sheets to production: the left end of the script A terminates in a bezel-set round diamond that is itself a link to the chain, and the right end of the final A terminates in a bezel-set marquise sapphire, so the chain attaches at the two outer ends of the lettering with no frame, no rail and no separate eyelet.

Shipped-construction evidence: this is `classical` fidelity evidence, and it is the only sheet in the set where the letters alone are the whole pendant.

Measured proportions, from the stated numbers: outer width to outer height is 58.0 / 22.5 = 2.58; thickness to height is 4.2 / 22.5 = 0.187.

Measured by eye on the hero: the ribbon's stroke is about 0.16 of the ascender height at its widest and about 0.06 at its thinnest, so this is a modulated stroke with roughly a 2.7 to 1 thick-to-thin contrast, not an even-weight stroke.

## File 03 - Framed Minimal, original render of the shipped look

The render shows a horizontal open rectangular frame with the name inside, on a cream sweep, chain to both top corners.

The name in the render is misspelled as `lsma`, with a lowercase l where the A belongs, which is worth recording because it is the exact failure class the identity gate exists to catch.

Gold-mask measurements on the 1122 x 1402 source, sampled at x = 360, 420, 600, 700 and 820 for the horizontal bars and y = 600 and 700 for the vertical rails:

- top bar thickness 26 px, from y 504 to y 530;
- bottom bar thickness about 31 px, from y 810 to y 841, wider because its lower edge shows cast depth;
- left vertical rail about 32 px, from x 232 to x 264;
- right side is not a plain rail but a wider pavé-set bar of about 44 px carrying five round diamonds;
- frame outer box about 690 x 337 px, so outer aspect is 2.05;
- ascender height of the l stem 186 px, from y 564 to y 750;
- clear gap from the top bar's inner edge to the ascender top 34 px;
- clear gap from the left rail's inner edge to the l's left edge 29 px;
- jump ring outer diameter about 50 px, wire about 15 px, aperture about 22 px, measured on rows y 448 to 505.

Derived ratios: bar thickness to ascender height 26 / 186 = 0.140 for the top bar and 32 / 186 = 0.172 for the side rails; ink-to-frame clear gap to ascender height 34 / 186 = 0.183 at the top and 29 / 186 = 0.156 at the left; ring outer diameter to bar thickness 50 / 26 = 1.92; frame outer height to ascender height 337 / 186 = 1.81.

Corner radius: there is none, because each of the four corners is a square set-stone box about 50 px on a side carrying one round diamond, so corner radius to bar thickness is 0 and the corner box is 1.9 bar thicknesses across.

Ring placement: both rings sit directly above the two top corner boxes, on the corner itself, not inset along the top bar.

Structural member production does not draw: a thin horizontal bar runs at the letter baseline from the left rail to the right bar, and the letters stand on it; this is visible at y 745 to 765 and it is what actually carries `l` and `a`, because neither letter reaches the top or side rails.

## File 15 - Origami Ribbon Asma, original render of the shipped look

The render shows ASMA whose letters and their enclosing rectangle are one continuous folded ribbon, on a cream sweep, chain to both top corners.

Gold-mask measurements: the piece's bounding box is x 209 to 905 and y 520 to 801, so 696 x 281 px, outer aspect 2.48.

The outer rectangle's top ribbon run is about 44 px deep at x = 300 and about 62 px at x = 700, so the ribbon width varies by roughly 1.4 to 1 across the piece rather than staying constant.

Four small square bezel diamonds sit at selected fold points: top left corner, the A's lower left fold, the S-to-M junction and the final A's lower right corner.

The sheet's own copy names the build logic as "continuous ribbon, geometric planes, sculptural depth" and the style as "folded origami ribbon rectangle".

Derived ratios: the ribbon's median width to the letter cap height is about 50 / 200 = 0.25, so the ribbon is a quarter of the cap height, which is a heavy stroke.

The silhouette is a filled rectangle, and the letters are negative space cut out of it, which the bare-name stencil cannot express.

## File 18 - Floating Diamond Rails Asma, original render of the shipped look

The render shows outline-weight ASMA held between a top rail and a bottom rail, on a cream sweep, chain to both rail ends.

Gold-mask measurements on the 1122 x 1402 source:

- piece bounding box x 176 to 949 and y 500 to 793;
- top rail thickness 26 px, from y 549 to y 575, sampled at x = 250, 450, 650 and 900;
- bottom structure is two members, an inner sub-rail of about 16 px at y 727 to 743 that the letters' feet stand on, and the main lower rail of about 18 px at y 759 to 777;
- letter stroke width 11 to 13 px, sampled on the A's uprights at x = 250 and 260;
- letter cap height about 165 px, from y 580 to y 745;
- jump ring outer diameter about 48 px, measured on rows y 495 to 545.

Derived ratios: rail thickness to cap height 26 / 165 = 0.158; letter stroke to rail thickness 12 / 26 = 0.46, so the rail is more than twice the weight of the lettering; ring outer diameter to rail thickness 48 / 26 = 1.85; rail overhang per side about 29 px, which is 1.1 rail thicknesses; clear gap from the top rail's inner edge to the cap line about 10 px, which is 0.06 of the cap height and 0.38 of the rail thickness.

Three bezel-set round diamonds float on the rails, two on the top rail and one on the bottom rail, each about 34 px across and each sitting proud of the rail so the rail passes behind it.

Ring placement: both rings overlap the outer ends of the top rail and hang outboard of them, which matches the production prose.

## File 01 - Rectangular Asma, original render of the shipped look

The render shows a rectangular nameplate where the frame and the letters are the same continuous outline stroke, on a cream sweep, chain to both top corners.

Gold-mask measurements: top bar about 23 px at y 563 to 586, bottom bar about 20 px at y 740 to 760, side rails about 26 px, letter stroke 14 to 16 px, frame outer box about 682 x 197 px, outer aspect 3.46.

Diamond placement is asymmetric by design: three small pavé stones in the top-left corner and two in the bottom-right corner, and nowhere else.

The sheet's copy calls the style "rectangular nameplate built from the lettering" and the build logic "integrated frame, clean geometry, modern balance", so the frame here is not a container the letters sit inside but an extension of the letters themselves.

Shipped-construction evidence: this is a second `framed-minimal` reference, and unlike file 03 it shows the frame and the letters at nearly the same stroke weight, 23 versus 15 px, a ratio of 1.5 rather than the 2 to 1 of file 18.

## Photography, against the four `STILL_VIEW_BRIEFS`

Every disagreement below is named against the exact brief text in `packages/ai/src/prompt-registry.ts:119-141`.

### studio

The brief says "Background is a plain warm off-white matte paper sweep."

Files 01, 03, 15 and 18 agree exactly, with a warm cream sweep, a soft contact shadow and no props.

Files 38 to 43 disagree: the hero of every specification sheet stands on a deep navy-to-black field with a vignette and, in 41, 42 and 43, a full mirror reflection of the pendant on a glossy dark table.

The brief says "The pendant lies almost flat, seen from just off straight-on"; 41, 42 and 43 agree on the hero but each adds a separate ANGLED VIEW at roughly 30 degrees, which the four-view contract has no slot for.

The brief says "The chain runs away from both rings and settles in a relaxed curve on the surface"; files 38, 39 and 40 disagree because the chain runs vertically out of the top of the frame from one bail and is cropped, not settled.

### on_skin

The brief says "The necklace worn by one adult woman, framed from the base of the neck to the top of the chest, face out of frame."

None of the ten files has a worn shot at all, so there is zero reference fidelity for `on_skin` in this set; the nearest thing is the "HERO SCALE ON CHAIN" tile in 41, 42 and 43, which is a scale demonstration on a bare dark ground.

The brief says "Daylight from a large window on the left"; the sheets are lit frontally and symmetrically from above, so even the fill direction has no reference support here.

### close_up

The brief says "with one jump ring and the first links of the chain threaded through it clearly in frame".

Every macro tile on 38 to 43 disagrees, because they crop to stone and metal only and no macro tile in the set shows a ring or a chain link.

The brief says "Every letter of the name ... sits fully inside the frame with a clear band of background on all four sides. No part of the pendant touches or crosses the frame edge - a name cropped at the edge is wrong."

The sheets disagree directly: the "BAGUETTE DIAMONDS IN LETTER FORMS" tile on 41 shows a single S bleeding off three edges of the tile, and the "ORIGAMI FOLDS" tile on 39 shows a fragment of a letter with no letter boundary in frame at all.

The brief says "Shallow but sufficient depth of field so the near edge is sharp and the far end falls off gently"; every sheet render is effectively all-in-focus, so the reference has no depth-of-field falloff to copy.

The brief says "angled so the thickness of the cast metal edge is visible along the strokes"; the sheets satisfy this with a dedicated SIDE PROFILE panel instead, which is a fifth view the contract does not have.

### dark

The brief says "The pendant lies on a dark textured stone slab".

Files 41, 42 and 43 disagree: the surface is a polished reflective plane that returns a clean mirror image of the pendant, with no stone texture anywhere.

The brief says "lit by one narrow soft source from the upper left so the gold reads as a bright edge against deep shadow"; the sheets use a broad frontal key plus a warm rim, so the gold reads as bright faces rather than a bright edge.

The brief says "The whole pendant and both rings stay readable"; on 38, 39 and 40 there is one bail rather than two rings, so the brief's own success condition cannot be evaluated against them.

## Where the current prose and constants contradict the references

### `PENDANT_CONSTRUCTION_PROSE` - `framed-minimal`

Quote, `packages/ai/src/prompt-registry.ts:182-183`:

> "Framed minimal. The lettering sits inside one thin plain rectangular gold frame with softly rounded corners, cast as a single piece with the letters and joined to them where the strokes reach the frame."

File 03 has square corners occupied by set-stone boxes and file 41 has square stepped Art Deco corners, so "softly rounded corners" is contradicted by both framed references.

File 39 says in its own body copy that the letters are "suspended in space and anchored at intentional points within a delicate architectural frame", and shows link chains doing the anchoring, so "cast as a single piece with the letters" is contradicted by the only high-fidelity framed sheet.

Quote, `packages/ai/src/prompt-registry.ts:184`:

> "The frame is a simple even bar with no ornament, no engraving and no second border."

All three clauses are contradicted at once: file 03's frame carries four corner diamonds and a five-stone pavé side bar, file 41's frame carries a stepped second border all the way round plus sunburst terminals, and every one of files 38 to 43 has an engraved constellation backplate.

"A simple even bar" is also contradicted by measurement, because in file 03 the top bar is 26 px, the bottom bar 31 px and the right bar 44 px, so the reference frame is deliberately uneven.

Quote, `packages/ai/src/prompt-registry.ts:186-188`:

> "The word is continuous metal into the frame at more than one place, no letter, foot, tail or terminal ends in mid-air inside the frame".

File 03 satisfies this only through the baseline bar that production does not draw; with the production stencil's two welds per rail, a name like `lsma` whose letters reach neither the top nor the sides has nothing to weld to.

### `PENDANT_CONSTRUCTION_PROSE` - `diamond-rails`

Quote, `packages/ai/src/prompt-registry.ts:190-192`:

> "The lettering is held between two straight parallel gold rails, one running along the top and one along the bottom ... The rails are narrow, flat and perfectly straight, the same metal as the letters."

File 18 has three rails, not two, because the bottom is a stepped pair, an inner sub-rail the letters stand on and a main rail offset below it, and that step is the whole point of the look's name, "floating".

File 18's rails also carry three bezel-set diamonds, and file 42's carriers are curved orbital wires rather than straight rails, so "perfectly straight" holds for 18 and fails for 42.

### `PENDANT_CONSTRUCTION_PROSE` - `origami-ribbon`

Quote, `packages/ai/src/prompt-registry.ts:179-180`:

> "The ribbon keeps a constant width and never doubles back over itself."

File 15 contradicts the first clause by measurement, 44 px at x = 300 against 62 px at x = 700, and files 38 and 40 contradict the second clause, because the whole point of the drop and stacked monograms is that the ribbon folds back across itself where letters interlock.

Quote, `packages/ai/src/prompt-registry.ts:180`:

> "The folds are a finish on the metal, not a change of shape: the outline stays exactly as @stencil draws it."

File 15's silhouette is a rectangle with the letters as negative space, and files 38 and 40 are cascades whose outline is nothing like a bare name, so on the references the folds are unambiguously a change of shape.

File 40's stated finish, "Satin & Polished", is a two-finish specification that the prose does not carry at all, and it is the mechanism that makes the facets read.

### `PENDANT_CONSTRUCTION_PROSE` - `classical`

Quote, `packages/ai/src/prompt-registry.ts:169-170`:

> "Stroke weight is even, edges are softly rounded where a polishing wheel would reach, and the metal has a single consistent thickness."

File 43 contradicts "stroke weight is even" with roughly a 2.7 to 1 thick-to-thin modulation in its script ribbon, and the sheet's own hero makes that contrast the identity of the look.

### The still template's material line

Quote, `packages/ai/src/prompt-registry.ts:659`:

> "Softly polished edges, consistent metal thickness, no ornament."

"No ornament" is contradicted by every one of the ten files, all of which carry stones, and by the four spec sheets that state "High Polish / Satin Accents" or "Satin & Polished", which is two finishes rather than one.

### The attachment paragraph

Quote, `packages/ai/src/prompt-registry.ts:676`:

> "Exactly two jump rings, no more and no fewer. Both are closed rings of the same gold, grown out of the body of the piece".

Files 38, 39 and 40 have exactly one attachment, a tapered trapezoid bail at the top centre, so the rule is flatly wrong for half the high-fidelity set.

Files 41, 42 and 43 have two attachments in the right places but they are elongated pavé or plain bails with a stated 4.0 to 4.5 mm aperture, each joined to the chain by its own small round link, so even where the count matches, "closed rings" does not describe the reference hardware.

### `IDENTITY_CARRIER_RAIL_WIDTH`

Quote, `packages/identity/src/shaping.ts:475-480`:

> "Rail thickness of a frame or a rail, in pixels: about 1.1 mm of metal on a 32 mm pendant ... `export const IDENTITY_CARRIER_RAIL_WIDTH = 26;`"

On the production stencil the name ink box for `asma-en-classic` is 888 x 264 px, so 26 px is 0.098 of the ink height.

File 03 measures 0.140 for its top bar and 0.172 for its side rails, and file 18 measures 0.158, so production's carrier is between 1.4 and 1.75 times too thin relative to the lettering.

The same conclusion arrives independently from the ring: the reference ring-outer-to-bar ratio is 1.92 in file 03 and 1.85 in file 18, while production is 84 px of ring diameter over 26 px of rail, which is 3.23, so either the rail thickens to about 44 px or the ring shrinks by half.

### `IDENTITY_CARRIER_FRAME_INSET`

Quote, `packages/identity/src/shaping.ts:482-483`:

> "Clear gap between the name's ink box and the inner edge of a frame rail. `export const IDENTITY_CARRIER_FRAME_INSET = 34;`"

34 px over 264 px of ink height is 0.129, against 0.183 at the top and 0.156 at the left in file 03, so production's frame crowds the name by about a third.

The ratio to the bar itself happens to agree, 34 / 26 = 1.31 in production against 34 / 26 = 1.31 in file 03, which means the inset must be raised alongside the rail if the ratio to the bar is to be preserved.

### `IDENTITY_CARRIER_FRAME_CORNER_RADIUS`

Quote, `packages/identity/src/shaping.ts:486-490`:

> "Corner radius of the frame's centreline, in pixels (\"softly rounded corners\" in the look brief). ... `export const IDENTITY_CARRIER_FRAME_CORNER_RADIUS = 44;`"

44 px of radius on a 26 px bar is 1.69 bar thicknesses of rounding.

File 03 has square corners with a 50 px stone box, file 01 has square corners, and file 41 has square stepped corners, so the reference value for this ratio is 0 in all three framed references and the constant's own justifying quote has no reference support.

### `IDENTITY_CARRIER_RAIL_GAP`

Quote, `packages/identity/src/shaping.ts:499-500`:

> "Clear gap between the name's ink box and the inner edge of a `diamond-rails` rail. `export const IDENTITY_CARRIER_RAIL_GAP = 34;`"

File 18 measures about 10 px of gap against a 26 px rail and a 165 px cap, which is 0.38 rail thicknesses and 0.06 of the cap height, while production is 1.31 rail thicknesses and 0.129 of the ink height.

Production's rails therefore float roughly twice as far from the lettering as the reference does, which is exactly what makes a production `diamond-rails` piece read as a name inside a box rather than a name gripped between rails.

### `IDENTITY_CARRIER_RAIL_OVERHANG`

Quote, `packages/identity/src/shaping.ts:502-503`:

> "How far each `diamond-rails` rail runs past the name's ink, per side. `export const IDENTITY_CARRIER_RAIL_OVERHANG = 48;`"

File 18 measures about 29 px of overhang on a 26 px rail, so 1.1 rail thicknesses, against production's 48 / 26 = 1.85.

If the rail is thickened to about 44 px the existing 48 px overhang becomes 1.09 rail thicknesses and lands on the reference without any change to this constant.

### `IDENTITY_CARRIER_RING_END_INSET`

Quote, `packages/identity/src/shaping.ts:506-512`:

> "How far a carrier ring's centre sits inward from the corner of the frame, or from the end of the top rail ... Far enough in that the ring stands on straight rail rather than on the corner arc ... `export const IDENTITY_CARRIER_RING_END_INSET = 48;`"

File 18 agrees for `diamond-rails`, because its rings sit at and slightly outboard of the rail ends.

File 03 disagrees for `framed-minimal`, because both of its rings sit directly on the top corners rather than inset along the top bar, and file 41's two bails likewise hang from the frame's two outer corners.

The comment's stated reason, keeping the ring off the corner arc, only exists because of the 44 px corner radius, so if the corner radius goes to zero the inset has no remaining justification for the framed case.

### `IDENTITY_CARRIER_WELDS_PER_RAIL`

Quote, `packages/identity/src/shaping.ts:514-515`:

> "Welds per rail: the look brief's \"no fewer than two separate places\". `export const IDENTITY_CARRIER_WELDS_PER_RAIL = 2;`"

Files 03 and 18 both carry the lettering on a continuous baseline member, not on two point welds, so the reference solution to the same structural problem is a bar rather than a pair of studs.

This is the single largest structural gap between the stencil and the references, because a two-weld frame cannot hold a name whose letters do not individually reach the rails.

### Pendant dimensions

Quote, `apps/web/src/features/atelier/previewHandoff.ts:95-103`:

> "const SIZE_PROFILE = { 22: \"delicate\", 32: \"classic\" } as const; ... const PENDANT_HEIGHT_MM = { 22: 12, 32: 18 } as const; const PENDANT_THICKNESS_MM = 1.2;"

Production's largest pendant is 32 x 18 x 1.2 mm, and all three specification sheets that state dimensions say 58.0 mm wide, 22.5 to 28.5 mm tall and 3.8 to 4.2 mm thick.

Production is therefore 0.55 of the reference width, 0.63 to 0.80 of the reference height and 0.29 to 0.32 of the reference thickness.

Production's aspect is 32 / 18 = 1.78 and 22 / 12 = 1.83, against 2.58, 2.04 and 2.58 on the sheets, so the shipped pendant is a noticeably squarer object than the reference.

The comment's claim that 1.2 mm is "the 1.2 mm minimum the casting rule requires" is not contradicted as a minimum, but every reference specifies more than three times that, and the still template's phrase "with visible real edge depth" at `packages/ai/src/prompt-registry.ts:659` is asking a 1.2 mm slab to photograph like a 4 mm one.

## Things the references specify that production has no slot for at all

Every one of the six sheets has an engraved constellation backplate, and no shipped still view photographs the reverse of the piece.

Every one of the six sheets has a dedicated SIDE PROFILE panel that exists to sell metal thickness, and the nearest shipped view, `close_up`, asks for a three-quarter macro of the face instead.

Files 38, 39, 40, 41, 42 and 43 all name their stones by role rather than by count, with an entry stone, a north star, a personal accent, an exit stone and hidden recessed stones, and production's `stone_coverage` and `gemstone` variables carry a single gemstone type with no placement semantics.

Files 38, 39 and 40 all hang a marquise stone below the piece as an articulated drop, which the single-casting rule at `packages/ai/src/prompt-registry.ts:673` forbids outright with "If any letter, dot or mark is a separate floating piece, the picture is wrong."
