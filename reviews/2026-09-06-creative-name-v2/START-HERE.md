# Creative name pendant prompt package — v2

Start with [the comparison gallery](review.html) and [the qualification-status report](report.md). This is a research candidate, not a production release. The gallery preserves all first attempts, shows prompts above images, and provides blind-review controls and detail crops.

## Package map

- [Consolidated specification](../../docs/rnd/PROMPT-SYSTEM-V2.md) and [research rationale](../../docs/rnd/creative-name-research/REVISIT.md).
- [New-design master template](master-template.txt), [view template](view-template.txt), [construction recipes](recipes.json).
- [Reference manifest](references/manifest.json): role, source/font hash, HarfBuzz version, glyph shaping and reviewed asset hash.
- [Frozen cases](cases.json), [campaign settings](campaign.json), [review rubric](rubric.json).
- `prompts/`: complete compiled JSON and exact prompt text for each case. Text bytes match the submitted string.
- `outputs/`: original provider image bytes. `crops/` contains lossless inspection crops; `blind/` contains alternate hard links to originals and a method-free review manifest.
- [Ledger](ledger.json): durable reservations, task IDs, output hashes, reviews and observed costs. `audits/` preserves the blinded source decisions.
- [Artifact verification](artifact-verification.json), [provider prompt readback](provider-prompt-verification.json), [image metadata](output-metadata.json), [pre-submission tests](tests-before-submission.txt).
- [Earlier frozen experiment](../2026-09-06-prompt-system/report.md): separate reconstruction evidence; its243 hashed files remain preserved.

## Deterministic assembly

Implementation lives in `scripts/prompt-lab/v2/`. The pure compiler performs no generation or network calls. Customer data is normalized once, copied and frozen; all sections resolve from that same configuration.

```js
const config = {
  name: 'Lily', script: 'English',
  construction: 'Classical', lettering: 'Classic',
  metal: 'White gold', coverage: 'No stones',
  size: 32, chain: 'Cable', twoNames: false, engraving: ''
};
const compiled = compileNewDesign(config, {
  method: 'text', references: []
});
// compiled.prompt is the exact one-image string.
// compiled contains version, config/prompt/recipe/template hashes and reference descriptors.
```

Methods are `text`, `style`, `style_hardware`, `style_hardware_spelling`. Their ordered reference roles are none; lettering; lettering+hardware; lettering+hardware+spelling. A descriptor contains `id`, `role`, matching `tag`, `path`, `sha256` and hash-bound visual preflight. The preparation layer verifies actual bytes before submission. Uploaded asset URLs remain in runtime; no authorization URLs or credentials are saved here.

| Template section | Source and invariant |
|---|---|
| identity | Exact NFC name, script and reading direction; preserve case, marks and meaningful spaces. |
| style | Script-specific pinned Classic lettering traits. |
| references | Explicit role for each supplied image; specimen names are not customer identity. |
| creative | Name-specific composition is permitted within the construction and identity rules. |
| construction/support/attachments | Versioned selected recipe and permitted discreet bridges. |
| selections | Active metal, stone coverage, chain and nominal size; inactive values are omitted. |
| photography | Independent selected view recipe. |
| invariants | Visible lettering openings, supports, hardware apertures, material/light coherence and no unrequested content. |

This v2 paid compiler deliberately accepts only the screened Classical/Classic/White-gold/No-stones/Cable32/single-name/no-engraving scope. Existing22 and32 choices are retained in the shared option definitions;22 and other selections remain untested here. Other construction recipes are marked draft, not silently accepted as qualified.

`compileView(config, {view, anchor})` requires the original Studio anchor's case ID, output hash, local path, matching configuration hash, original-design kind and reviewed status. It permits On skin, Close-up and Dark, each directly linked to the same original Studio image. A derived view cannot become the next view's identity authority. Paid continuity is gated independently by the ledger; a pure compile does not authorize a submission.

## Reproducibility and spending

The48 trials were frozen and randomly interleaved before the first submission. Max2 active,41-credit conservative reservation per call,60 NEW calls/2460-credit authorization ceiling, balance checks every20 and at stage end. An ambiguous task or confirmed charge above the allowance stops new work. No replacement generations, purchased credits, direct API experiments, built-in ImageGen substitution or paid visual judge.

Exact tool inputs are preserved. Tool prompt echoes are abbreviated/whitespace-normalized displays and cannot independently prove the complete downstream provider payload. Image success is never inferred from a prompt hash. Review original images and the status report before reusing any candidate.
