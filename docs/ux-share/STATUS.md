# UX share status

Updated 2026-09-05.
Share wire for the customer path.
Implemented as a review prototype (not live `/en`).
Canonical: `docs/CALEUMS-CUSTOMER-JOURNEY.md`.


## What a new run should read first

1. This file.
2. `docs/ux-share/README.md`
3. `docs/ux-share/CALEUMS-JOURNEY-WIREFRAME.md`
4. `docs/ux-share/BLNG-AUDIT.md`

## Locked for the review prototype (2026-09-05)

- Path: landing → compose (4 look photos) → sit (3 sit photos + 22|32) → atelier → request.
- No finish page. No metal chips.
- Drop sit = upright stack, never 90°.
- Request this piece, WhatsApp equal to send.
- Loading: understudy still + gold hairline. Never blank. Never a percent.
- V1–V6 are landing chrome only.

## Older wire notes


- ASCII in the wire is the **web UI**, not jewelry drawings.
- Jewelry on the wire is a `[still]` slot: a real jewelry photo, not video, not chrome.
- Text on the wire stays tiny.
- The charts carry the layout.
- Four unlike choices at each stage, proposed not locked: WINDOW / HALO / RAILS / DROP.
- Sits: BAR / DROP / WINDOW / BRIDGE.
- Finish lives on Compose: PLAIN / ACCENT / PAVE / ROSE, plus metal / size / chain.
- Default cameras stay four: Studio, On skin, Close, Dark.
- Quote, not add to bag.
- Do not clone BLNG.
- Steal jewelry-as-hero, white air, product then on-body.
- Do not steal prompt chips, influence sliders, dual CTAs, email-before-gold.

## Open (do not invent)

- Exact four vs six launch looks.
- Square sit (unnamed).
- One vs two styles.
- Video (out of this track).
- Finish before vs after generate (this wire puts finish on Compose).
- Email / account gate.
- Size 22 / 32 is the working wire. 35 mm is not on this wire.
- Pricing.

## Rebuild the PDF

Source of the screens: `docs/ux-share/build_wire.py` (aligned ASCII).
Then:

```bash
/tmp/jewelo-rnd-venv/bin/python3 docs/ux-share/build_wire.py
/tmp/jewelo-rnd-venv/bin/python3 docs/ux-share/md_to_pdf.py
```

PDF: `docs/ux-share/CALEUMS-JOURNEY-WIREFRAME.pdf` (14 landscape pages).

Do not go back to drawing necklaces in Courier.

## Umayr on the wire (2026-09-04)

- Did not understand if `[photo]` boxes are rendered pics, videos, or UI chrome.
- Other than that, looks fine.
- Atelier cameras are stills (pics), not video.
- Size: he remembers Omran wanting 22 mm and 32 mm only.
- Found the Omran name on the share wire funny. Keep Omran out of the customer-facing copy.

## Sent to Umayr (WhatsApp personal, 2026-09-04)

1. First wire PDF (jewelry-ASCII version, superseded).
2. Simplified UI wire PDF, with: want more thoughts and feedback, get Omran's as well, and what about my images.
3. Stills HTML zip (see `docs/rnd/STATUS.md`).
4. Drop old-vs-new compare HTML (`CALEUMS-drop-compare.zip`), with context that it is the sit correction, not catalog.

## Review landings (2026-09-04)

Six skins at `/en/review` (v1 to v6). Ivory/gold. Stills only. 22 / 32. Quote not bag.
Not production `/en`. Not a locked six looks.

## Do not

- Do not implement the configurator from this wire until Sanchay says so.
- Do not lock the four looks.
- Do not merge PRs or start the next numbered goal automatically.
