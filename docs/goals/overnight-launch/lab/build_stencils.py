#!/usr/bin/env python3
"""Build every lab stencil and merge the per-file records into the manifest.

Two variants per cell:

  <slug>-<script>-<lettering>.png           welded jump rings, the castable piece
  <slug>-<script>-<lettering>-norings.png   lettering only, for prompt families
                                            whose construction carries its own
                                            rings (IMAGE-LAB.md, extra-ring defect)

A file that is already on disk is kept, not rebuilt: some cells (the Arabic
classic ringed stencils) come from the production identity renderer via
render-production-stencils.mts, and the manifest records that in
stencil_source. Pass --force to rebuild the lab-rendered files anyway.

The manifest is merged, never rewritten from scratch: existing records are
preserved byte for byte and missing ones are inserted in build order.
"""
import argparse
import json
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from make_stencil import build, sha256_file  # noqa: E402
from verify_stencil import report as verify_report  # noqa: E402

OUT = HERE / "stencils"
MANIFEST = OUT / "manifest.json"

NAMES = [
    ("asma", "Asma", "أسماء", "lab"),
    ("noor", "Noor", "نور", "holdout"),
    ("layla", "Layla", "ليلى", "holdout"),
    ("muhammad", "Muhammad", "محمد", "holdout"),
]
LETTERINGS = ("classic", "kufi")
# (filename suffix, rings on)
VARIANTS = (("", True), ("-norings", False))

NORINGS_GAP = (
    "the production identity engine has no rings-off mode - every anchor it emits carries "
    "welded jump rings - so this ring-free variant exists only in the lab renderer"
)


def record_for(rec: dict, slug: str, role: str, script: str, lettering: str,
               text: str, rings: bool, path: Path) -> dict:
    """A manifest record in the schema the existing entries already use."""
    measured = verify_report(path)
    return {
        "file": path.name,
        "slug": slug,
        "role": role,
        "script": script,
        "lettering": lettering,
        "intendedName": text,
        "codepoints": rec["codepoints"],
        "stencil_source": "lab",
        "variant": "rings" if rings else "norings",
        "productionGap": None if rings else NORINGS_GAP,
        "sha256": rec["sha256"],
        "pixelSize": measured["size"],
        "components": measured["components"],
        "holes": measured["holes"],
        "labRender": {
            "font": rec["font"],
            "fontSha256": rec["fontSha256"],
            "fontSize": rec["fontSize"],
            "islandsBeforeBridging": rec["islandsBeforeBridging"],
            "bridges": rec["bridges"],
            "jumpRings": rec["jumpRings"],
            "bridgeWidthPx": rec["bridgeWidthPx"],
            **({"ringOuterPx": rec["ringOuterPx"], "ringInnerPx": rec["ringInnerPx"]} if rings else {}),
        },
    }


def load_manifest() -> dict:
    if MANIFEST.exists():
        return json.loads(MANIFEST.read_text())
    return {"stencils": []}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true",
                    help="re-render lab files that already exist (production-sourced files are still kept)")
    args = ap.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    manifest = load_manifest()
    existing = {r["file"]: r for r in manifest.get("stencils", [])}

    order: list[str] = []
    built = 0
    for slug, latin, arabic, role in NAMES:
        for lettering in LETTERINGS:
            for script, text in (("en", latin), ("ar", arabic)):
                for suffix, rings in VARIANTS:
                    name = f"{slug}-{script}-{lettering}{suffix}.png"
                    order.append(name)
                    path = OUT / name
                    on_disk = path.exists()
                    from_production = existing.get(name, {}).get("stencil_source") == "production"
                    if on_disk and (from_production or not args.force):
                        if name in existing:
                            print(f"{name:38s} kept")
                            continue
                        # On disk but unrecorded. Re-render to a scratch path so the
                        # bytes already published are never touched, then record the
                        # bytes that are actually on disk.
                        with tempfile.TemporaryDirectory() as tmp:
                            probe = Path(tmp) / name
                            rec = build(text, script, lettering, probe, rings=rings)
                            reproduced = rec["sha256"] == sha256_file(path)
                        rec["sha256"] = sha256_file(path)
                        entry = record_for(rec, slug, role, script, lettering, text, rings, path)
                        if not reproduced:
                            entry["stencil_source"] = "lab (published bytes differ from a fresh render)"
                        existing[name] = entry
                        print(f"{name:38s} kept, manifested"
                              f"{'' if reproduced else '  DRIFT: fresh render differs'}")
                        continue
                    rec = build(text, script, lettering, path, rings=rings)
                    existing[name] = record_for(rec, slug, role, script, lettering, text, rings, path)
                    built += 1
                    print(f"{name:38s} built  islands={rec['islandsBeforeBridging']:>2} "
                          f"bridges={rec['bridges']:>2} rings={rec['jumpRings']} "
                          f"components={rec['componentsFinal']}")

    manifest["stencils"] = [existing[n] for n in order if n in existing]
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(f"\n{built} built, {len(manifest['stencils'])} stencils manifested -> {OUT}")


if __name__ == "__main__":
    main()
