#!/usr/bin/env python3
"""Build a portable OLD vs NEW drop comparison HTML."""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, "/tmp/jewelo-rnd-venv/lib/python3.12/site-packages")
from PIL import Image

ROOT = Path("/Users/sanchay/hq/projects/devonel/jewelo")
STILLS = ROOT / ".tmp/rnd-stills"
S01 = STILLS / "S01"
OUT = STILLS / "CALEUMS-drop-compare"
IMG = OUT / "img"

OLD_PROMPT = """Photograph {name} as a real physical 18K yellow gold name pendant.

Look: Rectangular
Display: vertical drop — taller-than-wide rectangular nameplate, letters stacked or rotated into a vertical rectangle
Lettering: ar / Noto Naskh Arabic
Stones: accent lab diamond
Scale: classic 30 mm
Chain: curb 45 cm
Shot: ivory packshot
Model: gpt-image-2  ·  stencil = horizontal name

IDENTITY
Use the supplied stencil as immutable geometry.
Openwork rectangular nameplate.
Two jump rings on the top frame corners only.

PHOTOGRAPHY
Real camera capture. Ivory packshot."""

NEW_PROMPT = """Photograph {name} as a real physical 18K yellow gold name pendant.

Look: Rectangular
Display: upright letters stacked top to bottom. never rotate 90 degrees
Lettering: ar / Noto Naskh Arabic
Stones: accent lab diamond
Scale: classic 32 mm. metal follows the name.
Chain: curb 45 cm
Shot: ivory packshot
Model: gpt-image-2  ·  stencil = upright stacked letters

IDENTITY
Use the supplied stencil as immutable geometry.
Preserve exact spelling, glyph order, joins, and jump rings.
Openwork rectangular nameplate. Fuse lettering to the frame as one piece.
Two jump rings on the top frame corners only.

CASTING
This is one piece of 18K gold, as if it came from a single mould.
Every letter is physically fused to the next letter or to the frame.
No floating letters. No separate islands.
The two jump rings are attached to the body, not hovering.
A jeweler could pick the whole pendant up as one object.

DROP
Letters stay upright and stack.
Never rotate the writing 90 degrees.

SIZE
The metal follows the name. Short names sit compact.

PHOTOGRAPHY
Real camera capture. iPhone or DSLR jewelry product photo.
True metal, true shadows. No CGI plastic, no extra charms."""

ROWS = [
    {
        "id": "asma",
        "en": "Asma",
        "ar": chr(0x0623)+chr(0x0633)+chr(0x0645)+chr(0x0627)+chr(0x0621),
        "old_stencil": S01 / "stencils/ar_naskh_asma.png",
        "new_stencil": S01 / "stencils/drop_stack_asma.png",
        "old_still": S01 / "candidates/asma_downwards_a2_82945b31.png",
        "new_still": S01 / "candidates/asma_downwards_stack_a6.jpg",
        "old_note": "90 rotate. Umayr mark.",
        "new_note": "correction: upright stack, two corner rings, no extra bail. watermark = not a catalog pass.",
    },
    {
        "id": "noor",
        "en": "Noor",
        "ar": chr(0x0646)+chr(0x0648)+chr(0x0631),
        "old_stencil": S01 / "stencils/ar_naskh_noor.png",
        "new_stencil": S01 / "stencils/drop_stack_noor.png",
        "old_still": None,
        "new_still": S01 / "candidates/noor_downwards_stack_a1.jpg",
        "old_note": "no still. cell left empty.",
        "new_note": "correction: upright stack. watermark = not a catalog pass.",
    },
    {
        "id": "muhammad",
        "en": "Muhammad",
        "ar": chr(0x0645)+chr(0x062D)+chr(0x0645)+chr(0x062F),
        "old_stencil": S01 / "stencils/ar_naskh_muhammad.png",
        "new_stencil": S01 / "stencils/drop_stack_muhammad.png",
        "old_still": S01 / "candidates/muhammad_downwards_a1_e88524c2.png",
        "new_still": S01 / "candidates/muhammad_downwards_stack_a3.jpg",
        "old_note": "letters distorted. not readable.",
        "new_note": "correction: upright stack. diamond in a ring + watermark = not a catalog pass.",
    },
]


