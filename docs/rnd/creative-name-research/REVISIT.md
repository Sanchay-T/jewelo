# Creating a new name pendant: revised prompting research

6 September 2026 · Research proposal · No new generations or production changes

**Recommendation:** retain the deterministic master-template compiler, but investigate a different creative task: generate the customer's original pendant using reusable style and construction examples. Once that design exists, investigate using it as the visual reference for other views. An exact pre-existing pendant silhouette is not a prerequisite for the first image.

This is a proposed revision to the experiment, not a newly qualified prompt or a change to the production identity contract. The original 48-image results and frozen package remain unchanged.

## What the previous test actually established

All 48 saved configurations used **محمد**, Classic Arabic, white gold, no stones, a cable chain, the 32 mm label, and one name. Four constructions and three input methods varied. The reference arms prescribed an already defined shape. Their prompts expressly prevented redesign.

The complete-assembly arm passed 14/16, body-only 10/16, and text-only 6/16. Those are narrow screening observations. The name has no identifying letter dots, and the study did not exercise new names, Latin lettering, varied spelling, stones, or four-view continuity. Repeating one name cannot establish generalization across names. See the [unchanged screening report](../../../reviews/2026-09-06-prompt-system/report.md).

## What the attached OpenAI notebook changes in our interpretation

The [notebook digest](OPENAI-NOTEBOOK-DIGEST.md) and [complete text/code extraction](OPENAI-NOTEBOOK-EXTRACT.md) make the source readable without running it. Cell numbers are zero-based. The original has 98 cells, 24 image-generation/edit calls in source, and no saved execution outputs. Relative links to example pictures are not an embedded benchmark record.

Three separate patterns matter:

1. **Cells 40–41: style transfer to a new subject.** A reference supplies visual language while the output subject changes.
2. **Cells 50–56: preservation of an existing sketch or product.** These examples lock geometry because the design already exists.
3. **Cells 90–95: create an original character, then reuse its generated image in another scene.** The second request receives the first image; merely repeating text is not the illustrated continuity mechanism.

We had applied the second pattern to a product that needs the first, followed potentially by the third. The notebook supports that distinction. Applying these patterns to tiny jewelry connections and Arabic lettering remains our hypothesis. The notebook contains no Arabic text or jewelry-specific experiment. Its [live official counterpart](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide) was also checked.

## What is fixed, and what the model can design

| Element | Fixed by the customer or recipe | Creative freedom in the first design |
| --- | --- | --- |
| Name | Exact spelling, case, script, supplied marks, reading order, and meaningful spaces | None to change the name |
| Lettering | Approved visual style or an explicitly chosen exact typeface | Permitted flourishes, proportions, and composition within that choice |
| Arrangement | One/two-name choice and selected arrangement | Balance and spacing within the arrangement; Arabic shaping still applies |
| Construction | Selected family and permitted support mechanisms | How those permitted supports fit this new composition |
| Hardware | Selected attachment relationship and chain type | Placement within the permitted structural zones |
| Stones | Selection, coverage, setting recipe, and allowed placement zones | Placement within those zones where the recipe allows it |
| Photography | Requested view and readable evidence of required features | Photographic presentation within the shot brief |

**An exact font and a calligraphy style are different promises.** If exact glyph outlines are essential, a correctly shaped specimen of the customer's name is a stronger starting point to test. If the customer selects a broader calligraphic style, prescribing the whole outline could remove the originality they want. Neither reference mode guarantees pixel-perfect output. This choice should be explicit in the recipe rather than an ambiguous instruction to preserve everything.

## The references available before a customer's design exists

### A. A reusable lettering specimen

Use an approved specimen for the selected script and style. It should demonstrate connected words and relevant letter contexts, not only an isolated alphabet or a dot-free name. Its role is to convey stroke treatment, rhythm, proportions, terminals, and approved flourishes. Sample names are not the customer's requested text.

A specimen should be uncluttered and should not contain incidental metal finishes, stones, watermarks, or an unrelated pendant outline. Specimen review occurs once per supported style; no new image-model call is needed merely to select that asset for a customer.

### B. A reusable construction or attachment detail

Use a verified local assembly example that shows the body anchor, separate connector, and first chain links, including enough depth and body context to see what passes through what. A picture of an isolated ring is insufficient. Select a detail compatible with the requested construction and chain; a cable-chain example is not automatically a curb-chain specification.

