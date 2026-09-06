# Jewelry prompt system — next iteration

This is the working specification for the prompt R&D requested on 6 September 2026. It consolidates the recovered experiments into one place. The template below is a candidate, not a production release. The user authorized archiving old experiments and up to SIX Runway GPT Image 2 images, including repeats/retries, then review. No automatic purchases or extra calls. The application compiler and customer UI have not been changed.

## Intent and success condition

Translate validated form choices into consistent photographs of the same physically coherent pendant. Keep one shared prompt core, small construction recipes, and explicit variables. Improve first-attempt reliability through experiments; admit only audited images to the review gallery.

A prompt cannot guarantee correct geometry or realism. Reliability requires a valid construction reference before generation and an output gate afterward. An attractive image is neither proof of correct spelling nor evidence that the design can be manufactured. Manufacturing thickness, tolerances, stone seats, and strength require separate jeweler/CAD review.

The next loop uses **Runway MCP `generate_image`, explicitly `model: "gpt-image-2"`**. Do not use the default model. The built-in image tool is a separate experimental route only if requested later; do not mix its results into a Runway comparison. This R&D choice does not migrate the production provider adapter.

## What the recovered evidence teaches

- The recovered `CALEUMS-stills-review` ZIP contains 145 photographs with compiled prompt text above each image. It is an earlier 30 mm snapshot; it does not contain the later shared CASTING block. Its prompts are reconstructed families, not a complete record of submitted provider payloads.
- `CALEUMS-drop-compare` contains old/new prompts, stencils, and photos for Asma, Noor, and Muhammad. The old wording allowed “stacked or rotated,” which permitted sideways Arabic. The correction specifies upright stacking, connected construction, name-relative proportions, and a 32 mm trial target.
- The correction photos carry a Grok watermark despite the prompt display naming GPT Image 2. Treat them as layout experiments, not GPT Image 2 evidence or catalog passes. Noor has no old photo. Preserve these facts in comparisons.
- The earlier Asma rounds show that “fuse everything” can close a required Arabic gap; “free-standing” can instead detach an entire letter. Stone accents can replace a hamza or obscure letters. A frame that appears disconnected may still look expensive.
- A lettering-only stencil is insufficient authority for frames, bridges, ring placement, and stone seats. A silhouette containing provisional rings must not be interpreted both as immutable construction and as spelling-only guidance.

The principle is **no unsupported physical parts**, not “no empty space anywhere.” Preserve letter counters, openwork, permitted spacing, and visible ring apertures. A disconnected Arabic glyph needs an approved structural bridge or carrier, not a new linguistic join invented by the model.

Recovered originals: `/Users/sanchay/Downloads/CALEUMS-recovered-2026-09-06/`. Keep the two ZIPs as source evidence. Recovery source: Umayr chat, 4 September 2026; stills message `3EB0B1BCEC02A4BEBA8DF4`, comparison message `3EB0D319EF29D253573D78`.

## Form to specification: resolve before writing prose

The current prototype fields are defined in `apps/web/src/features/atelier/model.ts`. These are source mappings, not a declaration that every combination is geometrically supported.

| Form input | Resolved prompt meaning | Required handling |
| --- | --- | --- |
| `name`, `script` | `approved_names`, `language` | Trim and normalize NFC; preserve approved spelling. Never transliterate silently. Arabic reads RTL; English LTR. |
| `twoNames`, `secondName` | One or two identities | Omit the second name completely when disabled. Validate both when enabled. |
| `construction` | `construction_recipe` | Construction architecture, independent of font and photography. |
| `lettering` | Identity renderer selection | Resolve a supported script/font combination before generating a stencil. A style label alone does not prove glyph support. |
| `layout` | `name_arrangement` | Currently a TWO-NAME arrangement: side by side, heart, stacked, infinity, interlocked. It is not bar/drop/window. Omit when there is one name, even if the stored default says “Connected heart.” |
| No current field | `display_layout` | Separate R&D input: bar/window/upright drop. The test case must state it; do not infer drop from the two-name “Stacked” value. |
| `metal` | `metal_color` | Map to yellow/white/rose gold. 18K is an explicit experiment default, not a customer-selected karat. |
| `coverage`, `gem` | `stone_spec` | “No stones” compiles to no stones and no settings, regardless of the retained diamond value. Other coverages require a matching approved placement map. |
| `size` | `size_target` | Preserve the selected 22 or 32 mm value. Define the measured axis and dimensions in the geometry spec; do not invent width × height × thickness. |
| `chain`, `length` | `chain_spec` | Use the selected style and length. Total length cannot be certified from a cropped still. |
| `engraving` | Surface-specific personalization | Apply only to its approved surface; do not write back engraving across the front. If the surface is hidden, it is not verifiable in that view. |
| `requests` | Reviewed optional instructions | Parse into compatible constraints. Do not concatenate arbitrary text that overrides identity or construction rules. Unresolved conflicts block the affected request. |
| Selected camera view | `shot_recipe` | Studio first for auditing; later views preserve the accepted piece rather than redesigning it. |

