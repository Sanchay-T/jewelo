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



## Labels (blind viewer, lead decides the one close call)

A viewer who did not generate them labelled copies under random names; the lead mapped them back.
| file | intended | label | where |
| --- | --- | --- | --- |
| `neg-N1-1` | N1 | split | whole word floats inside the frame |
| `neg-N1-2` | N1 | split | whole word floats inside the frame |
| `neg-N2-1` | N2 | split | frame, O, m and "ar" are four bodies |
| `neg-N2-2` | N2 | split | word floats |
| `neg-N3-1` | N3 | split | left diamond of the ة dots floats; ف dot on its point |
| `neg-N3-2` | N3 | split (lead) | the viewer passed it on a thin pixel neck; the ة diamonds meet each other and the letter tip to tip and the ف diamond sits on its point, which the rule calls floating, so the lead labels it split |
| `neg-N4-1` | N4 | one piece | the model drew an edge join: alif runs into the top rail |
| `neg-N4-2` | N4 | one piece | alif runs into the top rail |
| `neg-P1-1` | P1 | one piece | baseline rail into both side bars |
| `neg-P1-2` | P1 | one piece | alif into the top rail, feet on the bottom rail |
| `neg-P2-1` | P2 | one piece | strut from the top rail into the ح |
| `neg-P2-2` | P2 | one piece | strut from the top rail into the ح |

Six split and six one piece. The viewer flagged `neg-P2-1` and `neg-P2-2` letterforms as odd; spelling is not what this set measures.

## Held-out controls (24 September 2026)

Wording 4 was written against the twelve controls above, so those controls can no longer test it.
These twenty-two stills are shapes the wording has never seen: six split split-shapes it must refuse, one split shape it must refuse in a classical body, and two one-piece look-alikes it must accept.
They are held out on purpose and no wording has been tuned against them.

Generated on the Runway MCP with `gpt-image-2.5-sunburst`, ratio 1:1, no reference image, plain warm off-white studio background.
Credits: 202225 before, 201873 after, 352 credits for twenty-two stills.
Full-size PNGs stay local in `img/`, which is not committed, and no signed URL is recorded here; any image can be fetched again from its task id with `get_task`.

As with the twelve above, no verdict column is filled.
The generator never scores its own images; a blind viewer labels each file split or one piece before these rows join the calibration set.

### The set