Remove irrelevant sample lettering from this reference's scope. Cropping can reduce accidental copying, but its benefit is untested: even a detail can influence metal color, proportions, or attachment placement. Review output for those effects. Ring closure and plausible appearance alone do not certify strength; ring dimensions and closure methods matter physically. [Cooksongold's jump-ring guidance](https://www.cooksongold.com/blog/learn/beginners-guide-how-to-use-jump-rings/)

### C. An optional customer-name spelling aid

Ordinary code can typeset the exact customer name into a clean image using a supported font and shaping engine. That adds no image-generation call. HarfBuzz shapes text using font substitution/positioning data and script, language, and direction; its output is glyphs and positions, not jewelry construction. [HarfBuzz shaping documentation](https://harfbuzz.github.io/shaping-and-shape-plans.html)

Test this as an additional reference, not an assumed requirement. It may improve spelling but also cause the model to copy its typography or silhouette. If supplied only for spelling, say so; if supplied as an exact lettering outline, say that instead. Do not send contradictory instructions about which reference controls the glyphs.

The hypotheses are **A helps style**, **B helps construction**, and **C helps spelling**. We have not measured those claims on new names. More references should earn their place through better results.

## The hardest issue is the support rule

Arabic character identity and contextual glyph shape are distinct. Identifying letter dots are part of a letter's identity, while other marks have their own treatment. [Unicode Arabic specification](https://www.unicode.org/versions/Unicode17.0.0/core-spec/chapter-9/#G20596) Arabic also contains legitimate joining breaks, and standalone hamza is non-joining. [W3C Arabic and Persian layout requirements](https://www.w3.org/International/alreq/)

For example, نور has a legitimate break after waw; أسماء adds hamza and other joining challenges. Making all visible shapes touch can damage the reading. Conversely, a correctly written detached mark may be an unsupported piece of metal.

Therefore, each construction needs an allowed **support treatment**, not a universal instruction to connect every letter. We choose the permitted mechanisms once per family, then test whether the model can adapt their placement to a new name. A frame, rails, a backing structure, and discrete bridges are different choices. The model must not silently substitute a frame when Classical forbids it. If the selected family offers no permitted way to support a particular name, that combination remains unresolved before generation.

A support should remain distinguishable from a linguistic stroke, preserve the reading, and be visible enough in R&D evidence to assess. Calling a support hidden cannot turn an uninspectable connection into a pass. Correct visual assembly is still separate from casting tolerances, strength, or manufacture approval.

## Proposed prompt architecture

Keep ordinary `{{variable}}` substitution. Introduce a clear distinction between **new design** and **another view of an existing design**. These are two task sections of one system; a language model does not need to rewrite either prompt.

The following is an **untested draft**, intentionally containing unresolved recipe slots. It cannot be submitted until the selected support recipe and reference roles are prepared.

```text
Create one photorealistic studio photograph of a newly designed custom-name necklace.

CUSTOMER IDENTITY
The pendant itself spells "{{name}}" in {{script}}.
Preserve this spelling, case, supplied marks, and reading order.
The name is formed from metal, not printed as a caption.
{{one_or_two_name_arrangement}}

REFERENCE ROLES
Image 1, @lettering: use its {{approved_style_traits}} for the requested name.
Its sample writing is not the requested name. Design a new composition.
Image 2, @hardware: use its {{selected_attachment_relationship}}.
Use it for that connection only. The customer selections govern metal and chain.
{{optional_spelling_reference_role}}

DESIGN AND CONSTRUCTION
Create a {{construction}} pendant within {{permitted_design_choices}}.
{{support_recipe_for_this_construction}}
Retain intentional lettering openings, marks, and word boundaries.
{{attachment_recipe}}

CUSTOMER SELECTIONS
{{metal_and_finish}}
{{stone_coverage_setting_and_allowed_placement}}
{{chain_style}}
{{applicable_personalization}}

PHOTOGRAPHY
{{studio_view_with_readable_lettering_supports_and_both_attachments}}
```

For a tested two-eyelet recipe, the attachment clause could identify two integral body eyelets, each receiving a separate closed connecting ring; each connector also passes through its first chain link. This is more specific than connected necklace. It is not a universal hardware recipe or proof that the model will comply.

Nominal **22 mm and 32 mm** remain stored selections. Their measurement meaning is unresolved and this study must not claim dimensional accuracy. Suppress inactive gemstone/second-name fields as before. Rear engraving remains rear-only; a front photograph cannot establish its correctness.

## Wording decisions that matter

| Wording to reconsider | More useful interpretation for this experiment |
| --- | --- |
| Preserve the reference | State which property each reference controls; exact-outline preservation applies only when an outline exists and is intended to be fixed. |
| No gaps / connect all letters | Keep legitimate openings and linguistic breaks; support every required component using the chosen mechanism. |
| Floating letters or stones | Describe the visible separation and its permitted support or setting. |
| Exactly two rings | Count body attachment points separately from connectors and chain links. |
| No extra elements | Define allowed supports, hardware, and settings first; then exclude unrequested decoration and captions. |
| Spell the Arabic out letter by letter | Keep the intact native word. An isolated-character checklist is an untested aid and must not prescribe separated visual lettering. |
| No text | The pendant name is required text; exclude captions and unrelated writing instead. |
| Same as before | For a new request, supply the design image and restate the properties to preserve. |
| Perfect, flawless, 8K | Use observable requirements; these words do not set API quality or resolution. |

The notebook's advice on photographic imperfections belongs to its candid-photo example; it is not a requirement to scratch new jewelry. For our diagnostic studio shot, use restrained reflections, readable edge thickness, and enough focus to inspect connections. GIA describes the different roles of diffused illumination and direct light in revealing metal and gemstones; these are physical photography principles, not a jewelry prompting benchmark. [GIA photography guidance](https://www.gia.edu/gem-photography)

## Where a reference of the actual pendant comes from

It comes **after the first creative generation**. That first product image can be the visual continuity reference for other views of that particular candidate. Every later view should refer directly to the same first image, rather than successively copying the previous view.

For example: first studio design → on-skin, close-up, and dark views, all conditioned on that studio design. Distinct creative alternatives receive distinct design IDs and their own first images. The same customer configuration alone does not specify which of several possible original compositions a later image should depict.

This proposes amending the earlier independent-view experiment. It does not change the production contract. The notebook's character example motivates the hypothesis; it does not prove fine jewelry consistency. A first-image defect can persist across every view, and a new angle may reveal a defect initially hidden.

If all outputs are generated without retries, one initial image plus three continuations is still **four output generations**, not a fifth planning image. That is not a promise of equal cost: reference inputs and serial dependency can affect cost and latency. It adds no automatic paid visual judge. During R&D, first-image failures remain failed requests even if continuations are skipped; record both submitted-image and complete-request denominators. A customer liking a picture establishes preference, not correctness.

## Focused next experiment

Prepare a new study rather than extending the old reconstruction score. No calls have been submitted for this proposal.

1. Prepare and inspect one permitted support recipe, one style specimen per tested script, and a compatible attachment detail. Resolve any unsupported name/recipe combination before spending. This preparation is not yet complete.
2. Use six names absent from the reference specimens and the previous paid screening: three Arabic cases covering dots, joining breaks, and hamza; three Latin cases covering separated/dotted letters and a long name. Treat these as development names, never final qualification holdouts. Use a single declared style per script, fixed across all arms, and one construction with fixed finish/chain/no stones.
3. Compare four nested arms: text only; text + style; text + style + hardware; text + style + hardware + name spelling aid. Six names × four arms × two repetitions = **48 proposed first-image outputs**. Keep semantic requirements the same, changing only reference availability and the applicable reference-role text. Randomize and interleave within name blocks.
4. Review with arm identities hidden. Hard criteria: spelling and script, structural support, attachments, selected options, and unwanted copying from references. Score style fit and creative appeal separately. A new outline is not a failure merely because it differs from the sample; a beautiful but misspelled pendant fails.
5. The 48-image comparison is diagnostic, not a reliability estimate. Its nested arms measure incremental help, not every reference interaction. Follow with a separately frozen continuity test, then cover all four constructions and broader form interactions. Do not infer those results from the first-image screen.

The original cumulative 50-submission boundary remains unresolved. This proposal is **not a quota reset or an instruction to launch another 48 calls**. The existing campaign remains paused; no new credits were consumed in this research.

## Current model and interface checks

The current OpenAI guide says GPT Image 2 processes image inputs at high fidelity automatically and does not accept changing `input_fidelity`. It still lists limitations in text, consistency, and precise composition. Its current maximum-edge rule permits 3840 pixels. That resolves the notebook's contradictory strict-less-than wording and older examples that pass `input_fidelity="high"`. [OpenAI image-generation guide](https://developers.openai.com/api/docs/guides/image-generation)

The notebook's table calls a column `outputQuality`; its Python calls use `quality`. Runway's connected MCP schema exposes neither that quality control nor effective GPT Image 2 `imageSize` control, although its website UI offers both. Tagged reference inputs are exposed. Website settings and prices are not proof of MCP settings or debits. [Runway's model guide](https://help.runwayml.com/hc/en-us/articles/51111417337363-Creating-images-with-GPT-Image-2) The connected tool description/schema was inspected read-only on 6 September 2026.

There is no documented prompt phrase or reference-role weight setting here that guarantees perfect copying of one feature and complete independence from every other feature. Those properties need empirical testing. The notebook is useful guidance, not a substitute for that evidence.

## Research boundary and stopping point

The notebook extraction, live OpenAI guidance, Runway interface documentation, Arabic shaping sources, and physical photography/assembly guidance establish the applicable techniques and their limits. Searches for GPT Image 2 Arabic benchmarks and custom-name jewelry prompts did not establish a reproducible new-name pendant benchmark. Public showcase examples and generic jewelry prompt lists are not used to infer success rates.

Research stopped because the remaining consequential questions concern our own generated outputs: reference-content copying, name accuracy, permitted supports, and continuity. More generic tips cannot resolve them. The saved draft and proposed controlled study make those questions testable while preserving the user's goal of deterministic prompt assembly and no automatically added paid runtime judge.
