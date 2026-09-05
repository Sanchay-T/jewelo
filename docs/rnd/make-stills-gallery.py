#!/usr/bin/env python3
"""Build a portable click-through gallery of pass stills (ffmpeg jpgs + one HTML)."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path("/Users/sanchay/hq/projects/devonel/jewelo")
STILLS = ROOT / ".tmp/rnd-stills"
OUT = STILLS / "CALEUMS-stills-review"
IMG = OUT / "img"

LOOKS = {
    "S01": ("Rectangular", "wanted"),
    "S03": ("Framed Minimal", "wanted"),
    "S04": ("Halo Calligraphy", "wanted"),
    "S05": ("Arabic Origami", "better"),
    "S09": ("English Origami", "better"),
    "S11": ("Maze", "wanted"),
    "S13": ("Negative Space", "wanted"),
    "S14": ("Broken Frame", "wanted"),
    "S15": ("Origami Ribbon", "better"),
    "S16": ("Impossible Rectangle", "wanted"),
    "S17": ("Rotating Name", "wanted"),
    "S18": ("Diamond Rails", "wanted"),
    "S20": ("Constellation Frame", "better"),
    "S24": ("Drop Origami", "spec"),
    "S25": ("Open Frame Origami", "spec"),
    "S26": ("Stacked Origami", "spec"),
    "S27": ("Art Deco", "spec"),
    "S28": ("Celestial", "spec"),
    "S29": ("Ribbon Flow", "spec"),
}

GROUP_LABEL = {
    "wanted": "Wanted",
    "better": "Must be better",
    "spec": "Spec",
}

SIT_LABEL = {"normal": "Bar", "downwards": "Drop", "in-frame": "Window"}
NAME_LABEL = {"short": "Noor", "medium": "Asma", "long": "Muhammad"}
SIT_ORDER = {"normal": 0, "downwards": 1, "in-frame": 2}
NAME_ORDER = {"short": 0, "medium": 1, "long": 2}
NAME_AR = {"short": "نور", "medium": "أسماء", "long": "محمد"}
ENGLISH_LOOKS = {"S09", "S24", "S25", "S26", "S27", "S28", "S29"}
DISPLAY = {
    "normal": "horizontal bar. letters stay upright",
    "downwards": "upright letters stacked top to bottom. never rotate 90 degrees",
    "in-frame": "name lives inside a window. letters stay upright",
}
RECIPE = {
    "S01": "Openwork rectangular nameplate. Stencil is spelling only — never copy stencil rings as holes on letters. Fuse lettering to the frame as one piece. Two jump rings on the top frame corners only.",
    "S03": "Thin gold window. Name sits inside. Two rings on the frame corners only. Letters never carry rings.",
    "S04": "Name inside a diamond quatrefoil halo. Two jump rings on the top lobe only.",
    "S05": "Folded origami planes as Arabic lettering. One castable piece.",
    "S09": "English origami. Folded letter planes in Playfair. One piece, two rings.",
    "S11": "The letters ARE maze corridors, not cursive sitting in a box.",
    "S13": "Name cut as negative space through a gold plate.",
    "S14": "Broken / interrupted frame. The name is the break.",
    "S15": "Origami ribbon rectangle. Open-work folds, not a solid plate.",
    "S16": "Impossible Escher rectangle. Architectural lettering, one piece.",
    "S17": "Rotating / kinetic name. Letters are the hanging body.",
    "S18": "Two floating diamond rails. The name rides the gap. No closed box.",
    "S20": "Diamond constellation frame. Hang from the frame only, never from letters.",
    "S24": "Vertical drop origami cascade. Playfair capitals. Two rings at the top letter.",
    "S25": "Letters suspended inside an open frame. Rings on the frame only.",
    "S26": "Two-row stacked origami monogram.",
    "S27": "Art deco architectural caps.",
    "S28": "Celestial / constellation construction on the name.",
    "S29": "Ribbon-volume fused name. Not origami. Not a plaque.",
}


def compile_prompt(look_id: str, look_name: str, sit: str, length: str) -> str:
    english = look_id in ENGLISH_LOOKS
    name_en = NAME_LABEL[length]
    name = name_en if english else f"{NAME_AR[length]} ({name_en})"
    font = "Playfair Display SemiBold" if english else "Noto Naskh Arabic"
    lang = "en" if english else "ar"
    return (
        f"Photograph {name} as a real physical 18K yellow gold name pendant.\n"
        f"\n"
        f"Look: {look_name}\n"
        f"Display: {DISPLAY[sit]}\n"
        f"Lettering: {lang} / {font}\n"
        f"Stones: accent lab diamond\n"
        f"Scale: classic 32 mm. metal follows the name length.\n"
        f"Chain: curb 45 cm\n"
        f"Shot: ivory packshot\n"
        f"Model: gpt-image-2  ·  stencil locked\n"
        f"\n"
        f"IDENTITY\n"
        f"Use the supplied stencil as immutable geometry.\n"
        f"Preserve exact spelling, glyph order, joins, and jump rings.\n"
        f"{RECIPE[look_id]}\n"
        f"\n"
        f"CASTING\n"
        f"This is one piece of 18K gold, as if it came from a single mould.\n"
        f"Every letter is physically fused to the next letter or to the frame.\n"
        f"No floating letters. No separate islands. No air gap that would make two pieces.\n"
        f"If the stencil shows bridges, those bridges are metal in the photo.\n"
        f"The two jump rings are attached to the body, not hovering.\n"
        f"A jeweler could pick the whole pendant up as one object.\n"
        f"If any letter is a separate piece, the image is wrong. Fuse it.\n"
        f"\n"
        f"PHOTOGRAPHY\n"
        f"Real camera capture. iPhone or DSLR jewelry product photo.\n"
        f"True metal, true shadows, true depth.\n"
        f"No illustration, no CGI plastic, no glow, no logo, no extra charms."
    )


def classify(name: str) -> tuple[str | None, str | None]:
    n = name.lower()
    sit = None
    if "in-frame" in n or "in_frame" in n or "inframe" in n:
        sit = "in-frame"
    elif "downwards" in n or "downward" in n:
        sit = "downwards"
    elif "normal" in n:
        sit = "normal"
    length = None
    if "short" in n or "noor" in n or "نور" in name:
        length = "short"
    elif "medium" in n or "asma" in n or "أسماء" in name:
        length = "medium"
    elif "long" in n or "muhammad" in n or "محمد" in name:
        length = "long"
    return sit, length


def ffmpeg_jpg(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(src),
            "-vf",
            "scale=1400:1400:force_original_aspect_ratio=decrease",
            "-q:v",
            "3",
            str(dest),
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


HTML = r"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CALEUMS stills</title>
<style>
  :root {
    --ivory: #f4efe6;
    --paper: #fbf7f0;
    --ink: #1c1814;
    --mute: #6f675d;
    --line: #ddd4c6;
    --gold: #9a7b32;
    --gold-deep: #6e5520;
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin: 0;
    background: var(--ivory);
    color: var(--ink);
    font-family: Palatino, "Palatino Linotype", "Iowan Old Style", Georgia, serif;
  }
  .app {
    min-height: 100%;
    display: grid;
    grid-template-columns: 260px 1fr;
  }
  aside {
    border-right: 1px solid var(--line);
    padding: 28px 22px;
    background: var(--paper);
  }
  .mark {
    font-size: 11px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: var(--gold);
    margin: 0 0 6px;
  }
  h1 {
    font-size: 22px;
    font-weight: 500;
    margin: 0 0 28px;
  }
  h2 {
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--mute);
    margin: 22px 0 8px;
    font-weight: 500;
  }
  .pills { display: flex; flex-wrap: wrap; gap: 6px; }
  button.pill {
    appearance: none;
    border: 1px solid var(--line);
    background: transparent;
    color: var(--ink);
    padding: 6px 10px;
    font: 12px/1 Palatino, Georgia, serif;
    cursor: pointer;
  }
  button.pill.on {
    background: var(--ink);
    color: var(--ivory);
    border-color: var(--ink);
  }
  main {
    display: grid;
    grid-template-rows: auto auto 1fr auto;
    min-width: 0;
    padding: 20px 36px 16px;
  }
  .meta { text-align: center; min-height: 72px; }
  .look {
    font-size: 13px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--gold-deep);
    margin: 0 0 6px;
  }
  .title {
    font-size: 28px;
    margin: 0;
    font-weight: 500;
  }
  .count { color: var(--mute); font-size: 13px; margin: 6px 0 0; }
  .stage-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 0;
    padding: 8px 0;
  }
  #prompt {
    margin: 0 auto 12px;
    max-width: 860px;
    max-height: 132px;
    overflow: auto;
    background: #fff;
    border: 1px solid var(--line);
    padding: 10px 12px;
    font: 11px/1.35 "Courier New", Courier, monospace;
    white-space: pre-wrap;
    color: #3a342c;
    text-align: left;
  }
  #photo {
    max-width: min(860px, 100%);
    max-height: calc(100vh - 340px);
    width: auto;
    height: auto;
    object-fit: contain;
    background: #fff;
    box-shadow: 0 18px 50px rgba(40, 30, 16, 0.12);
  }
  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding-top: 8px;
  }
  .navbtn {
    appearance: none;
    border: 1px solid var(--ink);
    background: var(--ink);
    color: var(--ivory);
    min-width: 120px;
    padding: 12px 18px;
    font: 13px Palatino, Georgia, serif;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    cursor: pointer;
  }
  .navbtn:disabled { opacity: 0.3; cursor: default; }
  .hint { color: var(--mute); font-size: 12px; }
  .empty {
    text-align: center;
    color: var(--mute);
    padding: 80px 20px;
  }
  @media (max-width: 860px) {
    .app { grid-template-columns: 1fr; }
    aside { border-right: 0; border-bottom: 1px solid var(--line); }
    #photo { max-height: 58vh; }
  }
</style>
</head>
<body>
<div class="app">
  <aside>
    <p class="mark">CALEUMS</p>
    <h1>Stills</h1>
    <h2>Group</h2>
    <div class="pills" id="groups"></div>
    <h2>Sit</h2>
    <div class="pills" id="sits"></div>
    <h2>Look</h2>
    <div class="pills" id="looks"></div>
  </aside>
  <main>
    <div class="meta">
      <p class="look" id="kicker"></p>
      <p class="title" id="title"></p>
      <p class="count" id="count"></p>
    </div>
    <pre id="prompt"></pre>
    <div class="stage-wrap">
      <img id="photo" alt="">
    </div>
    <div class="bar">
      <button class="navbtn" id="prev" type="button">Prev</button>
      <span class="hint">arrow keys or click next</span>
      <button class="navbtn" id="next" type="button">Next</button>
    </div>
  </main>
</div>
<script>
var ITEMS = __ITEMS__;
var LOOKS = __LOOKS__;
var group = "all";
var sit = "all";
var look = "all";
var i = 0;

function filtered() {
  return ITEMS.filter(function (it) {
    if (group !== "all" && it.group !== group) return false;
    if (sit !== "all" && it.sit !== sit) return false;
    if (look !== "all" && it.lookId !== look) return false;
    return true;
  });
}

function pill(parent, value, label, current, onpick) {
  var b = document.createElement("button");
  b.className = "pill" + (current === value ? " on" : "");
  b.type = "button";
  b.textContent = label;
  b.onclick = function () { onpick(value); };
  parent.appendChild(b);
}

function renderPills() {
  var g = document.getElementById("groups");
  var s = document.getElementById("sits");
  var l = document.getElementById("looks");
  g.innerHTML = ""; s.innerHTML = ""; l.innerHTML = "";
  [["all","All"],["wanted","Wanted"],["better","Must be better"],["spec","Spec"]].forEach(function (x) {
    pill(g, x[0], x[1], group, function (v) { group = v; i = 0; draw(); });
  });
  [["all","All"],["normal","Bar"],["downwards","Drop"],["in-frame","Window"]].forEach(function (x) {
    pill(s, x[0], x[1], sit, function (v) { sit = v; i = 0; draw(); });
  });
  pill(l, "all", "All looks", look, function (v) { look = v; i = 0; draw(); });
  LOOKS.forEach(function (lk) {
    pill(l, lk.id, lk.id, look, function (v) { look = v; i = 0; draw(); });
  });
}

function draw() {
  renderPills();
  var list = filtered();
  var photo = document.getElementById("photo");
  var prompt = document.getElementById("prompt");
  var kicker = document.getElementById("kicker");
  var title = document.getElementById("title");
  var count = document.getElementById("count");
  var prev = document.getElementById("prev");
  var next = document.getElementById("next");
  if (!list.length) {
    photo.removeAttribute("src");
    prompt.textContent = "";
    kicker.textContent = "";
    title.textContent = "Nothing in this group";
    count.textContent = "Try another filter. Gray slots were never passed.";
    prev.disabled = true;
    next.disabled = true;
    return;
  }
  if (i < 0) i = 0;
  if (i >= list.length) i = list.length - 1;
  var it = list[i];
  photo.src = it.file;
  photo.alt = it.look + " " + it.sitLabel + " " + it.name;
  prompt.textContent = it.prompt;
  kicker.textContent = it.lookId + "  ·  " + it.groupLabel;
  title.textContent = it.look;
  count.textContent = it.sitLabel + "  ·  " + it.name + "   ·   " + (i + 1) + " of " + list.length;
  prev.disabled = i <= 0;
  next.disabled = i >= list.length - 1;
}

document.getElementById("prev").onclick = function () { i -= 1; draw(); };
document.getElementById("next").onclick = function () { i += 1; draw(); };
document.getElementById("photo").onclick = function () { i += 1; draw(); };
document.addEventListener("keydown", function (e) {
  if (e.key === "ArrowRight" || e.key === " " || e.key === "n") { i += 1; draw(); }
  if (e.key === "ArrowLeft" || e.key === "p") { i -= 1; draw(); }
});

draw();
</script>
</body>
</html>
"""