| file | intended shape | intended construction | model | Runway task id | prompt | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| `img/held-H1a-1.png` | H1 | framed pendant, Arabic سلمى meeting the frame at one sharp point only, close-up | gpt-image-2.5-sunburst | `5b01a1e7-6778-468c-9b54-84dc88ee1138` | prompt H1a below | |
| `img/held-H1a-2.png` | H1 | framed pendant, Arabic سلمى meeting the frame at one sharp point only, close-up | gpt-image-2.5-sunburst | `a232ef8a-fe70-4a2e-b462-54a0c8b49fdd` | prompt H1a below | |
| `img/held-H1b-1.png` | H1 | framed pendant, Arabic محمد rotated so one letter corner meets the left bar at one point only, angled close crop | gpt-image-2.5-sunburst | `8d629abd-e15e-4299-b5a4-1964510182ba` | prompt H1b below | |
| `img/held-H1b-2.png` | H1 | framed pendant, Arabic محمد rotated so one letter corner meets the left bar at one point only, angled close crop | gpt-image-2.5-sunburst | `a22837a1-e323-4cd9-8c07-aa724bfbc426` | prompt H1b below | |
| `img/held-H2-1.png` | H2 | framed pendant, Arabic محمد held to the top bar by a single hair-thin wire, thinner than any other metal | gpt-image-2.5-sunburst | `1a35906c-e693-4942-9339-59de49c67e93` | prompt H2 below | |
| `img/held-H2-2.png` | H2 | framed pendant, Arabic محمد held to the top bar by a single hair-thin wire, thinner than any other metal | gpt-image-2.5-sunburst | `db5259c0-2f88-4c00-a212-94700b247d15` | prompt H2 below | |
| `img/held-H3-1.png` | H3 | framed pendant on an inner rail, one whole Arabic letter floating free inside the frame | gpt-image-2.5-sunburst | `5de8dcb0-2520-408a-b549-3b3632b54a91` | prompt H3 below | |
| `img/held-H3-2.png` | H3 | framed pendant on an inner rail, one whole Arabic letter floating free inside the frame | gpt-image-2.5-sunburst | `f13d41ea-9f3f-4084-8e29-eab7d5416fdf` | prompt H3 below | |
| `img/held-H3b-1.png` | H3 | same shape, second wording: the inner bar drawn explicitly and the letter lifted half a letter-height clear of it | gpt-image-2.5-sunburst | `1e546873-f011-4df4-9f9f-be8a4c174b0f` | prompt H3b below | |
| `img/held-H3b-2.png` | H3 | same shape, second wording: the inner bar drawn explicitly and the letter lifted half a letter-height clear of it | gpt-image-2.5-sunburst | `919a1841-ede5-4983-821e-b9bc51e63cba` | prompt H3b below | |
| `img/held-H4-1.png` | H4 | diamond-rails pendant, one letter floating between the two rails touching neither rail nor neighbour | gpt-image-2.5-sunburst | `e1289a36-68b6-4c24-8e51-9cae61c80577` | prompt H4 below | |
| `img/held-H4-2.png` | H4 | diamond-rails pendant, one letter floating between the two rails touching neither rail nor neighbour | gpt-image-2.5-sunburst | `dbc731ba-8f25-4039-8167-68392ae6c8e9` | prompt H4 below | |
| `img/held-H4b-1.png` | H4 | same shape, second wording: the floating letter cut short at both ends with a rail-thick band of background above and below | gpt-image-2.5-sunburst | `2167654b-9bed-4340-b5a5-d94b671824a8` | prompt H4b below | |
| `img/held-H4b-2.png` | H4 | same shape, second wording: the floating letter cut short at both ends with a rail-thick band of background above and below | gpt-image-2.5-sunburst | `cb05ed3c-fd53-4acb-8958-4bdd5cc37439` | prompt H4b below | |
| `img/held-H5-1.png` | H5 | classical English "Sarah", the final h separated from "Sara" by a clear gap with no bridge | gpt-image-2.5-sunburst | `92a89e7b-2cb3-4b88-b624-c0bd3d048a10` | prompt H5 below | |
| `img/held-H5-2.png` | H5 | classical English "Sarah", the final h separated from "Sara" by a clear gap with no bridge | gpt-image-2.5-sunburst | `0038b158-c439-4831-bf6a-597ba06e1ca5` | prompt H5 below | |
| `img/held-H6-1.png` | H6 | classical English "Sarah", fully joined, the left jump ring a loose loop beside the end letter touching nothing | gpt-image-2.5-sunburst | `7698d1dd-cf17-40d9-a3f2-ae1b7e325c62` | prompt H6 below | |
| `img/held-H6-2.png` | H6 | classical English "Sarah", fully joined, the left jump ring a loose loop beside the end letter touching nothing | gpt-image-2.5-sunburst | `32aa535d-caf7-4d11-a6b6-7ec5988d0345` | prompt H6 below | |
| `img/held-H7-1.png` | H7 | one-piece look-alike: framed محمد on a plate welded to the bottom bar by a broad visible joint | gpt-image-2.5-sunburst | `77beecd0-bd55-451b-8e06-f78a7ff949d5` | prompt H7 below | |
| `img/held-H7-2.png` | H7 | one-piece look-alike: framed محمد on a plate welded to the bottom bar by a broad visible joint | gpt-image-2.5-sunburst | `1995f1e0-092a-4348-b0a7-dca377098371` | prompt H7 below | |
| `img/held-H8-1.png` | H8 | one-piece look-alike: classical "Sarah", every letter joined, both rings properly fused | gpt-image-2.5-sunburst | `3dcdc6f2-9a2e-4f46-9a5b-5b1f5e8cfcb6` | prompt H8 below | |
| `img/held-H8-2.png` | H8 | one-piece look-alike: classical "Sarah", every letter joined, both rings properly fused | gpt-image-2.5-sunburst | `e1f36e90-5475-4350-a4ee-2b554c499c35` | prompt H8 below | |