def to_jpg(src: Path | None, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if src is None or not src.exists():
        img = Image.new("RGB", (900, 900), (244, 239, 230))
        img.save(dest, "JPEG", quality=86)
        return
    im = Image.open(src).convert("RGB")
    im.thumbnail((1100, 1100), Image.Resampling.LANCZOS)
    im.save(dest, "JPEG", quality=86)


def esc(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def card(kind: str, stencil: str, still: str, prompt: str, note: str, empty_still: bool) -> str:
    still_html = (
        '<div class="empty">no still</div>'
        if empty_still
        else f'<img src="{still}" alt="{kind} still">'
    )
    return f"""
      <section class="col {kind.lower()}">
        <p class="tag">{kind}</p>
        <figure class="stencil">
          <img src="{stencil}" alt="{kind} stencil">
          <figcaption>stencil</figcaption>
        </figure>
        <figure class="still">
          {still_html}
          <figcaption>still</figcaption>
        </figure>
        <p class="note">{esc(note)}</p>
        <pre>{esc(prompt)}</pre>
      </section>
    """


def main() -> None:
    IMG.mkdir(parents=True, exist_ok=True)
    blocks = []
    for row in ROWS:
        name = f'{row["ar"]} ({row["en"]})'
        old_st = f'img/{row["id"]}-old-stencil.jpg'
        new_st = f'img/{row["id"]}-new-stencil.jpg'
        old_ph = f'img/{row["id"]}-old-still.jpg'
        new_ph = f'img/{row["id"]}-new-still.jpg'
        to_jpg(row["old_stencil"], IMG / f'{row["id"]}-old-stencil.jpg')
        to_jpg(row["new_stencil"], IMG / f'{row["id"]}-new-stencil.jpg')
        to_jpg(row["old_still"], IMG / f'{row["id"]}-old-still.jpg')
        to_jpg(row["new_still"], IMG / f'{row["id"]}-new-still.jpg')
        blocks.append(f"""
    <article class="row" id="{row["id"]}">
      <h2>{esc(name)} <span>S01 drop</span></h2>
      <div class="pair">
        {card("OLD", old_st, old_ph, OLD_PROMPT.format(name=name), row["old_note"], row["old_still"] is None)}
        {card("NEW", new_st, new_ph, NEW_PROMPT.format(name=name), row["new_note"], False)}
      </div>
    </article>
        """)
    html = HTML.replace("{{ROWS}}", "\n".join(blocks))
    (OUT / "index.html").write_text(html, encoding="utf-8")
    (OUT / "manifest.json").write_text(
        json.dumps(
            {
                "look": "S01 Rectangular drop",
                "rows": [r["id"] for r in ROWS],
                "note": "New stills are sit proofs, not pass. Do not zip for Omran.",
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print("wrote", OUT / "index.html")


HTML = r'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CALEUMS drop compare</title>
<style>
  :root {
    --ivory: #f4efe6;
    --paper: #fbf7f0;
    --ink: #1c1814;
    --mute: #6f675d;
    --line: #ddd4c6;
    --gold: #9a7b32;
    --old: #8a3b2a;
    --new: #2f5d3a;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--ivory);
    color: var(--ink);
    font-family: Palatino, "Palatino Linotype", Georgia, serif;
  }
  header {
    padding: 28px 28px 12px;
    border-bottom: 1px solid var(--line);
    background: var(--paper);
  }
  .mark {
    font-size: 11px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--gold);
    margin: 0 0 6px;
  }
  h1 { font-size: 26px; font-weight: 500; margin: 0 0 8px; }
  .lead { margin: 0; color: var(--mute); font-size: 15px; max-width: 720px; }
  nav { display: flex; gap: 8px; padding: 16px 28px 0; }
  nav a {
    color: var(--ink);
    text-decoration: none;
    border: 1px solid var(--line);
    padding: 6px 10px;
    font-size: 13px;
  }
  .row { padding: 28px; border-bottom: 1px solid var(--line); }
  .row h2 { margin: 0 0 16px; font-weight: 500; font-size: 22px; }
  .row h2 span { color: var(--mute); font-size: 13px; letter-spacing: 0.16em; text-transform: uppercase; margin-left: 10px; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .col { background: #fff; border: 1px solid var(--line); padding: 14px; }
  .tag {
    margin: 0 0 12px;
    font-size: 11px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
  }
  .old .tag { color: var(--old); }
  .new .tag { color: var(--new); }
  figure { margin: 0 0 14px; }
  img, .empty {
    width: 100%;
    object-fit: contain;
    background: var(--ivory);
    display: block;
  }
  .stencil img { max-height: 220px; height: 220px; }
  .still img, .empty {
    aspect-ratio: 1;
    max-height: 420px;
  }
  .empty {
    display: grid;
    place-items: center;
    color: var(--mute);
    font-size: 13px;
  }
  figcaption {
    margin-top: 6px;
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--mute);
  }
  .note { margin: 0 0 10px; font-size: 14px; }
  pre {
    margin: 0;
    max-height: 240px;
    overflow: auto;
    background: var(--paper);
    border: 1px solid var(--line);
    padding: 10px;
    font: 11px/1.4 "Courier New", Courier, monospace;
    white-space: pre-wrap;
  }
  footer { padding: 18px 28px 32px; color: var(--mute); font-size: 13px; }
  @media (max-width: 820px) {
    .pair { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>
<header>
  <p class="mark">CALEUMS  ·  S01 Rectangular</p>
  <h1>Drop sit: old vs new</h1>
  <p class="lead">Left is the old drop. Right is the correction: stacked stencil, new prompt, new photo. New photos show the sit fix. They are not catalog passes.</p>
</header>
<nav>
  <a href="#asma">Asma</a>
  <a href="#noor">Noor</a>
  <a href="#muhammad">Muhammad</a>
</nav>
{{ROWS}}
<footer>Send this HTML to show the drop correction. Do not treat the new stills as launch catalog.</footer>
</body>
</html>
'''

if __name__ == "__main__":
    main()
