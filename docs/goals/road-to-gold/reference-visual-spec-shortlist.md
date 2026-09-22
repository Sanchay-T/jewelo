# Reference visual spec - Omran's shortlist, files 25-37

This file reads Omran's client-tagged reference images 25 through 37 as a construction spec, not as inspiration.
The source files are in `context/whatsapp/media/` and their concept names come from `context/whatsapp/media/index.md`.
Files 25-33 are the positive shortlist and files 34-37 are the conditional shortlist he said "can and have to be done much better".
The four shipped constructions are `classical`, `origami-ribbon`, `framed-minimal` and `diamond-rails`, defined in `packages/contracts/src/domain.ts` and described to the model by `PENDANT_CONSTRUCTION_PROSE` in `packages/ai/src/prompt-registry.ts`.

## How the numbers were measured

Every image in this range is a JPEG of exactly 1122 by 1402 native pixels, and the Read tool renders it at very close to 1:1, so screen coordinates and file coordinates agree to within one percent.
Measurements were taken by running a scan line across the native pixels and printing the runs of gold, background and transition, using a saturation test where a pixel counts as gold when its HSV saturation exceeds 0.28 with red at least green at least blue, and counts as background when saturation is under 0.12 and its maximum channel is above 200.
The scratch script lives in the session scratchpad at `scan.py` and is not in the repository.
Numbers below are given as approximations because the renders are three-quarter-lit CAD images with soft edges, bevels and a slight downward camera tilt, so a bar's measured thickness changes by up to fifty percent between its top edge and its bottom edge purely from perspective.
Where a number could not be read cleanly by scan line, because outline letters and hollow channels confuse the mask, the report says so and gives an eyeball estimate from the rendered image instead.
Cap height means the measured pixel height of a full-height upright letter stroke, and name width means the horizontal distance from the leftmost ink of the first glyph to the rightmost ink of the last glyph.

## The one thing to notice before any individual image

Every one of these thirteen images is a portrait specification card, not a photograph of a pendant.
The pendant render occupies roughly the top sixty percent of the card, the lower thirty-five percent is typographic furniture with a title line and four labelled columns headed Style, Diamond placement, Build logic and Prompt cues, and thin ornamental rules and fleurons box the whole card.
The background is a flat warm ivory sampled at RGB 248, 241, 231 in file 25 and 246, 238, 227 in file 36, with no seamless sweep, no gradient falloff and no visible paper texture.
The lighting is a single soft key from the upper left with a weak fill from the right, the metal is uniformly high-polish mirror 18k warm yellow gold in every single image with no brushed, matte, satin or hammered finish anywhere in the set, and the contact shadow is a soft short drop under the piece rather than a grounded photographic shadow.
The chain in every image is a polished round-link cable chain that arcs up and runs out of the top edge of the frame rather than terminating in a clasp.
None of this framing can be transferred to the four production stills, because the production contract in `docs/CALEUMS-FINAL-E2E-CONTRACT.md` wants four independent photographs and these are one CAD card each, so the references are evidence about the metal and nothing about the camera.

## File 25 - Rectangular Asma

