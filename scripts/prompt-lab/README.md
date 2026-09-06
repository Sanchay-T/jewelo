# Jewelry prompt laboratory

R&D only. No module in this folder is imported by the customer app, jobs, production identity renderer, or OpenAI adapter. Node 24 uses only built-ins. Deterministic reference rendering uses the existing local Python runtime with Pillow, NumPy and SciPy.

## Reproduce local checks

    node --test scripts/prompt-lab/lab.test.mjs
    node scripts/prompt-lab/gallery.mjs

Run commands from this worktree root. Generated artifacts are in reviews/2026-09-06-prompt-system/.

references.py creates the four narrow Muhammad candidates. Do not rerun it over frozen references after submissions. Preserve the current release and create a new campaign directory for changes.

prepare.mjs requires hash-matched visual preflight records. It writes 48 immutable compiled cases in seeded randomized order and refuses to overwrite an existing campaign. Geometry references are explicit, deterministic appearance hypotheses, not a certified manufacturing system.

## Provider boundary

Only the authorized Runway MCP tool makes generation calls. There is no direct API credential reader, hidden paid judge, alternate model or account top-up code here. A Codex tool runner:
1. Verifies the workspace with Runway whoami.
2. Uploads each new inspected local reference once and retains asset URLs in runtime memory only.
3. Reserves one case with journal.mjs reserve before the paid call.
4. Calls Runway generate_image with the exact saved prompt, model gpt-image-2, count 1, ratio and matching tagged reference.
5. Records the task ID using submitted; an uncertain response blocks all further submissions until reconciled.
6. Polls existing tasks, saves original image bytes locally, then records finish with file hash.
7. Reconciles credit balance after every 20 submissions and at the end.

Max two active reservations/tasks. Stage caps and the unverified 50-submission boundary include failed attempts. A reservation is never silently deleted after a timeout. This runner is a laboratory protocol, not a production workflow replacement.

The conservative per-image reservation is 41 credits, not a price claim. Actual workspace balance observations are recorded separately. Shared workspace usage can affect deltas. No asset URLs or signed upload instructions belong in the saved public review.

## Frozen interface

compile(config, {view, method, recipe, references}) returns immutable normalized selections, prompt, variable snapshot, model/ratio, template/config/recipe/prompt hashes and local reference descriptors. It rejects unknown fields, unresolved extra requests, script mismatches, invalid size choices, unspecified engraving surfaces, absent stone maps, unapproved recipes, changed reference hashes and malformed placeholders.

Inactive second-name/layout/gem values are removed. English calligraphy-labelled styles use the declared Latin visual adaptations. Existing 40/45/50/55 length fields are not accepted in this R&D interface. Size remains the nominal 22/32 mm selection, with no physical measurement-axis claim.

developmentMatrix() builds 128 configurations covering all feasible pairs observed in its deterministic 16,000-case candidate pool and the 16 explicit difficult-case requirements. This is not exhaustive testing of the Cartesian product. The reference preflight status of every development case starts as not_prepared; option coverage does not mean geometry support.

holdout(seed, frozenProtocol) creates 400 IID requests from a disjoint fixed name pool only after the release/rubric are frozen. Never inspect/use that generated set to tune the candidate. A revised candidate needs a separately documented future qualification campaign; do not fish for a passing streak.

## Review and stopping

Use blind-review.html first for semantic correctness; use review.html to inspect prompts and methods after verdicts. Save per-gate verdicts and concrete observations in audit.json. Report exact reference-contour preservation separately for reference methods. Uncertainty counts against qualification.

One image is the screening unit. One four-view request is the development/qualification unit. Do not substitute an individual-image success rate for complete-request success.

Stop before broad development if deterministic references for selected lettering, two-name geometry, setting or chain cannot pass preflight. Do not send a contradictory reference and ask the model to fix it. Report incomplete coverage and specific missing packages. Do not open final qualification unless the frozen candidate reaches >=99% full-request development success and all 16 regression requests pass.

## Qualification evidence entry point

    node scripts/prompt-lab/qualification.mjs CAMPAIGN_ROOT qualification-protocol.json

This command currently reports not ready because the later campaign has not run. It reads a sealed protocol (release object/hash, seal time, rubric path/hash, ledger path, study path/hash). The release binds the study and rubric hashes. The study contains 256 development, 16 regression and 400 qualification request descriptors. Each request declares its configuration hash and four outputs: view, trialId, compiledPath, compiledFileHash, promptPath, recipePath and auditPath. Every trial resolves to exactly one first-attempt ledger record.

The verifier reads actual original files and bound audits; it checks prompt/recipe/reference hashes, provider/model, request membership, distinct images/tasks, four-view agreement, release freeze time and Arabic reading/spelling review. It derives prerequisite counts from those complete requests. Counts alone cannot qualify the package. The separately exported qualificationCriteria function is a mathematical unit-test helper, not the evidence-based reporting entry point.

The current journal executes the screening manifest. Preparing sealed full-view manifests and running the later stages remain gated work; the 128-case matrix is not an executable promise that its missing geometry packages exist.
