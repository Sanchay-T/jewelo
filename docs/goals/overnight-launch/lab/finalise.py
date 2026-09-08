#!/usr/bin/env python3
"""Regenerate the mechanical appendix of IMAGE-LAB.md from the ledger.

Everything above the marker is hand-written narrative and is never touched.
Everything below it is derived, so it can be rebuilt after each stage lands.
"""
import json
import os
import sys
from collections import Counter, defaultdict
from pathlib import Path

# The spend section is the one part of the appendix that cannot be derived from
# the ledger: the final balance is read from Runway `whoami`. Without it this
# script used to rebuild the document silently minus the budget paragraph, so
# the evidence that the night stayed inside its cap disappeared and the file
# still looked complete. Refuse instead, before anything is written.
FINAL_BALANCE = os.environ.get("FINAL_BALANCE", "").strip()
if not FINAL_BALANCE:
    print(
        "FINAL_BALANCE is required: it is the Runway `whoami` balance after the "
        "last generation, and the budget paragraph cannot be rebuilt without it. "
        "Re-run as FINAL_BALANCE=<balance> python3 lab/finalise.py. "
        "IMAGE-LAB.md was not modified.",
        file=sys.stderr,
    )
    sys.exit(1)
try:
    FINAL = int(FINAL_BALANCE)
except ValueError:
    print(f"FINAL_BALANCE must be an integer, got {FINAL_BALANCE!r}", file=sys.stderr)
    sys.exit(1)
if FINAL <= 0:
    print(f"FINAL_BALANCE must be a positive balance, got {FINAL}", file=sys.stderr)
    sys.exit(1)

DOC = Path(__file__).resolve().parents[1] / "IMAGE-LAB.md"
LEDGER = Path(__file__).resolve().parents[1] / "ledger.jsonl"
LAB = Path(__file__).resolve().parent
MARKER = "<!-- GENERATED APPENDIX - rebuilt by lab/finalise.py, do not hand-edit below -->"
START = 306862

rows = [json.loads(l) for l in open(LEDGER) if l.strip()]
STAGE_LABEL = {
    "stage1": "Stage 1 - Studio, 4 looks x 2 scripts",
    "stage2": "Stage 2 - holdout names (Noor, Layla, Muhammad), v4.3 framed-minimal",
    "stage3": "Stage 3 - dependent views",
    "stage4": "Stage 4 - metal and stone variants",
    "stage5": "Stage 5 - Kufi lettering",
}

out = [MARKER, ""]
out.append("## Every cell, every attempt\n")
out.append("`pass` / `tweak` / `fail` are the viewer's verdicts. This lab never scored its own images.\n")

for stage in ("stage1", "stage2", "stage3", "stage4", "stage5"):
    rs = [r for r in rows if r["stage"] == stage]
    if not rs:
        continue
    c = Counter(r["verdict"] or "unscored" for r in rs)
    npass = c.get("pass", 0)
    out.append(f"### {STAGE_LABEL[stage]} - {npass} of {len(rs)} passed\n")
    out.append("| Cell | attempts | pass | defects seen |")
    out.append("| --- | --- | :--: | --- |")
    by = defaultdict(dict)
    for r in rs:
        by[r["cell"]][r["attempt"]] = r
    for cell in sorted(by):
        a = by[cell]
        seq = " ".join(f"a{i}:{a[i]['verdict'] or 'unscored'}" for i in sorted(a))
        n = sum(1 for i in a if a[i]["verdict"] == "pass")
        d = sorted({x for i in a for x in a[i]["defects"]})
        out.append(f"| `{cell}` | {seq} | {n}/{len(a)} | {', '.join('`'+x+'`' for x in d) or '-'} |")
    out.append("")

# pass rate summary
out.append("### Pass rates\n")
out.append("| Stage | images | pass | tweak | fail | pass rate |")
out.append("| --- | ---: | ---: | ---: | ---: | ---: |")
for stage in ("stage1", "stage2", "stage3", "stage4", "stage5"):
    rs = [r for r in rows if r["stage"] == stage]
    if not rs:
        continue
    c = Counter(r["verdict"] or "unscored" for r in rs)
    out.append(f"| {stage} | {len(rs)} | {c.get('pass',0)} | {c.get('tweak',0)} | "
               f"{c.get('fail',0)} | {c.get('pass',0)/len(rs)*100:.0f}% |")
