# Image lab ledger - 2026-09-24 - wording round (UNIV-2)

Model `gpt-image-2.5-sunburst`, ratio 1:1, via Runway MCP.
Question: does a stronger wording of the one dot-attachment sentence stop the loose floating diamonds UNIV-1 saw on dotted Arabic names.

One axis changed. Every prompt here is the UNIV-1 compiled free-route prompt for the same name with exactly one paragraph replaced by exact string match (the replace script fails loudly unless the base paragraph occurs exactly once); all other bytes are identical to `../lab-2026-09-24-universal/prompts/classical-<name>-ar.txt`.

- Wording A puts the dot on a named short straight gold bar as thick as the letter strokes, and adds the plain ring tabs.
- Wording B uses the sawn-from-one-sheet framing with a short visible bridge, and adds the same ring tabs.

Reference: the classical look crop only, the same private PNG bytes UNIV-1 sent (`caleums-private/look-references-v1/classical.png`, sha256 starts `e234cea88cc74ae8`), re-uploaded for this run. No stencil, no master, no style anchor.
The API echo of each submitted prompt (`_regenerate.arguments.promptText`) was checked against the file bytes; all 16 matched.

Credits: 201057 before the run, 200513 after, so 544 credits for 32 stills (16 cells, two takes each; 34 credits per cell).
Each still is `img/<cell>-<take>.png` (for example `img/classical-noor-ar-A-a.png`).
Full-size PNGs stay local in `img/` (gitignored by `docs/goals/road-to-gold/lab-*/img/`). No signed URL is recorded here.

## Cells

| cell | name | wording | take | Runway task id | prompt sha256 (first 16) |
| --- | --- | --- | --- | --- | --- |
| classical-noor-ar-A | نور | A | a | `c0880230-f196-4023-8df8-eaeee519aa77` | `988be82ff77569be` |
| classical-noor-ar-A | نور | A | b | `d1699198-9e19-4674-9ffc-75a468a75c8a` | `988be82ff77569be` |
| classical-noor-ar-B | نور | B | a | `66ed035f-fb82-4c5c-a604-4a28c1edd510` | `d697a816e79ee4b2` |
| classical-noor-ar-B | نور | B | b | `91aa5412-b167-4e12-bb9d-688a00aee811` | `d697a816e79ee4b2` |
| classical-khalid-ar-A | خالد | A | a | `1258479b-48b5-4696-87a3-c3f870b7e94d` | `3226ba128d3adbeb` |
| classical-khalid-ar-A | خالد | A | b | `2d060e07-522a-46d6-b00c-78112ac63343` | `3226ba128d3adbeb` |
| classical-khalid-ar-B | خالد | B | a | `70ecf55e-73ea-4011-bf91-3948f3273c7f` | `11666f5c991c82b3` |
| classical-khalid-ar-B | خالد | B | b | `ef061ed8-8ee9-4efe-a778-cfa4560c47ee` | `11666f5c991c82b3` |
| classical-rashid-ar-A | راشد | A | a | `950f5347-c801-47c1-bc82-fef0428df867` | `ca616d54910e3022` |
| classical-rashid-ar-A | راشد | A | b | `08e68801-3cab-4e21-bc68-5f9891c2ee78` | `ca616d54910e3022` |
| classical-rashid-ar-B | راشد | B | a | `080b8288-4ce2-4206-8f3f-24fda0c11965` | `7caa2c54fca95bb0` |
| classical-rashid-ar-B | راشد | B | b | `9632dba5-8c3c-443b-96a9-af82fc0627ca` | `7caa2c54fca95bb0` |
| classical-hessa-ar-A | حصة | A | a | `553fda67-747f-48a8-b8bd-2b0dd353e7de` | `f66fe775cd65d3d3` |
| classical-hessa-ar-A | حصة | A | b | `a2e25d04-23ef-4310-8643-2a501ab052e0` | `f66fe775cd65d3d3` |
| classical-hessa-ar-B | حصة | B | a | `c54e8d3c-0958-4bec-89f6-f4cb7199fdd2` | `28b33da6eb39fa4b` |
| classical-hessa-ar-B | حصة | B | b | `5049bb0a-9d60-4fd5-b5b6-2f4ba155c959` | `28b33da6eb39fa4b` |
| classical-aisha-ar-A | عائشة | A | a | `f1e84999-6a55-4f64-a6fd-682aa34d28c7` | `ef5922da1c2bd98c` |
| classical-aisha-ar-A | عائشة | A | b | `938c6922-10db-473b-887e-dbea83007d8d` | `ef5922da1c2bd98c` |
| classical-aisha-ar-B | عائشة | B | a | `85db9d90-d1d4-4baf-93cd-8afca6346583` | `cc0041a48ddd3fe5` |
| classical-aisha-ar-B | عائشة | B | b | `8f6e019f-ed3a-41f9-bd2c-5b02cb3e0bde` | `cc0041a48ddd3fe5` |
| classical-shaikha-ar-A | شيخة | A | a | `2ef3ee46-7140-46a8-a24c-83ca7eebe65a` | `3762fbb146376c8b` |
| classical-shaikha-ar-A | شيخة | A | b | `3f00c55d-5f11-43af-b349-40a7e389b26c` | `3762fbb146376c8b` |
| classical-shaikha-ar-B | شيخة | B | a | `c4764c20-ba02-4be4-9b37-238dd7b8368f` | `32caa3aad83a5d77` |
| classical-shaikha-ar-B | شيخة | B | b | `ee7a8282-2aad-460b-bd41-af53bdc47e66` | `32caa3aad83a5d77` |
| classical-zainab-ar-A | زينب | A | a | `d5c63975-fd20-4e7f-bf24-105b86c3a932` | `49c29191b8728e4c` |
| classical-zainab-ar-A | زينب | A | b | `0a4c9a8b-274a-462d-a5ea-d301eaf2d61f` | `49c29191b8728e4c` |
| classical-zainab-ar-B | زينب | B | a | `82fb553f-591c-49d7-b699-838462d7185c` | `d3df9e3247734bc1` |
| classical-zainab-ar-B | زينب | B | b | `87b7a763-33bf-454c-adb4-be6fc2be78b5` | `d3df9e3247734bc1` |
| classical-yousef-ar-A | يوسف | A | a | `200be237-66e3-40ea-beb9-f8f1784c18db` | `20f983a3feeb5aec` |
| classical-yousef-ar-A | يوسف | A | b | `d1f19433-ea3c-4975-9552-7e5cc01a8227` | `20f983a3feeb5aec` |
| classical-yousef-ar-B | يوسف | B | a | `21fc8940-424f-42c4-9ec5-ff2cd6adec0a` | `2c1d62262b4bddc7` |
| classical-yousef-ar-B | يوسف | B | b | `f2da29b4-e68d-49ab-98e7-d8a82724ce1b` | `2c1d62262b4bddc7` |

## Verdicts

Not scored here. This lab generated the stills and never judged them; a blind `viewer` scores dot attachment, spelling, one piece and the ring tabs from the pixels, A against B against the UNIV-1 baseline for the same name.