def main() -> None:
    items = []
    IMG.mkdir(parents=True, exist_ok=True)
    for look_id, (look_name, group) in LOOKS.items():
        pass_dir = STILLS / look_id / "pass"
        if not pass_dir.is_dir():
            continue
        for src in sorted(pass_dir.glob("*.png")):
            sit, length = classify(src.name)
            if not sit or not length:
                print("skip unmapped", look_id, src.name)
                continue
            fname = f"{look_id}-{sit}-{length}.jpg"
            dest = IMG / fname
            if not dest.exists() or dest.stat().st_mtime < src.stat().st_mtime:
                print("jpg", fname)
                ffmpeg_jpg(src, dest)
            items.append(
                {
                    "file": f"img/{fname}",
                    "lookId": look_id,
                    "look": look_name,
                    "group": group,
                    "groupLabel": GROUP_LABEL[group],
                    "sit": sit,
                    "sitLabel": SIT_LABEL[sit],
                    "name": NAME_LABEL[length],
                    "prompt": compile_prompt(look_id, look_name, sit, length),
                    "ord": (
                        {"wanted": 0, "better": 1, "spec": 2}[group],
                        look_id,
                        SIT_ORDER[sit],
                        NAME_ORDER[length],
                    ),
                }
            )
    items.sort(key=lambda x: tuple(x["ord"]))
    for it in items:
        it.pop("ord", None)
    looks = [{"id": k, "name": v[0], "group": v[1]} for k, v in LOOKS.items() if (STILLS / k / "pass").exists()]
    html = HTML.replace("__ITEMS__", json.dumps(items, ensure_ascii=True)).replace(
        "__LOOKS__", json.dumps(looks, ensure_ascii=True)
    )
    (OUT / "index.html").write_text(html, encoding="utf-8")
    print(f"wrote {OUT}/index.html with {len(items)} stills")


if __name__ == "__main__":
    main()
