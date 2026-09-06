# GPT Image 2 jewelry research — 6 September 2026

Research requested by Sanchay: spend on experiments before launch, then assemble a fixed master prompt with customer variables and make one image call per requested output. Research only; no additional images, provider changes, compiler implementation, deployment, or production verification changes were made.

The recommended direction is **one versioned master template, a small set of construction-specific sections, and deterministic variable substitution**. A paid model does not need to write the prompt, and a paid visual judge does not have to run on every request. The question for experiments is what first-attempt defect rate that simpler path achieves on the choices we actually support.

This updates the recommendation in [PROMPT-SYSTEM.md](PROMPT-SYSTEM.md): its review gate describes the R&D protocol, not evidence that every customer generation must receive another paid model call. Its two-reference v0.3 is an untested hypothesis. A single complete assembly reference may be sufficient; additional references must earn their cost through comparison.

## What the official documentation establishes

### Prompt design

OpenAI's GPT Image 2 cookbook favors maintainable templates and clear labeled sections. It recommends concrete material and composition instructions, explicitly requesting photorealism, specifying what changes and what remains fixed, and identifying the roles of multiple input images. Camera specifications are approximate visual cues. Long prompts can work, but small controlled revisions are easier to debug. Its product examples interpolate variables before making an image call. This supports our template approach; it does not establish a universally successful jewelry prompt. [OpenAI image prompting cookbook, dated 21 April 2026](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide)

### API behavior and limits

For a single prompt and output, OpenAI recommends the Images API. Its edits endpoint can generate using reference images. GPT Image 2 always processes input images at high fidelity: omit `input_fidelity`. Reference images contribute input cost. OpenAI explicitly lists remaining limitations in text accuracy, consistency, and precise composition. The Responses image tool can automatically revise prompts and adds the mainline model's token usage. [OpenAI image generation guide](https://developers.openai.com/api/docs/guides/image-generation)

