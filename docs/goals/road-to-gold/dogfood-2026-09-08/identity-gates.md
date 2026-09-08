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

## Fix pass 3 (adversarial review 2, `docs/goals/road-to-gold/reviews/identity-engine-adversarial-2.md`)

Review 2 found that the gate review 1 asked for was measuring the wrong region.
On `noor-ar-kufi` the right jump ring was welded onto the dot of ن, which hangs
off the body through one bridge bar, and the report still said
`glyphPixelsUnderRingMetal: 0`, `passed: true`: a chain on that ring would have
hung the pendant from a dot.
Two things allowed it.
The anchor was chosen on eroded ink alone, and a Kufi dot is a solid square that
survives an 11 px erosion, while the 24 px bridge bar that attaches it survives
too, so the dot was part of the largest eroded component and was the topmost
pixel on the right.
And the measurement exempted every pre-ring pixel within `IDENTITY_RING_WELD_ZONE`
(46 px) of the anchor - about 18% of each annulus - so a dot swallowed just
inside that disk was invisible to the gate that exists to catch it.

The fix is in two parts.
The anchor must now be eroded ink that also belongs to a *letter body*: islands
are counted on the thickened raster before any bridge bar is drawn, and a ring
may only be anchored to an island at least
`IDENTITY_RING_ANCHOR_MIN_ISLAND_FRACTION` (10%) of the largest island of its
piece, which also excludes the bars themselves.
And the exemption is now the weld and nothing else: the capsule
`IDENTITY_RING_WELD_WIDTH` across running from the ring centre down into the
anchor stroke, which is exactly the metal `drawBar` lays.
Everything else under the annulus counts and trips
`identity_ring_welded_to_glyph`.

The 10% threshold is measured, not chosen.
Over the 232-cell sweep, the largest island that ever carried a mark-anchored
ring is 9.9% of its piece's largest island (`aya-ar-thuluth-inspired`), and the
smallest island that carries a ring under the new rule is 11.3%.
Every one of the 61 anchors the rule moved was on a dot, a hamza or a nuqta at
2.4% to 9.9%, and every one of them moved onto a letter at 11.3% to 100%.

### The sweep

```
corepack pnpm --filter @jewelo/jobs render-stencils \
  /Users/sanchay/hq/projects/devonel/jewelo/docs/goals/overnight-launch/lab/stencils/production
```

```
WELDED-GLYPH 0/16 lab cells have ink welded into ring metal
LUMINANCE 16/16
SINGLE-PIECE 16/16
MATRIX SINGLE-PIECE 216/216
MATRIX MOVED-INK 0/216
MATRIX RECENTRE-DOWNSCALED 145/216
MATRIX WELDED-GLYPH 0/216 cells have ink welded into ring metal
MATRIX RINGS 216/216 cells have exactly 2 ring holes, each clear of the stroke it is welded to, with no punched-out and no welded-in ink
MATRIX RING HOLE SIZE min 1125 max 1437 mean 1336
```

232 of 232 rings-on cells pass with the narrowed exemption, exit code 0, and the
`matrix/` subdirectory was deleted rather than committed.
179 of the 232 cells have at least one ring centre in a different place than at
`6d7382b`, 13 of them among the 16 committed production stencils.
The two the lead flagged, in pre-recentre coordinates:

```
noor-ar-kufi     right ring 929,166 anchored on the dot at 898,193
                 -> 945,322 anchored on the ن stem at 885,348
noor-ar-classic  right ring 912,218 anchored on the dot at 881,244
                 -> 958,376 anchored on the ن bowl at 917,402
```

The ring-free sweep is unchanged by the fix and still refuses to draw a ring:

```
corepack pnpm --filter @jewelo/jobs render-stencils <scratchpad>/pass3-ringsoff --rings=off
```

```
WELDED-GLYPH 0/16 lab cells have ink welded into ring metal
MATRIX SINGLE-PIECE 216/216
MATRIX MOVED-INK 0/216
MATRIX RECENTRE-DOWNSCALED 0/216
MATRIX WELDED-GLYPH 0/216 cells have ink welded into ring metal
MATRIX RINGS 216/216 cells have exactly 0 ring holes, each clear of the stroke it is welded to, with no punched-out and no welded-in ink
```

### Three rulers, three sources

```
corepack pnpm --filter @jewelo/jobs measure-stencils \
  docs/goals/overnight-launch/lab/stencils/production render-report.json
```

