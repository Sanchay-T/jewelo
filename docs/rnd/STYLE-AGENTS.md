# Per-style subagents

One subagent owns one look.
They run in parallel.
They share a global Runway cap of 50 live tasks.
Each style agent may have at most 2 Runway tasks in flight.

Do not edit `matrix-cells.json` (write conflict).
Write `.tmp/rnd-stills/{lookId}/status.json` instead.

## Variety each agent must cover

Displays: `normal`, `downwards`, `in-frame`.

Arabic names: `نور` (short), `أسماء` (medium), `محمد` (long), plus `ليلى` if time.

English names: `Noor`, `Asma`, `Muhammad`, plus `Layla` if time.

Fonts from `packages/identity/engines/caleums-arabic-v3/fonts/`:

- Arabic default: `NotoNaskhArabic-Regular.ttf`
- Thin: `ScheherazadeNew-Regular.ttf` (dilate >= 2)
- Calligraphic: `Amiri-Regular.ttf`
- Kufi: `NotoKufiArabic-Regular.ttf`
- English: `PlayfairDisplay-SemiBold.ttf`

Pick fonts that fit the look. Always stencil before beauty.

## Output

```text
.tmp/rnd-stills/{lookId}/
  stencils/
  candidates/
  pass/
  status.json
```

`status.json` lists every attempt: name, font, display, task id, verdict, reject reason, path.

Only `pass/` images are zip-eligible.

## Audit

Pass only if the pixels show:

- exact name from the stencil
- one piece, two rings, sane hang
- this look and this display
- real-camera jewelry photo
- no melted gold, extra charms, floating stones

Max 3 paid attempts per name×display.