Reject unknown enum values, missing required inputs, unresolved placeholders, incompatible stone/coverage choices, and unsupported geometry. Name length means rendered glyph extent, not a guessed character-count category. A long name must not simply be squeezed until bridges become implausibly thin.

The existing application compiler is `packages/ai/src/prompt-registry.ts`. It already validates variables and stores a compiled-prompt hash. Its current slots do not express all of this contract. A future adapter must extend the validated schema; pasting this template into the existing registry will not automatically make these variables supported.

## Reference contract: geometry first

Each test starts with an approved construction reference tagged `@geometry`. It must depict the FINAL intended name arrangement, frame/rails if any, structural bridges, attachment locations, and proportions. Use an unambiguous front view with high contrast. Reference labels or diagrams outside the object are not jewelry decoration.

Preflight the reference itself:

1. Exact approved glyphs and ordering; all dots, hamzas, counters, and meaningful spaces preserved. No model-generated reference is automatically canonical.
2. Pendant body and approved carrier form a physically connected structure. Dots/hamzas have deliberate supports that preserve legibility. Use a vector connection map or an isolated mask as evidence; component count alone cannot establish strength or correct spelling.
3. Exactly the attachment arrangement specified for that construction. Initial test family: two body attachment points and one necklace chain. Rings and interlocking chain links are separate hardware; do not demand they be fused into the pendant casting.
4. Chain passes through hardware openings with a plausible load path. Crossed shapes in a flat picture are not proof of a connection.
5. Frame proportions fit the actual name; dimensions and bridge/stone feasibility are reviewed. Do not ask the model to repair an invalid reference.

If a second reference is used, give it a separate role such as `@material`: lighting, metal response, and surface finish only. Its name, frame, gems, and attachments must not be copied. A material reference is optional, not a substitute for geometry.

Bar: upright horizontal reading in the script's direction. Window: upright name in its approved frame. Drop: an independently approved upright vertical composition; not a horizontal word rotated 90 degrees. If the chosen script cannot be stacked legibly and connected with the available identity renderer, that cell is blocked at preflight.

## Next master prompt candidate v0.3 — UNTESTED

Compile only the applicable instructions. The model receives one coherent resolved specification, not contradictory menus or every possible option. The v0.2 hardware-only wording failed the pilot. This v0.3 candidate changes the reference method and has NOT been submitted. It requires a validated full assembly reference; it cannot run using the pendant-only stencil alone. Exact v0.1/v0.2 submissions remain unchanged in the pilot folder.