The concept name assigned by `index.md` is Rectangular Asma and it is evidence for `framed-minimal`, in the integrated-frame variant where the frame is not a separate outline around the word.
The metal is lettering fused into a frame: the piece is a single open rectangle of even bar, and the letters ASMA are drawn in the same bar weight inside it, but the left stem of the first A is the frame's left upright and the right stem of the final A is the frame's right upright, so the word and the frame are one continuous path rather than a word placed inside a border.
The letters are drawn as hollow monoline channels with a raised outer wall and a recessed centre groove, which is why a scan line across them returns alternating gold and shadow runs rather than one solid stroke.
Bar thickness divided by name cap height is approximately 0.12, from a vertical scan at x equals 500 that gave a top bar of about 19 pixels against an eyeball cap height of about 160 pixels, with the bottom bar measuring about 29 pixels at the same column purely from the downward camera tilt.
The clear gap between the ink box of the name and the inner edge of the frame is close to zero on the left and right because the outer letters are the frame, and vertically it is approximately 0.1 of cap height, roughly 18 pixels above the letter tops and a similar amount below the feet.
Frame corner radius divided by bar thickness is approximately 0.1, meaning the corners are effectively sharp mitred right angles with only a polishing-wheel break on the edge.
Overhang does not apply as a rail measurement here, since the frame outer width of about 680 pixels and the name width are the same object.
The two jump rings sit directly above the two top corners of the frame, at approximately x equals 250 and x equals 880, so each ring loads a corner rather than the middle of the top bar, and ring outer diameter divided by bar thickness is approximately 1.6 by eyeball.
Stone coverage is minimal and structural: a three-stone pavé run set into the top left corner of the frame and a two-stone run set into the bottom right corner, placed diagonally opposite each other, with no stones anywhere on the letters.
What the current `framed-minimal` prose gets wrong here is the corner treatment and the ornament ban.
The prose says the lettering "sits inside one thin plain rectangular gold frame with softly rounded corners", and this image has visibly square mitred corners and a word that does not sit inside the frame but forms two of its sides.
The prose also says "The frame is a simple even bar with no ornament, no engraving and no second border", and this frame carries two pavé stone runs set flush into the bar itself.

## File 26 - Arabic Halo Calligraphy

The concept name is Arabic Halo Calligraphy and it is evidence for none of the four shipped constructions, so it is best recorded as an unshipped concept, halo-frame calligraphy.
The metal is lettering plus a shaped ogee halo: the Arabic word is rendered in fluid rounded calligraphic strokes floating in the open centre, and a separate closed halo in a pointed arch or quatrefoil outline surrounds it, joined to the word only where the long alif on the right and the leading stroke on the left touch the halo.
The halo is not a rectangle and is not an even bar; its width tapers, and the stones are set along its entire outer face.
A vertical scan at x equals 560 gives a halo top bar of about 46 pixels at its crown against a word cap height of about 220 pixels for the alif, so bar over cap is approximately 0.21, which is nearly double any rectangular reference in this set.
The clear gap between the word and the inner edge of the halo varies from about 40 pixels at the sides to about 230 pixels at the top, because the halo is an arch and the word is a horizontal band, so a single gap ratio is meaningless and the honest description is a gap of approximately 0.2 of cap height at the tightest point and approximately 1.0 at the crown.
Corner radius does not apply because the outline has no corners, only cusps and lobes.
There are no rails and no overhang.
There are no jump rings at all: this piece hangs from one tall pavé-set bail centred on the top cusp, which is a single suspension point rather than the two-ring geometry every shipped construction assumes.
Stone coverage is heavy: an unbroken single line of round stones runs the entire perimeter of the halo, roughly seventy stones, plus eight more on the bail, while the calligraphy itself is bare polished gold.
There is no prose line to contradict because no shipped construction covers this, but it is worth recording that the shipped four have no vocabulary for a single-bail suspension or for a non-rectangular frame, and this was one of the nine Omran re-sent positively.

## File 27 - Negative Space Asma