H1 to H6 are drawn to be split and should be refused; H7 and H8 are drawn to be one piece and guard against over-correction.
H3 and H4 each took two prompt variants: the first wording drew the construction but not the floating letter, so a second wording was released that names the inner bar explicitly and gives the lifted letter a band of background on every side.
H1 took two variants by design, since the equivalent shape N4 failed to draw at all on the earlier run; both variants are kept so the viewer can judge which, if either, carries the pinpoint contact.
Every other shape drew on its first variant and no third variant was spent.

### Prompts

Each prompt is the shared studio preamble, then a construction line (frame, two rails, or flowing script), then one shape paragraph.

### H1a

sha256 of the full prompt: `81687d424d21953915a6e485c2e66415db40e4335fc04b2e9033af73f0cb6e7d`

```text
Photorealistic studio photograph of one gold name pendant, product catalogue packshot.
Polished 18K yellow gold, flat mirror-polished faces, crisp square edges, visible edge depth, no stones unless stated. Warm off-white matte paper background, no props, soft diffused light with one defined highlight streak, neutral white balance, real contact shadow. Nearly straight-on, whole pendant sharp and centred with an even margin. No text, logo or watermark other than the pendant itself.
The pendant body is one slim rectangular gold frame, square bar profile, with two small round rings on its top bar for a chain. No chain in view.
Inside the frame the Arabic word "سلمى" hangs at a slight tilt and the ONLY metal contact anywhere in the opening is a single pinpoint: the sharp upper tip of the tall letter just grazes the inner face of the top bar, meeting it at one point no wider than the tip itself. Everywhere else - below the word, on both sides, and along the whole bottom bar - a wide clear gap of plain background separates the word from the frame, and the gap beneath the word is as tall as the letters themselves. There is no inner rail, no strut, no wire, no weld bead, no tab, no sprue and no run of metal along any edge. The letter tip does not widen, flare, merge or flow into the bar; it stops dead at the point of touch, like a needle resting on glass. Shoot this as a tight close-up of the pendant so that the single pinpoint contact and the open gaps all around the word are unmistakable.
```

### H1b

sha256 of the full prompt: `b0eac22645ee06776f2d9ce89d86503282481125d3a8515f6691042f404ed72f`

```text
Photorealistic studio photograph of one gold name pendant, product catalogue packshot.
Polished 18K yellow gold, flat mirror-polished faces, crisp square edges, visible edge depth, no stones unless stated. Warm off-white matte paper background, no props, soft diffused light with one defined highlight streak, neutral white balance, real contact shadow. Nearly straight-on, whole pendant sharp and centred with an even margin. No text, logo or watermark other than the pendant itself.
The pendant body is one slim rectangular gold frame, square bar profile, with two small round rings on its top bar for a chain. No chain in view.
Inside the frame the Arabic word "محمد" is rotated a few degrees clockwise so that one sharp corner of one letter stroke just kisses the inner face of the left-hand side bar at a single pinpoint, and that pinpoint is the only place in the whole pendant where the word and the frame come together. Above the word, below the word and along the entire right-hand side there is a broad band of plain background between the word and the frame, wide enough to pass a thread through. Nothing bridges those gaps: no rail, no strut, no wire, no tab, no weld, no fillet, no shared edge, no run of metal. At the contact the corner stays a corner - it must not spread into a seam, a shoulder or a band of metal with width. Photograph it slightly angled and cropped close so the one point of contact and the empty space around the rest of the word read clearly.
```

### H2

sha256 of the full prompt: `5a0394f7ccb2b2e59572d8f23fcf439e5740c40b7db58fa820e0ce92e0483065`

