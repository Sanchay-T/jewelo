#!/usr/bin/env python3
"""ffmpeg contact sheets: one 3x3 grid per look, plus an overview and HTML index."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path("/Users/sanchay/hq/projects/devonel/jewelo")
STILLS = ROOT / ".tmp/rnd-stills"
OUT = STILLS / "_grids"
FONT = "/System/Library/Fonts/Supplemental/Arial.ttf"
CELL = 420
LABEL_H = 44
TILE_H = CELL + LABEL_H
COLS, ROWS = 3, 3

LOOKS = {
    "S01": "Rectangular",
    "S03": "Framed Minimal",
    "S04": "Halo Calligraphy",
    "S05": "Arabic Origami",
    "S09": "English Origami",
    "S11": "Maze",
    "S13": "Negative Space",
    "S14": "Broken Frame",
    "S15": "Origami Ribbon",
    "S16": "Impossible Rectangle",
    "S17": "Rotating Name",
    "S18": "Diamond Rails",
    "S20": "Constellation Frame",
    "S24": "Drop Origami",
    "S25": "Open Frame Origami",
    "S26": "Stacked Origami",
    "S27": "Art Deco",
    "S28": "Celestial",
    "S29": "Ribbon Flow",
}

SITS = ("normal", "downwards", "in-frame")
SIT_LABEL = {"normal": "BAR", "downwards": "DROP", "in-frame": "WINDOW"}
NAMES = ("short", "medium", "long")
NAME_LABEL = {"short": "Noor", "medium": "Asma", "long": "Muhammad"}

SLOTS = [(sit, name) for sit in SITS for name in NAMES]


def classify(name: str) -> tuple[str | None, str | None]:
    n = name.lower()
    sit = None
    if "in-frame" in n or "in_frame" in n or "inframe" in n:
        sit = "in-frame"
    elif "downwards" in n or "downward" in n:
        sit = "downwards"
    elif "normal" in n:
        sit = "normal"
    length = None
    if "short" in n or "noor" in n or "نور" in name:
        length = "short"
    elif "medium" in n or "asma" in n or "أسماء" in name:
        length = "medium"
    elif "long" in n or "muhammad" in n or "محمد" in name:
        length = "long"
    return sit, length


def map_pass(pass_dir: Path) -> dict[tuple[str, str], Path]:
    out: dict[tuple[str, str], Path] = {}
    for p in sorted(pass_dir.glob("*.png")):
        sit, length = classify(p.name)
        if sit and length:
            out[(sit, length)] = p
    return out


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT, size)


def make_tile(src: Path | None, label: str, dest: Path) -> None:
    canvas = Image.new("RGB", (CELL, TILE_H), (22, 22, 22))
    if src is None:
        photo = Image.new("RGB", (CELL, CELL), (43, 43, 43))
        canvas.paste(photo, (0, 0))
        label = label + "  empty"
    else:
        scaled = dest.with_name(dest.stem + "_sc.png")
        vf = (
            f"scale={CELL}:{CELL}:force_original_aspect_ratio=decrease,"
            f"pad={CELL}:{CELL}:(ow-iw)/2:(oh-ih)/2:white"
        )
        run(["ffmpeg", "-y", "-i", str(src), "-vf", vf, "-frames:v", "1", str(scaled)])
        canvas.paste(Image.open(scaled).convert("RGB"), (0, 0))
    draw = ImageDraw.Draw(canvas)
    draw.text((12, CELL + 10), label, font=font(22), fill=(255, 255, 255))
    canvas.save(dest)


def xstack_layout() -> str:
    parts = []
    for r in range(ROWS):
        for c in range(COLS):
            parts.append(f"{c * CELL}_{r * TILE_H}")
    return "|".join(parts)


def title_bar(text: str, width: int, dest: Path) -> None:
    img = Image.new("RGB", (width, 56), (17, 17, 17))
    ImageDraw.Draw(img).text((16, 14), text, font=font(26), fill=(242, 230, 201))
    img.save(dest)


def stack_look(tiles: list[Path], title: str, dest: Path, tmp: Path) -> None:
    header = tmp / "header.png"
    body = tmp / "body.png"
    title_bar(title, COLS * CELL, header)
    cmd = ["ffmpeg", "-y"]
    for t in tiles:
        cmd += ["-i", str(t)]
    layout = xstack_layout()
    ins = "".join(f"[{i}]" for i in range(len(tiles)))
    cmd += [
        "-filter_complex",
        f"{ins}xstack=inputs={len(tiles)}:layout={layout}",
        "-frames:v",
        "1",
        str(body),
    ]
    run(cmd)
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(header),
            "-i",
            str(body),
            "-filter_complex",
            "vstack=inputs=2",
            "-frames:v",
            "1",
            str(dest),
        ]
    )


def overview(look_ids: list[str], dest: Path, tmp: Path) -> None:
    thumbs: list[Path] = []
    for look in look_ids:
        src = OUT / f"{look}.png"
        thumb = tmp / f"ov_{look}.png"
        run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(src),
                "-vf",
                "scale=480:-1",
                "-frames:v",
                "1",
                str(thumb),
            ]
        )
        thumbs.append(thumb)
    cols = 4
    rows = (len(thumbs) + cols - 1) // cols
    while len(thumbs) < cols * rows:
        pad = tmp / f"ov_pad_{len(thumbs)}.png"
        run(
            [
                "ffmpeg",
                "-y",
                "-f",
                "lavfi",
                "-i",
                "color=c=0x111111:s=480x548:d=0.04",
                "-frames:v",
                "1",
                str(pad),
            ]
        )
        thumbs.append(pad)
    cmd = ["ffmpeg", "-y"]
    for t in thumbs:
        cmd += ["-i", str(t)]
    parts = []
    for r in range(rows):
        for c in range(cols):
            parts.append(f"{c * 480}_{r * 548}")
    ins = "".join(f"[{i}]" for i in range(len(thumbs)))
    cmd += [
        "-filter_complex",
        f"{ins}xstack=inputs={len(thumbs)}:layout={'|'.join(parts)}",
        "-frames:v",
        "1",
        str(dest),
    ]
    run(cmd)


def write_html(look_ids: list[str], counts: dict[str, int]) -> None:
    cards = []
    for look in look_ids:
        name = LOOKS.get(look, look)
        n = counts[look]
        cards.append(
            f'<section><h2>{look} · {name} · {n}/9</h2>'
            f'<a href="{look}.png"><img src="{look}.png" alt="{look}"></a></section>'
        )
    html = f"""<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<title>CALEUMS stills grids</title>