The concept name is Negative Space Asma and it is evidence for none of the four, so it is an unshipped concept, cut-out plaque.
The metal is a solid rectangular plaque with the name removed from it: the pendant is one uninterrupted slab of polished gold and the letters exist only as through-cut voids, so the name is read as absence of metal rather than presence of it.
This is the exact inverse of every shipped construction, all four of which assume the letters are the metal.
A vertical scan at x equals 300 gives a plaque running from about y equals 580 to about y equals 812, a total plaque height of about 232 pixels, interrupted by a letter void from about 690 to 728.
A horizontal scan at y equals 700 gives the plaque from x equals 208 to x equals 919, a width of about 711 pixels, with the letter voids as the gaps inside it.
Bar thickness over cap height has to be read as plaque margin over cut-out cap height, approximately 30 pixels of metal above the letter tops against a cut-out cap height of about 135 pixels, so approximately 0.22, with the bottom margin nearer 65 pixels and therefore approximately 0.48.
The clear gap between the name's ink box and the plaque edge is approximately 0.55 of cap height on the left, about 77 pixels from the plaque edge at 208 to the first letter void at about 285.
Corner radius over bar thickness is not applicable in the frame sense; the plaque corners carry a small even radius of roughly 8 pixels, which is under a tenth of the plaque's height.
There are no rails and no overhang.
The two jump rings sit above the two top corners of the plaque and are pinned into the slab rather than into a bar.
Stone coverage is three single bezel-set round stones, one at the top left corner, one at the top right corner and one at the bottom right corner, deliberately asymmetric, and the diamond placement caption reads "select corner or edge accents".
The relevant contradiction is with the fallback prose and with `classical`, both of which say the letters are or contain the whole pendant, whereas here the pendant is everything the letters are not.

## File 28 - Maze Asma

The concept name is Maze Asma and it is evidence for none of the four, so it is an unshipped concept, monoline maze.
The metal is lettering that has been extended into a continuous single-width path filling a rectangle: the strokes of ASMA are drawn as one unbroken monoline ribbon that then keeps going, turning at right angles and doubling back to fill the rectangular field around the word in a Greek-key labyrinth, and the outermost turn of that path is what reads as the frame.
There is no separate frame object anywhere in the piece; the border and the letters are the same single path.
A vertical scan at x equals 700 gives path strokes of about 20 pixels and about 37 pixels at different depths of the maze against an eyeball cap height of about 150 pixels, so stroke over cap is approximately 0.13 to 0.25 depending on which run of the path you measure, which itself shows the line weight is not constant.
Clear gap does not apply since the word never has a clear ink box separate from the maze.
Corner radius over stroke thickness is approximately zero: every turn in the path is a hard square right angle, which is the defining feature of the look.
There are no rails and no overhang.
The two jump rings sit above the top left and top right corners of the maze rectangle, on the outermost path run.
Stone coverage is four small stones set into square seats at what the caption calls start, end and key junction points of the path, at the lower left corner, the upper middle, the middle right and the lower right corner.
No shipped prose describes this, and it is worth recording that the maze is a stencil-geometry concept rather than a finish concept, so it could never be produced by dressing a lettering-only stencil in prose.

## File 29 - Broken Frame Asma

The concept name is Broken Frame Asma and it is evidence for `framed-minimal`, in a deliberately interrupted variant.
The metal is lettering inside a frame where the frame is cut: the word ASMA is drawn in the same hollow monoline channel style as file 25, and a rectangular frame surrounds it, but the top bar is severed at about sixty percent of its length and the bottom bar is severed at about twenty-five percent, and each severed end is capped and bridged by a single bezel-set diamond that spans the gap.
The word joins the frame at the left, where the first A's stem meets the left upright, and at the right, where the final A's stem meets the right upright.
Bar thickness divided by name cap height is approximately 0.17, from a vertical scan at x equals 500 giving a bottom bar of about 26 pixels against an eyeball cap height of about 145 pixels, with the top bar reading about 20 pixels at the same column.
The clear gap between the name's ink box and the inner edge of the frame is approximately 0.25 of cap height vertically, roughly 35 pixels above the letter tops, and effectively zero at the left and right where the outer letters weld to the uprights.
Frame corner radius divided by bar thickness is approximately 0.15, so the corners are square with a small chamfer that the light catches as a highlight rather than as a curve.
There is no rail and therefore no overhang.
The two jump rings sit above the top left and top right corners of the frame, at approximately x equals 232 and x equals 890, which by scan line is directly over the corner joints.
Stone coverage is exactly two bezel-set round stones, each occupying a break in the frame, one in the top bar right of centre and one in the bottom bar left of centre, and nothing else.
The current `framed-minimal` prose is contradicted twice by this image.
The prose says the frame is "one thin plain rectangular gold frame with softly rounded corners" and that "@stencil already draws that frame", but this frame is not closed, and a construction whose stencil always draws a closed rectangle cannot render the concept Omran approved.
The prose says "The frame is a simple even bar with no ornament, no engraving and no second border", whereas here the ornament is load-bearing: the two stones are the structural bridges that hold the frame together and removing them leaves four loose ends.