```text
Photorealistic studio photograph of one gold name pendant, product catalogue packshot.
Polished 18K yellow gold, flat mirror-polished faces, crisp square edges, visible edge depth, no stones unless stated. Warm off-white matte paper background, no props, soft diffused light with one defined highlight streak, neutral white balance, real contact shadow. Nearly straight-on, whole pendant sharp and centred with an even margin. No text, logo or watermark other than the pendant itself.
The pendant body is one slim rectangular gold frame, square bar profile, with two small round rings on its top bar for a chain. No chain in view.
Inside the frame the Arabic word "محمد" is held to the frame by one single hair-thin gold wire and by nothing else. That wire drops from the top bar down onto the top of the tallest letter. It is dramatically thinner than every other piece of metal in the pendant, about one tenth the thickness of the frame bars and of the letter strokes, as fine as a single strand of hair, so slender it almost vanishes against the background. Everywhere else a clear gap of plain background separates the word from every bar of the frame - below the word, on the left and on the right. There is no inner rail, no strut, no tab, no second wire and no run of metal along any edge. Keep that one wire visible and keep it hair-thin; do not thicken it into a bar, a strut or a stem.
```

### H3

sha256 of the full prompt: `761bcbeb906407dbac56688a8e8d19d287b626e17fe3260b1836e4c7c37b991a`

```text
Photorealistic studio photograph of one gold name pendant, product catalogue packshot.
Polished 18K yellow gold, flat mirror-polished faces, crisp square edges, visible edge depth, no stones unless stated. Warm off-white matte paper background, no props, soft diffused light with one defined highlight streak, neutral white balance, real contact shadow. Nearly straight-on, whole pendant sharp and centred with an even margin. No text, logo or watermark other than the pendant itself.
The pendant body is one slim rectangular gold frame, square bar profile, with two small round rings on its top bar for a chain. No chain in view.
Inside the frame the Arabic word "سلمى" rests along a thin horizontal inner rail that runs from the left bar to the right bar, and most of the word is fused into that rail. One whole letter is different: the tall upright letter of the word has been lifted out of the line and floats free in the air above the rail, touching nothing at all. A clear gap of plain background is visible all the way around that one letter - between it and the rail below it, between it and the letter on either side, and between it and every bar of the frame. The floating part is a full-size letter, as large and as thick as its neighbours; it is not a dot and not a diacritic. The rest of the word stays welded to the rail. Do not add any stem, wire, tab, prong or weld to the floating letter and do not let it reach the rail.
```

### H3b

sha256 of the full prompt: `112fd5a0ab058688439319c4b6ca8db59f8b2e1157a9fe83243b8e20ff565f6a`

```text
Photorealistic studio photograph of one gold name pendant, product catalogue packshot.
Polished 18K yellow gold, flat mirror-polished faces, crisp square edges, visible edge depth, no stones unless stated. Warm off-white matte paper background, no props, soft diffused light with one defined highlight streak, neutral white balance, real contact shadow. Nearly straight-on, whole pendant sharp and centred with an even margin. No text, logo or watermark other than the pendant itself.
The pendant body is one slim rectangular gold frame, square bar profile, with two small round rings on its top bar for a chain. No chain in view.
Inside the frame a straight thin horizontal gold bar is drawn all the way across the opening, from the left bar to the right bar, and it is fused into both of them - draw this inner bar clearly, it must be visible. The Arabic word "سلمى" sits on that inner bar and every stroke of the word flows down into it, cast as one piece with the bar. One exception: the tall upright letter of the word has been cut out at its base and lifted about half a letter-height straight up into the air, so it hovers on its own well above the inner bar. Plain background shows in a clear band underneath that raised letter, between its foot and the bar, and also on its left and its right where it no longer meets its neighbours. Draw that band of background wide and obvious. The raised letter is full size and the same thickness as the rest of the word, and nothing connects it to anything: no stem, no wire, no tab, no prong, no weld, no shadow-thin neck. Everything else in the word stays welded to the inner bar.
```

### H4

sha256 of the full prompt: `5adead283f70037e2ffcd4b370c95d9a559ef48bbe577979f89fa03af3ae981c`