```text
Create one realistic jewelry product photograph of the assembled necklace
shown in @assembly.

PIECE
Approved name(s): {{approved_names}}.
Script and reading direction: {{language}}.
Construction: {{construction_recipe}}.
Name arrangement and display: {{arrangement_and_display}}.
Material: {{metal_spec}}.
Stones and approved locations: {{stone_spec}}.
Size and proportions: {{size_spec}}.
Chain and attachment hardware: {{chain_and_attachment_spec}}.
Visible personalization: {{visible_personalization}}.

IDENTITY AND ASSEMBLY
@geometry defines the exact pendant body: approved glyphs, spelling,
reading order, counters, proportions, support bridges and integral eyelets.
@assembly shows that SAME body with the approved separate jump rings and
initial chain links already installed. The two references are aligned and
have been checked for agreement before this request.

Render the existing assembly; do not design another way to attach it.
Preserve all body contours, open spaces and the displayed interlocking
relationships. Integral eyelets remain part of the body casting. Separate
jump rings and chain links remain distinct metal hardware in their shown
positions. Use each existing eyelet exactly as illustrated in @assembly.
No new holes, moved attachments, detached components, closed counters,
added linguistic joins or chain ends resting loose beside the pendant.

Apply only the requested metal, surface finish and preapproved stone
settings to this same construction. Stones do not replace or obscure glyphs.

PHOTOGRAPHY
{{shot_recipe}}
Render real gold with consistent thickness, believable edge bevels, coherent
reflections, surface detail and contact shadows under one lighting setup.
Keep the complete pendant and both attachment junctions sharp enough to
inspect. Preserve the requested finish: polished is reflective, matte is
diffuse. Gemstones have defined facets and supported settings.
No plastic-like material, illustration, impossible intersections, smeared
links, fake glow, artificial sparkle graphics, logos, watermark, captions
or unrequested objects.
{{optional_material_reference_rule}}
```

For the first audit shot, use: “Near-front product photograph on matte ivory, one large soft light with gentle fill, neutral color balance, restrained highlights and enough depth of field to resolve every bridge, stone seat and attachment. Entire pendant in frame; no hands, fabric or props covering it.”

Recipe examples, always subordinate to the approved geometry:

| Family | Construction instruction |
| --- | --- |
| Classical | Preserve the approved script body and its discrete support bridges; no frame unless present in geometry. |
| Framed Minimal | Thin open frame supports lettering at the approved contacts. Attach the chain at designated frame points, not new letter holes. |
| Diamond Rails | The approved rails carry lettering and supported stone settings. “Floating” describes visual spacing, never detached components. |
| Origami Ribbon | Approved folded planes retain continuous metal across folds. Fold edges are surface geometry, not cracks or cut letters. |

Do not add a family merely by appending an adjective. New negative-space, broken-frame, constellation, two-name, or kinetic designs require their own valid construction recipe and reference. “Broken Frame” may be visually interrupted while the total support structure remains connected. A kinetic mechanism needs a different assembly contract and is outside the initial one-body trial.

## Audit gate

Reviewer input: the actual output pixels, approved name/specification, and geometry reference. Review at full image size, then inspect crops of the glyphs, supports, frame contacts, settings, and both chain attachments. Cropping is an inspection aid, not permission to repair evidence silently.

Review in this order. A beauty score never compensates for a failed hard gate.

| Gate | Pass evidence | Reject or needs-review evidence |
| --- | --- | --- |
| Identity | Same names, script, glyphs, diacritics, reading order and intended spacing | Missing/extra glyph, replaced hamza, obscured lettering, ambiguous spelling |
| Construction | All specified supports and junctions visibly intact; correct openwork | Island, fracture, detached frame segment, invented linguistic join; a junction hidden by glare/occlusion is uncertain |
| Hardware | Correct attachment count and positions; coherent interlocking chain | Chain ends in air, duplicated chain, impossible threading, extra ring or unexplained bail |
| Specification | Correct construction, layout, material appearance, stone coverage/placement and personalization | Wrong architecture, stone added to “No stones,” wrong color, overwritten name, plaque instead of openwork |
| Photography | Coherent light, realistic metal/gem response, clear inspectable detail and believable scale | Plastic, smeared geometry, inconsistent shadows/reflections, false depth, unsupported sparkle, watermark |

Status is `pass`, `reject`, or `needs_review`. Uncertain critical joins and disputed Arabic readings are `needs_review`, never a majority-vote pass. Record each fault by location and observable evidence. Another model may assist, but independent inspection must not inherit a generator's “pass” label. Do not claim independent review unless it actually happened. A separate plan reviewer inspected the first pilot reference and identified the integral-eyelet versus separate-jump-ring distinction before generation.

Suggested record:

```json
{
  "case_id": "AR-ASMA-FRAMED-WINDOW-01",
  "attempt": 1,
  "prompt_version": "0.1",
  "task_id": "returned by Runway",
  "status": "needs_review",
  "gates": {
    "identity": "needs_review",
    "construction": "needs_review",
    "hardware": "pass",
    "specification": "pass",
    "photography": "pass"
  },
  "findings": [
    {"code": "UNCERTAIN_JOIN", "location": "hamza support", "evidence": "Glare hides the contact with the carrier."}
  ],
  "reviewer": "actual reviewer identifier",
  "next_action": "Inspect source resolution; if unresolved, regenerate an inspectable view."
}
```

