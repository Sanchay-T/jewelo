# One-line prompt check against Omran's ChatGPT picture - 2026-09-24

Question (Sanchay): does a plain one or two line prompt, like the one Omran typed into ChatGPT, give his look, and what does it get wrong?
Model `gpt-image-2.5-sunburst` via Runway MCP, ratio 1:1, no reference image, 2 takes per prompt, about 100 credits.
Omran's picture is `caleums-private/look-references-v2/origami-folded-omran-chatgpt-full.png` (private, not in git).
Images are in `img/` (gitignored); a local comparison page was built from them.

| prompt | task ids | verdict |
| --- | --- | --- |
| `A gold origami name pendant that reads "LOVE", letters made of folded triangular gold facets, on a small bail. Studio product photo on a white background.` | `2466c5a1`, `25ab121e` | both match Omran's picture: folded facets, polygon O, bail; spelled right, one piece |
| `A gold origami name pendant that reads "تسنيم" in Arabic, letters made of folded triangular gold facets, on a small bail. Studio product photo on a white background.` | `3f9d30af`, `06512b3d` | the look is right; not one piece - every dot is a loose faceted diamond touching at a corner, the ن dot hangs from the bail ring; the ن is drawn tall and reads close to ل |
| `A gold name pendant that reads "قاسم" in Arabic calligraphy, on a gold chain. Studio product photo on a white background.` | `927a3498`, `fbffa272` | a: correct and clean; b: final م drawn like ح, reads قاسح |

## What it means

- The look Omran wants comes from a one-line prompt; no long style block is needed for it.
- Latin names: the one-liner is already enough (spelled right, one piece).
- Arabic names: the one-liner gets the look but not the build. Two faults, both seen across UNIV-1 to UNIV-7:
  1. Connectors (the main one): dots float or touch at a point, so the piece cannot be cast as one casting. Wording A plus the mark inventory (A3) fixed this on 24 of 24 dots in UNIV-7.
  2. Letter shape (rarer): a letter drawn as another, here م as ح. UNIV-7 had 1 in 24 (an open final م).
- Next: origami Arabic with the one-liner plus the A3 mark inventory and connector sentence, to get Omran's look and a castable, correctly spelled name together.
