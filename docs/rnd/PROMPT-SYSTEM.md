# Reusable jewelry prompt system

Implementation release: jewelo-prompt-lab-1.0.0, 6 September 2026. This document describes an isolated Runway R&D package, not a change to the production image workflow.

The implementation lives on isolated branch `codex/prompt-system-rnd` so ongoing customer UI work is preserved. The previous specification is retained in [the dated archive](archive/PROMPT-SYSTEM-before-prompt-lab-2026-09-06.md).


Measured screening: **30/48 overall passes, 14 rejects, 4 uncertain**; observed debit **960 credits**. Complete assembly was the strongest candidate (14/16), followed by body-only (10/16) and text-only (6/16). **Not qualified.** Paid work is paused before the broader stages at the unresolved 50-submission/reference-preparation gate.

## Current authority

The executable master template and construction/view sections are in [compiler.mjs](../../.claude/worktrees/prompt-system-rnd/scripts/prompt-lab/compiler.mjs). Exact compiled submissions, immutable references and results are in the [experiment gallery](../../.claude/worktrees/prompt-system-rnd/reviews/2026-09-06-prompt-system/review.html). The [plain prompt package](../../.claude/worktrees/prompt-system-rnd/reviews/2026-09-06-prompt-system/prompt-package.json) defines every variable and section. Read the [qualification report](../../.claude/worktrees/prompt-system-rnd/reviews/2026-09-06-prompt-system/report.md) for current measured status.

[Official-source research](GPT-IMAGE-2-RESEARCH.md) remains the research record. Earlier v0.1/v0.2 pilot evidence remains in the parent checkout's reviews/2026-09-06-prompt-pilot; it is not silently promoted or relabelled. Archive and selected evidence in the parent checkout are preserved.

## Compile one coherent specification

Freeze the selected configuration once. Resolve {{variables}} in ordinary code. Send exactly one complete prompt per requested view, without a model rewriting it. Four views are four independent image generations sharing the same approved piece specification.

Sections: Identity → Construction/attachments/reference roles → Customer selections → Photography → Applicable invariants.

Names preserve NFC-normalized spelling, script direction, dots/hamzas, counters and meaningful spacing. No transliteration, moved marks or invented linguistic joins. Existing deterministic reference code does not prove all script/style combinations correct.

Each construction gets its own recipe:
- Classical: lettering body and approved structural bridges.
- Framed minimal: open frame, explicit lettering supports and two frame eyelets.
- Diamond rails: parallel support rails, explicit contacts, separate stone map when selected.
- Origami ribbon: initial experiment is **shallow folded lettering itself**, not a folded carrier and not every possible origami interpretation.

English Diwani, Kufi and Thuluth labels resolve to the approved Latin visual adaptations. Specimen geometry for all six English and Arabic lettering choices remains a separate preflight deliverable, not an adjective delegated to the image model.

## Important words and exclusions

An integral eyelet belongs to the rigid body. A separate connecting ring interlocks with that eyelet and the first chain link. They are different components; avoid the ambiguous global rule “exactly two rings.”

“No gaps anywhere” is incorrect. Letter counters, openwork and interlocking apertures remain open. The rule is no unsupported components or broken intended contacts. Check each support separately: whole-body connected-component count missed a small lower-right support gap in the first frame/rail references; it was corrected before generation.

Fold edges describe continuous changes in the metal surface, not cracks. “Floating” describes visual separation only when actual support is specified. Stone selections require a count/location/setting map; generic “gemstone” wording is insufficient.

No stones suppresses gemstone and settings. Two-name layout/secondName disappear when disabled. Diamond rails does not force diamonds when coverage is No stones. Nonempty engraving requires an explicitly approved rear surface in the recipe; it must not be moved to the front. Names are limited to 30 Unicode characters and engraving to 80; these are input bounds, not geometry guarantees. Extra requests must resolve into supported selections before compilation; arbitrary overrides are rejected without a paid call.

Exactly two nominal size choices remain: **22 mm and 32 mm**. Their physical measurement axis/meaning is unresolved. This campaign does not certify actual dimensions and does not restore chain-length options.

## Reference and photography contract

Compare text only, body reference, and full local assembly reference. Body and assembly views come from one underlying geometry package. Each reference has a declared role and a checked file hash. Model-generated photos are never automatically promoted to canonical geometry.

The narrow screening uses the previously inspected Muhammad body, with distinct frame/rail construction changes and a shallow fold heightfield. Removing original eyelets for frame/rail variants changes the attachment-region outline; core lettering stays in place. Geometry is in reference pixels, not manufacturing millimetres. References depict local chain attachment, with chain continuing beyond the image.

Studio is inspectable neutral photography; On skin shows gravity/contact; Close-up retains the full pendant; Dark retains readable edges and attachments. Metal reflections follow coherent lighting; avoid arbitrary scratches, excessive sparkle, unnecessary camera jargon and unrequested props.

## Evaluation and transfer

The [lab runbook](../../.claude/worktrees/prompt-system-rnd/scripts/prompt-lab/README.md) defines budgets, reconciliation, preparation and review. The maximum staged campaign is 2,832 images, with two active tasks and a stop at 50 submissions while the suspected quota/reset remains unverified. Existing credits only.

Final qualification requires a frozen release and 400/400 unseen **complete four-view requests** passing, after development/regression gates. Missing outputs and unresolved visual judgments are failures. This is measured reliability for a declared distribution, never a universal guarantee or manufacturing approval.

No production interface, identity renderer, verification policy, customer UI or direct API provider has changed. Future API integration needs a separately requested validation on the actual production model and settings.