## File 30 - Impossible Rectangle Asma

The concept name is Impossible Rectangle Asma and it is evidence for `framed-minimal`, in an illusion variant that the current geometry rules will most likely refuse.
The metal is lettering inside a frame whose bars weave over and under each other at the corners, so the rectangle reads as a Penrose-style impossible object rather than as a flat closed loop.
The letters ASMA are again hollow monoline channels, they are set at a slightly different depth plane than the frame, and the frame's top right and bottom left runs visibly pass behind and then in front of the same bar.
Bar thickness over cap height is approximately 0.14 by eyeball, about 22 pixels of bar against a cap height of about 155 pixels.
Clear gap between the name's ink box and the inner edge of the frame is approximately 0.2 of cap height above the letters and effectively zero at the left and right where the outer A stems merge with the uprights.
Frame corner radius over bar thickness is approximately zero, with hard mitred corners, which the illusion depends on.
There are no rails and no overhang.
The two jump rings sit above the top left and top right corners.
Stone coverage is four small stones in square seats, at the top left corner, the bottom left corner, the top right corner, and one extra at the interior intersection between the S and the M, which the caption calls "structural corner and intersection accents".
What this contradicts is not one prose line but the whole construction contract: `framed-minimal` says "reproduce them exactly as drawn and add nothing to them" about a frame the stencil draws flat, and an impossible rectangle is by definition a depth trick that a flat stencil cannot encode, so this approved concept has no path through the current pipeline at all.

## File 31 - Rotating Name Pendant Asma

The concept name is Rotating Name Pendant Asma and it is evidence for `framed-minimal` only loosely, because it is really an unshipped concept, pivoting inner module.
The metal is a frame within a frame: an outer plain rectangular bar frame carries two pivot posts on its left and right uprights, and a second, smaller inner rectangular nameplate holding ASMA is suspended between those posts so that it can spin on the horizontal axis.
The inner nameplate has its own closed frame, and the letters inside it are hollow monoline channels welded to that inner frame's top and bottom bars.
A vertical scan at x equals 560 gives the outer top bar at about 37 pixels, the inner module's combined top bar and letter tops as a 75 pixel run, the inner bottom bar at about 28 pixels and the outer bottom bar at about 27 pixels, against an eyeball letter cap height of about 100 pixels.
Outer bar thickness over cap height is therefore approximately 0.3, which is by far the heaviest frame in the set, and that is a consequence of the frame being a structural bearing rather than a border.
The clear gap between the inner module's outer edge and the outer frame's inner edge is approximately 0.25 of cap height at the top and bottom, roughly 25 pixels, and the two are separated everywhere except at the pivots.
Corner radius over bar thickness is approximately 0.2 on the outer frame, so the corners are square with a soft break, and the inner module's corners are similar.
There are no rails and no overhang.
The two jump rings sit above the top left and top right corners of the outer frame, and the ring outer diameter over the outer bar thickness is approximately 1.0 by eyeball, which is the tightest ring-to-bar ratio in the set because the bar is so heavy.
Stone coverage is two three-stone pavé barrels, one on each pivot end cap, so the stones are mechanical trim on the moving joint and appear nowhere else.
The `framed-minimal` prose is contradicted directly by the words "cast as a single piece with the letters and joined to them where the strokes reach the frame", because the entire point of this piece is that the letters are not cast as a single piece with the outer frame and must be free to rotate relative to it.

## File 32 - Floating Diamond Rails Asma

