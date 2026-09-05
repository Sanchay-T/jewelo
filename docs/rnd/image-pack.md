# Image pack

What stills to make, in what order, for Omran review and for prompt R&D.

Working name on the current board: `أسماء`.
Quality bar: CALEUMS spec sheets `context/whatsapp/media/38`–`43`.
Photography bar: real iPhone / camera / DSLR jewelry photo, not AI render-looking.

## Default experiment recipe

Use this until a look is proven:

| Slot | Default |
| --- | --- |
| Name | `أسماء` |
| Script | Arabic, classic lettering |
| Metal | 18K yellow, polished |
| Stones | accent diamond |
| Size | classic ~30 mm |
| Chain | one default (fine curb, 45 cm) |
| Shot | ivory packshot first |

Do not vary gem, size, and metal until the look holds identity and photorealism.

## Phases

### Phase 0 — stencil

One identity mask per name × lettering.
Pass/fail on spelling, connectivity, two rings.
Current board already has a passing `أسماء` Naskh stencil.

### Phase 1 — hero packshot per look

One identity-locked ivory packshot per look under test.
Display starts as the look’s natural sit (frame vs drop vs bar).
Fail if letters drift from the stencil.
Fail if it looks illustrated or plasticky.

### Phase 2 — three displays

For each surviving look, three displays:

- Normal / horizontal bar
- Downwards / vertical
- In the frame

Skip a display only if the look physically cannot sit that way, and write why.

### Phase 3 — name-length variants

Short, medium, long.
Same look, same display, same finish.
This is the preview-adaptation Omran asked for.

### Phase 4 — `{{ }}` swaps

Only on looks that already look like photographs.
Swap metal, gem, size one at a time.
Keep winners as prompt proof, not as a 3,078-image dump.

## Minimum Omran review pack (after six are chosen)

```text
6 looks × 3 displays × 3 name lengths = 54 stills
```

Until six are chosen, do not pretend 54 is in flight.
Generate from the positive + spec lists as experiments.

## Suggested first queue (not the locked six)

Start where the board already is, then adjacent positive looks:

1. S03 Framed Minimal (board has a locked ivory still; hang is wrong)
2. S18 Floating Diamond Rails (text-only dark window existed; identity failed)
3. S24 Drop Origami (spec-sheet bar)
4. S01 Rectangular
5. S17 Rotating Name Pendant
6. S04 Arabic Halo Calligraphy

Replace this queue the moment he names six.
Until then this is only a build order.

## Known board state (4 Sep 2026 checkout)

| Item | Result |
| --- | --- |
| Stencil `أسماء` Naskh | pass |
| Text-only framed ivory | fail, floating hamza |
| Text-only rails dark | fail, floating hamza |
| Text-only worn | fail, extra glyph, unmatched skin |
| Identity-locked framed ivory | photography close; double hang (rings on letters and frame corners) |

## Outputs to keep

Every still needs:

- look id
- display
- name
- lettering
- finish slots used
- stencil id
- prompt / task id
- verdict: pass / fail / tweak
- one-line photographic and identity notes

Surface: `/sample-images`.
Do not commit private client media or raw provider URLs.

## Worn and extra angles

Spec sheets show front, 3/4, side, worn, backplate.
Hero packshot is the gate.
Worn and extra angles come after a look passes packshot photorealism and identity.
Worn is a shot, not a new look.
