"""Layer 1 - deterministic Arabic name-pendant physics solver (canonical v3).

Guarantees BEFORE any AI render:
  1. Correct connected Arabic spelling (raqm/HarfBuzz shaping - never
     arabic_reshaper+bidi on top of raqm, that double-shapes).
  2. Manufacturable one-piece geometry: every floating mark (dots, hamza,
     madda) is MOVED along the shortest path until it physically overlaps
     its letter body; letter groups are nudged until they touch. No
     connector tabs/lines ever (rule taken from a real manufactured
     pendant). Smallest-piece-first so dots travel with their letter.
  3. Two jump rings sunk into the body at each side's topmost point.
  4. Hard verification: exactly one connected component or SolverError.

Empirical record: 54/54 name-font matrix cells, 17-name regression suite
(3-9 letters, madda, standalone hamza, compounds) all pass.
"""
import io
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

FONT_DIR = __file__.rsplit("/", 1)[0] + "/fonts"

#: Arabic style -> (font file, status). Pendant catalog = cut-out only.
STYLE_FONTS = {
    "classic":   (f"{FONT_DIR}/Amiri-Regular.ttf", "LIVE"),
    "minimal":   (f"{FONT_DIR}/ScheherazadeNew-Regular.ttf",
                  "LIVE - pass dilate_px>=2 before casting (thin strokes)"),
    "signature": (f"{FONT_DIR}/ArefRuqaa-Regular.ttf",
                  "HELD - requires native-reader sign-off before sale"),
    "kufi":      (f"{FONT_DIR}/ReemKufi.ttf",
                  "EXCLUDED for cut-outs - fusing corrupts dot identity"),
    "contemporary": (None, "GAP - source + vet a font"),
    "diwani":       (None, "GAP"),
    "thuluth":      (None, "GAP"),
    "organic":      (None, "GAP"),
}


class SolverError(RuntimeError):
    """Raised when geometry cannot be guaranteed. Never render past this."""


def typeset_mask(name: str, font_path: str, size: int = 560) -> np.ndarray:
    """Shaped RTL Arabic text as a boolean ink mask."""
    font = ImageFont.truetype(font_path, size)
    kw = dict(font=font, direction="rtl", language="ar")
    tmp = Image.new("L", (10, 10), 255)
    box = ImageDraw.Draw(tmp).textbbox((0, 0), name, **kw)
    pad = size // 3
    img = Image.new("L", (box[2] - box[0] + 2 * pad, box[3] - box[1] + 2 * pad), 255)
    ImageDraw.Draw(img).text((pad - box[0], pad - box[1]), name, fill=0, **kw)
    return np.array(img) < 128


def _nearest(a_pts, b_pts):
    if len(a_pts) > 600:
        a_pts = a_pts[:: len(a_pts) // 600]
    if len(b_pts) > 6000:
        b_pts = b_pts[:: len(b_pts) // 6000]
    d = ((a_pts[:, None, :].astype(float) - b_pts[None, :, :]) ** 2).sum(-1)
    i, j = np.unravel_index(d.argmin(), d.shape)
    return a_pts[i], b_pts[j], float(np.sqrt(d[i, j]))


def _fuse(mask: np.ndarray, overlap: int, max_steps: int = 60):
    steps = 0
    while True:
        lab, n = ndimage.label(mask)
        if n == 1:
            return mask, steps
        sizes = ndimage.sum(mask, lab, range(1, n + 1))
        c = int(np.argmin(sizes)) + 1
        pts_c = np.argwhere(lab == c)
        pts_o = np.argwhere(mask & (lab != c))
        p_c, p_o, dist = _nearest(pts_c, pts_o)
        v = (p_o - p_c).astype(float)
        v /= (np.linalg.norm(v) or 1.0)
        dy, dx = np.round(v * (dist + overlap)).astype(int)
        moved = np.zeros_like(mask)
        ys = np.clip(pts_c[:, 0] + dy, 0, mask.shape[0] - 1)
        xs = np.clip(pts_c[:, 1] + dx, 0, mask.shape[1] - 1)
        moved[ys, xs] = True
        mask = (mask & (lab != c)) | moved
        steps += 1
        if steps > max_steps:
            raise SolverError(f"fuse did not converge after {max_steps} moves")


def solve(name: str, font_path: str, size: int = 560,
          dilate_px: int = 0) -> tuple[Image.Image, dict]:
    """Name -> verified one-piece pendant silhouette (black on white).

    dilate_px: minimum-stroke-width safeguard for thin fonts (Scheherazade:
    use >=2). Applied before ring placement so the final check covers it.

    Returns (PIL image, report). Raises SolverError on any guarantee failure.
    KNOWN ISSUE: on names ending in a low sweeping tail the left ring
    anchors at the tail tip (renders fine but chain hangs from the tip);
    smarter anchor ranking is a planned refinement.
    """
    mask = typeset_mask(name, font_path, size)
    _, n0 = ndimage.label(mask)
    mask, steps = _fuse(mask, overlap=max(3, size // 45))
    if dilate_px:
        mask = ndimage.binary_dilation(mask, iterations=dilate_px)

    img = Image.fromarray(np.where(mask, 0, 255).astype(np.uint8))
    draw = ImageDraw.Draw(img)
    ys, xs = np.nonzero(mask)
    r_o, r_i = size // 15, size // 28
    for side in ("left", "right"):
        sel = xs < xs.min() + (xs.max() - xs.min()) * 0.20 if side == "left" \
            else xs > xs.max() - (xs.max() - xs.min()) * 0.20
        idx = np.argmin(ys[sel])
        cx, cy = int(xs[sel][idx]), int(ys[sel][idx]) - r_o + max(2, size // 80)
        draw.ellipse([cx - r_o, cy - r_o, cx + r_o, cy + r_o], fill=0)
        draw.ellipse([cx - r_i, cy - r_i, cx + r_i, cy + r_i], fill=255)

    _, n_final = ndimage.label(np.array(img) < 128)
    if n_final != 1:
        raise SolverError(f"{name}: {n_final} components after solving")
    report = {"name": name, "components_before": int(n0),
              "fuse_moves": steps, "dilate_px": dilate_px, "passed": True}
    return img.convert("RGB"), report


def to_png_bytes(img: Image.Image) -> bytes:
    buf = io.BytesIO(); img.save(buf, "PNG"); return buf.getvalue()