The concept name is Floating Diamond Rails Asma and it is the primary evidence for `diamond-rails`.
The metal is lettering between rails: ASMA is drawn in hollow monoline channel letters, a straight flat top rail runs across the letter tops and a straight flat bottom rail runs across the letter feet, the letters weld to both rails where they touch, and there is no left or right upright at all, so the piece is open at both ends.
A vertical scan at x equals 900, chosen because it clears the letters, gives a top rail of about 26 pixels and a bottom rail of about 25 pixels, so the rails are genuinely even and the perspective distortion is small here.
Rail bar thickness divided by name cap height is approximately 0.15, from 25 pixels of rail against an eyeball cap height of about 165 pixels measured from the A apex at about y equals 580 to the feet at about y equals 745.
The clear gap between the name's ink box and the inner edge of the rails is approximately zero, and this is the single most important measurement in the image: the top rail's lower edge is at about y equals 574 and the letter tops begin at about y equals 580, a gap of roughly six pixels or 0.04 of cap height, and the bottom rail does not clear the feet at all but passes behind them so the feet cross it and project below.
Corner radius over bar thickness does not apply because there are no corners.
Rail overhang per side divided by name width is approximately zero and is asymmetric: a horizontal scan at y equals 548 puts the top rail's metal from about x equals 187 to about x equals 935, a span of about 748 pixels, while a scan at y equals 760 puts the bottom rail from about x equals 283 to about x equals 949, a span of about 666 pixels, against a name width of about 750 pixels, so the top rail matches the name almost exactly and the bottom rail is inset by about 0.13 of name width on the left and overhangs by about 0.01 on the right.
The two jump rings sit at the outer ends of the top rail, riding on top of it, and a horizontal scan at y equals 525 puts the left ring from about x equals 200 to about x equals 239 and the right ring from about x equals 880 to about x equals 918, so ring outer diameter divided by rail thickness is approximately 1.5, about 38 pixels of ring against 25 pixels of rail.
Stone coverage is three bezel-set round stones and their placement is the concept's whole identity: two sit on the top rail, one above the gap between the A and the S and one above the gap between the M and the final A, and one sits on the bottom rail centred under the S and M, each in a raised round bezel collar visibly thicker than the rail it interrupts.
The current `diamond-rails` prose is contradicted in three places.
The prose says "@stencil already draws both rails, the welds where the word meets them and the two jump rings at the outer ends of the top rail: reproduce them exactly as drawn and add nothing to them", which forbids the model from putting the three bezel diamonds on the rails, and those diamonds are the only thing that makes the construction a diamond rail rather than a plain bar rail.
The prose says "The lettering is held between two straight parallel gold rails, one running along the top and one along the bottom", which describes bounding, whereas the image shows the feet of the letters crossing the bottom rail and projecting below it on the left.
The prose says "The rails are narrow, flat and perfectly straight, the same metal as the letters" without giving any proportion, and the image fixes that proportion at rail thickness equal to about 0.15 of cap height with essentially zero overhang, which is much tighter than a model left to its own devices will draw.

## File 33 - Framed Minimal

