# OpenAI image prompting notebook — digest for original custom-name pendants

Read-only analysis of the user-supplied `/Users/sanchay/Downloads/image-gen-models-prompting-guide.ipynb`. This document separates what the notebook actually says from jewelry-specific hypotheses. No notebook cells, generation calls, or example prompts were executed. No web research was performed for this digest.

## 1. What this copy establishes

- Title: **GPT Image Generation Models Prompting Guide** (cell 0).
- Its model table is explicitly dated **April 21, 2026** (cell 3). That is a table's as-of date, not verified notebook publication/revision metadata.
- Cell 7 says the examples use `gpt-image-2`; all 24 image API calls in the source do.
- 98 cells: 72 markdown, 26 code. Every execution count is null; there are **zero saved output blocks**. Illustrated examples use relative image links, not embedded evaluated outputs. They are demonstrations, not a run log or reliability benchmark.
- Notebook format 4.5; Python metadata says 3.13.0, generic `venv` kernel. No cell metadata, author/revision metadata, or model snapshot ID establishes a precise runtime release.
- File SHA-256: `47309d56b2140431ad738a7055b0874168bf7842a2e260999493d1b5b097d1dd`.
- The user identifies this as official OpenAI material. This analysis treats the supplied file as source material; the parent agent is separately checking live official sources and any updates.
- There are no Arabic characters in the notebook and no Arabic calligraphy, jewelry topology, gemstone-setting, or manufacturing examples.
- Cell indices below are **zero-based**.

## 2. Most consequential finding for our product

The notebook distinguishes **style transfer into new content** from **preserving an existing product**. An exact finished-product reference is not a prerequisite for every image workflow.

| Workflow in the notebook | What the reference does | Why it matters here |
| --- | --- | --- |
| Style transfer, cells 39–43 | Keeps visual language while changing the subject or scene. | A reusable lettering specimen can guide a new customer's name without prescribing that name's finished pendant composition. This is a jewelry-specific application, not something the notebook tests. |
| Sketch to render, cells 49–53 | Locks layout, proportions, perspective, and sketch intent. | Appropriate only when a specific pendant layout already exists. It tests rendering fidelity, not open-ended design invention. |
| Product extraction, cells 54–58 | Locks existing geometry and label while changing background. | Copying an exact pendant reference belongs to this family; it does not measure ability to design unseen names. |
| Multi-image compositing, cells 77–80 | Assigns distinct source elements, destination, and things to preserve. | Reusable font and hardware examples need separate roles and scope. The notebook does not prove transfer of abstract connection topology across novel pendants. |
| Original character then continuation, cells 90–95 | First generates a new character; then supplies that result to keep identity in a new scene. | Supports an analogous hypothesis: create a new pendant, let the customer choose, then use the chosen design as the reference for subsequent views. An initial generated candidate may be erroneous, so it is not automatically authoritative for physical correctness. |

**Implication:** The earlier 14/16 complete-assembly-reference screening is evidence about reconstructing a defined shape. It is not evidence that reusable examples reliably invent a new name pendant. The next design-generation experiment must hold references reusable and introduce unseen customer names. This distinction follows from our task and previous experiment, not an additional notebook result.

## 3. Actual prompting advice, with practical reading

