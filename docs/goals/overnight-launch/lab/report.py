#!/usr/bin/env python3
"""Derive the stage tables and the passed-file list from the ledger."""
import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
rows = [json.loads(l) for l in open(ROOT / "ledger.jsonl") if l.strip()]

def table(stage, header):
    rs = [r for r in rows if r["stage"] == stage]
    by = defaultdict(dict)
    for r in rs:
        by[r["cell"]][r["attempt"]] = r
    lines = [header, "| --- | --- | --- | --- |"]
    for cell in sorted(by):
        atts = by[cell]
        seq = " ".join(f"a{a}:{atts[a]['verdict'] or '?'}" for a in sorted(atts))
        n = sum(1 for a in atts if atts[a]["verdict"] == "pass")
        defects = sorted({d for a in atts for d in atts[a]["defects"]})
        lines.append(f"| {cell} | {seq} | {n}/{len(atts)} | {', '.join(f'`{d}`' for d in defects) or '-'} |")
    return "\n".join(lines), rs

def summary(stage):
    rs = [r for r in rows if r["stage"] == stage]
    c = Counter(r["verdict"] or "unscored" for r in rs)
    return len(rs), c

if __name__ == "__main__":
    for stage in ("stage1", "stage3", "stage4"):
        rs = [r for r in rows if r["stage"] == stage]
        if not rs:
            continue
        n, c = summary(stage)
        print(f"\n### {stage}: {n} images  {dict(c)}")
        t, _ = table(stage, "| Cell | attempts | pass | defects |")
        print(t)
    print("\n### passed files")
    for r in rows:
        if r["verdict"] == "pass":
            print(f"  {r['stage']:7s} {r['cell']:34s} a{r['attempt']}  {r['file']}")
    print(f"\ncredits: start 306862, balance {min(r['creditsAfter'] for r in rows)}, "
          f"spent {306862 - min(r['creditsAfter'] for r in rows)}, images {len(rows)}")
    print(f"pass total {sum(1 for r in rows if r['verdict']=='pass')} of {len(rows)}")