```text
Photorealistic studio photograph of one gold name pendant, product catalogue packshot.
Polished 18K yellow gold, flat mirror-polished faces, crisp square edges, visible edge depth, no stones unless stated. Warm off-white matte paper background, no props, soft diffused light with one defined highlight streak, neutral white balance, real contact shadow. Nearly straight-on, whole pendant sharp and centred with an even margin. No text, logo or watermark other than the pendant itself.
The pendant body is two straight parallel horizontal gold rails, one above and one below, with the letters standing in the space between them, and a small round ring at each end of the top rail. No chain in view.
Between the two rails the Arabic word "محمد" is spelled out, and every letter is welded into both the top rail and the bottom rail except one: the middle letter has been lifted free and floats in the open space between the rails, touching nothing at all. A clear gap of plain background is visible all the way around that letter - above it between the letter and the top rail, below it between the letter and the bottom rail, and on both sides between it and its neighbouring letters. The floating letter is the same size, the same thickness and on the same line as its neighbours. Do not add a stem, wire, tab, weld or prong to it, and do not let it reach either rail or either neighbour.
```

### H4b

sha256 of the full prompt: `fd06aa9e0769c6666a03b64aeabfedd877464b80c65d69e0f702bc73045770ad`

```text
Photorealistic studio photograph of one gold name pendant, product catalogue packshot.
Polished 18K yellow gold, flat mirror-polished faces, crisp square edges, visible edge depth, no stones unless stated. Warm off-white matte paper background, no props, soft diffused light with one defined highlight streak, neutral white balance, real contact shadow. Nearly straight-on, whole pendant sharp and centred with an even margin. No text, logo or watermark other than the pendant itself.
The pendant body is two straight parallel horizontal gold rails, one above and one below, with the letters standing in the space between them, and a small round ring at each end of the top rail. No chain in view.
Between the two rails the Arabic word "محمد" is spelled out letter by letter, and every letter is fused into the top rail above it and the bottom rail below it, except one. One middle letter has been cut shorter at both ends and lifted into the middle of the gap, so it hovers in the open air with plain background clearly visible above it, below it, to its left and to its right. Draw a wide band of background between the top of that letter and the top rail, and another wide band between its bottom and the bottom rail; both bands must be at least as thick as a rail. Nothing connects that letter to anything at all - no stem, no wire, no tab, no weld, no prong, no thin neck, no shared edge - it is a separate small piece of gold suspended in the opening. Its neighbouring letters keep their full joints to both rails.
```

### H5

sha256 of the full prompt: `fbb7d4a9d784dcfc1d156f2366cdd545f1b800f26fc76168f94fe8dcd117cf7e`

```text
Photorealistic studio photograph of one gold name pendant, product catalogue packshot.
Polished 18K yellow gold, flat mirror-polished faces, crisp square edges, visible edge depth, no stones unless stated. Warm off-white matte paper background, no props, soft diffused light with one defined highlight streak, neutral white balance, real contact shadow. Nearly straight-on, whole pendant sharp and centred with an even margin. No text, logo or watermark other than the pendant itself.
The pendant is a flowing high-polish gold script name, fine tapered strokes, softly rounded like hand-finished cast gold, with one small round jump ring at each end of the name. No chain in view.
The name "Sarah" is written in flowing script, and the letters S, a, r and a are joined to one another in one continuous line of gold - but the final letter "h" stands completely apart. A clear wide gap of plain background, about as wide as a letter, separates the "h" from the letter before it. Nothing crosses that gap: no connecting stroke, no bridge, no hairline, no tail, no swash, no bar. The script simply stops, plain background follows, and then the "h" begins again further along. The "h" is the same size and weight as the other letters and sits on the same baseline, so the name still reads "Sarah". The two jump rings sit at the far ends of the name, fused to the first letter and to the "h".
```

### H6

sha256 of the full prompt: `f282e299e498d922a8cb92095c696ece804de083c6a38bed248c81e75d2ed890`

