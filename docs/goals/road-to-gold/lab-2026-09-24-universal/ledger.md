# Image lab ledger - 2026-09-24 - universal free route (UNIV-1)

Model `gpt-image-2.5-sunburst`, ratio 1:1, via Runway MCP, compiler `caleums-still-compiler-v4`.
Question: how does the production free studio prompt do on common UAE names, so the free route can be widened as far as the evidence allows.

Every prompt in `prompts/*.txt` except the two `ctl-DR-*` controls is the exact byte string the production compiler emits on the free route.
They were produced by the SP-2d path - the real `buildPromptVariableSnapshot` and `compileStillPrompt` from `@jewelo/ai` against the live minimal `image.packshot@v4` template (`BASELINE_PROMPT_TEMPLATES["image.packshot"]`; `lab-diff` pins that the live `@v4` leaves the stencil to the compiler) - with the route forced to `"free"`, bypassing `stillRoute`, which would send most of these names to the stencil today.

The compile command:

```
corepack pnpm --filter @jewelo/jobs exec tsx <scratchpad>/univ1-compile.mts docs/goals/road-to-gold/lab-2026-09-24-universal
```

The specification is the shape `backendSpecification` writes in `apps/web/src/features/atelier/previewHandoff.ts`: lettering `classic`, arabicStyle `contemporary`, stoneCoverage `none`, gemstone `none`, metalColor `yellow`, metalKarat `18K`, finish `polished`, layout `single-name`, connector `none`, sizeProfile `classic`, dimensions 32 x 12 x 1.2 mm, chain cable 45 cm.
On the free route `arabic_style` is the free lettering brief and the Name line never names Kufi, so `contemporary` and the `kufi` the SP-2d script passed compile to the same bytes.
That is checked mechanically: the script recompiles the SP-2d cell `classical-muhammad-ar` through this exact path and asserts its pinned sha256 `92835ad907bc30db5da34b51351b0afb88d5e55b92280d944bb98074ab098511`, and it reproduced it.
`classical-layla-ar` here also lands on the pinned SP-2d sha256 `e6fe5b2f541586e71e2f8b5e32311b8cb4a16adc57bad6bfd2d52d26c8c27f77`, which is a second independent check of the same path.

References: exactly what production sends on the free route for this construction - the construction's look crop only, no stencil, no style anchor, no master.
The bytes uploaded to Runway are the same PNGs `LOOK_REFERENCES` pins by sha256 (`caleums-private/look-references-v1/classical.png` and `diamond-rails.png`); they are private brand reference and are not in git.

Credits: 201873 before the run, 201057 after, so 816 credits for 48 stills (24 cells, two takes each).
Full-size PNGs stay local in `img/` (gitignored by `docs/goals/road-to-gold/lab-*/img/`). No signed URL is recorded here.

## Cells

