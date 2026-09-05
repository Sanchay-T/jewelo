# CALEUMS UX share packet

Live status: `docs/ux-share/STATUS.md`.

## Wire

ASCII is the website layout, not jewelry art.
Jewelry is a `[photo]` slot.

- `build_wire.py` — aligned screens (source of the mockups)
- `CALEUMS-JOURNEY-WIREFRAME.md` — generated from `build_wire.py`
- `wireframe.css` — print
- `md_to_pdf.py` — markdown + weasyprint → PDF
- `CALEUMS-JOURNEY-WIREFRAME.pdf` — share file (14 landscape pages)

Rebuild:

```bash
/tmp/jewelo-rnd-venv/bin/python3 docs/ux-share/build_wire.py
/tmp/jewelo-rnd-venv/bin/python3 docs/ux-share/md_to_pdf.py
```

## Also here

- `BLNG-AUDIT.md` — what we stole in spirit from blng.ai
- `blng-capture/` — landing, pricing, app gate

Implemented review path: `docs/CALEUMS-CUSTOMER-JOURNEY.md`.
Looks on the customer path are four photographs: WINDOW / HALO / RAILS / DROP.
This folder remains the share wire + BLNG study.
It is not live `/en`.
