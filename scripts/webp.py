#!/usr/bin/env python3
"""Convert evidence images to WebP in place (same pixels, quality 85) and delete the originals."""
import sys
from pathlib import Path
from PIL import Image

for name in sys.argv[1:]:
    src = Path(name)
    dst = src.with_suffix(".webp")
    Image.open(src).save(dst, "WEBP", quality=85, method=6)
    src.unlink()
    print(f"{src} -> {dst} ({dst.stat().st_size // 1024} KB)")
