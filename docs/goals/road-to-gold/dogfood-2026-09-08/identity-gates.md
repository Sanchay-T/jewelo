# Identity gates: negative proofs, 8 September 2026

Adversarial review 1 (`docs/goals/road-to-gold/reviews/identity-engine-adversarial-1.md`)
finding 4 asked for the tamper proofs to live in the tree rather than in a chat
log.
This file is that record: for every gate the identity engine and the presentation
job carry, the exact command that made it fire and the message it produced.

Every run below is on branch `codex/overnight-launch-2026-09-08` at the fix-pass-2
working tree, Node 24.18.1, `export PATH=$HOME/.local/share/mise/installs/node/24.18.1/bin:$PATH`
prefixing every command.
The scratch scripts that drive the tampering live outside the repository, in the
session scratchpad; what they do is described beside each result, so nothing here
depends on a file that is not either committed or quoted.

## 1. The six engine gates

The script builds a rasteriser that implements the solver's own port
(`IdentityRasterizer`) and then lies to the solver in one specific way per case:
`fill-holes` closes every enclosed background region in the decoded PNG,
`cut` clears one column of ink after encoding, `solid-block` typesets a solid
800x700 block instead of a name, and the fourth case runs an unmodified copy of
`packages/identity/src` whose ring placement is restored to the pre-fix seat
(the lab's single seat: lift only, punch as the only objective).
The last two cases feed the real engine an impossible name and a name carrying a
code point the pinned face does not cover.

```
corepack pnpm --filter @jewelo/jobs exec tsx <scratchpad>/negatives/identity-negatives.mts
```

```
ring gate          : identity_ring_gate_failed:holes=0,expected=2
component gate     : identity_component_gate_failed:components=2
ring punched       : identity_ring_punched_ink:pixels=642
ring welded to glyph: identity_ring_welded_to_glyph:pixels=41
fit overflow       : identity_fit_overflow:width=1209.56,height=32,box=884x774,size=40
shaping gate       : identity_shaping_gate_failed:notdef=1,uncovered=1
```

The welded-glyph line is the finding 2 gate refusing a real customer name:
`Asma` in classic Latin lettering, welded at the pre-fix ring seat, hides 41
pixels of the name inside ring metal.
With the fix's placement search the same name renders with zero.

## 2. Pipeline release mismatch and the pre-spend fallback

The script stubs `globalThis.fetch`, so no request leaves the machine and no
credential is used; the Supabase URL is a placeholder and the service key is a
literal that is never printed.
The first case calls `signedIdentityUrl` for a task pinned to
`caleums-final-media-v1` while the engine stamps `caleums-final-media-v2`
(finding 1).
The second case runs `executePresentationTask` for a task at attempt 2 with a
pre-spend gate that throws, and the stub answers
`rpc/mark_task_pre_spend_blocked` with the error the live RPC raises for a task
whose attempt is not 0 (finding 3).

```
corepack pnpm --filter @jewelo/jobs exec tsx <scratchpad>/negatives/presentation-negatives.mts
```

```
release mismatch: identity_pipeline_release_mismatch:task=caleums-final-media-v1,report=caleums-final-media-v2
fetch calls during the release-mismatch check: 0
outcome: {"status":"operator_review","attempt":2}
  POST /rest/v1/rpc/mark_task_pre_spend_blocked {"p_task_id":"11111111-1111-4111-8111-111111111111","p_reason":"identity_pipeline_release_mismatch:task=caleums-final-media-v1,report=caleums-final-media-v2"}
  POST /rest/v1/rpc/reconcile_provider_attempt {"p_task_id":"11111111-1111-4111-8111-111111111111","p_attempt":2,"p_status":"failed","p_actual_cost_cents":0,"p_error_class":"identity_pipeline_release_mismatch:task=caleums-final-media-v1,report=caleums-final-media-v2","p_terminal":true}
  POST /rest/v1/rpc/transition_generation_task {"p_task_id":"11111111-1111-4111-8111-111111111111","p_from":["queued","generating","verifying","retrying"],"p_to":"blocked","p_patch":{"terminal_error_code":"identity_pipeline_release_mismatch:task=caleums-final-media-v1,report=caleums-final-media-v2"}}
  POST /rest/v1/audit_events {"design_id":"66666666-6666-4666-8666-666666666666","principal_id":"33333333-3333-4333-8333-333333333333","actor_type":"job","action":"task.operator_review","detail":{"taskId":"11111111-1111-4111-8111-111111111111","attempt":2,"error":"identity_pipeline_release_mismatch:task=caleums-final-media-v1,report=caleums-final-media-v2"}}
```

Zero fetch calls before the release gate fires: the mismatch is refused before
the stencil is uploaded and before an artifact row exists.
The block RPC rejects, and the fallback writes `terminal_error_code` with the
same `identity_*` message, which is what the record was missing.

## 3. The ring-free configuration guard

`IDENTITY_RINGLESS_CONSTRUCTIONS` is only allowed to be non-empty once P3-7 has
stopped the prompts promising exactly two jump rings (finding 6).

```
corepack pnpm --filter @jewelo/jobs exec tsx <scratchpad>/negatives/config-negatives.mts
```

```
default (empty set)                             : accepted, ringless={}, promptsReady=false
ringless set, IDENTITY_RINGLESS_PROMPTS_READY=0 : REJECTED -> IDENTITY_RINGLESS_CONSTRUCTIONS: IDENTITY_RINGLESS_CONSTRUCTIONS must stay empty until the prompts stop promising two jump rings (P3-7); set IDENTITY_RINGLESS_PROMPTS_READY=1 once P3-7 has shipped
ringless set, IDENTITY_RINGLESS_PROMPTS_READY=1 : accepted, ringless={framed-minimal}, promptsReady=true
```

## 4. The welded-glyph measurement across the whole sweep

The measurement is `glyphPixelsUnderRingMetal`: pre-ring ink pixels lying under
the ring annulus or its weld fillet, further from the anchor than
`IDENTITY_RING_WELD_ZONE` (`IDENTITY_RING_STEM_WIDTH + IDENTITY_RING_WELD_OVERLAP`
= 46 px).
Before the placement change, with the gate measured but not enforced, on the 232
rings-on cells (16 lab plus 216 matrix):

```
WELDED-GLYPH 9/16 lab cells have ink welded into ring metal
MATRIX WELDED-GLYPH 121/216 cells have ink welded into ring metal, worst tasneem-ar-kufi.png:271 abdulrahman-en-kufi.png:257 tasneem-en-kufi.png:225 shahrazad-en-kufi.png:192 abdulrahman-ar-thuluth-inspired.png:183
MATRIX RINGS 95/216 cells have exactly 2 ring holes, each clear of the stroke it is welded to, with no punched-out and no welded-in ink
```

The nine lab cells were `asma-en-classic` 41, `asma-en-kufi` 73,
`asma-ar-classic` 5, `asma-ar-kufi` 19, `noor-ar-classic` 50, `noor-ar-kufi` 2,
`layla-en-classic` 49, `layla-en-kufi` 86, `muhammad-ar-kufi` 43.
130 of 232 cells welded part of the name into the ring.

After the fix (the ring lifts within the reserved band and then shifts outward
by up to `IDENTITY_RING_MAX_OUTWARD_SHIFT`, taking the first seat where nothing
is punched and nothing outside the weld zone lies under the metal):

```
corepack pnpm --filter @jewelo/jobs render-stencils <scratchpad>/f2-renders
```

```
WELDED-GLYPH 0/16 lab cells have ink welded into ring metal
LUMINANCE 16/16
SINGLE-PIECE 16/16
MATRIX SINGLE-PIECE 216/216
MATRIX MOVED-INK 0/216
MATRIX RECENTRE-DOWNSCALED 124/216
MATRIX WELDED-GLYPH 0/216 cells have ink welded into ring metal
MATRIX RINGS 216/216 cells have exactly 2 ring holes, each clear of the stroke it is welded to, with no punched-out and no welded-in ink
MATRIX RING HOLE SIZE min 1114 max 1439 mean 1355
```

232 of 232 cells pass with zero welded-glyph pixels, exit code 0.
The ring-free sweep is unchanged by the fix and still refuses to draw a ring:

```
corepack pnpm --filter @jewelo/jobs render-stencils <scratchpad>/f2-renders-ringsoff --rings=off
```

```
WELDED-GLYPH 0/16 lab cells have ink welded into ring metal
LUMINANCE 16/16
SINGLE-PIECE 16/16
MATRIX SINGLE-PIECE 216/216
MATRIX MOVED-INK 0/216
MATRIX RECENTRE-DOWNSCALED 0/216
MATRIX WELDED-GLYPH 0/216 cells have ink welded into ring metal
MATRIX RINGS 216/216 cells have exactly 0 ring holes, each clear of the stroke it is welded to, with no punched-out and no welded-in ink
```

## 5. The independent ruler still agrees

`measure-stencils` decodes each PNG again and compares it with the claim the
manifest carries, which since finding 5 is read from `report.measured` and
nowhere else.

```
corepack pnpm --filter @jewelo/jobs measure-stencils <scratchpad>/f2-renders render-report.json
SINGLE-PIECE 16/16
MATCH 16/16

corepack pnpm --filter @jewelo/jobs measure-stencils docs/goals/overnight-launch/lab/stencils/production render-report.json
SINGLE-PIECE 16/16
MATCH 16/16
```

The committed production stencils were regenerated with the fixed engine, by the
same `render-stencils` command run with the absolute path of that directory; the
`matrix/` subdirectory it creates was deleted rather than committed.