The concept name is Framed Minimal and it is the primary evidence for `framed-minimal`, and it is also the only image in the shortlist whose lettering is solid rather than hollow-channel.
The metal is lettering inside a frame plus an internal baseline rail: a rectangular open frame surrounds the name, and a further horizontal bar runs straight across the inside of the frame at the letters' baseline, so the letters are actually carried on that internal bar rather than joined to the frame's sides.
The letters themselves are solid, chunky, flat-topped block letters with square terminals and a bright mirror face, and they sit clearly proud of the frame plane so they cast their own shadow onto the frame behind them.
A vertical scan at x equals 400 gives the top bar at about 23 pixels, the internal baseline bar at about 45 pixels and the bottom bar at about 37 pixels, the last inflated by the downward camera tilt, and a vertical scan at x equals 320 through the first letter's stem gives a continuous letter run from y equals 573 to y equals 779, a cap height of about 207 pixels.
Frame bar thickness divided by name cap height is therefore approximately 0.12, taking a representative bar of about 25 pixels against 207 pixels of cap.
The clear gap between the name's ink box and the inner edge of the frame is approximately 0.21 of cap height at the top, about 44 pixels from the top bar's inner edge at y equals 529 to the letter tops at y equals 573, and approximately 0.15 at the bottom, about 31 pixels from the letter feet at y equals 779 to the bottom bar at y equals 810.
Horizontally, a scan at y equals 650 puts the left upright's inner edge at about x equals 263 and the first letter's stem at about x equals 295, so the side gap is about 32 pixels or approximately 1.3 times the bar thickness and approximately 0.15 of cap height.
Frame corner radius divided by bar thickness is approximately zero, because all four corners are occupied by square raised bezel blocks that set a single stone each, and the frame bars meet those blocks at hard right angles with no curve anywhere.
There are no rails in the `diamond-rails` sense and therefore no overhang, but the frame is generous: a scan at y equals 830 gives an outer frame width of about 685 pixels from x equals 225 to x equals 909 against a name width of about 545 pixels, so the frame extends about 0.13 of name width past the name on each side.
The two jump rings sit directly on the top left and top right corner bezel blocks, and a scan at y equals 490 puts the left ring across about x equals 207 to 251 and the right across about x equals 868 to 917, so ring outer diameter divided by bar thickness is approximately 1.5 to 1.9, a ring of roughly 38 to 44 pixels against a 23 pixel bar.
Stone coverage is four corner stones, one in each square corner bezel, plus a vertical pavé run of six round stones set into the right upright between the two right corner bezels, which is deliberately asymmetric and appears on one side only.
This image contradicts the current `framed-minimal` prose in four separate places.
The prose says the frame has "softly rounded corners", and the measured corners are square blocks with a radius of about zero, and every other framed reference in the shortlist agrees with this image and not with the prose.
The prose says "The frame is a simple even bar with no ornament, no engraving and no second border", and this frame carries four corner bezels, a six-stone pavé upright and a full internal baseline bar, which is precisely a second border.
The prose says "The word is continuous metal into the frame at more than one place, no letter, foot, tail or terminal ends in mid-air inside the frame", and in this image the letters are continuous only into the internal baseline bar, while the terminals of the final letter end in mid-air with a visible clear gap to the right upright.
The prose says the lettering "sits inside" the frame, which implies coplanar, and the render clearly shows the letters standing on a raised plane in front of the frame with a cast shadow, which is a depth relationship the flat stencil does not encode.
One further caution that is not a geometry finding: the name rendered in this image reads "lsma" rather than "Asma", so the reference itself carries a misspelling and must never be treated as a spelling authority even though Omran re-sent it positively.

## File 34 - Arabic Origami

The concept name is Arabic Origami and it is evidence for `origami-ribbon`, in the Arabic script.
The metal is lettering only, with no frame and no rail, but it is lettering built out of faceted planes rather than out of an even stroke.
The word is a single connected run of Arabic with a separated alif on the right, and every stroke is a chain of flat triangular and quadrilateral facets meeting at hard crease lines, so the highlights break into distinct bright and dark planes exactly as a folded sheet does.
Bar thickness over cap height does not apply because there is no frame or rail; the equivalent measurement is stroke width over letter height, which by eyeball runs from about 55 pixels at the widest facet to about 25 pixels at the narrowest against an alif height of about 240 pixels, so approximately 0.1 to 0.23 and visibly not constant.
Clear gap, corner radius and overhang are all not applicable.
The two jump rings sit on top of the two tall vertical strokes at the extreme left and extreme right of the word, so the suspension points are on letters and not on any added hardware, and ring outer diameter over the local stroke width is approximately 0.8 by eyeball.
Stone coverage is four princess-cut stones in a tight two by two block set flush into the body of one letter in the middle of the word, plus one princess stone set into the top facet of each of the two suspension strokes, plus one on the descending tail at the lower right.
Two current `origami-ribbon` prose lines are contradicted.
The prose says "The ribbon keeps a constant width and never doubles back over itself", and the measured stroke width here varies by more than a factor of two along a single letter, which is what makes the form read as faceted sculpture rather than as folded tape.
The prose says "The folds are a finish on the metal, not a change of shape: the outline stays exactly as @stencil draws it", and the silhouette here is visibly jagged with pointed and chamfered terminals that no smooth Arabic stencil outline would produce, so the folds have changed the outline.
The prose also omits stones entirely, and this approved reference sets six.

