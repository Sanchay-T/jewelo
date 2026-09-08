#!/usr/bin/env python3
"""Merge viewer verdict files into the ledger, matching on (cell, attempt).

The ledger row is written when the task is submitted, with verdict null.
The viewer writes verdicts separately so the generator can never score itself.
This joins the two without inventing a verdict for anything unscored.
"""
import glob
import json
import os
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = ROOT / "ledger.jsonl"

# Every field this script owns. Listed once so a miss clears exactly what a hit
# would have written: a row that loses its verdict file must lose its verdict,
# not keep a stale one that no longer has a viewer behind it.
VERDICT_FIELDS = (
    "verdict",
    "defects",
    "viewerAxis",
    "viewerConfidence",
    "sameAsMaster",
    "samePhotograph",
    "letteringIsKufi",
    "verdictSource",
)

verdicts = {}
duplicates = 0
for path in sorted(glob.glob(str(ROOT / "lab" / "*" / "verdicts*.jsonl"))):
    for line in open(path):
        if not line.strip():
            continue
        v = json.loads(line)
        key = (v["cell"], v["attempt"])
        previous = verdicts.get(key)
        if previous is not None:
            # Last write still wins, but silently is how two viewers disagreeing
            # about the same image becomes one verdict nobody chose.
            duplicates += 1
            print(
                f"warning: duplicate verdict for {key[0]} a{key[1]}: "
                f"{previous[1]} says {previous[0]['verdict']}, "
                f"{Path(path).name} says {v['verdict']} and wins",
                file=sys.stderr,
            )
        verdicts[key] = (v, Path(path).name)

rows = [json.loads(l) for l in open(LEDGER) if l.strip()]
merged = unscored = 0
for row in rows:
    hit = verdicts.get((row["cell"], row["attempt"]))
    if not hit:
        unscored += 1
        row["verdict"] = None
        row["defects"] = []
        for stale in VERDICT_FIELDS:
            if stale not in ("verdict", "defects"):
                row.pop(stale, None)
        continue
    v, src = hit
    row["verdict"] = v["verdict"]
    row["defects"] = v.get("defects", [])
    row["viewerAxis"] = v.get("axis")
    row["viewerConfidence"] = v.get("confidence")
    for extra in ("sameAsMaster", "samePhotograph", "letteringIsKufi"):
        if extra in v:
            row[extra] = v[extra]
        else:
            row.pop(extra, None)
    row["verdictSource"] = src
    merged += 1

# Written to a sibling temp file and moved into place, so an interrupted run
# cannot leave the ledger truncated. `open(LEDGER, "w")` emptied the only copy
# of the corpus before the first byte was written back.
fd, tmp_path = tempfile.mkstemp(dir=str(ROOT), prefix=".ledger.", suffix=".tmp")
try:
    with os.fdopen(fd, "w") as fh:
        for row in rows:
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")
        fh.flush()
        os.fsync(fh.fileno())
    os.replace(tmp_path, LEDGER)
except BaseException:
    if os.path.exists(tmp_path):
        os.unlink(tmp_path)
    raise

print(
    f"ledger rows {len(rows)}  scored {merged}  unscored {unscored}"
    f"  duplicate verdict keys {duplicates}"
)
scored = [r for r in rows if r.get("verdict")]
by = {}
for r in scored:
    by.setdefault(r["cell"], []).append((r["attempt"], r["verdict"]))
for cell in sorted(by):
    seq = " ".join(f"a{a}:{v}" for a, v in sorted(by[cell]))
    print(f"  {cell:22s} {seq}")
