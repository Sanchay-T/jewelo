# One-piece reader replay - 2026-09-24

SP-2a proof.
`OpenAIPieceReader` (`packages/ai/src/studio.ts`) run over the thirteen lab stills that SP-2a names, blind: the image and nothing else, no stencil and no approved text.

- Model: `gpt-5.6-luna` (the value of `OPENAI_VERIFIER_MODEL`).
- Date: 2026-09-24.
- Runs: one. The wording was not adjusted; the single disagreement is argued below, not tuned away.
- Estimated cost of the whole run: **USD 0.153** (metered from the API's own `usage`, priced at USD 1.25 per 1M input tokens and USD 10 per 1M output tokens). Hard stop was USD 1.50.
- Agreement with the expected labels: **12 of 13**.
- Replay script: session scratchpad, not the repository.

| image (under `docs/goals/road-to-gold/lab-2026-09-24-split/img/`) | expected | answer | verdict | notes returned by the reader |
| --- | --- | --- | --- | --- |
| `v2/c-fat-studio.png` | false | **false** | agree | The main left calligraphic section is continuous and attached to the left ring, but it stops with a clear gap before the separate right-hand letter/form. The small diamond-shaped mark above that right-hand form also floats free rather than being joined. Thus the pendant is not one continuous metal piece. |
| `v2/c-fat-on_skin.png` | false | **false** | agree | The main lower calligraphic body is continuous through the central letters and connects toward both end rings. However, there is a visible gap between the rightmost ف and the tall ا, and the diamond-shaped dot above ف is visibly floating rather than joined to the letter. These breaks make it multiple pieces. |
| `v2/c-fat-close_up.png` | false | **false** | agree | The left attachment and the main central Arabic lettering appear continuous, and the right attachment is connected to the rightmost character. However, there is a clear open gap between the main central lettering and the separate rightmost character, so the name is not one continuous piece. |
| `v2/c-fat-dark.png` | false | **false** | agree | The left ring and the main Arabic lettering are joined by continuous metal, and the central letters share a continuous lower rail. However, the rightmost letter is visibly separated from the central lettering by a clear gap; it is a separate piece, despite being attached to the right ring. Its small upper mark appears attached to that rightmost piece. Therefore the pendant is not one continuous piece. |
| `v3/c-omran-studio-a.png` | false | **false** | agree | The main Arabic calligraphic body is continuous from the left ring through the central lettering to the right side/ring connection. However, the diamond-shaped dot/diacritic above the left portion is visibly floating with a clear gap and is a separate metal piece, so the pendant is not one continuous piece. |
| `v3/c-omran-studio-b.png` | false | **false** | agree | The main calligraphic body is a continuous piece of metal between the two attachment rings, with the letter strokes joined along the lower rail. However, the small diamond-shaped dot/mark above the left side is visibly floating with a clear gap and is a separate piece. The enclosed opening in the central letter is only a cutout, not a separate part. |
| `v3/c-fat-studio-a.png` | true | **false** | DISAGREE | The main lower Arabic calligraphic rail is continuous through the central letters and into the right-hand loop/attachment. However, the angular piece beneath the left ring is visibly separated from the leftmost letter by a gap, and the diamond-shaped mark above the right-hand letter also appears to float with a gap rather than being joined to the body. |
| `v3/c-omran-studio-stencil-b.png` | true | **true** | agree | The Arabic lettering forms one continuous gold body, with the strokes and baseline/rail joined from the left attachment ring through to the right attachment ring. No floating dots, diacritics, or separate name components are visible; the attachment areas connect into the pendant without an intervening gap. |
| `v2/o-muh-studio.png` | true | **true** | agree | The angular Arabic lettering is joined along a continuous lower rail, with the letter strokes connected into that rail across the full name. Both end sections connect to the respective rings. The dark lines visible within the gold are facet/engraving seams rather than open gaps, and no separate floating dots or diacritics are visible. |
| `v2/o-fat-studio.png` | true | **true** | agree | The faceted Arabic lettering forms one continuous metal body, with the lower rail linking the successive letter forms and the raised strokes joining into it. The end ornaments connect into the attachment rings. The visible openings are internal cutouts, not gaps between separate pieces; no floating dots or disconnected marks are visible. |
| `v2/r-fat-studio.png` | true | **true** | agree | The pendant’s top rail runs continuously between the two rings, and the letter forms are joined into the same metal through their shared lower rail and connecting strokes. The raised dots/marks above the letters appear attached to the adjacent letter bodies by continuous gold bezels; no floating dot or visible break separates any part of the name. |
| `v2/c-muh-dark.png` | true | **true** | agree | The cursive “Muhammad” lettering appears as one continuous metal pendant, with the letter strokes joined along the lower script line from the initial M through the final d. The end connections to both rings are also continuous. No floating dots, diacritics, separate marks, or visible gaps break the name. |
| `v2/f-fat-studio.png` | true | **true** | agree | The rectangular frame is continuous: the top and bottom rails join the four corner blocks and side bars. The Arabic lettering is joined along its lower stroke, and its tall vertical strokes meet the top rail, connecting the name to the frame. The two diamond-like marks above the letters also visibly touch the letter bodies; no floating dots or gaps are visible. |

## The one disagreement

`v3/c-fat-studio-a.png` was labelled one piece; the reader answers `false`.

Looking at the photograph: the two square dots of the final ة sit above the letter with a clear gap and are welded to the left jump ring, not to the letter body, and the diamond dot of the ف on the right hangs from the right ring the same way.
So the name body reaches one ring and the dot cluster reaches the other, and the only thing joining them is a jump ring.
That is two pieces of metal on a ring, which is exactly what the rule refuses and exactly what a jeweller would have to quote as two parts.

The reader is right and the label is wrong.
The wording was left alone: loosening it so this image passes would also pass the six split pieces above it.
