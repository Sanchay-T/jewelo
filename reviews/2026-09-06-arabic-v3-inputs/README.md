# Arabic input revision — what we changed and why

Status: implemented locally, not generated or qualified on Runway. No production changes. Zero new provider calls or generation credits. Open [the three-name input review](input-review.html) to see exactly what code now prepares for the model.

The recommendation is to add a deterministic Arabic preparation step before the final prompt/reference call. A master template remains useful, but generic instructions such as “preserve all marks” do not describe the name-specific obligations. Fonts shape the written name; an explicit identity profile describes its dots and signs; a relationship graph describes what must support what. The model retains creative composition within those requirements.

## What the evidence actually says

The v2 Arabic sample contains 24 images: 1 complete pass, 19 rejects, 4 uncertainties. Identity passed 6/24; construction passed 6/24; attachments passed 15/24. Material selections and photography passed 24/24. These categories overlap: a spelling failure can occur in an otherwise connected piece. All three tested names and all failures remain in the original denominator.

The [computed diagnosis](diagnosis.json) verifies the frozen reference descriptors matched the intended customer names and scripts in all 48 cases. The spelling image for إيمان visibly contains the correct below-alif hamza. Missing font support or a wrong-name reference is therefore not an established cause of this batch's failures.

Two reusable-code defects are independently reproducible:

- V2 accepts a reviewed spelling descriptor for a different customer name. Preparation chose the correct files in this campaign, but the reusable compiler did not enforce that binding. V3 rejects this mismatch at compilation and verifies actual reference bytes again before producing tool arguments.
- The older production identity solver translates entire disconnected components until they touch, then returns `exactCharactersPreserved: true` based on a component-count check. That is not an independent proof of Arabic identity and can relocate marks. V2 did not call this solver. V3 uses natural shaping without this fusion step; production source remains untouched.

## Changes now implemented

1. **Name-specific identity.** NFC normalization preserves the raw customer input separately. A versioned Standard Arabic Naskh profile specifies identifying dots/signs and their owning letters. Unicode joining properties determine natural letter groups. Glyphs, linguistic groups, and disconnected metal pieces are kept conceptually separate.
2. **Specific support obligations.** Code names the linguistic breaks requiring metal bridges, gives identifying marks an owning letter/group, and requires body-rooted eyelets plus distinct connectors. It specifies relationships, not a fixed silhouette, coordinates or a manufacturing strength claim.
3. **Customer-name reference first.** Native HarfBuzz renders the complete target word in pinned Noto Naskh. No unrelated sample names, moved marks, added tracking or fused glyphs. The prompt uses this reference for spelling and contextual forms while explicitly leaving pendant composition open. This reference will still exert some font/layout influence; selective preservation is a model hypothesis, not guaranteed isolation.
4. **Optional construction example.** An unnamed diagram demonstrates a mark support and a body-eyelet/connector/chain relationship. It is not an exact customer-name pendant or a manufacturing drawing. The second-reference candidate exists separately so its effect can be compared.
5. **Shorter, applicable prompt.** About 1,900–2,200 characters for these examples; removes generic Latin capitalization and unmeasurable nominal-size prose, retains nominal32 in configuration lineage, and names exact dot/hamza locations. Length is an observability/debugging choice, not a magic optimal word count.
6. **Final request assembler.** Recompiles the packet, checks configuration/identity/prompt hashes, checks the name/script/font association, verifies actual image bytes and visual preflight hashes, binds uploaded asset IDs/hashes in order, and returns the exact Runway `promptText` plus tagged `referenceImages`. Hosted URLs remain in runtime memory; no model rewrites the prompt. No quality or imageSize knobs are invented.

For **إيمان**, the identity obligations now explicitly include a hamza **below** the initial alif, two dots below ya, one dot above nun, and natural groups **إ / يما / ن**. Each group remains linguistically distinct while metal supports connect the pendant. This was absent from the generic v2 wording.