| cell | name | construction | take | Runway task id | prompt sha256 (first 16) | credits before / after | kind |
| --- | --- | --- | --- | --- | --- | --- | --- |
| classical-fatima-ar | فاطمة | classical | a | `78ce9cc5-ddea-4925-91fc-bb909ac9b9a4` | `71e78b57795b92ad` | 201873 / 201839 | cell |
| classical-fatima-ar | فاطمة | classical | b | `baefea17-e869-4fd4-b74f-e5e39d02325f` | `71e78b57795b92ad` | 201873 / 201839 | cell |
| classical-maryam-ar | مريم | classical | a | `87689b06-96c5-4cfc-9533-2090fc23b389` | `c08fd8997df8e8ce` | 201839 / 201805 | cell |
| classical-maryam-ar | مريم | classical | b | `3f3b7479-a53b-4040-b9a8-f6d51e210882` | `c08fd8997df8e8ce` | 201839 / 201805 | cell |
| classical-aisha-ar | عائشة | classical | a | `fc721d53-c2f8-4593-8a92-415263584b97` | `f2eb71d15b013c6b` | 201805 / 201771 | cell |
| classical-aisha-ar | عائشة | classical | b | `d718fdc3-c094-4267-9f48-a972665b004b` | `f2eb71d15b013c6b` | 201805 / 201771 | cell |
| classical-noor-ar | نور | classical | a | `5b7b50b5-3d75-499e-80a9-6461cbc3e7f7` | `b2990c59820e895b` | 201771 / 201737 | cell |
| classical-noor-ar | نور | classical | b | `8df4a427-d0d9-413c-b461-cdf612a93a5f` | `b2990c59820e895b` | 201771 / 201737 | cell |
| classical-zainab-ar | زينب | classical | a | `64aab5a6-2a1c-4dca-b391-2a785b713eb3` | `a64803a9b22b0485` | 201737 / 201703 | cell |
| classical-zainab-ar | زينب | classical | b | `5306d7a9-4917-4764-8c34-2f9df7478277` | `a64803a9b22b0485` | 201737 / 201703 | cell |
| classical-khalid-ar | خالد | classical | a | `9175ca0f-b04d-4f62-a3fa-9d18a54a0b82` | `2d9ba15edd9bca9e` | 201703 / 201669 | cell |
| classical-khalid-ar | خالد | classical | b | `92883791-11a4-41bf-8835-faee16f25885` | `2d9ba15edd9bca9e` | 201703 / 201669 | cell |
| classical-yousef-ar | يوسف | classical | a | `93c7764f-f558-4a35-a85a-afd5c3c163ee` | `c6b278ce600f244e` | 201669 / 201635 | cell |
| classical-yousef-ar | يوسف | classical | b | `e20f6b78-4115-4cd7-96ad-fae4d168ea5b` | `c6b278ce600f244e` | 201669 / 201635 | cell |
| classical-layla-ar | ليلى | classical | a | `368ab216-892b-49e4-b31d-e7516fbcc4e8` | `e6fe5b2f541586e7` | 201635 / 201601 | cell |
| classical-layla-ar | ليلى | classical | b | `c771286b-7ce7-4e94-b39b-dbae82a63723` | `e6fe5b2f541586e7` | 201635 / 201601 | cell |
| classical-hessa-ar | حصة | classical | a | `a5d0ac97-d5cc-4e74-949f-1acc8b96604d` | `ddd0398af083da50` | 201601 / 201567 | cell |
| classical-hessa-ar | حصة | classical | b | `96b762ac-686e-4c44-bb95-7b2bb271e76c` | `ddd0398af083da50` | 201601 / 201567 | cell |
| classical-shamma-ar | شمة | classical | a | `ad4946bc-7ca6-49fb-aa94-82f09c8f651f` | `104977b5dead42e2` | 201567 / 201533 | cell |
| classical-shamma-ar | شمة | classical | b | `1f8efa1b-d20f-4954-8dac-71bb058076dd` | `104977b5dead42e2` | 201567 / 201533 | cell |
| classical-rashid-ar | راشد | classical | a | `a8877449-0c5d-4e9d-bf01-4c48af9413e6` | `aea13d73928ef96c` | 201533 / 201499 | cell |
| classical-rashid-ar | راشد | classical | b | `ee0a3f10-de04-419f-bef5-b5faba19d68b` | `aea13d73928ef96c` | 201533 / 201499 | cell |
| classical-abdullah-ar | عبدالله | classical | a | `d36a5dae-d6cd-4618-a1b6-ad4985d8bb12` | `1d88f84095991c8c` | 201499 / 201465 | cell |
| classical-abdullah-ar | عبدالله | classical | b | `dcad5adb-fb25-472e-8ebe-94bdba59e1ce` | `1d88f84095991c8c` | 201499 / 201465 | cell |
| classical-hamdan-ar | حمدان | classical | a | `1016f928-943d-498c-80a6-fedc8f201a2d` | `719d13d5f0ffbbef` | 201465 / 201431 | cell |
| classical-hamdan-ar | حمدان | classical | b | `54316b6b-3556-4a2b-ae39-b6f48ec257b0` | `719d13d5f0ffbbef` | 201465 / 201431 | cell |
| classical-maitha-ar | ميثاء | classical | a | `a8312666-5cf0-491e-9fcc-29fbe9e25fd5` | `33d9cb126243f6df` | 201431 / 201397 | cell |
| classical-maitha-ar | ميثاء | classical | b | `28a23dcb-9811-468c-af10-6be631e95413` | `33d9cb126243f6df` | 201431 / 201397 | cell |
| classical-hind-ar | هند | classical | a | `849a5fd9-2be2-4640-bfe8-fc766ab846d1` | `91dbcca94273b7ad` | 201397 / 201363 | cell |
| classical-hind-ar | هند | classical | b | `2e5f916a-f052-44b5-87a2-b464504d9f10` | `91dbcca94273b7ad` | 201397 / 201363 | cell |
| classical-shaikha-ar | شيخة | classical | a | `4d1a52dc-d648-47d9-b480-10ecd5b44c44` | `553d021a3d58ac23` | 201363 / 201329 | cell |
| classical-shaikha-ar | شيخة | classical | b | `40212c9d-f49e-48ef-b304-9c60e78a510f` | `553d021a3d58ac23` | 201363 / 201329 | cell |
| diamond-rails-fatima-ar | فاطمة | diamond-rails | a | `418f3940-539a-46d6-9927-e15fab27c67d` | `5ddac9c3e9cd4e4d` | 201329 / 201295 | cell |
| diamond-rails-fatima-ar | فاطمة | diamond-rails | b | `ab4864e8-e270-4dd9-8cb5-0abe21449e11` | `5ddac9c3e9cd4e4d` | 201329 / 201295 | cell |
| diamond-rails-noor-ar | نور | diamond-rails | a | `751bba62-6afc-4b57-ae32-dd6a57f8c995` | `343966bb916f8fc7` | 201295 / 201261 | cell |
| diamond-rails-noor-ar | نور | diamond-rails | b | `c4e133eb-8f8d-4306-8253-91e03e04d4d5` | `343966bb916f8fc7` | 201295 / 201261 | cell |
| diamond-rails-zainab-ar | زينب | diamond-rails | a | `3d6e6193-0276-4890-8d4f-ec78dad24683` | `670d1d01c6292b3c` | 201261 / 201227 | cell |
| diamond-rails-zainab-ar | زينب | diamond-rails | b | `e8ba0beb-59e7-48c1-b885-dcbaa8ca52c5` | `670d1d01c6292b3c` | 201261 / 201227 | cell |
| diamond-rails-khalid-ar | خالد | diamond-rails | a | `943cc3ad-c881-48cd-9c81-d9ece2b358ca` | `64f43f343831082d` | 201227 / 201193 | cell |
| diamond-rails-khalid-ar | خالد | diamond-rails | b | `1f2c14a3-c8be-43df-9e72-a4c61c5c2be0` | `64f43f343831082d` | 201227 / 201193 | cell |
| diamond-rails-yousef-ar | يوسف | diamond-rails | a | `431346c5-2856-47c6-a5c8-f8556829af1c` | `aa5fd2274095c70a` | 201193 / 201159 | cell |
| diamond-rails-yousef-ar | يوسف | diamond-rails | b | `ed2ca55c-4f6a-422a-b1c0-4f7ea47cee58` | `aa5fd2274095c70a` | 201193 / 201159 | cell |
| diamond-rails-shamma-ar | شمة | diamond-rails | a | `d4ac4269-52b8-484c-8722-d56845cef4e3` | `2bb63b6c23e8f581` | 201159 / 201125 | cell |
| diamond-rails-shamma-ar | شمة | diamond-rails | b | `13866955-d520-40f8-a32d-aea58493e1bc` | `2bb63b6c23e8f581` | 201159 / 201125 | cell |
| ctl-DR-point | سلمى | diamond-rails | a | `7a4bd7af-be67-41c7-8abd-ebc9cf8ce905` | `4721597fd6c7dba4` | 201125 / 201091 | control |
| ctl-DR-point | سلمى | diamond-rails | b | `bf3b6477-d7a1-4fe6-bf3b-53269c0ec839` | `4721597fd6c7dba4` | 201125 / 201091 | control |
| ctl-DR-wire | محمد | diamond-rails | a | `25c1aa2d-b654-421e-b6bc-87e10078206c` | `e6889ae8491d6229` | 201091 / 201057 | control |
| ctl-DR-wire | محمد | diamond-rails | b | `8fe90c73-6558-403c-9441-722c61043edb` | `e6889ae8491d6229` | 201091 / 201057 | control |

