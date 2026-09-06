#!/usr/bin/env python3
"""Deterministic name-pendant stencil renderer for the overnight image lab.

Pipeline:
  1. shape + rasterise the exact approved characters with HarfBuzz (hb-view)
     against a pinned font file, so glyph forms and joining are the font's,
     never the model's;
  2. binarise, thicken to a castable minimum stroke;
  3. connect every raster island with a straight metal bridge drawn at the
     nearest point pair - islands are never MOVED, so dots, hamzas and letter
     positions keep their exact typographic place;
  4. grow two jump rings out of the top edge so they overlap the body;
  5. hard gate: exactly one 4-connected component, or the stencil fails.

Output: 1024x1024 black silhouette on white.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
import tempfile
import unicodedata
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage
from scipy.spatial import cKDTree

REPO = Path(__file__).resolve().parents[4]
FONT_DIR = REPO / "packages/identity/engines/caleums-arabic-v3/fonts"

# lettering -> (script -> font file). Kufi has no Latin coverage, so the
# English side of the Kufi family uses Cairo, the geometric sans in the same
# licensed font pack that does cover Latin.
FONTS = {
    "classic": {"ar": "NotoNaskhArabic-Regular.ttf", "en": "PlayfairDisplay-SemiBold.ttf"},
    "kufi": {"ar": "NotoKufiArabic-Regular.ttf", "en": "cairo.ttf"},
}

CANVAS = 1024
MARGIN = 56          # clear space around the whole piece
RING_BAND = 110      # vertical room reserved above the lettering for the rings
BRIDGE_W = 24        # ~1.0 mm at a 32 mm nominal pendant width
THICKEN = 2          # dilation passes; keeps counters open, kills hairlines
RING_OUTER = 42
RING_INNER = 24
RING_GAP = 6         # weld gap between ring outer edge and the body top
STEM_W = 30          # ring weld fillet width (~1.2 mm at 32 mm nominal)
WELD_OVERLAP = 16    # how far the ring body sinks into the stroke it sits on


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def render_text(font: Path, text: str, size: int) -> np.ndarray:
    """Rasterise with HarfBuzz shaping. Returns a boolean ink mask."""
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp) / "r.png"
        subprocess.run(
            [
                "hb-view",
                f"--font-file={font}",
                f"--font-size={size}",
                "--margin=40",
                "--background=ffffff",
                "--foreground=000000",
                "--output-format=png",
                f"--output-file={out}",
                text,
            ],
            check=True,
            capture_output=True,
        )
        img = Image.open(out).convert("L")
        return np.array(img) < 128


def crop(mask: np.ndarray) -> np.ndarray:
    ys, xs = np.nonzero(mask)
    if not len(ys):
        raise SystemExit("empty raster")
    return mask[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]


def draw_bar(mask: np.ndarray, p0, p1, width: int) -> None:
    """Filled capsule between two points - a cast metal bridge."""
    y0, x0 = p0
    y1, x1 = p1
    r = width / 2.0
    ymin = max(0, int(min(y0, y1) - r) - 1)
    ymax = min(mask.shape[0] - 1, int(max(y0, y1) + r) + 1)
    xmin = max(0, int(min(x0, x1) - r) - 1)
    xmax = min(mask.shape[1] - 1, int(max(x0, x1) + r) + 1)
    yy, xx = np.mgrid[ymin : ymax + 1, xmin : xmax + 1]
    dy, dx = y1 - y0, x1 - x0
    seg = float(dy * dy + dx * dx)
    if seg == 0:
        t = np.zeros_like(yy, dtype=float)
    else:
        t = np.clip(((yy - y0) * dy + (xx - x0) * dx) / seg, 0.0, 1.0)
    py, px = y0 + t * dy, x0 + t * dx
    mask[ymin : ymax + 1, xmin : xmax + 1] |= ((yy - py) ** 2 + (xx - px) ** 2) <= r * r


STRUCT4 = np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]], dtype=bool)


def components(mask: np.ndarray):
    lab, n = ndimage.label(mask, structure=STRUCT4)
    return lab, n


def bridge_all(mask: np.ndarray, width: int) -> int:
    """Connect every island to the growing main body. Nothing is moved."""
    bridges = 0
    for _ in range(64):
        lab, n = components(mask)
        if n <= 1:
            return bridges
        sizes = ndimage.sum(mask, lab, index=range(1, n + 1))
        main = int(np.argmax(sizes)) + 1
        main_pts = np.argwhere(lab == main)
        tree = cKDTree(main_pts)
        best = None
        for idx in range(1, n + 1):
            if idx == main:
                continue
            pts = np.argwhere(lab == idx)
            d, j = tree.query(pts, k=1)
            k = int(np.argmin(d))
            if best is None or d[k] < best[0]:
                best = (float(d[k]), tuple(pts[k]), tuple(main_pts[j[k]]))
        draw_bar(mask, best[1], best[2], width)
        bridges += 1
    raise SystemExit("bridging did not converge")


def add_rings(mask: np.ndarray) -> list[tuple[int, int]]:
    """Two jump rings welded onto the top edge, one over each end of the name.

    The ring is anchored on load-bearing metal - the mask is eroded first so a
    dot, a hamza or a hairline serif can never become the chain anchor - and
    the ring body overlaps that stroke, so it is integral, not floating.
    """
    ys, xs = np.nonzero(mask)
    x0, x1 = int(xs.min()), int(xs.max())
    span = max(1, x1 - x0)
    solid = ndimage.binary_erosion(mask, structure=np.ones((11, 11), bool))
    if not solid.any():
        solid = mask
    sys_, sxs = np.nonzero(solid)
    centres: list[tuple[int, int]] = []
    for side in ("left", "right"):
        for frac in (0.18, 0.32, 0.50):
            sel = sxs < x0 + span * frac if side == "left" else sxs > x1 - span * frac
            if sel.any():
                break
        sy, sx = sys_[sel], sxs[sel]
        top = int(np.argmin(sy))
        ax, ay = int(sx[top]), int(sy[top])
        # sit the ring on the outer top corner so it never buries a hamza,
        # a dot or a serif that carries the spelling
        outward = -1 if side == "left" else 1
        cx = ax + outward * int(RING_OUTER * 0.75)
        cy = max(RING_OUTER + 2, ay - RING_OUTER + WELD_OVERLAP)
        yy, xx = np.mgrid[0 : mask.shape[0], 0 : mask.shape[1]]
        d2 = (yy - cy) ** 2 + (xx - cx) ** 2
        mask |= d2 <= RING_OUTER**2
        mask &= ~(d2 <= RING_INNER**2)
        # weld fillet from under the ring into the stroke, metal continuity
        draw_bar(mask, (cy + RING_INNER + 4, cx), (ay + 14, ax), int(STEM_W * 1.3))
        centres.append((cy, cx))
    return centres


def recentre(mask: np.ndarray) -> np.ndarray:
    """Crop to the finished piece and centre it, without rescaling."""
    ys, xs = np.nonzero(mask)
    art = mask[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]
    h, w = art.shape
    box = CANVAS - 2 * MARGIN
    if h > box or w > box:
        f = min(box / w, box / h)
        if f < 0.80:
            raise SystemExit(f"assembly {w}x{h} is far too large for the canvas")
        img = Image.fromarray((art * 255).astype(np.uint8), mode="L")
        img = img.resize((max(1, int(w * f)), max(1, int(h * f))), Image.LANCZOS)
        art = np.array(img) > 110
        h, w = art.shape
    out = np.zeros((CANVAS, CANVAS), dtype=bool)
    top, left = (CANVAS - h) // 2, (CANVAS - w) // 2
    out[top : top + h, left : left + w] = art
    return out


def build(text: str, script: str, lettering: str, out: Path) -> dict:
    text = unicodedata.normalize("NFC", text)
    font = FONT_DIR / FONTS[lettering][script]
    if not font.exists():
        raise SystemExit(f"missing font {font}")

    # leave head-room for the growth added by thickening, bridges and rings
    body_w = CANVAS - 2 * MARGIN - 2 * (THICKEN + BRIDGE_W // 2)
    body_h = CANVAS - 2 * MARGIN - RING_BAND - 2 * (THICKEN + BRIDGE_W // 2)

    probe = crop(render_text(font, text, 200))
    scale = min(body_w / probe.shape[1], body_h / probe.shape[0])
    size = max(40, min(900, int(200 * scale)))
    art = crop(render_text(font, text, size))
    # one refinement pass so long names land inside the box
    scale = min(body_w / art.shape[1], body_h / art.shape[0])
    if not 0.97 <= scale <= 1.03:
        size = max(40, min(900, int(size * scale)))
        art = crop(render_text(font, text, size))

    canvas = np.zeros((CANVAS, CANVAS), dtype=bool)
    h, w = art.shape
    top = MARGIN + RING_BAND + (body_h - h) // 2
    left = (CANVAS - w) // 2
    canvas[top : top + h, left : left + w] = art

    lab, islands_raw = components(canvas)
    for _ in range(THICKEN):
        canvas = ndimage.binary_dilation(canvas, structure=np.ones((3, 3), bool))
    bridges = bridge_all(canvas, BRIDGE_W)
    rings = add_rings(canvas)
    canvas = recentre(canvas)
    _, final_n = components(canvas)
    if final_n != 1:
        raise SystemExit(f"component gate failed: {final_n} components")

    img = Image.fromarray(np.where(canvas, 0, 255).astype(np.uint8), mode="L").convert("RGB")
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out)
    return {
        "file": out.name,
        "text": text,
        "codepoints": [f"U+{ord(c):04X}" for c in text],
        "script": script,
        "lettering": lettering,
        "font": font.name,
        "fontSha256": sha256_file(font),
        "fontSize": size,
        "islandsBeforeBridging": int(islands_raw),
        "bridges": bridges,
        "thickenPasses": THICKEN,
        "bridgeWidthPx": BRIDGE_W,
        "jumpRings": len(rings),
        "ringOuterPx": RING_OUTER,
        "ringInnerPx": RING_INNER,
        "componentsFinal": int(final_n),
        "canvas": [CANVAS, CANVAS],
        "sha256": sha256_file(out),
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--text", required=True)
    ap.add_argument("--script", required=True, choices=["ar", "en"])
    ap.add_argument("--lettering", required=True, choices=list(FONTS))
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    rec = build(args.text, args.script, args.lettering, Path(args.out))
    json.dump(rec, sys.stdout, ensure_ascii=False, indent=2)
    print()


if __name__ == "__main__":
    main()
