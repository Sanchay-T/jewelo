# Design matrix

How looks combine with finish options.
Customer launch is small.
R&D space is larger.
Do not build a screen for every SKU.

## Independent axes

| Axis | Customer | Prompt slot | Values | Open? |
| --- | --- | --- | --- | --- |
| Name | yes | `{{approved_name}}` | customer text | no |
| Script | yes, EN/AR | `{{language}}` `{{arabic_style}}` | en, ar + lettering | lettering live set is contract-bound |
| Look | yes, six at launch | `{{pendant_style}}` (missing today) | catalog IDs | exact six open |
| Display | yes, separate step | `{{layout}}` | 3 in text, 4 in VN5 | 3-vs-4 open |
| Metal | compact finish | `{{metal_color}}` `{{metal_karat}}` | yellow, white, rose · 18K | karat locked |
| Stones | compact finish | `{{stone_coverage}}` `{{gemstone}}` | none/accent/partial/full · 6 gems | no |
| Size | compact finish | `{{size_profile}}` `{{dimensions}}` | 22 / 30 / 36 mm | 35 mm asked, unanswered |
| Chain | compact or default | `{{chain_style}}` `{{chain_length}}` | 4 styles × 4 lengths | may default |
| Shot | after generate | `{{presentation_view}}` | studio, worn, close-up, dark | not a look picker |
| Name length | auto preview | catalog key | short / medium / long | not a customer picker |

## Display values

From group text, 30 Aug:

1. Normal
2. Downwards
3. In the frame

From VN5, later the same day:

1. Frame
2. Vertical
3. Horizontal
4. Square

Working interpretation only, not a decision:

| If we keep 3 | Closest VN5 word | Piece meaning |
| --- | --- | --- |
| Normal | Horizontal | Name reads as a bar |
| Downwards | Vertical | Name stacks or drops |
| In the frame | Frame | Name sits in a window |
| (none) | Square | Unassigned; do not add a fourth tile yet |

Some looks already imply a display.
Framed Minimal is already in-frame.
Drop Origami is already downwards.
Keep look and display as separate axes because he did.

## Must not multiply as style tiles

| Thing | Why |
| --- | --- |
| Classic / Minimal / Diwani / Kufi / Signature | Lettering engine |
| Side-by-side / heart / infinity / interlocked | Old two-name connectors |
| Studio / worn / close-up / dark | Camera after the piece exists |
| Video | Out of this track |

## Customer launch grid

Assume one look, three displays, compact finish kept, chain defaulted.

```text
Looks            6
Displays         3
Look × display   18   ← what the customer should feel

Metal            3
Stone configs    19   = 1 none + 3 settings × 6 gems
Size             3
Chain            default 1

SKU count        6 × 3 × 3 × 19 × 3 = 3,078
```

If chain stays fully open (4 styles × 4 lengths):

```text
3,078 × 16 = 49,248
```

That explosion is why the form has to stay short.
Do not turn SKUs into tiles.

If “up to two looks” is allowed later:

```text
C(6,1) + C(6,2) = 6 + 15 = 21 style picks
× 3 displays = 63
```

Leave that gated until he confirms.

## R&D first pass (do this, not 3,078 stills)

Default finish for experiments:

- name `أسماء` (Arabic) and a matching English name when needed
- 18K yellow
- accent diamond
- classic ~30 mm
- one default chain

Then:

```text
chosen looks  ×  3 displays  ×  1 name length
```

Add short and long name lengths only after a look wins at medium.

Do not pre-render every metal × gem × size.
Those are `{{ }}` swaps on a winning prompt.

## Launch catalog math (once six exist)

```text
6 looks × 3 displays × 3 name lengths = 54 review stills
```

That 54 is the Omran review pack, not the SKU catalog.

## Current-app leftover (do not revive as the matrix)

Today’s configurator multiplies calligraphy × two-name connectors × metal × stones × size × chain.
That is the long form he asked to reduce.
Keep it out of launch combinatorics unless a later product decision puts two-name back.
