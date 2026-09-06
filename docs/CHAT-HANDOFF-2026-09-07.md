# CALEUMS handoff — 7 September 2026

Read this first, then `docs/OMRAN-BUSINESS-CONTEXT.md`, `docs/START-HERE.md`, `CLAUDE.md`, and `docs/goals/responsive-customer-experience.md`. This checkpoint preserves work in progress; it does not certify a finished configurator.

## User intent and authority

Sanchay wants a realistic, responsive name-pendant configurator based on Omran's reference, with minimal steps: Design → Review → Bag. Preview stays prominent and sticky; Studio / On skin / Close-up / Dark controls remain visible. Use fixed Asma / أسماء examples (Asma + Fatima / أسماء + فاطمة for two names) while shopping. Customer name personalization should occur after Preview My Piece, via a future backend integration. Every new option must preserve earlier visual selections in the same pendant.

The user rejected the old UI explorations and later rejected procedural Three.js previews for looking fabricated. Do not restore either as an accepted solution. Original images and rejected attempts are retained for lineage; retained files do not equal approved UI or imagery.

Latest explicit request: push all project work and context to remote main for a new chat/model. This supersedes prior local-only/no-main instructions for this checkpoint push. No paid bulk generation or deployment was requested in this checkpoint.

## Current implementation

Entry: `apps/web/src/app/[locale]/design/new/page.tsx`; main UI: `apps/web/src/features/atelier/Atelier.tsx`. Options: English/Arabic, one/two names and five layouts, four constructions, six lettering styles, three gold colors, four stone coverage settings and six gems, 22/32mm, four chain styles; optional engraving/requests. No cm chain-length control.

Draft and bag persist locally; review/mock capture and image snapshots are implemented. Customer selection and sample reference are separated in `previewHandoff.ts`. Real provider generation, confirmed pricing and payment remain inactive. Bag data lives on the user's device, not in Git.

`resolveOptionFamily` in `catalogue.ts` now publishes only exact complete visual matches. Earlier last-click/nearest-example matching was rejected because metal or stone changes swapped Arabic rails/Kufi into unrelated English designs. Missing combinations currently display no matching photo and disable Preview My Piece. This stops false substitution but is NOT the complete shopping experience the user wants; many choices still lead to missing photos.

Last verified catalogue:168 connected photos,57 configurations,37 complete four-view families. Twelve v8 Studio photos cover Arabic/one name/Kufi/Diamond rails/Rolo/32mm × three metals × four stone settings (lab diamond). v9 completes the white/no-stones family's other three views. Other v4/v7 generation batches remain incomplete or unintegrated. Manifests distinguish reviewed and rejected assets. Review quality is visual concept inspection, not measured manufacturing certification.

## Crucial correction: combinations are not image-generation requirements

Current unrestricted form space:2 languages ×6 arrangements (single +5 dual layouts) ×4 constructions ×6 lettering ×3 metals ×19 stone configurations (none +3 coverages ×6 gems) ×2 sizes ×4 chains =131,328 configurations. Multiplying by4 views gives525,312 keys ONLY for the naive implementation of a separate finished image per key.

The assistant incorrectly presented that as a necessary generation count and a roughly1.1TB storage requirement. The user challenged it. The assistant explicitly corrected that claim: state count is not minimum image count or monetary cost. No price was established. Lab/natural diamonds may share illustrative appearance; some views may share size assets; reusable compositing/rendering could reduce asset count if realism and continuity are proven. Do not invent compatibility restrictions, relabel wrong photos as matches, restore the rejected renderer, or start bulk spending to satisfy the arithmetic.

The offline `catalogueInventory.ts` and `scripts/atelier/catalogue-inventory.mjs` enumerate the naive full catalogue for audit only. Stable IDs, checksums, structural-master/material/camera dependencies and review gates exist. This is NOT a generation worker, resumable execution service, or settled architecture decision. Full NDJSON was tested under /tmp; it is regenerable and not committed. Summary/proof is under docs/proof/responsive-atelier/option-catalogue. Two exported files are rollback-safe for handled failures, not crash-atomic as a pair.

## Verification and remaining work

Prior local validation:30 unit tests;10 cumulative browser regressions;25 shopping/retry/accessibility browser checks;165 image decodes;typecheck/lint passed. Latest addition:5 inventory unit tests,4 export failure/collision tests,5 four-view tests at320/390/768/1024/1440;typecheck passed; independent reviewer accepted three v9 camera images. Rerun current checks rather than treating historical reports as current results.

Commands:
- `pnpm --filter @jewelo/web typecheck`
- `pnpm --filter @jewelo/web lint`
- `pnpm --filter @jewelo/web test:atelier`
- `pnpm --filter @jewelo/web test:atelier:e2e` (local app on3001)
- `node --test scripts/atelier/inventory-export.test.mjs`
- `node scripts/atelier/catalogue-inventory.mjs` (offline summary, no provider calls)

The local dev server previously needed mock provider mode and an external temporary environment-normalization preload; that /tmp helper is not portable or part of this checkpoint. Follow existing project environment setup and never commit secrets. Next's generated .next cache once returned ENOSPC/500; clearing only that cache and restarting resolved it.

Next engineering task: choose and validate an efficient realistic cumulative preview architecture, with a small visual proof before scaling. The user has NOT selected bulk generation over native incremental work, approved a bulk spend limit, or accepted full coverage as complete. Preserve latest local UI and user choices. The last observed live selection was Arabic/rails/Thuluth/yellow/partial pavé/ruby/32mm/Cable and had no exact photo; browser state may have changed since.

## Included and excluded checkpoint material

Includes current project sources, intentional old-UI deletions, generated image versions/lineage, proof and review archives, tests, scripts, config references and documentation. Historical renderer/proof files are context, not accepted production behavior. Excludes credentials, env files, node_modules, build caches, nested agent worktrees and redundant machine-local tool skill aliases. Those remain local and are not deleted.

Checkpoint verification on7September: current typecheck, lint and all35 atelier unit tests passed;4 export-safety tests passed. Browser results above are from prior local runs, not rerun for the checkpoint. Git whitespace checking reports vendor font-license whitespace and one archived Markdown hard-break line; these source/archive texts were preserved. Pattern scanning removed18 signed asset JWT occurrences from two archived manifests; a repeat scan found no matching credential/signed-token patterns. This is a best-effort scan, not a security certification. Origin was verified as the public Sanchay-T/jewelo repository and matched the branch base before push. Machine-local duplicate skill aliases and nested worktrees were left untracked.
