# Findings and next development decision

This file separates observed failures from proposed fixes. The frozen candidate, first-attempt denominator and review rubric are not changed in response to results. Consult `report.md` for final counts and method eligibility.

## What the images establish

The compiler can assemble exact, reproducible customer instructions, and the image model can produce appealing name-specific designs. A correct prompt and convincing metal appearance do not establish correct jewelry geometry or spelling.

- **Arabic marks are unreliable.** Multiple إيمان trials put hamza above the initial alif, making أيمان. Other outputs omit or change dot counts; V2-03 has three lower diamonds where the requested ya has two. V2-39 loses the nun dot. These are identity errors, not permitted stylistic freedom.
- **Disconnected components occur in both scripts.** Arabic dots and entire letter groups float in several outputs; Christopher's i dot floats in V2-17; Ava's final a is separated from Av in V2-41. General instructions to support every component did not consistently prevent this.
- **Hardware can look convincing without being attached.** V2-15 and V2-26 show detached end assemblies; V2-38 lacks readable body-eyelet/connector relationships. A generic hardware specimen did not consistently bind the hardware to the newly invented body.
- **Some results do pass.** V2-05 Lily and V2-43 Noor are useful selected evidence of visibly supported lettering with plausible attachments. Passing individual images does not demonstrate repeatability for unseen names.
- **Ambiguity remains meaningful.** Some Noor arrangements blur the boundary between the final ra and an upward attachment stem. Tiny apparent contacts cannot establish a finite support joint. These remain uncertain under the frozen rubric; a professional script/engineering review has not been claimed.

These observations do not prove why the model failed. A new hamza might reflect the style specimen, generic prompt language or the model's prior. The experiment tests complete input methods; it does not isolate those causal explanations.

## Recommended next revision — untested, not executed

Keep the deterministic template/compiler, immutable configuration and offline comparison pipeline. Change the generation instructions only in a new version with a new denominator.

1. **Derive an explicit feature inventory from each name.** Describe applicable identifying marks and their locations, for example the hamza below the initial alif in إيمان and the two dots below ya. Keep Arabic words naturally shaped and whole; do not split them into unconnected characters. A checked script-aware mapping must handle contextual forms and meaningful marks, rather than an LLM rewriting customer identity.
2. **Derive the required support relationships.** Every separate dot and letter group needs a named, visible connection to its supporting stroke/group. Preserve linguistic breaks. This can constrain connectivity while still allowing the model to choose proportions, curves and layout. The mapping itself needs visual/script review; it is not automatically safe because it is deterministic.
3. **Make attachment integration part of the body recipe.** Define where both closed body eyelets grow from the pendant, then how the separate connectors pass through them and the chain. A floating sample tab or a connector hooked over an open letter terminal must remain a failure.
4. **Use only applicable vocabulary.** Test removing irrelevant mark names and redundant requirements, while preserving exact identity and physical relationships. Test whether a smaller lettering specimen reduces copying of unrelated glyph features. These are hypotheses; more words or references are not inherently better.
5. **Make adapter behavior observable.** Submission echoes match normalized prompt prefixes, but long echoes stop at3500characters and completion echoes at60. This does not prove actual input truncation. Keep a future candidate within an observable echo length where practical and verify full payload forwarding in the eventual production adapter before qualification. Do not call that cutoff an optimal image-prompt length.
6. **Retest first-design correctness before buying extra views.** Start with the fixed failed cases and untouched holdouts in a separately authorized, bounded comparison. Do not roll revised outputs into this campaign's denominator. Do not transfer the unused conditional-view allowance into new wording tests automatically.

If repeated bounded revisions still cannot satisfy visible connectivity and exact script identity, the product decision is whether to constrain design geometry more strongly or present images as creative concepts requiring approval. A universal no-judge workflow cannot be made reliable merely by declaring a master prompt finished. No production workflow changes are made here.
