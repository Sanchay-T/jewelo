# Omran business context — UI reset, 5 September 2026

No customer screen, sequence, default, look count, or media fanout is approved by this document. The user discarded the existing customer UI and UI proposals. Preserve the brand palette and establish the new experience through discussion.

## Evidence quality

The following is preserved from the 3 September iteration brief, which attributes feedback to WhatsApp messages and transcribed voice notes. The original transcripts have not been reverified in this reset. Distinguish reported client statements from the prior author’s interpretations. Source archive: `jewelo-intake/whatsapp-jewelry-ai/CONTEXT.md` and `transcripts/ALL.txt`, outside this repository. Do not delete or publish that private archive.

## 3. Omran’s feedback (29–30 August 2026)

Voice notes are transcribed in `jewelo-intake/whatsapp-jewelry-ai/transcripts/ALL.txt`. Texts are in `chat.json`.

### What he said on the voice notes (Scribe v2, 3 Sep)

1. **Name first.** “First they put in their name as in per the flow itself. Once they put in that name, all is good.”
2. **Then style, then display, then stop.** “They select the style… two styles… two different formats. Either the rotating design… or the origami. After that, yalla… displayed in the frame, or vertically or horizontally, or square. I think that makes it done.”
3. **Six designs, not a BOM form.** “We can start off with six designs. That’s it.”
4. **Preload photoreal names by length.** Asma now. Also a long name like Muhammad. “A four-letter word… a 10-letter word… that preview would change so that they can actually see how that piece would look like.” Follow-up: ordinary names are enough; he counts “one, two, three, four, five.”
5. **Cheap first look.** He floated Gemini Flash. Partner preference, not a stack decision.
6. **No video.** Text, same thread: “Videos are not needed.”
7. **Then customize one.** Sanchay: six one-shots, then “expand and add more ideas” on the chosen option. Omran: “Yes let’s have that.”

### What the cards he sent actually are

Two decks. This is the missing piece the voice notes assume.

**Deck A — first look (cream concept sheets).** Caption: “these four also yes but can and has to be done much better” + “Plus classical” + “literally normal writing and the following styles.”

- Floating Diamond Rails
- Framed Minimal
- Diamond Constellation Frame
- Origami Ribbon
- English Origami
- Arabic Origami

These are **construction looks**, not Arabic calligraphy fonts. Classical / normal writing sits next to origami. That is the six.

**Deck B — customize later (dark CALEUMS spec sheets).** Caption: “We can add more things then from these styles.”

- Drop Origami
- Stacked Origami
- Open-Frame Suspended Origami
- Art Deco
- Celestial / Constellation
- Ribbon Flow

These add journey stones (entry / north star / accent / exit / hidden), backplate engraving, and camera angles. They are the customization layer, not step 2 of the first form.

“Rotating” in the voice note is still fuzzy. Strongest reading next to his own cards: **normal/classical writing vs origami folds**. Weaker reading: a literal rotating construction. Do not invent a third family until he confirms.

### What he did not ask for in the first path

Metal colour, stone coverage, gem, pendant size, chain style, chain length, two-name connection geometry, and motion. Those are in the current wizard **before** generate. That is the main collision.

---


## Business capabilities to preserve, without prescribing a form

- Customer name(s), script, and approved spelling; deterministic pendant identity.
- Construction look and display/physical arrangement; exact meanings and choices need discussion.
- Metal, stone coverage/gem, size, chain, optional two-name connections and personalization remain business inputs. Decide timing, defaults and exposure afresh.
- Quote/request and eventual payment/fulfillment retain approved-design lineage.
- Existing backend identity, storage, jobs, adapters, budgets, security, and commerce are retained infrastructure, not proof that the old journey is accepted.
- Reported later feedback: gold must be connected, letters upright rather than rotated, and frame proportions must match name length. See `docs/rnd/PROMPT-SYSTEM.md` for jewelry evidence, not UI instructions.
- Size notes conflict: older proposals use 22/30/36, later notes report 22/32. Do not silently restore older values or infer a complete SKU policy.

## Questions still open

Exact construction catalog; meaning of “rotating”; one or two styles; preload versus paid generation; number of generated candidates versus inspection cameras; customization fields and timing; request payload and follow-up; language behavior; approved size/default policy. No inherited wireframe resolves these questions.