```
SINGLE-PIECE 16/16
MATCH 16/16
CLAIM 16/16
```

`MATCH` is this script's decode of the written bytes against the engine's own
decode of the same bytes: one ruler read twice, which catches a file that
changed after it was written and nothing else (finding 6).
`CLAIM` is new and differently sourced: the engine's measurement against the
engine's *construction account* - the rings it says it welded and where, the
islands it says it bridged, the ink it says it preserved.
Per cell it prints the ring count both ways, the distance from each claimed ring
centre to the measured hole centroid after the recentre transform, the
`islands - bars = 1` identity against the measured component count, and the
measured ink against the claimed pre-bridge ink scaled by the claimed downscale.
Measured over all 16: the x delta stays inside 0.4 px and the y delta runs 3.8
to 4.8 px, because the weld fillet fills the bottom of the hole and pulls the
centroid up; the tolerance is 8 px.

The third ruler is the Python oracle, which shares no code with either:

```
<scratchpad>/venv/bin/python docs/goals/overnight-launch/lab/verify_stencil.py \
  docs/goals/overnight-launch/lab/stencils/production/*.png
```

It agrees with `report.measured` on all 16 files for ink pixels, components,
holes, hole sizes, bounding box and canvas: `PYTHON ORACLE AGREES 16/16`.

### Negative proofs

```
corepack pnpm --filter @jewelo/jobs exec tsx <scratchpad>/pass3/pass3-negatives.mts
```

The script feeds one synthetic name and four real ones to four copies of the
engine that differ from the committed one in a single named way, so each line
below is the same input judged by two rules.

```
(a) a name whose right end is a floating dot: a 70x70 dot island
    beyond the right end of a 650x270 body bar, bridged into one
    piece. The dot is the topmost ink in the right anchor band.
  committed anchor rule (eroded ink only): ok  anchor=(153,433) ring=(122,407)   anchor=(883,303) ring=(952,274)  welded=0 punched=0
  fix pass 3 anchor rule (eroded AND body): ok  anchor=(153,433) ring=(122,407)   anchor=(796,428) ring=(827,341)  welded=0 punched=0
```

The committed rule anchors the right ring on the dot at `(883,303)` and every
gate passes; the new rule anchors it on the body at `(796,428)` and lifts the
ring clear.

```
(b) the same engine with the placement search removed, so the
    ring sits at the lab's single seat and its annulus covers
    letter ink outside the weld capsule:
  Asma      : THREW identity_ring_welded_to_glyph:pixels=16
  Layla     : THREW identity_ring_welded_to_glyph:pixels=23
  Noor      : ok  anchor=(73,409) ring=(44,383)   anchor=(910,482) ring=(941,456)  welded=0 punched=0
  Muhammad  : ok  anchor=(85,502) ring=(54,476)   anchor=(925,491) ring=(956,465)  welded=0 punched=0
```

```
(c) the five names whose left ring is against the canvas edge.
  Noor-en-classic committed guard (break):
    TRACE left: anchor=(73,409) seat=(42,383) candidates=0 first=[] chosen=(44,383) cost=Infinity
  Noor-en-classic fix pass 3 (clamped x):
    TRACE left: anchor=(73,409) seat=(42,383) candidates=1 first=[44,383] chosen=(44,383) cost=0
  Noor-en-kufi committed guard (break):
    TRACE left: anchor=(73,399) seat=(42,373) candidates=0 first=[] chosen=(44,373) cost=Infinity
  Noor-en-kufi fix pass 3 (clamped x):
    TRACE left: anchor=(73,399) seat=(42,373) candidates=1 first=[44,373] chosen=(44,373) cost=0
  Layla-en-classic committed guard (break):
    TRACE left: anchor=(73,398) seat=(42,372) candidates=0 first=[] chosen=(44,372) cost=Infinity
  Layla-en-classic fix pass 3 (clamped x):
    TRACE left: anchor=(73,398) seat=(42,372) candidates=1 first=[44,372] chosen=(44,372) cost=0
  Layla-en-kufi committed guard (break):
    TRACE left: anchor=(73,368) seat=(42,342) candidates=0 first=[] chosen=(44,342) cost=Infinity
  Layla-en-kufi fix pass 3 (clamped x):
    TRACE left: anchor=(73,368) seat=(42,342) candidates=1 first=[44,342] chosen=(44,342) cost=0
  Muhammad-en-kufi committed guard (break):
    TRACE left: anchor=(73,496) seat=(42,470) candidates=0 first=[] chosen=(44,470) cost=Infinity
  Muhammad-en-kufi fix pass 3 (clamped x):
    TRACE left: anchor=(73,496) seat=(42,470) candidates=1 first=[44,470] chosen=(44,470) cost=0
```

