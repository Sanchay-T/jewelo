# Staging before the Umayr fixes, 9 September 2026 14:05 IST

Lead's own in-app browser, viewport 1440x900, deployment `e04b835e` (`f63b3e3`).
The browser tool returns screenshots to the session and cannot write them to disk, so the record is the DOM measurement.

## Journey: `Umayr`, English, classical, classic, yellow gold, 32 mm cable

1. `/en/design/new`: the preview column shows the Asma sample card (214x268 px image) with the "Asma example" pill, the "CALEUMS - THE NAME COLLECTION" footer, the "Sample look, not your piece" badge and two grey paragraphs, matching Umayr's annotated screenshot 03.
2. "Review my piece" opens the review step; the big picture is the same Asma sample.
3. Ticking the spelling checkbox starts the run. Within 20 s every tile reads "We will photograph it in the shop and send it" (mock refusal, terminal), the caption reads "Umayr · we will send the photograph", and a line says "We could not photograph your piece here. Leave one way to reach you and we will send it."
4. The four thumbnails under those labels are still the four Asma sample images (150x66 each, `atelier/v1/...`), and the big picture is still the Asma sample with "Sample look, not your piece". This is what Umayr called "just generates Asma again".
5. Layout: the preview panel measures 703x1214 px; at scroll 671 its top is at -333 px in a 900 px viewport, so the sticky panel is taller than the screen and the column above the sample reads as empty. This is the session-1 short-height defect measured again.

## Findings

- F1 (major): after a terminal refusal the sample images stay in every tile and in the big picture, under a "we will send" label; the shopper reads it as their run producing Asma.
- F2 (major): the sticky preview panel exceeds the viewport height at 1440x900; the top third of the column is blank while scrolling.
- F3 (minor): three labels on the sample card plus two paragraphs (Umayr 03, items 2 and 4).
- F4 (minor): "THE NAME ATELIER" header and "Language / script" label (Umayr 03, items 3 and 5).

P6-8 (running) answers F1, F3, F4; F2 goes to the same task's second pass.