## File 35 - English Origami

The concept name is English Origami and it is evidence for `origami-ribbon`, in Latin script.
The metal is lettering only, with no frame and no rail, in heavy faceted block letters where each letter is built from three to six flat planes that meet at sharp creases, and the terminals are cut as angled chamfers rather than as flat or rounded ends.
Stroke width over letter height by eyeball runs from about 90 pixels at the widest to about 30 pixels at the narrowest against a cap height of about 330 pixels, so approximately 0.09 to 0.27, and the taper within a single stroke is strong enough to read as a deliberate wedge.
Clear gap, corner radius and rail overhang are all not applicable.
Suspension is the important structural fact here and it is unique in the shortlist: there are no jump rings at the ends of the word at all, and instead one tall faceted triangular bail is fitted centrally above the word between its second and third letters, carrying a single jump ring through which the chain passes, so the piece hangs from one central point.
Stone coverage is five princess-cut stones set flush into facet corners spread across the letters, one on the bail, plus a detached three-stone stepped cluster floating below and to the right of the final letter as a separate hanging accent.
The contradicted prose is the same pair as file 34 and one more.
The prose says "Every curve is replaced by a run of straight flat facets", and this reference goes further by replacing the outline too, which the next line explicitly forbids when it says "the outline stays exactly as @stencil draws it".
The prose says "The ribbon keeps a constant width", and the measured width varies by a factor of three.
The prose assumes two rings on the outer glyphs, since the construction inherits the standard attachment, and this reference uses one central bail, which means an origami piece built to the current stencil will hang from the wrong points.

## File 36 - Origami Ribbon Asma

The concept name is Origami Ribbon Asma and it is the primary evidence for `origami-ribbon`.
The metal is a folded ribbon that both writes the name and fills a rectangle: a single flat strip of gold is creased and turned so that its runs spell ASMA, and the leftover runs of the same strip continue past the letters to close a rectangular silhouette, so the outer boundary of the piece is a rectangle formed by the ribbon's own edges rather than by a separate frame.
A vertical scan at x equals 300 gives ribbon runs of about 43, 39, 27 and 52 pixels at four different depths of the same column, which is the clearest possible evidence that the ribbon width is not constant.
Ribbon width over cap height is approximately 0.2 to 0.35 by that scan against an eyeball cap height of about 150 pixels, and the variation is not perspective but real, because adjacent runs at the same depth measure differently.
Clear gap between the name's ink box and the rectangle boundary is approximately zero, because the letters reach the boundary and become it.
Corner radius over ribbon width is approximately zero: every crease and every corner of the rectangle is a hard mitred angle.
There are no rails and no overhang, and the rectangle outer width is about 690 pixels against a name width that is the same object.
The two jump rings sit above the top left and top right corners of the rectangle, on the ribbon's own outermost run.
Stone coverage is four single round stones in small square seats at chosen fold points, one at the top left corner, one low inside the first A, one in the notch of the M, and one at the bottom right corner, which the caption calls "select fold-point accents".
The current `origami-ribbon` prose is contradicted in its two most specific claims.
The prose says "The ribbon keeps a constant width and never doubles back over itself", and this reference visibly doubles back several times, with one run of the strip passing in front of another between the S and the M, and with measured widths differing by nearly a factor of two in one scan column.
The prose says "The folds are a finish on the metal, not a change of shape: the outline stays exactly as @stencil draws it", and this reference's outline is a rectangle that a lettering-only stencil of ASMA does not contain anywhere, so the folds create shape that the stencil cannot supply.
The prose omits stones and omits the rectangular silhouette that gives the concept its name in `index.md`.

