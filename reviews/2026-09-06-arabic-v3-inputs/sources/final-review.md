# V3 fresh implementation and reference review

Status after re-review: **all three identified blockers resolved; cleared as a local diagnostic input candidate for the three reviewed names**. This does not approve production use or claim corrected model outputs. Read-only repository review; no provider calls. Reviewed identity.mjs, compiler.mjs, references.py, build.mjs, arabic-profile.json, the reference manifest, and all four generated PNGs. Reproductions below used only local reads and in-memory compiler calls. Original findings are retained below as review history.

## Fix verification and exact reviewed assets

- `analyzeArabic` now rejects any standalone `ء` with `standalone_hamza_requires_support_recipe`. Tests cover سماء, أسماء, and ء. The Unicode data table still contains that character, but the implemented supported scope is narrower and no contradictory packet is emitted.
- Reference IDs are now required nonempty strings with a bounded permitted syntax; duplicate IDs are rejected before upload binding. The missing-ID loophole is closed.
- The revised construction image replaces the noon-like bowl with a generic diamond fragment joined by a short horizontal neck to a rounded rectangular patch. The connection is visible, finite-width, and distinguishable from the two shapes; it does not form a recognizable Arabic letter or cross a counter. The right-hand eyelet and interlocking connector/chain remain readable. Cleared for its declared local relationship role, with the existing instruction not to copy its patch or mark layout. It illustrates one possible support relation, not the correct position of a particular customer's marks.
- Independently ran `node --test scripts/prompt-lab/v3/compiler.test.mjs`: **14 passed, 0 failed**.
- Exact bytes were rehashed; all four SHA-256 values match the current manifest. The three spelling PNGs are unchanged from their visual inspection. The construction PNG was visually re-inspected after replacement.

| Asset | SHA-256 | Visual preflight |
| --- | --- | --- |
| references/name-6302368ffc7c286c.png (ليان) | `c31b8404d86e1456b7f9653fb367f3823ad81ccd420638e4274d1106e8dfc52f` | pass for spelling specimen |
| references/name-be2b16e67745f135.png (نور) | `1e7aaeaa2af5da43f68c8503368d80bade915415fc8fe8b9e15ce92455904b49` | pass for spelling specimen |
| references/name-060992e33d3a2021.png (إيمان) | `51ceee01782db9ca0b48cacf8cc7113fb6088223340dd7e11b2e0cc910c71465` | pass for spelling specimen |
| references/construction.png | `f727b01db50093adb3171590422c1a20185697a88816de8413210f4f2b8344a6` | pass for generic relationship specimen |

Local preflight declarations remain trusted operator data rather than signed approvals; the parent has explicitly documented that boundary. No further blocking finding arose in this bounded re-review.

## Original blocking findings (resolved above)

1. **The accepted standalone hamza is missing from the identity inventory and can become an eyelet root.** `analyzeArabic('سماء')` accepts the name but produces no marks; `describeIdentity` says “no identifying dots or hamzas.” The graph places the left eyelet on the final standalone `ء` group, while the prose prohibits attachment to a detached identifying mark. `ء` alone is accepted with the same contradiction and two eyelets rooted on it. Either explicitly exclude standalone-hamza input from this diagnostic scope, or distinguish standalone base letters from attached identifying signs, describe their presence correctly, and define a separate supported eyelet-root policy. Do not treat standalone hamza as merely an above/below accent. Add these exact regression cases.

2. **The construction illustration undermines the intended separation between support and lettering.** Its left half is a recognizable noon-like bowl and diamond with a long central upright (approximately x243–258, y530–715). The added stem reads as part of an altered letter, and spans much of the bowl's open area. This is the same class of error the prompts are meant to prevent. The “no customer letters” declaration is insufficient to neutralize the visual cue. Replace this with a generic short body fragment and short distinct local bridge whose arrangement does not form a recognizable Arabic letter or cross a counter. Keep the complete name silhouette out of this illustration. The right eyelet, connector, and alternating chain links are visually readable as separate interlocking parts; no visual correction requested for that half.

3. **Upload identity binding accepts missing IDs.** `referenceCheck` does not require `ref.id`; `assembleRunwayRequest` accepts an upload without `id` when its descriptor also lacks it. This was reproduced with the existing name reference: compilation and assembly succeeded with both IDs deleted, correct existing bytes/hash, and a dummy HTTPS URL without performing network calls. Require nonempty IDs and unique IDs across reference roles; test missing, empty, duplicate, and reordered bindings. Exact reference bytes, role order, and final prompt remain independently checked.

## Reference observations

- `name-6302368ffc7c286c.png`: reads ليان, with two yeh dots below and one noon dot above; natural ليا / ن separation is preserved.
- `name-be2b16e67745f135.png`: reads نور, with the noon dot above, waw counter preserved, and natural نو / ر separation.
- `name-060992e33d3a2021.png`: reads إيمان, with hamza below initial alef, two yeh dots below, noon dot above, and natural إ / يما / ن separation.
- These are suitable spelling specimens for the three demonstrated names. They are not proofs of manufacturing continuity, universal Arabic coverage, or successful model interpretation. The locally pinned renderer preserves their natural positioning without bridge edits.

## Boundaries and nonblocking observations

The compiler correctly separates linguistic joining groups, identifying features, and required construction relationships. It leaves proportions and support routing creative while fixing written identity. Supported options are bounded explicitly; input normalization is NFC and unexpected characters/options fail. Disk verification resolves real paths within the package, checks reference bytes, rebuilds the prompt/config/identity, and assembly preserves the exact prompt string and ordered reference tags. Pending visual review prevents request assembly.

The explicit feature table is a Naskh convention table, not a Unicode-derived physical-component count. The three previews validate only their three names. Other accepted characters and contexts need fixture coverage before claiming the whole 36-character profile is reviewed. HarfBuzz glyph availability does not prove that a mark is readable or that a physical support can be added without changing its interpretation.

`verifyPacket` validates consistency against the running compiler and on-disk reference bytes. It does not authenticate its own embedded preflight declarations against a separate trusted approval registry. Keep that trust boundary explicit; do not describe it as protection against an actor coherently rewriting the packet and its approval metadata. `build.mjs` also reuses an existing manifest; regeneration after renderer changes must be deliberate and must refresh renderer provenance and visual review.

No claim that shorter prompts, first-reference placement, or target-only references cure the observed Arabic failures is supported yet. These remain reasonable causal hypotheses to test later. V2's six-name screen supports observed failure counts for that experiment, not a universal error rate or a causal attribution to a particular reference mechanism.

Clearance after fixes: the target-name reference approach and relational prompt structure fit the creative objective. Preserve candidate/nonproduction status and zero paid calls in this turn. The revised construction PNG's required visual recheck is complete, with its approved bytes identified above.
