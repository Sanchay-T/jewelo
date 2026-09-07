#!/usr/bin/env python3
"""Independent geometry gate over a stencil PNG.

Checks what the renderer's own report asserts but does not measure:
one connected ink component, and the number of enclosed holes (a jump ring
shows up as a hole, so does a letter counter).
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

S4 = np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]], dtype=bool)


def ink_mask(path: Path) -> np.ndarray:
    im = Image.open(path)
    if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
        a = np.array(im.convert("RGBA"))
        return a[..., 3] > 96
    return np.array(im.convert("L")) < 128


def report(path: Path) -> dict:
    ink = ink_mask(path)
    _, n = ndimage.label(ink, structure=S4)
    filled = ndimage.binary_fill_holes(ink)
    holes = filled & ~ink
    _, hn = ndimage.label(holes, structure=S4)
    hlab, _ = ndimage.label(holes, structure=S4)
    sizes = sorted(ndimage.sum(holes, hlab, index=range(1, hn + 1)).tolist(), reverse=True)
    ys, xs = np.nonzero(ink)
    bbox = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())] if ink.any() else None
    return {
        "file": path.name,
        "size": list(ink.shape[::-1]),
        "inkPixels": int(ink.sum()),
        "components": int(n),
        "holes": int(hn),
        "holeSizes": [int(s) for s in sizes[:8]],
        "bbox": bbox,
    }


if __name__ == "__main__":
    for arg in sys.argv[1:]:
        r = report(Path(arg))
        print(f"{r['file']:28s} {str(r['size']):12s} ink={r['inkPixels']:>7} "
              f"components={r['components']:>3} holes={r['holes']:>3} {r['holeSizes'][:6]}")
