#!/usr/bin/env python3
"""Convert CALEUMS-JOURNEY-WIREFRAME.md to PDF. ASCII is the UI mockup."""

from pathlib import Path

import markdown
from weasyprint import CSS, HTML

ROOT = Path(__file__).resolve().parent
MD = ROOT / "CALEUMS-JOURNEY-WIREFRAME.md"
CSS_PATH = ROOT / "wireframe.css"
PDF = ROOT / "CALEUMS-JOURNEY-WIREFRAME.pdf"


def main() -> None:
    body = markdown.markdown(
        MD.read_text(encoding="utf-8"),
        extensions=["extra", "sane_lists", "md_in_html"],
    )
    html = (
        "<!doctype html><html><head><meta charset='utf-8'>"
        "<title>CALEUMS customer journey</title></head>"
        f"<body>{body}</body></html>"
    )
    HTML(string=html, base_url=str(ROOT)).write_pdf(
        PDF,
        stylesheets=[CSS(filename=str(CSS_PATH))],
    )
    print(f"wrote {PDF}")


if __name__ == "__main__":
    main()