GPT Image 2 offers the dated snapshot `gpt-image-2-2026-04-21`; fine-tuning is unsupported. Pinning a snapshot stabilizes the model version, rather than making repeated outputs identical. [OpenAI model documentation](https://developers.openai.com/api/docs/models/gpt-image-2)

Practical consequence: R&D improves our saved instructions and reference assets. It does not permanently teach this hosted model our jewelry rules. Every independent request needs its complete resolved specification and applicable inputs.

### Settings we can actually control

| Control | Direct OpenAI Images API | Connected Runway MCP image tool |
| --- | --- | --- |
| Model | Dated GPT Image 2 snapshot available | Exposes `gpt-image-2` alias |
| Prompt | Complete text string | `promptText` |
| References | Image inputs | Tagged `referenceImages` |
| Quality | Explicit setting | No quality parameter exposed |
| Resolution | Explicit size | Documentation says `imageSize` is ignored for GPT Image 2 |
| Composition ratio | Through output dimensions | `ratio` |
| Masked edit | Supported by Images API | No mask parameter exposed |

Sources: the API guide and model page above; connected `runway_generate_image` tool description/schema inspected on 6 September 2026. This is a comparison of interfaces, not a recommendation to replace the project's locked production provider. Runway's website controls and MCP controls are different surfaces. Hidden MCP defaults were not established.

Runway's official UI guide lists these credits **per image**, and says UI quality defaults to High:

| Resolution | Low | Medium | High |
| --- | ---: | ---: | ---: |
| 1K / 2K | 1 | 5 | 20 |
| 4K | 2 | 11 | 41 |

Its UI also supports reference images and scene sketches. These prices and capabilities do not establish that the MCP accepts the same settings. [Runway GPT Image 2 guide](https://help.runwayml.com/hc/en-us/articles/51111417337363-Creating-images-with-GPT-Image-2)

Writing “low quality,” “4K,” or a snapshot ID inside the image prompt cannot be relied upon to set billing or API parameters. For later cost experiments, use a supported interface that actually exposes the setting, and record it. Validate the chosen template on the intended production provider and settings before treating Runway results as transferable.

Documentation caveat: some cookbook edit snippets still include `input_fidelity="high"`, contradicting its own model table and the explicit current API guide. Follow the API guide and omit it for GPT Image 2. Do not copy older-model tuning advice blindly.

## What actual jewelry expertise adds

These are physical photography/construction sources. Their application to generated images below is our proposed experiment, not a published GPT Image 2 success guarantee.

| Source finding | Proposed use in our prompt system |
| --- | --- |
| GIA explains that diffused light reveals metal gradients and gemstone color; a combination with direct light can produce sparkle. It also recommends consistent light color temperature. | Use a stable neutral catalog lighting section. Add a restrained gemstone highlight clause only when appropriate to the selected stone. |
| Nils Wilbert's documented jewelry shoot uses diffusion and separately controlled light to emphasize chosen areas. | Describe where reflections fall and which surfaces should remain readable; avoid asking every surface to glow. |
| GIA's round-stone setting example requires a seated stone, fitted bearings, and adequate prong contact. | Define a setting with actual contact and support instead of merely asking for a “floating diamond.” |
| GIA explicitly cautions that one princess-cut setting benchmark does not fit all settings. | Choose the appropriate setting section by construction and stone cut; do not hardcode one prong rule globally. |

Sources: [GIA photography guidance — Weldon and Conrad, 2015](https://www.gia.edu/gem-photography), [broncolor: The Fine Line — Nils Wilbert](https://broncolor.swiss/news/the-fine-line), [GIA Bench Tip 17](https://www.gia.edu/gia-website/bench-tip-avoid-stone-loss-with-quality-assurance-benchmarks), [GIA princess-cut V-prong benchmark](https://my.gia.edu/quality-assurance-benchmark/setting-a-princess-cut-center-stone-in-a-platinum-mounting-with-v-prongs).

For our pendants, “no gaps anywhere” is the wrong global rule. The reference must distinguish intentional lettering openings, spaces between interlocking links, and openwork from an unsupported part or a broken attachment. Our pilot already demonstrates why this distinction matters. Likewise, the same metallic junction rule cannot describe a rigid casting and an articulated chain.

Suggested appearance variables should describe what is visible: metal color and finish; stone color, cut, count and placement; chain type; the photographed view. Keep nominal karat, gemstone origin, dimensions and chain length in the product specification too. A picture cannot establish those facts merely by looking convincing. A cropped pendant shot cannot demonstrate an entire necklace's measured length.

For the first catalog candidate, our proposed visual target is a clean, near-front pendant view with both attachment areas readable, controlled metal reflections, visible edge thickness and enough depth of field to resolve the piece. Test decorative props, extreme blur and dramatic lighting separately after this base behaves well. This is our shot choice for these known failures, not a universal photography prescription.

## Same-model examples: useful evidence and its limits

| Resource | What was actually available | Weight for this decision |
| --- | --- | --- |
| [Masonry four-model ring test](https://masonry.so/blog/ai-jewelry-product-photography), published 5 June, updated 4 August 2026 | Firsthand article with one displayed fictional ring output per model, including GPT Image 2. It explicitly says the prompt is reconstructed and no real product reference was supplied. | Useful example of a bounded text-only ring brief. Cannot estimate repeatability or preservation of our changing names. Its later reference-edit command uses a different model. |
| [Carat jewelry prompt gallery](https://carat.im/en/prompt-gallery/jewelry-product), dated 22 May 2026 | GPT Image 2-labeled necklace, ring and earring examples. Prompts ask to retain the input product while changing presentation. | Provider-authored inspiration for reference-based workflows. No original API lineage, repeated trials or failure denominator established. |
| [Hylo JRF-30 benchmark](https://hylo-app.vercel.app/research/ai-jewelry-photography-benchmark-2026), July 2026 | Reports 30 pieces and three tasks per tool; methodology uses default workflows and mixes hands-on trials with public outputs/documentation. Publisher evaluates its own product. | Useful categories to consider in our tests. Despite its “independent” title, commercial conflict and mixed evidence prevent importing its rankings or rates into Jewelo. Not a test of an optimized master prompt. |
| [ImgPilot jewelry transformation](https://imgpilot.app/ai-image-prompts/ai-jewelry-product-photography-prompt), discovered as a GPT Image 2 result | Author explicitly says GPT Image 2 timed out and Nano Banana Pro produced the final image. | Exclude from same-model success evidence. |

I did not find a reproducible public study demonstrating a universal GPT Image 2 prompt that preserves arbitrary Arabic name-pendant geometry, chain attachments and gemstone substitutions without failures. The resources above provide techniques and examples, not that proof. These external outputs were not independently audited at full resolution in this research.

Searches covered exact-model prompting, jewelry photography, product fidelity, chain/attachment benchmarks, name necklaces and Arabic pendants. General discovery used Agent Reach's Exa backend and web search; primary pages were opened or fetched directly. A WeShop ring tutorial was found in Exa, but the page could not be opened through the web fetch, so its claims are not used as verified findings here. No paid courses or model subscriptions were purchased.

## Proposed master-template design

This is an illustrative structure for the next decision, **not a tested replacement prompt**:

```text
Create one photorealistic catalog image of the specified necklace.

IDENTITY AND CONSTRUCTION
{{identity_and_construction}}
{{reference_roles_if_any}}
{{attachment_recipe}}

SELECTED FINISH
{{metal_clause}}
{{stone_and_setting_clause}}
{{size_and_chain_clause}}

PHOTOGRAPHY
{{shot_clause}}

PRESERVE
{{construction_specific_invariants}}
```

The application replaces every placeholder before sending **one** image request. Joining these text sections is ordinary code; it is not a chain of separately billed image generations. A second model is unnecessary for choosing a predefined section from a form enum.

“Universal” should describe the template's structure. The applicable construction rules can still differ: a framed name, origami ribbon and two-name connector do not share every physical relationship. Select one compatible recipe, then send only that recipe. Do not give the model all choices and ask it to decide what the customer meant.

Concrete proposed compilation rules:

- Freeze one configuration object at the moment of generation. Every occurrence of a value comes from that same object, preventing mixed old/new selections.
- Compile a complete stone clause. If coverage is `No stones`, emit an explicit stone-free specification and suppress the retained gemstone value. If stones are selected, resolve the setting and placement as well as the gem name.
- Give measurements their units and defined axes. Retain catalog dimensions as data; do not manufacture missing width, thickness or stone measurements from a size label.
- Keep lettering direction, support locations, integral eyelets and separate chain hardware distinct. Include only constraints that apply to that construction.
- Treat names and optional requests as data. Validate supported values and reject unresolved placeholders or conflicting options before spending on an image.
- Version the template, recipe set, references, provider and settings together. Save the actual submitted text, not a later reconstruction.

These are proposed code-level checks, with no extra model fee. They prevent malformed requests; they do not inspect the resulting pixels.

Local inspection confirms that [prompt-registry.ts](../../packages/ai/src/prompt-registry.ts) already contains `{{variables}}`, validation and compiled-prompt hashing. The work is to improve and connect the right specification, not invent a new prompting framework. [The current draft model](../../apps/web/src/features/atelier/model.ts) retains a gemstone value even with `No stones`; the final prompt needs the coverage-aware rule above. The active UI task removes chain-length controls; this research does not propose restoring them.

## How to experiment upfront without buying a verifier on every request

OpenAI recommends task-specific evaluations, representative and edge-case inputs, comparison against clear criteria, and human calibration of automated judging. Its guidance includes evaluation when the system changes; it does not establish a requirement to purchase a visual judge for every jewelry output. [OpenAI evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)

Our proposed sequence:

1. **Repair the experimental comparison first.** Keep the exact same customer specification, scene and model settings. Compare concise text only, concise text plus the existing body stencil, and concise text plus a complete assembly reference. Use repeated independent generations and record all failures. A reference can be a deterministic drawing/render; it does not require another paid image call per request.
2. **Choose the simplest successful input method.** Add a second reference or longer construction instructions only if a controlled comparison improves the relevant defects. Our previous two-reference proposal has not earned that status yet.
3. **Expand across actual options.** Include short/long Arabic names, hamza/dots and natural separation, Latin names, yellow/white metal, no stones/stone settings, supported constructions and chain types. Test interaction risks such as a long name with dense stones. This requires valid case references, not the already-questionable legacy stencils.
4. **Freeze the candidate, then test unseen cases.** Keep a holdout set that was not used to rewrite the prompt. Count first-attempt passes and uncertain results separately by construction, plus cost and latency. Repeat calls to expose variation; a best-of-four gallery is not a first-attempt result.
5. **Decide release scope and residual risk.** Choose which combinations can use the one-call path. If a family still fails, fix or restrict that family rather than silently adding unlimited retries everywhere. Any launch threshold and new image budget remain to be decided.

The existing six images are diagnostic evidence: three visual passes and three rejects, for one name and construction. They are too narrow to estimate production reliability. The stronger hardware paragraph added unwanted holes in both of its attempts. Those records remain in the [pilot review](../../reviews/2026-09-06-prompt-pilot/review.html).

A possible production policy is one generation call, ordinary input checks and periodic human sampling of saved outputs, with no per-request AI judge. Sampling does not intercept every defect before display, and human review still takes time. That is a cost/reliability choice to make from the experiments, not something the prompt can eliminate by assertion. Existing backend verification contracts remain unchanged pending that decision.

For budgeting, compare total experiment spend and first-attempt defect rates separately. Reusing a saved reference avoids regenerating it, but supplying it may still incur input cost. Reusing the same prompt text does not make image generation free. Prompt caching is not a cache of finished images; don't assume Runway passes through savings. An exact saved output can only be reused when its configuration and intended presentation actually match.

## Decision to make next

Proceed with one-call production as the target and use development experiments to select the smallest reliable template/reference combination. First prepare a finite comparison matrix and a concrete image/credit cap. Then run the approved experiment, retain the complete failure evidence, and choose a frozen release based on unseen cases. No new experiments have been submitted as part of this research.
