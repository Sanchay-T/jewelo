# Independent Arabic diagnostic review — 6 September 2026

Read-only review of the isolated prompt-system-rnd worktree. No source changes, provider calls, or paid tests. Old evidence remains unchanged. Findings concern the completed v2 screen and proposed local v3 work; they are not a production approval.

## What the 48 images demonstrate

Recounted the eight saved audit arrays against the blind manifest, independently of report.md:

| Script | Images | Exact identity pass / reject / uncertain | Construction pass / reject / uncertain | All seven gates pass |
|---|---:|---:|---:|---:|
| Arabic | 24 | 6 / 15 / 3 | 6 / 12 / 6 | 1 |
| English | 24 | 24 / 0 / 0 | 20 / 3 / 1 | 16 |

Arabic attachment judgments were 15 pass, 6 reject, 3 uncertain. All 24 Arabic images passed selections and photography. Thus attractive rendering is already substantially easier than preserving Arabic identity and visible support. The failures are not solely hardware failures.

Concrete original-image observations include the above-alif hamza in V2-29 (أيمان instead of إيمان), its entirely floating nun dot, V2-40's single lower diamond instead of a two-dot ya, and missing nun dots in V2-39/42. These are distinct semantic and mechanical defects. Gate counts overlap and must not be added as if they were separate failed images. Assessments are blinded assistant judgments, not professional calligraphy certification.

## Verified reference provenance: v2 did not use production fusion

`scripts/prompt-lab/v2/references.py:19–39` calls hb-shape and hb-view using the pinned font, native direction/script/language, and natural glyph advances. It pastes the resulting images onto white cards. It performs no glyph relocation, component fusion, dilation, tracking, or hardware addition to text. The current renderer hash matches the frozen reference manifest, which records HarfBuzz 14.3.0. All nine reference files match their manifest hashes.

I visually inspected all three Arabic spelling cards and the Arabic style card. The spelling cards show ليان, نور, and إيمان with the expected marks; إيمان clearly has its hamza BELOW the initial alif. The style specimen contains مريم, فاطمة, جلال, أمينة, including an above-alif hamza in أمينة. These are correctly shaped text examples, not supported metal pendant specimens. Their natural disconnected marks are valid for the stated spelling/style roles.

`v2/prepare.mjs:35–41` selects the correct customer spelling card by slug and supplies it only to the fourth arm. Consequently, “production fusion corrupted the v2 input” is contradicted by the inspected generation path. Nor is it accurate to claim v2 had no correct Arabic visual identity input: six Arabic outputs received the customer-name spelling reference. The distinction is that none of the inputs demonstrates how to support Arabic marks without changing their semantic placement.

## Production solver cannot establish spelling safety from one component

`packages/identity/src/caleums-arabic-v3.ts:216–269` selects the smallest connected component, finds nearby ink, erases its original pixels, and translates the entire component toward other ink with overlap. This is relocation, not an additive bridge. Dots, hamzas, and entire disconnected letter groups can move; the algorithm has no character ownership, mark-position, join-break, or counter constraints. Dilation and ring drawing then further alter the mask (`164–168`, `323–387`).

The acceptance gate is a single connected component (`168–173`). The returned `exactCharactersPreserved: true` and `passed: true` are unconditional report values (`193–207`), not results of independent visual or semantic validation.

Bounded local reproduction: supplied solveArabicIdentity with a deliberately non-Arabic synthetic mask consisting of a rectangle and an isolated 100-pixel square, while approvedNames contained إيمان. The solver made one fuse move, removed all 100 original square pixels from their locations, achieved componentsFinal=1, and returned exactCharactersPreserved=true/passed=true. No files or providers were involved. This proves the report flag cannot independently certify rendered spelling. It does not establish the exact damage to any specific real production name or explain v2 failures, because v2 bypassed this solver.

Do not reuse that fused silhouette as a spelling-safe v3 reference merely because it is connected. Changing this production solver/report contract would be a separate implementation and regression task; the present local R&D can avoid it entirely.

## A demonstrated reusable-compiler validation gap