<style>
  body {{ margin: 24px; background:#111; color:#eee; font: 15px/1.4 Helvetica, Arial, sans-serif; }}
  h1 {{ font-size: 22px; font-weight: 600; }}
  p {{ color:#aaa; }}
  img {{ width: 100%; max-width: 1280px; height: auto; background:#000; }}
  section {{ margin: 0 0 36px; }}
  h2 {{ font-size: 14px; color:#d4b56a; letter-spacing: .04em; }}
  a {{ color: inherit; }}
</style></head>
<body>
<h1>CALEUMS stills</h1>
<p>Each look is BAR / DROP / WINDOW × Noor / Asma / Muhammad. Gray = no pass. ffmpeg grids.</p>
<p><a href="overview.png">all looks overview</a></p>
{"".join(cards)}
</body></html>
"""
    (OUT / "index.html").write_text(html, encoding="utf-8")


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    tmp = OUT / "_tmp"
    tmp.mkdir(exist_ok=True)
    look_dirs = sorted(
        p for p in STILLS.glob("S*") if p.is_dir() and (p / "pass").is_dir()
    )
    look_ids: list[str] = []
    counts: dict[str, int] = {}
    for look_dir in look_dirs:
        look = look_dir.name
        mapped = map_pass(look_dir / "pass")
        filled = sum(1 for slot in SLOTS if slot in mapped)
        counts[look] = filled
        look_ids.append(look)
        tiles = []
        for i, (sit, length) in enumerate(SLOTS):
            label = f"{SIT_LABEL[sit]}  {NAME_LABEL[length]}"
            tile = tmp / f"{look}_{i:02d}.png"
            make_tile(mapped.get((sit, length)), label, tile)
            tiles.append(tile)
        title = f"{look}  {LOOKS.get(look, '')}   {filled}/9"
        print(title, flush=True)
        stack_look(tiles, title, OUT / f"{look}.png", tmp)
    if look_ids:
        overview(look_ids, OUT / "overview.png", tmp)
    write_html(look_ids, counts)
    print(f"wrote {OUT} ({len(look_ids)} look grids + overview + index.html)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