`cost=Infinity` is the whole of finding 2: the committed guard left the shift
loop at shift 0 on every pass, so the left ring was drawn at a seat the search
had never evaluated for punched or welded ink, two pixels outside the canvas
clearance.
The clamped x makes the seat legal, the search evaluates it, and it comes back
`punched=0 welded=0`.
The right rings, which are not against the edge, are untouched: `Layla-en-kufi`
evaluates the same 25 candidates and chooses the same seat in both engines.

### Recentre baseline (finding 8, recorded, no code change)

The outward shift makes some pieces wider, and a wider piece is downscaled
harder by `recentre`, which loses a little ink to Lanczos resampling.
`IDENTITY_MIN_RECENTRE_SCALE` = 0.8 bounds it and nothing here approaches that.
For `layla-ar-kufi`, the cell review 2 named, in pre-recentre ink of 108848
pixels both times:

| | `recentreScale` | final `inkPixels` |
| --- | --- | --- |
| at `6d7382b` | 0.9287 | 102467 |
| fix pass 3 | 0.9184 | 100645 |

`RECENTRE-DOWNSCALED` over the matrix moved from 124/216 to 145/216, and over
the 16 lab cells from 10/16 to 12/16.
The worst downscale in the whole sweep is 0.895 (`noor-en-kufi`).

### `passed` (finding 5, comment only)

`passed` in `caleums-arabic-v3.ts` cannot be false: every conjunct has already
thrown by the time the object is built.
The comment above it now says so, so the next reader does not take that line for
the thing that stops a bad piece; the field stays because the row is stored and
read, and the database check on `validation_report->>'passed'` reads it.

### The pre-spend gates that used to escape (finding 4)

`prompt_compile_failed` called `blockPreSpend` with no `catch`, and
`task_prompt_release_mismatch`, `prompt_snapshot_lineage_mismatch` were bare
throws before any `try`.
The Inngest function runs with `retries: 0`, so on a retry each of them left the
task `retrying` with no `terminal_error_code` and the two-minute stale sweeper
re-dispatched it for ever.
All three now go through one `blockPreSpendTerminally` helper, the same shape
review 1 finding 3 introduced for the identity gate.

```
corepack pnpm --filter @jewelo/jobs exec tsx <scratchpad>/pass3/presentation-negatives-pass3.mts
```

The task is at attempt 2 and the stubbed `mark_task_pre_spend_blocked` answers
with the error the live RPC raises for a task whose attempt is not 0, so every
case has to fall through to the terminal path. No request leaves the machine.

```
task_prompt_release_mismatch  : outcome {"status":"operator_review","attempt":2}
  POST /rest/v1/rpc/transition_generation_task ... "terminal_error_code":"task_prompt_release_mismatch"
prompt_compile_failed         : outcome {"status":"operator_review","attempt":2}
  POST /rest/v1/rpc/transition_generation_task ... "terminal_error_code":"prompt_compile_failed:Unknown prompt variable: a_variable_that_does_not_exist"
prompt_snapshot_lineage_mismatch: outcome {"status":"operator_review","attempt":2}
  POST /rest/v1/rpc/transition_generation_task ... "terminal_error_code":"prompt_snapshot_lineage_mismatch"
```

A failing `materializePromptSnapshot` is deliberately *not* routed there.
It is a write against Supabase, so its failure is a transport fault rather than
a property of the task, and the same task will succeed on the next dispatch;
blocking it terminally would turn one 500 into a lost order, and the stale
sweeper is the correct recovery.

The release comparison in `signedIdentityUrl` (finding 7) now runs against the
configured pipeline release before `renderIdentityAnchor` is called, so a
mismatch no longer costs a shape, a raster, a measurement and an encode; the
post-render comparison stays as the statement about what the engine actually
stamped. The fix-pass-2 proof still reads:

```
release mismatch: identity_pipeline_release_mismatch:task=caleums-final-media-v1,report=caleums-final-media-v2
fetch calls during the release-mismatch check: 0
```