## Model guidance and limits

OpenAI recommends quoted exact text, explicit typography and image-reference roles, and small controlled changes when debugging prompts. Its sketch-rendering examples lock an existing drawing; that is a different creative task from inventing a new name pendant. We retain that distinction. [OpenAI prompting guide](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide)

GPT Image 2 processes image inputs at high fidelity automatically; `input_fidelity` is not a missing setting to turn on. Runway MCP exposes neither quality nor effective imageSize control for this model. Official OpenAI documentation continues to acknowledge imperfect text placement and precise composition. No input preparation can turn an untested generation into a guaranteed correct one. [OpenAI image generation guide](https://developers.openai.com/api/docs/guides/image-generation)

Runway tool echoes abbreviated long v2 prompts. Their visible portions match saved normalized prefixes; that does not prove downstream model inputs were truncated. We have not independently observed Runway's internal request or image preprocessing. The local assembler proves our boundary, not hidden provider internals.

Joining rules use pinned [Unicode 17 ArabicShaping data](https://www.unicode.org/Public/17.0.0/ucd/ArabicShaping.txt). Font shaping uses [HarfBuzz's glyph/cluster and positioning pipeline](https://harfbuzz.github.io/shaping-and-shape-plans.html). Unicode joining data does not supply a physical construction plan; the explicit mark profile is a separately versioned application convention.

## Supported scope and remaining work

This is an R&D compiler for basic Standard Arabic Naskh letters, one word, Classical/Classic, white gold, no stones, Cable, nominal32 and Studio. Only ليان, نور and إيمان have rendered/reviewed example references here. Other profile letters are software-supported draft mappings, not visually qualified names. Standalone hamza (ء, including names such as أسماء) is deferred until its support/eyelet-root recipe is defined; it must not be treated like a mark attached to another letter. Spaces, vowel marks, tatweel, join/bidi controls, presentation forms, Persian/Urdu extensions and unsupported customer options stop before submission. No silent spelling conversion or broader form support is claimed.

Visual preflight attestations are trusted local review data, not signed approvals or an independent linguistic verification service. Hashes bind the reviewed bytes to a request; they do not recognize Arabic or prevent an operator from creating a false attestation.

Reference correctness and code tests do not prove that the model will obey. The next diagnostic should hold the revised prompt/configuration fixed and compare target-name-only versus target-name-plus-construction on the three existing hard names, twice each: **12 images**. This isolates the incremental construction-reference effect. It does not isolate every simultaneous change from v2 or estimate population reliability. A separate fresh control is required to attribute improvement to wording alone. All first attempts and uncertainties must remain visible. Fixing these three names would then require untouched names and broader options to be tested before release.

That comparison is prepared, not executed. The old twelve-call allowance was conditional on successful screening and cannot silently become a new experiment. No further paid campaign has been opened by this local revision. No automatic paid visual judge is added to the intended customer flow.

## Files and reproducibility

- `identities.json`: exact name features and support relationships.
- `reference-manifest.json` and `references/`: PNG/SVG spelling assets, construction example and hashes.
- `candidate-index.json`, `requests/`: six complete local request candidates and exact prompt text.
- `diagnosis.json`: read-only aggregation and historical binding checks.
- `sources/`: plan/fresh reviews, retained without modifying old evidence.
- `tests.txt`, `proof-packet.json`: local check results and immutable-input preservation evidence.
- `../../../scripts/prompt-lab/v3/`: compiler, renderer, diagnostic aggregation, gallery builder and tests.

Run from the worktree: `node scripts/prompt-lab/v3/build.mjs`, `node scripts/prompt-lab/v3/diagnose.mjs`, `node --test scripts/prompt-lab/v3/compiler.test.mjs`, then `node scripts/prompt-lab/v3/gallery.mjs`. Building with an existing reference manifest reuses its bytes; it does not silently replace reviewed references.
