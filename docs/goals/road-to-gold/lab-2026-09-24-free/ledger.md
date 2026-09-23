# Image lab ledger - 2026-09-24 - free mode (no stencil)

Model: `gpt-image-2.5-sunburst`, ratio 1:1, default imageSize, via Runway MCP.
Question: how often does a short free prompt with no stencil spell the name right, per style and per script?
If the rate is high, production can drop the hard stencil lock and rely on the existing name verifier plus retries.

Credits: 208334 before the run, 207734 after the last submit. 25 calls billed (24 cells plus one failed retry), 600 credits, 17 per image plus overhead.

## What a prompt looks like

Every prompt is 4 or 5 short lines, about 440 to 500 bytes, against roughly 3.2 to 4.3 kB for the production long template used on 2026-09-22.
No stencil image, no geometry rules, no "exact silhouette, add, remove or move nothing".

```
A fine jewelry name pendant that reads "<name>", in <style in plain words>.[ The name is Arabic script, written right to left.]
Made in polished 18k <metal>, one connected piece hanging from a thin gold cable chain.
Studio product photo on warm off-white paper, soft daylight, shallow depth of field.
Use the attached image @look only for the style, not for its letters.
The name must read exactly "<name>", letter for letter.
```

Full text per cell in `prompts/<id>.txt`; `prompts/index.json` carries the style, name and prompt hash.

## References

One reference per generation, tag `look`, uploaded from `~/hq/projects/devonel/caleums-private/` and never copied into this repository.

| style | source file |
|---|---|
| origami | `look-references-v2/origami-folded-omran-chatgpt-letters.png` |
| framed minimal | `look-references-v1/framed-minimal.png` |
| diamond rails | `look-references-v1/diamond-rails.png` |
| classical | `look-references-v1/framed-minimal.png` (see note) |

Note: `look-references-v1/classical.png` and `look-references-v1/framed-minimal.png` are byte-identical (md5 `5004d6e368f121fe3dde75820cfbd8e2`).
The classical cells therefore carry the framed reference, not a classical one. Any classical style miss in this run has to be read with that in mind.

## Generations

24 cells, 4 styles x 6 names. Names: Asma and Muhammad in English, أسماء, محمد and فاطمة in Arabic, Love in rose gold (Omran's own word).
All images downloaded to `img/<id>.webp` (longest side 800 px). Contact sheet: `sheets/free-mode.webp`.
Verdicts are filled in by the `viewer`; this agent never scores its own images.

| # | id | style | name | script | metal | task id | verdict |
|---|---|---|---|---|---|---|---|
| 1 | o-asma | origami | Asma | en | yellow | badb34f9-3981-4d2b-9243-086b33ed5599 | fail |
| 2 | o-muh | origami | Muhammad | en | yellow | 58bc3e31-c269-4715-b8ed-7a05751d06e9 | fail |
| 3 | o-arasma | origami | أسماء | ar | yellow | 82fba72e-0712-4e99-90d5-4669ec4ed973 | tweak |
| 4 | o-armuh | origami | محمد | ar | yellow | f9a0f469-17bc-4ce6-ad95-e74e74d0acc1 | tweak |
| 5 | o-love | origami | Love | en | rose | 6400def1-63b5-4141-8846-47378a60d319 | pass |
| 6 | o-fat | origami | فاطمة | ar | yellow | 7b437bf7-1afb-429a-a5ca-cba1ed6a5d6f | tweak |
| 7 | f-asma | framed minimal | Asma | en | yellow | 089da2a4-ce95-400e-bc30-438637e5d0fa | pass |
| 8 | f-muh | framed minimal | Muhammad | en | yellow | bef94c22-91b8-4d1a-bc37-73acd2b1ceb8 | pass |
| 9 | f-arasma | framed minimal | أسماء | ar | yellow | ba3b84eb-b541-4a69-899e-d7d5692eef22 | pass |
| 10 | f-armuh | framed minimal | محمد | ar | yellow | fc398ebd-dfd0-46ea-a5b1-6ddcf80bfc46 | pass |
| 11 | f-love | framed minimal | Love | en | rose | 79d31ccd-2365-4bf3-9bff-966836452646 | pass |
| 12 | f-fat | framed minimal | فاطمة | ar | yellow | 6cd9e786-ea6a-4283-b396-8e8c0691b39e | fail |
| 13 | r-asma | diamond rails | Asma | en | yellow | df2baaba-4149-4a5e-80db-e5c4dbafd538 | pass |
| 14 | r-muh | diamond rails | Muhammad | en | yellow | 5ef7799a-e04e-48b0-8449-be7b19df4982 | pass |
| 15 | r-arasma | diamond rails | أسماء | ar | yellow | e8963233-5e21-470c-a29b-547d3ab22f49 | fail |
| 16 | r-armuh | diamond rails | محمد | ar | yellow | 2094d7d4-35c1-4535-9bc8-89e37df34f58 | tweak |
| 17 | r-love | diamond rails | Love | en | rose | 6f4e1724-f963-46eb-8563-78aba5a408ca | pass |
| 18 | r-fat | diamond rails | فاطمة | ar | yellow | 9f898700-24dd-4479-a1e7-8f8b3a347a24 | pass |
| 19 | c-asma | classical | Asma | en | yellow | 47042119-2464-4d17-ad72-9c149f841e6d | pass |
| 20 | c-muh | classical | Muhammad | en | yellow | 42093392-8f99-4a6c-9c0a-d71e6887212a | pass |
| 21 | c-arasma | classical | أسماء | ar | yellow | e7dfdaff-a344-47fc-b3cf-de7881647c1b | pass |
| 22 | c-armuh | classical | محمد | ar | yellow | 1601210c-6d78-418e-b488-7dd3e9508487 | pass |
| 23 | c-love | classical | Love | en | rose | 6d2b2028-39f8-465f-b9d9-76c42bd17adf | pass |
| 24 | c-fat | classical | فاطمة | ar | yellow | eb6f4e08-f2a5-47f6-80a2-90a91637ce63 | tweak |

## Failures

One call failed and was retried. Cell `o-love`, first attempt: the reference URL was reassembled by hand instead of copied, so Runway rejected it.

```
referenceImages[0].url was rejected by Runway (HTTP 401): its signed `_jwt` token is not valid for this asset.
Request ID: mcp_muegokzy_9hmmkc
```

The retry with the copied URL succeeded as task `6400def1-63b5-4141-8846-47378a60d319`.
No cell was generated twice; the cap of three attempts per cell was never approached.

## Where the pixels are

- `img/` - 800 px WebP, the committed evidence.
- Full resolution 1920 px PNGs stay in the session scratchpad only (`scratchpad/fullres/`), so the viewer can read Arabic letter by letter without the repository carrying 90 MB.
- `docs/goals/overnight-launch/ledger.jsonl` carries one line per cell with the prompt hash, task id and credits before and after.
