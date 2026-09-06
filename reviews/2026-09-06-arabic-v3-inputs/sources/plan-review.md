# v3 Arabic preflight plan review

Recommendation: proceed with the bounded local implementation, with the constraints below. This clears a diagnostic package and request validation, not a better model success rate or production release. Preserve all frozen v1/v2 files and make no paid calls.

## Must address: linguistic identity is not a pixel component count

Unicode joining properties and HarfBuzz output cannot by themselves supply an exact Arabic dot inventory or a physical assembly plan. Identifying dots are often part of an encoded letter, not separate combining marks; glyph clusters, linguistic joining groups and disconnected raster components are different things. Implement a small, versioned, explicitly supported Arabic character/profile table for mark identity and ownership. Use Unicode joining data for the natural joining rules and pinned HarfBuzz for visual shaping. Do not infer dot counts from glyph count, Unicode general category, or connected-component count. Reject unrecognized characters/profile combinations rather than guessing.

Preserve the original input separately and normalize identity with NFC only. Do not remove marks, convert hamza forms, apply NFKC, or quietly accept presentation-form characters. Define handling of spaces, tatweel, join controls, bidi controls, mixed scripts and optional vowel marks explicitly; rejecting them in this narrow R&D compiler is acceptable. Record Unicode-data version, font hash, HarfBuzz version, direction/script/language and shaping flags. A missing-glyph check is necessary but does not prove correct readback.

Useful fixture expectations for the current names:

| Name | Natural joining groups | Identifying mark obligations |
|---|---|---|
| ليان | ليا / ن | Two yeh dots below; one noon dot above; no hamza |
| نور | نو / ر | One noon dot above; no hamza |
| إيمان | إ / يما / ن | Hamza below initial alef; two yeh dots below; one noon dot above |

These are semantic obligations for this declared Arabic profile. The number of physical pieces depends on the eventual composition. A mark count alone cannot validate position, ownership or spelling.

## Preserve the creative objective

Use one customer-name spelling strip as the first reference. It should contain the exact naturally shaped target, without specimen names, captions or hardware. Its role is exact text, contextual letter identity, mark ownership and above/below relationships. State explicitly that its font silhouette and spacing are not an approved pendant outline. This still introduces a font bias; describe that as a design hypothesis, not a guarantee that reference influence is perfectly isolated.

Express construction as a graph of required relationships, not an exact outline: each separated linguistic group must be visibly supported; each detached identifying mark must have a distinguishable nonlinguistic support to its owning group; each of the two body eyelets must join a visible body stroke/support and receive its own closed connector. Allow the model to choose composition, proportions and bridge routing within those obligations. A dot must not become an attachment eyelet or move merely to reach a chain. A ra must not become a noon-like bowl to accommodate an attachment.

Keep the no-name hardware specimen as a separate, narrowly scoped reference if used. An optional support illustration should be a generic mark-to-stroke junction, with no customer-name outline, surrounding carrier or full backing. Do not construct and feed a fully connected customer-specific silhouette under the label spelling aid: that would silently return to reconstruction. Do not make a generic dot specimen prescriptive for every mark or attach each piece directly to every other piece. No strength or millimeter claims follow from these diagrams.

The short prompt must retain the obligations that matter: exact native spelling, target-specific marks/absence of hamza, linguistic breaks, visible finite-width supports, exactly two integral eyelets plus separate connectors, chosen material/stones/chain, inspectable Studio view, and creative freedom. Removing irrelevant capitalization and nominal-size boilerplate is sensible. Prompt shortening by itself is not evidence of improvement.

## What the completed screen establishes

The saved report records Arabic 1/24 pass, 19 reject and 4 uncertain, versus English 16/24 pass. The Arabic names are only ليان, نور and إيمان, each represented eight times across four arms; each name/method cell has only two attempts. The reference-rich arm performed poorly in this screen, but it changed several inputs together and does not identify a unique failure cause. Report gate counts as nonexclusive, exact observed output defects as observations, and reference interference, instruction competition, positional mark confusion or shaping weakness as hypotheses.

Do not interpret the abbreviated Runway tool echo as evidence of downstream prompt truncation. Keep uncertainty separate from definite failure, while both prevent advancement. The reviewer is an assistant visual reviewer, not an Arabic calligraphy authority; borderline ra shapes and bridge contacts need independent script-aware adjudication. No silently upgraded uncertain cases.

This sample does not establish general Arabic or English reliability, a 99% rate, superiority across arbitrary names, all six lettering choices, other constructions, two-name compositions, stone options or other views. The three zero-credit examples can prove only that the new compiler produces the intended local instructions/references and preserves identity metadata. They cannot prove that Runway follows them.

## Minimal implementation and proof packet

1. Derive a non-mutating diagnostic aggregate from existing case/audit records, retaining name/method denominators and nonexclusive gate failures. Include links to representative immutable failures and clearly labeled hypotheses.
2. Implement the limited character/profile table, joining-group computation and native shaped spelling strip. Keep semantic identity and optional construction relationships in separate data structures.
3. Assemble one immutable request artifact containing exact prompt bytes/hash, normalized config and raw input, ordered reference roles/hashes, and compiler/template/font/shaping lineage. Validate actual on-disk bytes at orchestration time; a descriptor hash alone is not verification. Fail on duplicated/missing/out-of-order roles or a stale preflight hash.
4. Test canonical-equivalent input, إ versus أ, mark ownership/count, the three natural-break fixtures, transparent marks if supported, unsupported controls/characters, missing glyphs, mismatched reference bytes, role order and prompt/config mismatch. No mock acceptance result should stand in for model behavior.
5. Render the three name strips and any generic support/hardware example for visual preflight. Save complete zero-credit example requests and a before/after explanation. Label them locally tested candidates; leave all provider execution and production integration deferred.

No new approval is needed for these already-authorized reversible local changes. Further paid testing, if later requested, should change one substantive hypothesis at a time and retain all first attempts; this review does not open an additional paid campaign.