`v2/compiler.mjs:69–85` checks role, ID, hash syntax, and preflight status, but does not bind a spelling descriptor's words/script to the requested identity. A local reproduction successfully compiled customer ليان with the genuine approved spelling-ar-iman descriptor, whose words are [إيمان]. This creates contradictory input if a future caller selects the wrong descriptor. The frozen v2 preparer maps the slug correctly, so this is a latent compiler defect rather than an established cause of this campaign.

Small fix: the v3 compiler should require a spelling reference bound to normalized customer text, script, and identity hash; the file-backed request adapter must verify actual bytes and reviewed hashes and preserve explicit image order/roles. A plausible path/hash alone is insufficient. Add mismatch tests for wrong name, wrong script, stale preflight hash, and reordered image roles.

## What remains a hypothesis

The v2 prompt already says to preserve marks, linguistic breaks, continuous bridges, and separate hardware relationships (`compiler.mjs:20–21, 87–107`). The gap is not a complete absence of those instructions. They are generic rather than a validated, name-specific inventory of marks, joins, breaks, and support obligations.

The style card's above-hamza example may prime the wrong hamza for إيمان; multiple specimen names may compete with the customer identity; reference order, extra inputs, prompt length, or role ambiguity may impair compliance. Those are plausible hypotheses, not causal findings. The fourth arm's 1/12 all-gate pass rate is an observed result of the full nested package, not proof that HarfBuzz spelling strips inherently hurt performance. There are only two repetitions per name/method, and the screen is not a full factorial isolation of these factors.

The documented provider echo abbreviation also does not prove downstream prompt truncation. Resolve exact serialized request and image-role visibility locally, then keep the provider visibility limitation explicit.

## Smallest useful local v3 revision

1. Create a separate, immutable identity contract from the customer's normalized text and native shaping output. For the three diagnostic names, explicitly validate: ليان has groups ليا | ن, two ya dots below and one nun dot above; إيمان has groups إ | يما | ن, a hamza below initial alif, two ya dots below and one nun dot above; نور has groups نو | ر, one dot above nun and a readable waw counter. Do not generalize these three fixtures into a universal Arabic parser. Arbitrary-name support needs maintained joining/mark data and tests; raster components alone are not character identities.
2. Keep the native spelling artwork unchanged and hash-bound. Give the model name-specific semantic requirements from that contract. Preserve freedom over proportions, style interpretation, placement of discreet supports, and overall name-specific composition. The text card is identity evidence, not a mandatory finished pendant contour.
3. Add a small relationship specimen showing a supported Arabic dot/hamza and a bridge across a linguistic break, with finite-width connections and recognizable negative space. Keep original letter/mark coordinates in the specimen; add support material separately. Use no customer-specific finished design as the initial template. Maintain clear reference roles and screen for specimen copying. This is a proposed aid, not a proven fix.
4. Treat any additive support renderer as a design candidate, not semantic certification. Checks that original ink remains and no pixels move are useful but insufficient: added bridges can still erase meaningful gaps, merge dots, or occlude counters. Retain original glyph/mark masks and provenance, inspect reference output, and use a competent Arabic readback before declaring broad support.
5. Freeze compact compiler output and the actual ordered request representation with exact prompt/reference hashes. Unit-test identity binding, expected mark ownership/placement, join-break constraints, no component translation, and failure on unsupported inputs. These tests validate local contracts; they cannot establish generative success.
6. After approval for another bounded paid diagnostic, compare the old and revised packages on the same three Arabic names with repeated first attempts, retain all failures, and score identity separately from support and hardware. If testing the relationship image's specific benefit, hold the semantic prompt and remaining inputs fixed across arms. Do not bundle several changes and then attribute improvement to one. Continuity stays closed until a first design passes.

The useful conclusion is that v2 demonstrated semantic and support failures despite correct native Arabic spelling references. A tighter name-specific identity/relationship contract is a justified next experiment. It is not yet a demonstrated fix, and neither a connected raster nor a self-reported preservation flag should replace visual evidence.
