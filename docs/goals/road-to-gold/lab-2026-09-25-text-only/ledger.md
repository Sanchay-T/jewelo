# Lab 2026-09-25: text only, one line per style

Runway MCP, `gpt-image-2.5-sunburst`, no reference image of any kind.
Names: تسنيم, قاسم, زينب. Six of Omran's styles, 18 images per round.

## The prompt (this is the whole pipeline)

Written the way you would brief a jeweller: an 18k name pendant, the style in bench terms, the chain.

```
<style line> <jeweller sentence> Studio product photograph on a white background, soft even light, high polish.
```

Style lines (`NAME` is the shopper's name, Arabic in the quotes):

- classical: `An 18k yellow gold Arabic name pendant spelling "NAME" in classic Naskh script, saw-pierced from one polished gold sheet, hung from a small jump ring on a fine cable chain.`
- origami: `An 18k yellow gold Arabic origami name pendant spelling "NAME", each letter built from folded triangular gold facets with crisp creases, hung from a small bail on a fine cable chain.`
- origami ribbon: `An 18k yellow gold Arabic origami ribbon name pendant spelling "NAME", the letters folded from one continuous flat gold ribbon with sharp creases, on a fine cable chain.`
- framed minimal: `An 18k yellow gold framed minimal Arabic name pendant spelling "NAME", the name set inside a slim polished rectangular gold frame with one bezel-set round diamond at each corner, on a fine cable chain.`
- floating diamond rails: `An 18k yellow gold floating diamond rails Arabic name pendant spelling "NAME", the name floating between two slim straight gold rails, each rail set with small bezel-set round diamonds, on a fine cable chain.`
- diamond constellation frame: `An 18k yellow gold diamond constellation Arabic name pendant spelling "NAME", the name inside an open frame of small bezel-set diamonds joined by fine gold wire like a constellation, on a fine cable chain.`

Jeweller sentence (Arabic only):

```
Made like a jeweller's Arabic nameplate: cast as one single piece of gold, every dot soldered to its own letter by a short gold bridge, and any letters that do not join in Arabic linked along the baseline by a thin gold bar, so the whole name lifts off the table as one piece.
```

## Results

| Round | One piece | Spelled right |
|---|---|---|
| Name only, no jeweller sentence | mixed | 10/18 (framed 3, rails 3, classical 2, origami 1, ribbon 1, constellation 0) |
| With jeweller sentence | 18/18 | 9/18 (classical 3, rails 2, ribbon 1, framed 1, constellation 1, origami 0) |
| Jeweller sentence plus a mark list, on the 10 misses | 10/10 | 6/10 |
| Jeweller wording (18k, bench terms) plus jeweller sentence | 17/18 | 11/18; the four app styles 9/12 (classical 3, rails 3, ribbon 2, framed 1) against 7/12 before; faceted origami 0/3, constellation 2/3 |

The jeweller sentence fixes connection.
The mark list fixed most dot errors but is a rule; Sanchay chose no rules, so it is not in the pipeline.
Faceted origami tends to draw ن tall.
Misses in the jeweller-wording round: ribbon قاسم read فاسم, framed تسنيم lost one ي dot, framed قاسم one dot on ق, constellation تسنيم read تثيم.
Runway task ids and exact prompts: scratchpad `stref/jeweller2/prompts.json`, 288 credits.

## Decision (Sanchay, 25 Sep 2026)

No stencil, no reference image, no reader, no recheck, no rule text, no Python helpers.
The line above goes straight to the image model.
