#!/usr/bin/env python3
from __future__ import annotations
import json, sys
from pathlib import Path
sys.path.insert(0, "/tmp/jewelo-rnd-venv/lib/python3.12/site-packages")
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage
ROOT = Path("/Users/sanchay/hq/projects/devonel/jewelo")
SOLVER_DIR = ROOT / "packages/identity/engines/caleums-arabic-v3/reference"
FONT = ROOT / "packages/identity/engines/caleums-arabic-v3/fonts/NotoNaskhArabic-Regular.ttf"
OUT_SHARED = ROOT / ".tmp/rnd-stills/_stencils/drop"
OUT_S01 = ROOT / ".tmp/rnd-stills/S01/stencils"
sys.path.insert(0, str(SOLVER_DIR))
from solver import _fuse
NOOR = chr(0x0646)+chr(0x0648)+chr(0x0631)
ASMA = chr(0x0623)+chr(0x0633)+chr(0x0645)+chr(0x0627)+chr(0x0621)
MUH = chr(0x0645)+chr(0x062D)+chr(0x0645)+chr(0x062F)
NAMES = [
    {"name": NOOR, "slug": "noor", "length": "short", "letters": [chr(0x0646), chr(0x0648), chr(0x0631)]},
    {"name": ASMA, "slug": "asma", "length": "medium", "letters": [chr(0x0623), chr(0x0633), chr(0x0645), chr(0x0627)+chr(0x0621)]},
    {"name": MUH, "slug": "muhammad", "length": "long", "letters": [chr(0x0645), chr(0x062D), chr(0x0645), chr(0x062F)]},
]


def label_count(mask):
    _, n = ndimage.label(mask)
    return int(n)

def crop(mask, pad=4):
    ys, xs = np.nonzero(mask)
    y0 = max(0, int(ys.min()) - pad)
    y1 = min(mask.shape[0], int(ys.max()) + 1 + pad)
    x0 = max(0, int(xs.min()) - pad)
    x1 = min(mask.shape[1], int(xs.max()) + 1 + pad)
    return mask[y0:y1, x0:x1]

