"""Build labelled contact sheets per lab stage from the ledger verdicts.
Usage: python3 contact_sheet.py  (writes docs/goals/overnight-launch/report/contact-<stage>.jpg)
"""
import json, os, glob
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(__file__))
LEDGER = os.path.join(ROOT, "ledger.jsonl")
OUT = os.path.join(ROOT, "report")
os.makedirs(OUT, exist_ok=True)
rows = [json.loads(l) for l in open(LEDGER) if l.strip()]
by_stage = {}
for r in rows:
    if not r.get("file"): continue
    by_stage.setdefault(r["stage"], []).append(r)
try:
    font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22)
except Exception:
    font = ImageFont.load_default()
TILE, LABEL, COLS = 320, 58, 6
COLORS = {"pass": (34, 139, 34), "tweak": (200, 140, 0), "fail": (190, 30, 30)}
for stage, items in sorted(by_stage.items()):
    items = sorted(items, key=lambda r: (r["cell"], r.get("attempt", 0)))
    n = len(items); rws = (n + COLS - 1) // COLS
    sheet = Image.new("RGB", (COLS * TILE, rws * (TILE + LABEL)), (247, 244, 238))
    d = ImageDraw.Draw(sheet)
    for i, r in enumerate(items):
        x, y = (i % COLS) * TILE, (i // COLS) * (TILE + LABEL)
        p = os.path.join(os.path.dirname(ROOT), "..", "..", r["file"]) if not os.path.isabs(r["file"]) else r["file"]
        p = os.path.normpath(os.path.join(ROOT, "..", "..", "..", r["file"]))
        try:
            im = Image.open(p).convert("RGB"); im.thumbnail((TILE - 8, TILE - 8))
            sheet.paste(im, (x + 4 + (TILE - 8 - im.width) // 2, y + 4 + (TILE - 8 - im.height) // 2))
        except Exception as e:
            d.text((x + 8, y + 8), f"missing {os.path.basename(r['file'])}", fill=(0, 0, 0), font=font)
        v = r.get("verdict") or "unscored"
        col = COLORS.get(v, (90, 90, 90))
        d.rectangle([x, y + TILE, x + TILE, y + TILE + LABEL], fill=(255, 255, 255))
        d.text((x + 6, y + TILE + 4), f"{r['cell']} a{r.get('attempt','?')}", fill=(20, 20, 20), font=font)
        defects = ",".join(r.get("defects") or [])[:34]
        d.text((x + 6, y + TILE + 30), f"{v.upper()} {defects}", fill=col, font=font)
    out = os.path.join(OUT, f"contact-{stage}.jpg")
    sheet.save(out, quality=82)
    print(out, n, "images")
