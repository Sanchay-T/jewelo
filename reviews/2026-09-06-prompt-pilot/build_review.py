"""Build a local evidence page from the saved submissions and audit records."""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
e = html.escape


def main():
    pilot = json.loads((ROOT / "pilot.json").read_text())
    records = json.loads((ROOT / "audit.json").read_text()) if (ROOT / "audit.json").exists() else []
    cards = []
    for record in records:
        prompt = (ROOT / record["prompt_file"]).read_text()
        findings = "".join(f"<li>{e(f)}</li>" for f in record.get("findings", []))
        gates = "".join(f"<span>{e(k)}: <b>{e(v)}</b></span>" for k, v in record.get("gates", {}).items())
        image = record.get("file")
        photo = f'<a href="{e(image)}"><img src="{e(image)}" alt="Attempt {record["attempt"]} full output"></a>' if image else '<p>Output not available.</p>'
        crops = "".join(f'<a href="{e(c)}"><img src="{e(c)}" alt="Audit detail"></a>' for c in record.get("crops", []))
        cards.append(f'''<article id="attempt-{record['attempt']}">
        <div class="heading"><h2>Attempt {record['attempt']} · {e(record['version'])}</h2><b class="{e(record['status'])}">{e(record['status'])}</b></div>
        <p>{e(record.get('condition',''))}</p><small>Runway task {e(record['task_id'])}</small>
        <details open><summary>Exact submitted prompt</summary><pre>{e(prompt)}</pre></details>
        {photo}<div class="gates">{gates}</div><ul>{findings}</ul>
        <p class="reviewer">{e(record.get('reviewer',''))}</p><div class="crops">{crops}</div></article>''')
    page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>CALEUMS · Prompt pilot · 6 September 2026</title><style>
    *{box-sizing:border-box}body{margin:0;background:#f5f2e9;color:#18362e;font:16px/1.5 system-ui,sans-serif}main{max-width:1450px;margin:auto;padding:36px 24px}h1{font:44px/1.1 Georgia,serif;margin:12px 0}h2{font-size:20px}header{max-width:920px;margin-bottom:28px}.eyebrow,small{font-size:12px;color:#52655d}a{color:inherit}.intro{padding:20px;background:#e8ece4;border-radius:12px}.reference{max-width:620px;width:100%;background:white;border:1px solid #d9ded5}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}article{background:#fffef9;border:1px solid #dcded4;padding:20px;border-radius:12px;min-width:0}article img{width:100%;display:block;margin-top:16px}.heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.heading>b{padding:5px 9px;border-radius:20px;font-size:12px}.pass{background:#dcebd8}.reject{background:#f6d9ce}.needs_review{background:#f2e6b8}details{margin-top:16px;border:1px solid #dce0d4;padding:12px}summary{cursor:pointer;font-weight:600}pre{max-height:360px;overflow:auto;white-space:pre-wrap;font:13px/1.55 ui-monospace,monospace}.gates{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.gates span{font-size:12px;padding:4px 7px;background:#edf0e9}.crops{display:grid;grid-template-columns:1fr 1fr;gap:8px}.reviewer,footer{font-size:13px;color:#52655d}footer{margin-top:32px}@media(max-width:750px){.grid{grid-template-columns:1fr}h1{font-size:34px}main{padding:22px 14px}}
    </style><main><header><div class="eyebrow">CALEUMS / JEWELRY R&D / 6 SEPTEMBER 2026</div><h1>Preserve the piece.<br>Inspect the result.</h1>
    <p>One Muhammad geometry reference. Repeated controlled trials. Exact prompts above every output; failures remain visible.</p>
    <div class="intro"><b>Scope:</b> Runway GPT Image 2, maximum six submitted images including retries. Experimental rendering evidence, not manufacturing approval or proof of universality. Source reference has one connected script component and zero glyph fusion moves. Eyelets are integral; separate jump rings thread through them.</div></header>
    <section><h2>Geometry reference</h2><img class="reference" src="references/muhammad-geometry.png" alt="Deterministic Muhammad silhouette with two integral eyelets"><p><a href="pilot.json">Submission metadata</a> · <a href="audit.json">Audit records</a> · <a href="../../docs/rnd/PROMPT-SYSTEM.md">Consolidated specification</a></p></section><section class="grid">'''
    if pilot.get("summary"):
        summary = pilot["summary"]
        page = page.replace('<section class="grid">', f'<p><b>Completed: {summary["visual_pass"]} visual passes / {summary["reject"]} rejects.</b> No prompt promoted. The v0.2 wording did not fix hardware; v0.3 assembly-reference method remains untested.</p><section class="grid">')
    page += "\n".join(cards)
    page += f'</section><footer>{pilot.get("images_submitted", 0)} of 6 authorized images submitted. Critical uncertainty is needs_review, never an assumed pass. Prompt and image files are immutable per attempt.</footer></main></html>'
    (ROOT / "review.html").write_text(page)
    print(f"Built review.html with {len(records)} audit records")


if __name__ == "__main__":
    main()
