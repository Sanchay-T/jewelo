# Start here — jewelry prompt research handoff

Updated 7 September 2026. Repository: Sanchay-T/jewelo. Branch: `codex/prompt-system-rnd`. This branch packages the complete available R&D history; it does not change production or the separate customer UI branch.

## What the user is trying to achieve

A customer chooses their name, lettering/construction style and supported jewelry options. Ordinary code fills one master prompt and supplies appropriate reference images to GPT Image 2. The model creates an original, attractive name pendant with correct Arabic spelling and physically plausible supports/chain attachments. Arabic is the priority. The intended eventual customer path avoids an automatically added paid visual judge or repeated paid correction loop.

A pre-existing photograph or exact finished silhouette for every unseen name is not available. Do not silently turn the creative task into copying a fully prescribed pendant. Fonts can supply correct written identity; code can specify exact marks and required support relationships while the model chooses composition. This approach remains experimental.

## Current state and authoritative evidence

| Package | Outcome | Location |
|---|---|---|
| Historical experiments and recovered comparison | Preserved context, not current qualification | `reviews/archive/2026-09-06/` |
| Early pilot | Earlier small pilot, retained independently | `reviews/2026-09-06-prompt-pilot/` |
| v1 reconstruction screen | 48 images; 30 pass,14 reject,4 uncertain. Complete assembly14/16 on one Muhammad design.960 credits. Does not establish unseen-name creativity. | `reviews/2026-09-06-prompt-system/report.md` |
| v2 creative-name screen | 48 images;17 pass,24 reject,7 uncertain. Arabic1/24 complete pass; English16/24.960 credits. No method met12/12 advancement gate; no continuation views generated. | `reviews/2026-09-06-creative-name-v2/report.md` |
| v3 Arabic input revision | Local code/reference candidate only.14 tests pass;4 references visually reviewed;6 request candidates.0 model calls/credits. | `reviews/2026-09-06-arabic-v3-inputs/README.md` |

The two48-image campaigns cost1920 credits combined, excluding earlier historical/pilot work. Last observed Runway balance after v2 was306882; this is historical, not a current account query.

**No99%/100% reliability, professional Arabic calligraphy certification, manufacturing approval or production readiness has been established.** A single Noor v2 image passed; never say no Arabic passed. Read the per-image failures rather than treating attractive images as correct.

## What the latest investigation found

- Arabic identity passed6/24, construction6/24, attachments15/24; selections and photography24/24. Gates overlap.
- The supplied إيمان spelling reference is correct, including below-alif hamza. The frozen batch used the intended name/reference bindings. Missing font support or mismatched references are not established causes of those outputs.
- V2 used generic mark/support prose, without exact name-specific dot/hamza obligations or natural joining groups. The hardware specimen did not explain its attachment to the customer's actual lettering.
- A latent v2 compiler defect accepted another customer's spelling descriptor. V3 explicitly binds name/script/font/identity and actual file bytes.
- Existing production `packages/identity/src/caleums-arabic-v3.ts` moves raster components to fuse them. Its `exactCharactersPreserved:true` flag is not independent visual proof. V2 did not use that solver, so it did not cause those results. Production code was not changed.
- Runway tool echoes abbreviate long prompts. Visible echoes match normalized saved prefixes; that is not evidence that the downstream model input was truncated. Full internal provider request/preprocessing remains unobserved.

## Implemented v3 changes

` scripts/prompt-lab/v3/ ` contains the name-specific identity/mark/join compiler, explicit support relations, target-only spelling references rendered by pinned HarfBuzz/Noto Naskh, optional generic construction specimen, and exact final Runway request assembler with config/prompt/reference/upload binding checks. No model rewrites the prompt.

For إيمان: hamza below initial alif, two ya dots below, one nun dot above; natural groups إ / يما / ن. Metal supports connect groups without changing linguistic identity. Creative proportions, curves and support routing remain open.

