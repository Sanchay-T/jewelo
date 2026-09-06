# Six-image prompt pilot — complete, not promoted

Open [review.html](review.html) for all six outputs, exact submitted prompts above each image, hardware crops and independent audit findings. [pilot.json](pilot.json) stores the reference/prompt hashes, task IDs, model, submission cap and summary. [audit.json](audit.json) stores per-attempt verdicts.

| Condition | Visual passes | Rejected |
| --- | --- | --- |
| v0.1 yellow gold, identical pair | 2 | 0 |
| v0.1 white gold, metal-only change | 1 | 1 |
| v0.2 white gold, hardware-only correction | 0 | 2 |

Six of six authorized images submitted through Runway MCP, explicitly gpt-image-2, ratio 1:1. All outputs saved unchanged at 1920×1920 and inspected by the parent and an independent reviewer. No native ImageGen calls, purchases, extra retries or production integration.

Three visual passes and three rejects. Attempt 3 leaves a chain end detached. Attempts 5–6 add new attachment holes rather than using the intended eyelets. Realistic metal alone is not acceptance. v0.2 is not promoted; no template is a universal release. This is one name/one construction, not a catalog benchmark.

The proposed v0.3 reference method and next master prompt are in [PROMPT-SYSTEM.md](../../docs/rnd/PROMPT-SYSTEM.md): show the full intended assembly with jump rings and initial chain links, alongside the unchanged body identity. No v0.3 generation has been run.

Validation: original output hashes recorded; yellow/white prompts differ only in metal terms; v0.2 changes only the hardware paragraph; review page local links and image dimensions checked. Browser rendering was not verified. Nonvisual properties such as gold composition, exact scale and manufacturing strength remain unverified.