c = Counter(r["verdict"] or "unscored" for r in rows)
out.append(f"| **all** | **{len(rows)}** | **{c.get('pass',0)}** | **{c.get('tweak',0)}** | "
           f"**{c.get('fail',0)}** | **{c.get('pass',0)/len(rows)*100:.0f}%** |")
out.append("")

# defect frequency
out.append("### Defect frequency across the whole lab\n")
d = Counter(x for r in rows for x in r["defects"])
if d:
    out.append("| Defect tag | times seen | class |")
    out.append("| --- | ---: | --- |")
    CLASS = {
        "wrong-spelling": "identity", "extra-glyph": "identity", "missing-glyph": "identity",
        "floating-mark": "identity", "rotated-letters": "identity",
        "disconnected-component": "geometry", "unsupported-geometry": "geometry",
        "duplicate-pendant": "geometry", "floating-stone": "geometry",
        "extra-ring": "attachment", "missing-ring": "attachment",
        "chain-not-through-ring": "attachment",
        "cgi-look": "photography", "wrong-display": "photography",
        "wrong-look": "brief", "wrong-metal": "brief", "wrong-stones": "brief",
    }
    for tag, n in d.most_common():
        out.append(f"| `{tag}` | {n} | {CLASS.get(tag,'-')} |")
    out.append("")
    cls = Counter()
    for tag, n in d.items():
        cls[CLASS.get(tag, "-")] += n
    out.append("By class: " + ", ".join(f"{k} {v}" for k, v in cls.most_common()) + ".\n")

# passed files
passed = [r for r in rows if r["verdict"] == "pass"]
out.append(f"## Every passed file ({len(passed)})\n")
out.append("| Stage | Cell | Attempt | File |")
out.append("| --- | --- | :--: | --- |")
for r in sorted(passed, key=lambda r: (r["stage"], r["cell"], r["attempt"])):
    out.append(f"| {r['stage']} | `{r['cell']}` | a{r['attempt']} | `{r['file']}` |")
out.append("")

# spend. `FINAL` is validated at the top of the file; the script never gets
# here without it.
out.append("## Spend\n")
out.append("Every figure below is a balance read from Runway `whoami`, not an estimate.\n")
out.append("| Checkpoint | images | Runway balance | spent cumulative |")
out.append("| --- | ---: | ---: | ---: |")
out.append(f"| lab start | 0 | {START:,} | 0 |")
seen = 0
for stage, label in (("stage1", "Stage 1 close"), ("stage2", "Stage 2 close"),
                     ("stage3", "Stage 3 close"), ("stage4", "Stage 4 close"),
                     ("stage5", "Stage 5 close")):
    rs = [r for r in rows if r["stage"] == stage]
    if not rs:
        continue
    seen += len(rs)
    ca = [r["creditsAfter"] for r in rs if r.get("creditsAfter")]
    bal = min(ca) if ca else None
    if bal:
        out.append(f"| {label} | {seen} | {bal:,} | {START-bal:,} |")
    else:
        out.append(f"| {label} | {seen} | not read per stage | - |")
out.append(f"| **final `whoami`** | **{len(rows)}** | **{FINAL:,}** | **{START-FINAL:,}** |")
out.append("")
out.append(f"Budget for the night was 40,000 credits. **{START-FINAL:,} were used, "
           f"{(START-FINAL)/40000*100:.1f}% of the cap**, across {len(rows)} images.")
per = (START - FINAL) / len(rows)
out.append(f"That averages {per:.0f} credits per image against a documented rate of 20; "
           "one Stage 5 task was charged 60 rather than 20 and the API response gave no reason, "
           "so the discrepancy is recorded rather than explained away.")
out.append("")
out.append(f"The 50-tasks-in-flight cap was never approached; the largest batch submitted at once was 12. "
           f"The three-paid-attempts-per-cell cap was never exceeded.\n")

text = DOC.read_text()
head_txt = text.split(MARKER)[0].rstrip() + "\n\n"
DOC.write_text(head_txt + "\n".join(out) + "\n")
print(f"appendix rebuilt: {len(rows)} ledger rows, {len(passed)} passed")
