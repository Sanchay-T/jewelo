#!/usr/bin/env python3
"""Merge viewer verdict files into the ledger, matching on (cell, attempt).

The ledger row is written when the task is submitted, with verdict null.
The viewer writes verdicts separately so the generator can never score itself.
This joins the two without inventing a verdict for anything unscored.
"""
import glob
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = ROOT / "ledger.jsonl"

verdicts = {}
for path in sorted(glob.glob(str(ROOT / "lab" / "*" / "verdicts*.jsonl"))):
    for line in open(path):
        if not line.strip():
            continue
        v = json.loads(line)
        verdicts[(v["cell"], v["attempt"])] = (v, Path(path).name)

rows = [json.loads(l) for l in open(LEDGER) if l.strip()]
merged = unscored = 0
for row in rows:
    hit = verdicts.get((row["cell"], row["attempt"]))
    if not hit:
        unscored += 1
        continue
    v, src = hit
    row["verdict"] = v["verdict"]
    row["defects"] = v.get("defects", [])
    row["viewerAxis"] = v.get("axis")
    row["viewerConfidence"] = v.get("confidence")
    for extra in ("sameAsMaster", "samePhotograph", "letteringIsKufi"):
        if extra in v:
            row[extra] = v[extra]
    row["verdictSource"] = src
    merged += 1

with open(LEDGER, "w") as fh:
    for row in rows:
        fh.write(json.dumps(row, ensure_ascii=False) + "\n")

print(f"ledger rows {len(rows)}  scored {merged}  unscored {unscored}")
scored = [r for r in rows if r.get("verdict")]
by = {}
for r in scored:
    by.setdefault(r["cell"], []).append((r["attempt"], r["verdict"]))
for cell in sorted(by):
    seq = " ".join(f"a{a}:{v}" for a, v in sorted(by[cell]))
    print(f"  {cell:22s} {seq}")