Scope is intentionally limited: one-word Standard Arabic Naskh, Classical/Classic, white gold, no stones, Cable, nominal32, Studio. Only ليان, نور, إيمان have reviewed example reference assets. Standalone hamza ء (including أسماء), spaces, vowel marks, controls, Persian/Urdu extensions and other form combinations are unsupported in this prototype. Do not silently drop these future product requirements or claim universal coverage.

## Exact pending next action

The assistant asked: “May I run those12 tests, capped at492 existing Runway credits? At the previous observed rate, they would use about240 credits.” The user has **not answered yes**; their next instruction was to compile/push the repository for another chat.

`reviews/2026-09-06-arabic-v3-inputs/proposed-test.json` prepares three Arabic names × two methods (name-only vs name+construction) × two attempts, randomized, max2 active. The old unused12 calls were conditional continuation views; they are not automatically repurposed. Do not execute paid calls based on this handoff alone. Once authorized, refresh Runway workspace/balance, freeze input hashes/rubric and use a fresh ledger; preserve all first attempts and costs. The comparison isolates the incremental construction-reference package, not every simultaneous change from v2. New-name holdouts and broader choices remain necessary afterward.

Runway MCP `gpt-image-2` only for this R&D. No purchases/topups, direct API experiments, native ImageGen substitutions or paid judge. Direct production integration requires a separate request and validation on the actual adapter/model/settings.

## Read in this order

1. This handoff.
2. `reviews/2026-09-06-arabic-v3-inputs/README.md` and `sources/final-review.md`.
3. `scripts/prompt-lab/v3/identity.mjs`, `compiler.mjs`, `compiler.test.mjs`.
4. `docs/rnd/creative-name-research/OPENAI-NOTEBOOK-DIGEST.md` and `REVISIT.md`.
5. v2 report/gallery and exact per-image prompts/audits as needed.

Source research: `GPT-IMAGE-2-RESEARCH.md`, `creative-name-research/SOURCE-NOTES.json`, full notebook extraction and the original supplied `image-gen-models-prompting-guide.ipynb` (read, never executed). Historical specs `PROMPT-SYSTEM.md` and `PROMPT-SYSTEM-V2.md` describe their own stages; do not mistake either for current production approval.

## Reproduce and browse

From the repository root:

```sh
node --test scripts/prompt-lab/v3/compiler.test.mjs
node --test scripts/prompt-lab/v2/*.test.mjs
python3 -m http.server 8783 --bind 127.0.0.1 --directory reviews
```

Then open:
- `http://127.0.0.1:8783/2026-09-06-arabic-v3-inputs/input-review.html`
- `http://127.0.0.1:8783/2026-09-06-creative-name-v2/review.html`
- `http://127.0.0.1:8783/2026-09-06-prompt-system/review.html`
- `http://127.0.0.1:8783/archive/2026-09-06/recovered/drop-compare/index.html`

Gallery prompts are above images; originals, detail crops, failures, task IDs and hashes are retained. Binary files are ordinary Git assets: a normal clone obtains them, no external signed links required. Historical manifests may record original absolute Mac paths; these are provenance, not portable commands. Resolve files from the repository-relative locations. Do not rerun old preparation/render scripts over frozen evidence.

Reference regeneration needs existing HarfBuzz CLI and Python Pillow/NumPy/SciPy; compiler tests use Node built-ins. Existing assets suffice for review without installing rendering tools.

## Publication and preservation

The repo is public. Two copied historical manifests had18 signed provider URLs removed for publication. Original parent archives remain untouched; this redaction means old archive-level hashes for those two copied manifests no longer apply. New publication inventory hashes the sanitized copies. The v1/v2/v3 experiment evidence is preserved unchanged. No private WhatsApp intake/transcripts, credentials, cookies or assistant session data is included.

Parent checkout `/Users/sanchay/hq/projects/personal/devonel.com/jewelo` contains unrelated customer UI work on `codex/responsive-customer-experience`. R&D worktree: `.claude/worktrees/prompt-system-rnd`. Preserve parent changes; no merge/deploy/production modification is part of this handoff.