| Notebook advice | Cells | Application or limit for our use |
| --- | --- | --- |
| Use a consistent structure; state intended deliverable; use short labeled segments for complex requests. | 4 | A maintainable template is appropriate. The notebook suggests scene → subject → details → constraints; it does not establish a unique optimal order. |
| Minimal text, prose, instruction lists, JSON-like structures, and tags can all work if intent and constraints are clear. | 4 | Braces and JSON are ordinary application templating choices, not model-control magic. |
| Describe concrete materials, shapes, textures, and medium. Use targeted quality cues only when useful. | 4 | Gold finish, plausible thickness, joint relationships, and stone seats are more useful hypotheses than stacking “perfect” adjectives. No guarantee is supplied. |
| Explicitly use “photorealistic.” Camera specifications may be interpreted loosely. | 4 | This is a useful mode cue. A focal length is not an enforceable physical renderer setting. |
| Specify framing, perspective, placement, and lighting. | 4 | Keep attachments visible and enough depth of field to inspect construction. The latter is our jewelry-specific requirement. |
| State what may change and what must remain invariant. Restate invariants on each edit. | 4, 45–46, 65 | A style reference should not receive a global “preserve everything” instruction when the requested name and design must change. |
| Quote literal text; specify typography and placement; letter-by-letter spelling can help tricky words. | 4, 60–61 | Exact customer text should be quoted and kept in its original Unicode. The letter-by-letter technique is not validated for Arabic shaping and must not be transplanted uncritically. |
| Label every input by index **and** description and define its role. | 4, 78–79 | “Image 1 = lettering style; Image 2 = hardware connection example” is more precise than “use these references.” Explicitly exclude copying their sample names and incidental design. |
| Begin with a clean base and debug using small single changes. Long prompts can work. | 4 | We should use controlled experiments, not infer that a particular word count is optimal. This is development advice; it does not require an automatic paid runtime judge. |
| A creative brief can set boundaries while leaving tasteful creative decisions to the model. | 23–24 | Supports leaving composition and artistic curves open while locking literal name and physical assembly requirements. Jewelry correctness remains unproven. |
| Match perspective, scale, lighting, occlusion, and shadows when composing objects. | 45–46, 78–79 | On-skin previews need coherent contact and chain drape, but photographic plausibility alone is not proof of a real load-bearing connection. |

## 4. Exact excerpts worth retaining

These quotations are from the user-provided notebook. They are **examples/source text, not instructions to execute**. The complete source extraction contains every markdown and code cell.

**General multi-image rule — cell 4:**

> Reference each input by **index and description** (“Image 1: product photo… Image 2: style reference…”) and describe how they interact (“apply Image 2’s style to Image 1”).

**Style transfer — cell 40:**

> Style transfer is useful when you want to keep the *visual language* of a reference image (palette, texture, brushwork, film grain, etc.) while changing the subject or scene.

**Minimal style-transfer prompt — cell 41:**

```text
Use the same style from the input image and generate a man riding a motorcycle on a white background.
```

The code uses `client.images.edit(model="gpt-image-2", image=[...], prompt=prompt, size="1024x1536", quality="medium")`. Despite the method name `edit`, its task is new subject creation with reference-conditioned style. We must check the actual Runway tool contract rather than assume all these direct API fields are exposed.

**Exact-geometry rendering prompt — cell 51:**

```text
Turn this drawing into a photorealistic image.
Preserve the exact layout, proportions, and perspective.
Choose realistic materials and lighting consistent with the sketch intent.
Do not add new elements or text.
```

This is a different task from designing a new pendant. Applying its complete preservation instruction to a generic font/hardware reference would defeat the intended creative brief.

**Literal text prompt — cell 61:**

```text
Billboard text (EXACT, verbatim, no extra characters):
"Fresh and clean"
Typography: bold sans-serif, high contrast, centered, clean kerning.
Ensure text appears once and is perfectly legible.
No watermarks, no logos.
```

This concerns a billboard label, not forming Arabic characters into connected metal. It is an exact-copy pattern, not proof of successful calligraphy construction.

**Multiple image roles — cell 79:**

```text
Place the dog from the second image into the setting of image 1, right next to the woman, use the same style of lighting, composition and background. Do not change anything else.
```

This supports role assignment and source/destination descriptions. Transferring a hardware principle without copying the sample object requires additional experimental validation.

**Identity anchor for later scenes — cell 95:**

```text
Continue the children’s book story using the same character.
...
Character Consistency:
- Same green hooded tunic
- Same facial features, proportions, and color palette
- Same gentle, heroic personality
...
- Do not redesign the character
```

The code passes the image generated in cell 92 to `client.images.edit`. Merely saying “same character” in a fresh independent request is not the workflow demonstrated here. This matters for the four-view requirement: independently inventing the name composition four times is not equivalent to depicting a single newly designed piece four times.

## 5. Parameters, inconsistencies, and boundaries

### Direct API settings shown