Pixels cannot certify exact millimeters, chain length, gold karat, lab/natural origin, hidden engraving, weld strength, or manufacturability. Record those as not visually verifiable, not as passed visual facts.

## Runway iteration protocol

1. Freeze test input, geometry, prompt version, shot and available generation budget. Check provider/model access without creating unrelated assets. No automatic credit purchase or model fallback.
2. Compile the actual form/spec snapshot. Store the full submitted prompt BEFORE the call, reference file hashes/roles, model `gpt-image-2`, ratio `1:1`, attempt number and case ID. Never rely on a shortened `get_task` prompt to reconstruct it later.
3. Upload approved local reference files through Runway's supported upload flow. Do not print signed upload/download URLs or credentials into logs or commit them. Preserve provider IDs and local checksums for lineage.
4. Submit one image per test case using `generate_image`. Store returned task ID immediately. For exact repeated trials, `count` may create separate attempts; the prompt still describes one photo.
5. Retrieve the output, save it unchanged, then audit. Do not overwrite previous attempts. A favorable preview is not a completed full-resolution review.
6. Diagnose before retrying: invalid reference → fix reference and record a new revision; instruction conflict → repair compiler/recipe; correct geometry but poor material → change photography/material wording only. Do not keep extending a global negative-prompt paragraph.
7. Change one cause at a time and compare against the same case. Any edit of a failed image creates a new candidate and repeats every audit gate. Repeatedly unclear supports require geometry review, not unlimited paid retries.
8. Stop at the agreed image/credit cap. Preserve accepted results, show failures honestly, and state what remains untested. Never substitute a different name/layout and label it the requested design. A last accepted image may remain visible only with its own accurate configuration.

The review page for each case must show: resolved selections, geometry reference, FULL submitted prompt above the candidate, version/attempt/task ID, output, audit crops, verdict, observed faults, and next change. Compare the same case between versions. Keep rejected candidates reachable in the audit view, outside the accepted gallery.

Use a small adversarial set before a broad catalog: Arabic Asma with hamza in a window; short Noor window proportions; Muhammad in a separate approved upright drop; English origami with explicit supports; rails with stones restricted to rails; and a two-name case only if its connector geometry passes preflight. These are test cases, not an approved launch catalog. Repeat identical difficult cases to assess variability before claiming a universal improvement.

Measure first-attempt hard-gate passes / first attempts; eventual passes / cases; reject and uncertain rates by defect; calls and available credit cost per accepted image. Report sample size and tested combinations. Six successful examples do not establish a reliability percentage for all form combinations. Compare against old prompts only when exact inputs/references are available; otherwise label the baseline reconstructed.

The initial stopping condition is a documented prompt version, validated test references, the agreed small batch with every output audited, and a review comparison explaining what improved and what still fails. Promotion requires repeat trials plus held-out names/configurations; no candidate template is production-ready merely because one render looks good.

## Cleanup boundary

This file is the working reference for the new iteration. Old rules such as “first try guaranteed,” “retry without a limit,” “keep a legal sibling regardless of selected layout,” the 261-cell launch sweep, and the 50-task agent wave do not govern this loop.

Archived: the superseded operational documents under `docs/rnd/` (`prompt-slots.md`, `sit-and-size.md`, `image-loop.md`, `dual-loop.md`, `image-pack.md`, `ZIP-DELIVERABLE.md`, `design-matrix.md`, `STYLE-AGENTS.md`, `running-agents.md`, `agent-roster.md`, `matrix-cells.json`) and the older prompt advice in `docs/planning/omran/IMAGE-PROMPTS.md`. These now live under `reviews/archive/2026-09-06/` with source-building scripts and original galleries. Incoming active-document links were updated. The attributed style catalog remains beside this specification as source context.

Preserve original recovered ZIPs, canonical identity assets, selected pass/fail evidence and task lineage. User selected ARCHIVE, not permanent deletion. Archive exact bytes and verify hashes before removing an active copy. Never include unrelated UI changes, private WhatsApp archives, application compiler/tests, or another task's edits in cleanup.