## File 37 - Diamond Constellation Frame Asma

The concept name is Diamond Constellation Frame Asma and it is evidence for `diamond-rails`, at the opposite end of the weight range from file 32.
The metal is lettering between two hairline wire rails that are studded with bezel-set stones, and the stones rather than the metal are what read as the frame.
The letters ASMA are solid flat block letters here, not hollow channels, with even stroke weight and slightly rounded outer corners, and they float clear of both rails in the vertical middle.
A vertical scan at x equals 640 and again at x equals 790 gives the top wire at about 4 to 5 pixels and the bottom wire at about 4 pixels, and the two wires sit at y equals 560 and y equals 774, so the rails are 214 pixels apart.
Rail bar thickness divided by name cap height is approximately 0.03, from about 4.5 pixels of wire against an eyeball cap height of about 135 pixels, which is a fifth of the ratio measured in file 32 and shows the shipped construction has to cover a five-to-one spread in rail weight.
The clear gap between the name's ink box and the inner edge of the rails is approximately 0.3 of cap height at the top and a similar amount at the bottom, roughly 40 pixels each way, and unlike file 32 the letters genuinely float with clearance and touch neither rail directly, connecting instead through short vertical tie wires at the outer ends.
Corner radius over bar thickness does not apply because there are no corners.
Rail overhang per side divided by name width is approximately 0.06, since each wire carries a large corner bezel that sits outboard of the outermost letter by roughly 50 pixels against a name width of about 590 pixels.
The two jump rings sit at the outer ends of the top wire, each attached directly to the large corner bezel rather than to the wire itself, so the stone is a structural node and not an accent, and ring outer diameter over wire thickness is approximately 7, about 30 pixels of ring against a 4 pixel wire, which is the most extreme ratio in the set.
Stone coverage is ten bezel-set round stones arranged as a constellation, five on each wire, in a large, small, large, small, large rhythm along each rail, with the four largest at the four corner positions, and the captions describe them as "bezel-set perimeter nodes implying a rectangle".
The current `diamond-rails` prose is contradicted in two ways.
The prose says "@stencil already draws both rails, the welds where the word meets them and the two jump rings at the outer ends of the top rail: reproduce them exactly as drawn and add nothing to them", which forbids the ten bezel nodes on which this entire concept depends, and the two rings here attach to stones rather than to the rail ends the prose names.
The prose says "The lettering is held between two straight parallel gold rails ... cast as a single piece with the letters that touch them", which does not cover the case measured here where the letters touch neither rail and hang from short tie wires, and the prose gives no range for rail weight even though the two approved references differ by a factor of five.

## Cross-cutting findings

No image in files 25 through 37 is evidence for `classical`, because every one of the thirteen adds a frame, a rail, a plaque, a maze path, a halo or a faceted finish to the lettering.
This is consistent with `index.md`, which records that after file 37 Omran asked in text to "Add a classical/traditional direction", meaning the shipped construction with the strongest claim to being the default is the only one the client shortlist never illustrated.
Every single image in the range carries stones, and in nine of the thirteen the stones sit on the frame, rail or plaque rather than on the letters, while the two structural prose lines for `framed-minimal` and `diamond-rails` both end with "add nothing to them".
Not one frame in the range has a rounded corner, whereas `framed-minimal` prose names "softly rounded corners" as its defining feature.
Four of the thirteen approved concepts, files 27, 28, 30 and 31, cannot be produced by any of the four shipped constructions even after a prose rewrite, because they need different stencil geometry rather than different words.
Two of the thirteen, files 26 and 35, hang from a single central bail rather than two jump rings, which is a suspension case the identity engine does not currently model.