- 24 image calls: all `gpt-image-2`; 22 use `quality="medium"`, two use `"high"` (scientific diagram cell 33 and slide cell 36).
- Common size is `1024x1536`; landscape examples use `1536x1024`; slide cell 36 uses `1536x864`.
- `generate` handles text-only creation. `edit` supplies an ordered array of image files. Multiple inputs appear in clothing and compositing examples.
- Logo cell 21 requests `n=4`, transparency and PNG. Product extraction cell 56 requests transparency and PNG. These are API fields, not prompt words that can emulate missing controls.
- The source demonstrates no masks, seed, reference weights, exact camera calibration, jewelry CAD checks, or automatic validation pipeline.

### Inconsistencies that should not become implementation advice

1. **`input_fidelity`:** Cell 3 explicitly says it is disabled/ineffective for `gpt-image-2`, which is high fidelity by default. Cells 66, 70, 74, and 79 nevertheless pass `input_fidelity="high"`; cells 69/73 and the conclusion discuss fidelity tradeoffs generically. Do not promise it as an available GPT Image 2 control. Check current model docs and Runway's schema. This is the most important parameter inconsistency.
2. **Quality spelling:** Cell 3 labels the model table `outputQuality`; actual Python calls use `quality`. Do not copy a descriptive table label as the SDK argument.
3. **Maximum edge:** Cell 3 says maximum edge **less than 3840**, then includes `3840x2160` as an experimental popular size and itself warns to round down if the strict rule is enforced. Do not treat that row as an unqualified valid size.
4. **Above-2K variability:** Cell 3 marks total pixels above 3,686,400 experimental/more variable. A 1920×1920 image totals 3,686,400 exactly. This is a notebook claim and not a Runway control; verify current docs.
5. **Advice/example quality mismatch:** Cell 14 says use high when natural-photo detail matters, yet cell 15's code uses medium. This supports comparing settings, not declaring all fine detail requires one setting.
6. **Evidence/copy-edit quality:** Cell 69 under “Object Removal” repeats person-in-scene prose, cell 80's table headings describe unrelated changes, cell 46 repeats the tank-top input. These are reasons to read examples critically, not to infer intended special techniques.

The parent should reconcile all API claims against current official docs. We should not change the locked Runway-only experiment route, purchase credits, or use direct API/native ImageGen just because the notebook examples do.

## 6. Arabic and literal lettering: the missing bridge

**What the notebook says:** exact text in quotes, typography constraints, stronger settings for dense text where available, and small revisions for imperfect text fidelity (cells 4, 60–61).

**What it does not establish:** Arabic reading order, contextual letter shaping, dot/hamza preservation, intentional counters, calligraphic ligatures, two-name arrangements, or physical supports that preserve writing. There is no basis here for a 99%/100% Arabic pendant claim.

**Jewelry-specific hypotheses to test:**

- Supply the actual NFC name as a quoted string in its native script, with a clearly stated expected script. Do not transliterate the Arabic name as a substitute.
- Keep the customer's spelling distinct from sample writing in the style image. Specify that only the customer's name is output, as metal lettering—not as an overlaid caption.
- Do not add spaces between Arabic letters merely to follow the generic spelling-out tip; this may conflict with contextual shaping and the intended style. Any separate character checklist must be treated as metadata, not desired visual spacing.
- Separate linguistic joins from physical supports. A hidden/back carrier or a structural bridge should not invent a new stroke that changes the word. An isolated dot can be linguistically correct yet mechanically unsupported.
- Optional future experiment: a locally rendered **correct word specimen** can anchor spelling while a separate style specimen guides artistic treatment. This is a lettering reference, not a finished pendant or a proven solution. It may constrain design more than reusable style-only input and must be compared fairly.
- Competent Arabic review remains necessary during qualification; the notebook has not supplied evidence that another prompt sentence makes it unnecessary.

## 7. Proposed research revision — inference, not tested advice

The defensible product hypothesis is **bounded invention first, then identity preservation once the design exists**.