## Negative controls

`ctl-DR-point` and `ctl-DR-wire` are hand-written, not compiled: they are the H1a and H2 shapes from `lab-2026-09-24-free-route/negative-controls.md` moved from a frame to the diamond-rails construction, so the one-piece reader can be checked on a rail joint the way it was checked on a framed joint.
`ctl-DR-point` draws سلمى touching the upper rail at a single pinpoint and nowhere else; `ctl-DR-wire` draws محمد held by one hair-thin wire and nothing else.
Both are drawn to be split and should be refused. Their full text is in `prompts/ctl-DR-point.txt` and `prompts/ctl-DR-wire.txt`; the sha256 in the table is of the bytes sent, which are the file without its trailing newline.

## Verdicts

Not scored here. This lab generated the stills and never judged them; a blind `viewer` scores spelling, one piece and construction from the pixels.

## Verdict (lead, 24 Sep)

Blind viewer (`blind-scores.md`, images renamed u01-u48 through `blind-map.json`): spelling 48 of 48; one piece 28 of 48 by erosion measurement confirmed by eye.
The viewer brief wrongly said diamond-rails is "set with small diamonds"; stones appear only when ordered (`packages/ai/src/prompt-registry.ts` stones rule), so the 12 plain-rail stills are the construction as ordered and presentable is 28 of 48.

| group | spelled | one piece |
|---|---|---|
| diamond-rails, فاطمة نور زينب خالد يوسف شمة, 2 takes | 12/12 | 12/12 |
| classical, 16 names, 2 takes | 32/32 | 15/32 |
| diamond-rails controls (point, wire) | - | 1/4, and that one was drawn whole, not split |

Classical failures: a dot cluster floating free (13, mostly the three dots of ش/ث, and single dots on ن/ز), a word split in two (يوسف both takes, عائشة b), a dot on a tip (1).
Production readers (`reader-replay.md`, USD 0.83): the name reader said "matches" on all 45 it read, and the viewer agrees all were spelled right; the piece reader never accepted a still the viewer measured as broken (0 false accepts, the three real rail splits refused) but refused 16 the viewer measured as one piece (too strict on free stills).
Consequence: diamond-rails Arabic can take the free route for any name; classical waits for a dot-join wording (UNIV-2).