def render_glyph(ch, size):
    font = ImageFont.truetype(str(FONT), size)
    kw = dict(font=font, direction="rtl", language="ar")
    tmp = Image.new("L", (10, 10), 255)
    box = ImageDraw.Draw(tmp).textbbox((0, 0), ch, **kw)
    pad = max(12, size // 8)
    img = Image.new("L", (box[2] - box[0] + 2 * pad, box[3] - box[1] + 2 * pad), 255)
    ImageDraw.Draw(img).text((pad - box[0], pad - box[1]), ch, fill=0, **kw)
    mask = np.array(img) < 128
    if not mask.any():
        raise SystemExit("empty glyph")
    mask, _ = _fuse(mask, overlap=max(3, size // 45))
    return crop(mask, pad=2)

def place(dst, src, y, x):
    h, w = src.shape
    y0, x0 = max(0, y), max(0, x)
    y1, x1 = min(dst.shape[0], y + h), min(dst.shape[1], x + w)
    sy, sx = y0 - y, x0 - x
    dst[y0:y1, x0:x1] |= src[sy:sy + (y1 - y0), sx:sx + (x1 - x0)]

def hbar(mask, x0, x1, y, thickness):
    y0 = max(0, y - thickness // 2)
    y1 = min(mask.shape[0], y0 + thickness)
    xa, xb = sorted((max(0, x0), min(mask.shape[1], x1)))
    mask[y0:y1, xa:xb] = True

def vbar(mask, x, y0, y1, thickness):
    x0 = max(0, x - thickness // 2)
    x1 = min(mask.shape[1], x0 + thickness)
    ya, yb = sorted((max(0, y0), min(mask.shape[0], y1)))
    mask[ya:yb, x0:x1] = True

def draw_ring(draw, cx, cy, r_o, r_i):
    draw.ellipse([cx - r_o, cy - r_o, cx + r_o, cy + r_o], fill=0)
    draw.ellipse([cx - r_i, cy - r_i, cx + r_i, cy + r_i], fill=255)

def stack_letters(letters, size):
    glyphs = [render_glyph(ch, size) for ch in letters]
    max_w = max(g.shape[1] for g in glyphs)
    overlap = max(12, int(size * 0.22))
    step_ys = [max(10, g.shape[0] - overlap) for g in glyphs]
    total_h = glyphs[0].shape[0] + sum(step_ys[1:])
    pad = size // 4
    extra_w = int(max_w * 0.18)
    canvas = np.zeros((total_h + 2 * pad, max_w + extra_w + 2 * pad), dtype=bool)
    y = pad
    for i, glyph in enumerate(glyphs):
        x = pad + extra_w // 2 + (max_w - glyph.shape[1]) // 2
        place(canvas, glyph, y, x)
        if i + 1 < len(glyphs):
            y += step_ys[i + 1]
    canvas, _ = _fuse(canvas, overlap=max(6, size // 30))
    if label_count(canvas) != 1:
        raise SystemExit("stack still disconnected")
    return crop(canvas, pad=2)


def compose_s01(stack, length):
    sh, sw = stack.shape
    if length == "short":
        pad_x, pad_y = max(18, sw // 12), max(16, sh // 22)
        stroke = max(16, min(sw, sh) // 18)
    elif length == "long":
        pad_x, pad_y = max(22, sw // 10), max(18, sh // 20)
        stroke = max(18, min(sw, sh) // 18)
    else:
        pad_x, pad_y = max(20, sw // 11), max(16, sh // 21)
        stroke = max(16, min(sw, sh) // 18)
    inner_w = sw + pad_x * 2
    inner_h = sh + pad_y * 2
    ring = max(22, stroke + 8)
    margin = ring + 18
    canvas_h = inner_h + stroke * 2 + margin * 2
    canvas_w = inner_w + stroke * 2 + margin * 2
    mask = np.zeros((canvas_h, canvas_w), dtype=bool)
    x0 = margin
    y0 = margin
    x1 = margin + inner_w + stroke
    y1 = margin + inner_h + stroke
    hbar(mask, x0, x1 + stroke, y0 + stroke // 2, stroke)
    hbar(mask, x0, x1 + stroke, y1 + stroke // 2, stroke)
    vbar(mask, x0 + stroke // 2, y0, y1 + stroke, stroke)
    vbar(mask, x1 + stroke // 2, y0, y1 + stroke, stroke)
    lx = x0 + stroke + (inner_w - sw) // 2
    ly = y0 + stroke + (inner_h - sh) // 2
    place(mask, stack, ly, lx)
    # Short side sprues only, mid-height. Not full-height bars, not a center bail.
    sprue = max(5, stroke // 3)
    mid_y = ly + sh // 2
    vbar(mask, x0 + stroke, mid_y - 10, mid_y + 10, sprue)
    vbar(mask, x1, mid_y - 10, mid_y + 10, sprue)
    hbar(mask, x0 + stroke, lx + 2, mid_y, sprue)
    hbar(mask, lx + sw - 2, x1 + sprue, mid_y, sprue)
    mask, _ = _fuse(mask, overlap=6)
    if label_count(mask) != 1:
        raise SystemExit("S01 compose disconnected")
    left = (x0 + stroke // 2, y0 + stroke // 2)
    right = (x1 + stroke // 2, y0 + stroke // 2)
    return mask, left, right, ring

def mask_to_image(mask, rings, r_o):
    img = Image.fromarray(np.where(mask, 0, 255).astype(np.uint8)).convert("L")
    if rings:
        draw = ImageDraw.Draw(img)
        r_i = max(6, r_o // 2)
        for cx, cy in rings:
            draw_ring(draw, cx, cy, r_o, r_i)
    rgb = img.convert("RGB")
    ink = np.array(rgb)[:, :, 0] < 128
    if label_count(ink) != 1:
        raise SystemExit("final image disconnected")
    return rgb

def main():
    OUT_SHARED.mkdir(parents=True, exist_ok=True)
    OUT_S01.mkdir(parents=True, exist_ok=True)
    report = []
    sizes = {"short": 280, "medium": 240, "long": 260}
    for spec in NAMES:
        size = sizes[spec["length"]]
        stack = stack_letters(spec["letters"], size)
        stack_path = OUT_SHARED / ("stack_%s.png" % spec["slug"])
        mask_to_image(stack, None, 0).save(stack_path, "PNG")
        mask, left, right, ring = compose_s01(stack, spec["length"])
        s01_path = OUT_S01 / ("drop_stack_%s.png" % spec["slug"])
        s01_img = mask_to_image(mask, [left, right], ring)
        s01_img.save(s01_path, "PNG")
        entry = {
            "name": spec["name"],
            "slug": spec["slug"],
            "length": spec["length"],
            "stack": str(stack_path.relative_to(ROOT)),
            "s01": str(s01_path.relative_to(ROOT)),
            "stack_size": [int(stack.shape[1]), int(stack.shape[0])],
            "s01_size": [int(s01_img.size[0]), int(s01_img.size[1])],
            "components": 1,
            "rings": 2,
            "rotate90": False,
        }
        report.append(entry)
        print(json.dumps(entry, ensure_ascii=False))
    (OUT_SHARED / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

if __name__ == "__main__":
    main()
