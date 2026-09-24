# SP-2a3 framed negative and positive controls (24 September 2026)

Review 5 of SP-2a3 found the one-piece reader's calibration set has no framed pendant that is genuinely split, so every framed image in the set was labelled one piece and no wording could be measured against a framed miss.
These twelve stills fill that hole: four shapes that should be refused and two that should be accepted, two takes each.

Generated on the Runway MCP with `gpt-image-2.5-sunburst`, ratio 1:1, the same model as the SP-2d free-route and SP-2f2 dependent labs.
No reference image was sent; the framed look is carried by the prompt text alone, so the model was free to draw the floating parts instead of copying a welded master.
Credits: 202417 before, 202225 after, 192 credits for twelve stills.
Full-size PNGs stay local in `img/`, which is not committed, and no signed URL is recorded here; any image can be fetched again from its task id with `get_task`.

No verdict column is filled on purpose.
The generator never scores its own images; a blind viewer labels each file split or one piece, and only then do these rows join the calibration set.

## The set

| file | intended shape | intended construction | model | Runway task id | prompt | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| `img/neg-N1-1.png` | N1 | framed rectangular pendant, Arabic محمد floating inside, touching nothing | gpt-image-2.5-sunburst | `c2692256-edce-4a8c-83e0-32dc96bdb33b` | prompt N1 below | |
| `img/neg-N1-2.png` | N1 | framed rectangular pendant, Arabic محمد floating inside, touching nothing | gpt-image-2.5-sunburst | `dc55069e-18b9-4c78-a529-c51adaf04cb1` | prompt N1 below | |
| `img/neg-N2-1.png` | N2 | same frame, English "Omar" floating inside, touching nothing | gpt-image-2.5-sunburst | `46a1338c-a5a4-4c94-aa48-4b22ff7e0148` | prompt N2 below | |
| `img/neg-N2-2.png` | N2 | same frame, English "Omar" floating inside, touching nothing | gpt-image-2.5-sunburst | `716b9b88-3e42-4049-83db-c8ad43bf2327` | prompt N2 below | |
| `img/neg-N3-1.png` | N3 | framed فاطمة on an inner rail, ف dot and ة dots as separate diamonds touching at one corner point | gpt-image-2.5-sunburst | `45414a9e-6f66-40a0-a95e-d03c8119ad1c` | prompt N3 below | |
| `img/neg-N3-2.png` | N3 | framed فاطمة on an inner rail, ف dot and ة dots as separate diamonds touching at one corner point | gpt-image-2.5-sunburst | `9e755df0-b10c-49cd-839d-66891d3c0d79` | prompt N3 below | |
| `img/neg-N4-1.png` | N4 | framed Arabic word touching the frame only at a single sharp corner point | gpt-image-2.5-sunburst | `f79af93f-2ff8-429f-8c40-7417f8553ec4` | prompt N4 below | |
| `img/neg-N4-2.png` | N4 | framed Arabic word touching the frame only at a single sharp corner point | gpt-image-2.5-sunburst | `dda97aeb-3154-491b-8c60-efc94bdaeeab` | prompt N4 below | |
| `img/neg-P1-1.png` | P1 | framed سلمى on an inner rail that joins both side bars | gpt-image-2.5-sunburst | `babf7ba4-4933-4e30-9a99-8a89cd30070f` | prompt P1 below | |
| `img/neg-P1-2.png` | P1 | framed سلمى on an inner rail that joins both side bars | gpt-image-2.5-sunburst | `8de45409-b20a-47aa-86da-69fd49f0c451` | prompt P1 below | |
| `img/neg-P2-1.png` | P2 | framed محمد held by one vertical strut to the top rail, thin shadow gap above the bottom rail | gpt-image-2.5-sunburst | `c387c14e-dca6-4eea-9870-80b9f61b6e48` | prompt P2 below | |
| `img/neg-P2-2.png` | P2 | framed محمد held by one vertical strut to the top rail, thin shadow gap above the bottom rail | gpt-image-2.5-sunburst | `ace93253-af9b-4482-ac11-2650e1268667` | prompt P2 below | |

Intended shapes N1 to N4 are drawn to be split and should be refused; P1 and P2 are drawn to be one piece and guard the wording against over-correction.
Only one prompt variant was needed per shape: the model drew every shape that was asked for on the first release, including the physically impossible floating word, so no second or third variant was spent.

## Prompts

Every prompt is the same two-paragraph preamble followed by one shape paragraph.
The preamble is:

```text
Photorealistic studio photograph of one gold name pendant, product catalogue packshot.
Polished 18K yellow gold, flat mirror-polished faces, crisp square edges, visible edge depth, no stones unless stated. Warm off-white matte paper background, no props, soft diffused light with one defined highlight streak, neutral white balance, real contact shadow. Nearly straight-on, whole pendant sharp and centred with an even margin. No text, logo or watermark other than the pendant itself.
The pendant body is one slim rectangular gold frame, square bar profile, with two small round rings on its top bar for a chain. No chain in view.
```

### N1

sha256 of the full prompt: `7c4ba9fd5cb3d07ab7eb53fc138d8949b102d4af5beb37ab5ce5d0f787b03eb2`

```text
Inside the frame the Arabic word "محمد" floats completely free: it touches nothing at all. A clear gap of plain background is visible all the way around the word - above it, below it, and on both sides - between the word and every bar of the frame. The word is suspended in the middle of the opening as if held by an invisible thread, like a museum display. Do not add any bar, rail, strut, weld, prong, tab or sprue between the word and the frame. Do not let any letter reach or rest on the frame. This is intentional: the word and the frame are two separate pieces of gold with empty space between them.
```

### N2

sha256 of the full prompt: `9a43dff1abe8b827e531238958435dc896db95f1f114babb61c56d8954b0af89`

```text
Inside the frame the English word "Omar" floats completely free: it touches nothing at all. A clear gap of plain background is visible all the way around the word - above it, below it, and on both sides - between the word and every bar of the frame. The word is suspended in the middle of the opening as if held by an invisible thread, like a museum display. Do not add any bar, rail, strut, weld, prong, tab or sprue between the word and the frame. Do not let any letter reach or rest on the frame. This is intentional: the word and the frame are two separate pieces of gold with empty space between them.
```

### N3

sha256 of the full prompt: `00e86cca4748b411a030c6f20b2b5689a2495e0cb8d54c565af66b1d5fcecc59`

```text
Inside the frame the Arabic word "فاطمة" rests along a thin horizontal inner rail that runs from the left bar to the right bar, and the body of the word is welded to that rail. The dots are different: the single dot of ف above the word and the two dots of ة are small separate diamond-shaped gold studs, each one hanging so that it meets its letter at a single sharp corner point only, a pinpoint touch with plain background visible on either side of that point. The dots are not fused, not bridged by a stem, and not resting on any edge - each dot balances on one corner. Keep the pinpoint contacts clearly visible.
```

### N4

sha256 of the full prompt: `0d3593beb7fb4e5a68cc6f9d5fb7969d74af3935ef9a9bf78fe69d23276fc840`

```text
Inside the frame the Arabic word "سلمى" is tilted so that exactly one sharp corner of one letter grazes the inner face of the frame at a single pinpoint, and nowhere else. Everywhere else a clear gap of plain background separates the word from every bar of the frame. There is no rail, strut, weld bead, tab or run of metal along an edge - the whole word hangs from that one point of contact, like a card balanced on its corner. Do not widen the contact into an edge or a seam.
```

### P1

sha256 of the full prompt: `e54a057b77e06162af26bd13c67b456fb8e67c935a264b194b54e8f328a5996c`

```text
Inside the frame a thin horizontal gold rail runs all the way across from the left bar to the right bar and is fused into both of them. The Arabic word "سلمى" sits on top of that rail, its letters flowing down into the rail so that letters and rail are cast as one continuous piece of metal. Every letter and every mark of the word touches the rail or touches a neighbouring letter along a full edge. The whole pendant - frame, rail, word and rings - is one single connected piece of gold with no separate parts.
```

### P2

sha256 of the full prompt: `d1b99c5e7e1a6ff92f0b6c96c673f491e4cd800e77cc476f56b55ad501ec9389`

```text
Inside the frame the Arabic word "محمد" hangs from the top bar: one thin vertical gold strut runs from the top bar down into the tall letter of the word and is fused into both, so the word and the frame are one continuous piece of metal. Below the word a narrow band of shadowed background separates the bottom of the letters from the bottom bar of the frame, so the word does not reach the bottom bar. The letters of the word all join each other along full edges. Apart from that one shadow gap below, the pendant is a single connected piece of gold.
```

## Ledger

All twelve tasks are in `docs/goals/overnight-launch/ledger.jsonl` under run `lab-2026-09-24-negative-controls`, task `SP-2a3`, written at submit time with the prompt hash, task id and the credit balance before and after each release.
Their verdict field is `pending-blind-viewer` until the viewer scores them.

