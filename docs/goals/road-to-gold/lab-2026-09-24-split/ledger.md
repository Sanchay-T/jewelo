# Image lab ledger - 2026-09-24 - split design (free piece, our presentation)

Model: `gpt-image-2.5-sunburst`, ratio 4:5, via Runway MCP.
Question: can the piece be free and Omran-like, as in his own ChatGPT images, while the presentation (four views, realism, jewelry physics) stays fixed and ours?
Flow kept from production: the studio photograph is made first, and every other view is made from it as `@master`.

Pieces: origami, framed, diamond rails, classical, each as "Muhammad" and as فاطمة (8 pieces, 32 views).
Credits: 207734 before the run, 206297 after the last submit, so 1437 credits for about 84 billed images across v1, v2 and retakes.

Evidence: `sheets/overview.webp` (all 32 views) and one 2x2 sheet per piece in `sheets/` (studio, on skin / close up, dark).
Full-size PNGs stay local in `img/` (185 MB) and are not committed; `urls.tsv` holds signed Runway links and is not committed either.
`tasks.tsv` lists every Runway task id, so any image can be fetched again with `get_task`.

## The studio prompt (v2)

Three parts: one free piece sentence per style, then two fixed blocks that never change per style - real jewelry physics and real photograph.

```
Photograph one real, physical, finished fine jewelry name pendant necklace that reads "<name>"[ in Arabic script, written right to left].
The piece: <style sentence>. Use the attached image @look only for the style, not for its letters. Made in polished 18k yellow gold as one single connected piece of metal: <connect line>[, every dot is fused to its letter], nothing floats. It hangs from two small rings at its outer ends on a fine gold cable chain.
Shot: studio catalogue packshot, nearly straight-on, the whole pendant and both rings sharp and centred with an even margin, the chain in relaxed natural curves. Warm off-white matte paper.
Real jewelry physics: a cast piece about 35 mm wide with 1.2 mm straight polished side walls and real weight. It lies flat under gravity with a true contact shadow. Each ring is a closed round jump ring and the end link of the chain passes through its hole. The chain is small even interlocking links that drape in natural curves. Nothing floats, bends or melts. [Any diamonds are real faceted stones seated in prongs or bezels, with small crisp white and spectral sparkles.]
Real photograph: full-frame camera and a 100 mm macro lens on a jewellery set, not a render. Large soft key light, a white bounce card on the shadow side, and one small harder light that puts a defined highlight streak along the polished metal. Neutral white balance. The gold shows bright reflected highlights, true mid tones in its own colour and darker reflections of the room, never flat uniform brightness. Soft occlusion in tight corners, finite depth of field, believable paper texture.
No render look, no plastic or candy gold, no glow or bloom, no over-sharpened edges, no text, logo or watermark.
The name must read exactly "<name>", letter for letter.
```

Style sentences:

- origami: "origami style, each letter built from folded, faceted gold planes with crisp creases, like folded paper"; Latin adds "while every letter keeps its normal readable shape: the two a's are clearly a's and the two m's are clearly m's".
- framed: "framed minimal style, the letters sit inside a clean slim rectangular gold frame and touch it at top and bottom".
- diamond rails: "diamond rails style, slim gold letters with rails of tiny pave diamonds running along them".
- classical: "classical style, flowing high-polish script letters with fine tapered strokes" (Arabic: "Arabic calligraphy letters"); no `@look` reference.

## The view prompts (v2)

Every view opens with the identity lock, then its own shot line, then the same physics and photograph blocks.

```
The attached image @master is a photograph of one real gold name pendant that reads "<name>"[ in Arabic, right to left]. Photograph this exact same pendant, unchanged: same letters, same spelling, [every dot where it is, ]<same folds | same frame, same corner stones | same pave diamonds and rail | same script>, same thickness, same rings and chain.
```

- On skin: "worn by one adult woman, framed from the base of the neck to the top of the chest, face out of frame. Real scale: the pendant is about 35 mm wide, small and delicate on the body, roughly a third of the distance between her collarbones, resting just below the collarbone notch. The fine chain follows the curve of her neck under its own weight, both sides rising evenly from the two rings, and the pendant lies flat against the skin with a soft real shadow. Natural skin with visible pores and fine texture, a soft neutral top, daylight from a large window on the left." plus "no beauty-filter smoothing".
- Close up: "tight three-quarter macro of the pendant lying flat on warm off-white paper, angled so the 1.2 mm polished side wall of the metal shows along the strokes, one jump ring with the end chain link threaded through its hole clearly in frame. The whole name stays inside the frame with background on all four sides."
- Dark: "low-key editorial still. The pendant lies flat on a dark textured slate slab under gravity, the chain loosely coiled beside it with natural slack, both rings and the whole name in frame. One narrow soft light from the upper left so the gold reads as a bright edge against deep shadow, with a little fill so every letter stays readable. True contact shadow; believable slate grain."

## Verdicts (v2, chosen takes)

| Piece | Studio | On skin | Close up | Dark |
| --- | --- | --- | --- | --- |
| origami Muhammad | pass (take c) | pass | pass (retake b) | pass |
| origami فاطمة | pass | pass | pass | pass |
| framed Muhammad | pass | pass | pass | pass |
| framed فاطمة | pass | pass (modest retry) | pass | pass |
| rails Muhammad | pass (take b) | pass | pass | pass |
| rails فاطمة | pass | pass | pass | pass |
| classical Muhammad | pass | pass | pass | pass |
| classical فاطمة | pass | pass | pass | pass |

All 32 spell the name.
Every Arabic dot is fused to its letter or rail in every view (zoom crops checked for the classical فاطمة dark and close up, and earlier for all studios).
The same piece carries through all four views in every row.

## What went wrong and what fixed it

1. v1 on-skin views drew the pendant two to three times real size. The explicit "35 mm, a third of the distance between her collarbones" line fixed it in every v2 on-skin view.
2. Origami Latin let the a's become o's (v1b, v2a, v2b). The readability clause fixed the studio (v2c). One close up still drifted to "Mhhamnad" (ff569efb); a retake that names every letter's shape fixed it (9a878eea).
3. Rails Muhammad take a came back plain letters with three bezel stones and no pave; take b has the pave rails.
4. Framed فاطمة on skin failed Runway output moderation once (`SAFETY.OUTPUT.THIRD_PARTY`) on the "base of the neck to the top of the chest" wording. The retry with "a cream knit top with a modest round neckline, framed from her chin down to the neckline" passed. That was 1 failure in 9 on-skin calls; production should use the modest wording by default.

## Not done here

- Nothing in production changed. Porting the split design into the prompt compiler waits for Sanchay's review of these sheets.
- No OpenAI API call was made; Runway serves the same model, so the prompts transfer.