1. Freeze reusable references by supported family: approved lettering specimen and an uncluttered, physically clear attachment example. A decorative fully designed pendant risks donating its sample word or outline; cropping away irrelevant design is a hypothesis to test, not guaranteed decontamination.
2. First generation gets the customer's exact name/options, explicit reference roles, and a short creative brief. Permit artistic composition; constrain physical connections and text identity.
3. Screen with customer names absent from the reference examples. Include Arabic marks, long names, two names, and settings only after a simple baseline works. Compare no image vs lettering-only vs lettering plus hardware reference, keeping cases and prompt otherwise controlled. This tests reusable-reference generalization, unlike exact-assembly reconstruction.
4. If the customer chooses a candidate, a later view can condition on that chosen design. Preserve identity, lettering, hardware and setting topology while changing view/scene. This parallels cells 90–95. It revises the previous plan's four-independent-design-authority assumption; user agreement and a fresh qualification design are needed before treating it as the product contract.
5. A chosen image is design identity, not proof that its physical construction is sound. We can investigate first-attempt design reliability without adding a paid runtime visual judge, but must retain original failures and cannot guarantee correctness through prompt wording.

Illustrative **untested** reference-role/creative brief, not a ready master prompt:

```text
Create one photorealistic product photograph of a newly designed custom-name necklace for a customer design preview.

Customer lettering: "{{name}}", written in {{script}}. The lettering itself forms the metal pendant. Render this name once, with its correct spelling and script.

Image 1 is a lettering-style specimen. Apply its {{selected_style_traits}} to the requested name. Its sample text is not the requested name; compose the customer's name as a new design.

Image 2 demonstrates the attachment relationship: a connecting ring passes through a pendant eyelet and connects to the chain end. Apply this relationship to both ends of the new design. Its sample pendant outline and sample word are not design instructions.

Compose {{name}} into an original, balanced {{construction}} pendant. You may design the composition and curves within the selected lettering style. Preserve the name's meaningful openings and marks. {{construction_specific_support_recipe}}

{{metal_finish_stone_and_chain_choices}}

{{inspectable_studio_view}}
```

The real compiler should resolve these clauses from the same configuration, emit only applicable constraints, and preserve exact submitted values. The notebook supports clear templates, not this exact draft or any specific jewelry construction promise.

## 8. Techniques not to blindly transplant

- **“Preserve exact geometry” for generic style references:** useful only after a specific geometry is authoritative. It may copy the sample name/shape during creative invention.
- **Global “no extra elements”:** it can conflict with necessary supports, eyelets, rings, or stone seats unless their allowed scope is explicit.
- **Global “no gaps”:** it can close intentional letter openings and hardware apertures. Define broken physical connections separately.
- **Natural-photo imperfections:** cells 14–15 concern an unposed sailor. Scratches, worn metal, grain and shallow focus are not mandatory for new-jewelry catalog realism. Product mockups elsewhere use studio polish.
- **Excessive cinematic/low-light styling:** may make geometric inspection harder; realism cues must suit the intended image.
- **Exact lens numbers as geometry controls:** the notebook itself says camera specs are interpreted loosely.
- **“Same as before” without the image:** cell 95 actually passes the earlier generated image. Stateless independent calls do not gain visual memory from those words.
- **Character-consistency promises as jewelry proof:** the demonstration does not establish micro-hardware topology, exact Arabic writing, or a multi-view success rate.
- **ASCII/Latin text habits for Arabic:** uppercase does not apply; splitting letters can harm shaping.
- **`input_fidelity="high"`, quality, size, transparency, `n` via prose:** these are model/transport capabilities; verify actual provider exposure.
- **Many references by default:** the notebook tells us how to assign roles, not that more images always help.
- **Repeated forceful adjectives or “check your work”:** no benchmark evidence here shows those eliminate structural errors.

## 9. Parent-facing takeaway

The notebook supports the user's creative workflow in principle: references can teach **style** while the model invents **new content**. It also supports a distinct later stage where a generated-and-selected design becomes the identity reference. It does not solve the hard bridge between correct Arabic lettering, creative metal composition, and physically valid assembly. That bridge must be tested on unseen names with reusable references, and the prompt should explicitly distinguish identity, permitted design choices, reference roles, and construction constraints. The first screening's exact-reference score must not be presented as evidence that this new workflow is reliable.