```text
Photorealistic studio photograph of one gold name pendant, product catalogue packshot.
Polished 18K yellow gold, flat mirror-polished faces, crisp square edges, visible edge depth, no stones unless stated. Warm off-white matte paper background, no props, soft diffused light with one defined highlight streak, neutral white balance, real contact shadow. Nearly straight-on, whole pendant sharp and centred with an even margin. No text, logo or watermark other than the pendant itself.
The pendant is a flowing high-polish gold script name, fine tapered strokes, softly rounded like hand-finished cast gold, with one small round jump ring at each end of the name. No chain in view.
The name "Sarah" is written in flowing script with every letter joined to the next along a full stroke of metal, one continuous line. The jump ring at the right-hand end is properly fused to the first letter, with a visible shoulder of gold where the loop grows out of the stroke. The jump ring at the left-hand end is not attached at all: it sits just beside the last letter as a separate closed loop of gold, with a clear narrow gap of plain background running all the way around it, between the ring and the letter along their whole facing edges. Nothing bridges that gap - no stem, no tab, no wire, no weld, no overlap - the loose ring simply lies next to the name and touches nothing. Keep both rings the same size and keep the gap around the loose one clearly visible.
```

### H7

sha256 of the full prompt: `e4c6db0f4cb0bb86e87c1704d3df88aecfc38a706f2183f1e6fe9b42ebb3aff9`

```text
Photorealistic studio photograph of one gold name pendant, product catalogue packshot.
Polished 18K yellow gold, flat mirror-polished faces, crisp square edges, visible edge depth, no stones unless stated. Warm off-white matte paper background, no props, soft diffused light with one defined highlight streak, neutral white balance, real contact shadow. Nearly straight-on, whole pendant sharp and centred with an even margin. No text, logo or watermark other than the pendant itself.
The pendant body is one slim rectangular gold frame, square bar profile, with two small round rings on its top bar for a chain. No chain in view.
Inside the frame the Arabic word "محمد" sits low in the opening, and its letters are carried on a small flat plate of gold that is welded onto the bottom bar of the frame by one broad, obvious joint. That joint is a wide band of metal, as wide as the letter group itself, with a visible fillet of gold where the plate and the bar have flowed together and been polished smooth, so it is unmistakable at a glance that the two are one continuous piece. The joint runs the full width of the letter group and clearly merges into the bottom bar; it is a band with real width, never a point or a corner. Above the word a band of plain background shows between the letters and the top bar of the frame. Every part of the pendant - frame, rings, bottom bar, joint, plate and letters - is one single connected piece of gold.
```

### H8

sha256 of the full prompt: `d430d0be828d546261660d0ed42c8f167be15e55123e253d8687a7e24ef136bf`

```text
Photorealistic studio photograph of one gold name pendant, product catalogue packshot.
Polished 18K yellow gold, flat mirror-polished faces, crisp square edges, visible edge depth, no stones unless stated. Warm off-white matte paper background, no props, soft diffused light with one defined highlight streak, neutral white balance, real contact shadow. Nearly straight-on, whole pendant sharp and centred with an even margin. No text, logo or watermark other than the pendant itself.
The pendant is a flowing high-polish gold script name, fine tapered strokes, softly rounded like hand-finished cast gold, with one small round jump ring at each end of the name. No chain in view.
The name "Sarah" is written in flowing script with every letter joined to the next along a full stroke of metal, one continuous unbroken line of gold from the first letter to the last, with no gap, no shadow seam and no break anywhere in the script. At each end a small round jump ring is properly attached: the loop grows out of the end letter through a visible fused shoulder of gold, a wide solid joint with real width, never a point or a tip of contact. Both rings are closed and both are clearly part of the same casting. The whole pendant - both rings and every letter - is one single connected piece of gold.
```

### Ledger

All twenty-two tasks are in `docs/goals/overnight-launch/ledger.jsonl` under run `lab-2026-09-24-held-out-controls`, task `SP-2a3`, written at submit time with the prompt hash, task id and the credit balance before and after each release.
Their verdict field is `pending-blind-viewer` until the viewer scores them.