## First pilot: narrowed after reference inspection

The stage0 identity report is not itself a linguistic quality gate. The current Arabic engine moves separate components to force connectivity and reports `exactCharactersPreserved`; Asma/Noor still require spacing and spelling review. The Latin references visibly lack a complete connected construction. The thick Asma reference has unsupported components. None is ready for this first generation batch merely because its report says passed.

Use `reviews/2026-09-06-prompt-pilot/references/muhammad-geometry.png` (original and stage0 report archived under `reviews/archive/2026-09-06/reviews/partner-matrix/`): hash matches stage0; `componentsBefore=1`, `fuseMoves=0`. Parent and independent plan reviewer visually inspected it. This is an experimental geometry reference, not a manufacturing approval. Its two circular silhouettes are INTEGRAL EYELETS; specify one SEPARATE closed jump ring through each eyelet and a single necklace chain. The thin eyelet necks remain a strength-review limitation.

Attempts 1–2: identical Muhammad classical bar, yellow gold, no stones, same camera/reference. If both pass all visible gates, attempts 3–4 change only yellow to white gold. If either fails, diagnose one cause and repeat the revised prompt twice instead. Attempts 5–6 are optional confirmation; stop earlier when the reference or budget is the limiting factor. No universality, drop, frame, stone, Latin, or two-name claim follows from this narrow pilot. Store prompts, submissions and verdicts in `reviews/2026-09-06-prompt-pilot/`.

## Pilot finding: attractive can still be broken

Attempts 1–2 (yellow v0.1) passed independent visual audit. Attempt 4 (white v0.1) also passed. Attempt 3, using the identical white prompt, placed the left chain end beside the pendant instead of connecting it. Its lettering and photographic appearance were acceptable, but its assembly was rejected. This directly demonstrates why the prompt alone is not a release gate.

The final two authorized attempts use white v0.2 with ONLY the HARDWARE paragraph changed: explicitly complete assembled necklace, integral cast eyelet-to-letter necks, and separately stated left/right chain-to-ring-to-eyelet connections. All other inputs stay fixed. Full submitted variants remain in the pilot folder; do not retroactively rewrite v0.1. The six-image cap has been reached; no further automatic calls. All six outputs are now independently audited.

## Decision after the six-image pilot

The final hardware-only revision did not solve attachment reliability. It produced extra attachment holes instead of using the original eyelets. Do not promote v0.2 or describe its more forceful wording as an improvement. Cosmetic realism can pass while construction fails.

Next hypothesis, not yet tested: supply BOTH a body identity reference and a matching complete assembly reference with eyelets, separate jump rings and initial chain links shown in a legible orientation. Validate their agreement before generation. A deterministic assembly diagram or render should define the interlocking relationships; a prior generated photo can be comparative evidence but does not become canonical automatically. Test this method on the same Muhammad white-gold case before adding styles/names. Keep the master concise instead of accumulating failed instructions.

The candidate master above reflects that proposed method. There is no tested universal release and no live-form integration. The archived failures are part of the evidence, not clutter to erase.

### Recorded results

| Submitted condition | Visual passes / outputs | Outcome |
| --- | --- | --- |
| v0.1 Muhammad, yellow gold | 2 / 2 | Reference and assembled hardware visually preserved. |
| v0.1 Muhammad, white gold | 1 / 2 | One detached left chain; same prompt has inconsistent outcomes. |
| v0.2 Muhammad, white gold | 0 / 2 | Added attachment eyelets/branches; intended eyelets unused. |

Total: 6 generated, 3 visual passes, 3 rejects, all audited by parent and independent reviewer. This is an exploratory result for one name/one construction, not an estimated universal success rate. No more calls, no native-image-tool runs, no production integration. Next action is a validated assembly reference for the untested v0.3 hypothesis. Detailed evidence: [pilot review](../../reviews/2026-09-06-prompt-pilot/review.html).

Cleanup complete: 182 historical file entries archived and hash-verified; 10 selected historical images kept accessible. Original recovered ZIPs preserved. No permanent deletion. Active R&D starts here; archived operational rules are superseded.
