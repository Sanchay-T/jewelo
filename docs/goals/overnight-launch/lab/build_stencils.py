#!/usr/bin/env python3
"""Build every lab stencil and write the manifest with per-file sha256."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from make_stencil import build  # noqa: E402

OUT = Path(__file__).resolve().parent / "stencils"

NAMES = [
    ("asma", "Asma", "أسماء", "lab"),
    ("noor", "Noor", "نور", "holdout"),
    ("layla", "Layla", "ليلى", "holdout"),
    ("muhammad", "Muhammad", "محمد", "holdout"),
]

def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    records = []
    for slug, latin, arabic, role in NAMES:
        for lettering in ("classic", "kufi"):
            for script, text in (("en", latin), ("ar", arabic)):
                name = f"{slug}-{script}-{lettering}.png"
                rec = build(text, script, lettering, OUT / name)
                rec.update({"slug": slug, "role": role, "intendedName": text})
                records.append(rec)
                print(f"{name:34s} islands={rec['islandsBeforeBridging']:>2} "
                      f"bridges={rec['bridges']:>2} rings={rec['jumpRings']} "
                      f"components={rec['componentsFinal']}")
    manifest = {
        "generator": "docs/goals/overnight-launch/lab/make_stencil.py",
        "generatedFor": "docs/goals/overnight-launch-2026-09-08.md workstream W2",
        "canvas": [1024, 1024],
        "gate": "exactly one 4-connected ink component, two jump rings, exact NFC characters",
        "letteringFonts": {
            "classic": {"ar": "NotoNaskhArabic-Regular.ttf", "en": "PlayfairDisplay-SemiBold.ttf"},
            "kufi": {"ar": "NotoKufiArabic-Regular.ttf", "en": "cairo.ttf"},
        },
        "note": "Noto Kufi Arabic has no Latin coverage, so the English side of the "
                "Kufi family uses Cairo, the geometric sans in the same licensed pack.",
        "stencils": records,
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(f"\n{len(records)} stencils -> {OUT}")

if __name__ == "__main__":
    main()
