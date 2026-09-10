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
(46 px) of the anchor, so a dot swallowed just inside that disk was invisible to
the gate that exists to catch it.
(Correction, fix pass 4: this paragraph first said the disk was "about 18% of
each annulus". Measured over the 32 committed rings it is 35.6%.)

The fix is in two parts.
The anchor must now be eroded ink that also belongs to a *letter body*: islands
are counted on the thickened raster before any bridge bar is drawn, and a ring
may only be anchored to an island at least
`IDENTITY_RING_ANCHOR_MIN_ISLAND_FRACTION` (10%) of the largest island of its
piece, which also excludes the bars themselves.
And the exemption is narrowed to two capsules `IDENTITY_RING_WELD_WIDTH` across:
the fillet `drawBar` lays, and a second one from the ring *centre* down into the
anchor stroke.
Everything else under the annulus counts and trips
`identity_ring_welded_to_glyph`.
(Correction, fix pass 4: this paragraph first said the exemption was "the weld
and nothing else". It was the weld plus that second capsule, which is metal the
solver never lays; the pair covers 31.0% of each annulus, measured over the 32
committed rings. Fix pass 4 removes the second one.)

The 10% threshold is measured, not chosen.
Over the 232-cell sweep, the largest island that ever carried a mark-anchored
ring is 9.9% of its piece's largest island (`aya-ar-thuluth-inspired`), and the
smallest island that carries a ring under the new rule is 11.3%.
Every one of the 61 anchors the rule moved was on a dot, a hamza or a nuqta at
2.4% to 9.9%, and every one of them moved onto a letter at 11.3% to 100%.
(Correction, fix pass 4: those two numbers are real but they are not a gap, and
this paragraph read as if they were. They were measured over the 232 cells that
sweep covered, and the sweep covered no name whose spelling lives in a Latin
tittle. On a wider corpus the same rule admits the tittle of the i as a carrier
at 13.5% in `Ali`, 10.5% in `Niki` and 14.5% in `Li`, because in Latin every
letter is its own island and the ratio is taken against whatever the biggest
letter happens to be. The rule is kept, for what it does catch, and a second
test is added beside it in fix pass 4.)

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

## Fix pass 4 (adversarial review 3)

Review 3 falsified three of fix pass 3's claims and found four more things.
The lead confirmed the first by eye on `Ali` in Playfair: the right ring was
welded onto the tittle of the i, which hangs off the stem by a bridge bar.
A chain on that ring would have hung the pendant from a dot, which is the same
defect review 2 found on ن and the same one fix pass 3 was supposed to close.

### 1. What separates a mark from a letter

Fix pass 3 asked whether an island was at least 10% of the largest island of its
piece.
That question has no answer in Latin.
Arabic joins, so the largest island is a whole run of letters and a nuqta is a
few per cent of it; Latin does not join, so the largest island is one letter and
the tittle of the i is 13.5% of the A in `Ali`, 10.5% in `Niki`, 14.5% in `Li`.
The rule admitted all three.
It also admits `nunu` in Arabic classic at 10.3%.

The new question never compares one island with another.
A mark is a *blob*: a lump of metal about as wide as it is thick.
A letter is a *stroke*: a run of metal several stroke widths long, bent around a
shape.
So each island is measured against itself, as `area / thickness^2`, where
`thickness` is `2 * r - 1` and `r` is the largest Chebyshev inradius of that
island - the half-side of the biggest square of its own ink that fits inside it.
The measure is scale-free, face-free and script-free.
It is `IDENTITY_RING_MARK_MAX_COMPACTNESS` in `packages/identity/src/shaping.ts`,
and the distance transform that computes the inradius is a private helper in
`caleums-arabic-v3.ts`.

Compactness cannot see one shape: two nuqtas fused into a single slab, which in
the `minimal` face measures 3.5 to 4.0 and reads as a stroke.
The fix-pass-3 area rule catches exactly that, at 7.4% of the piece in `تسنيم`.
So both tests are kept and an island has to clear both:

```
carrier = the largest island of the piece
        | compactness > 3.35 and area >= 10% of the largest island
```

The largest island is always a carrier, so the carrier can never be empty.

### 2. The corpus and the margin

The threshold was measured over the union of three corpora: the `render-stencils`
matrix (now 36 names x 2 scripts x 6 styles = 432 cells), the adversarial-3
sweep of 35 short names in 6 styles, and the stress list review 3 named - `Ali`,
`Amir`, `Niki`, `Titi`, `Jiji`, `Li`, `Ij`, `Maji`, `nunu`, `أمير`, `قق`, `نور`,
`يزن`, `بيان`, `تيم`, `ذكرى`, `غيث`, `شمس`, `ياسين`, `إيمان`, each in both
scripts and all six styles.
Deduplicated that is 92 name-and-script pairs, 552 solves, 2698 islands.
The 18 stress names are now in `MATRIX_NAMES` in `render-stencils.mts`, so the
sweep covers them permanently.

```
corepack pnpm --filter @jewelo/jobs exec tsx <scratchpad>/pass4/sweep.mts
```

```
UNION SWEEP  552 solves (92 names x scripts x 6 styles)
  solved 552/552, threw 0
  rings placed 1104, seats found at cost 0: 1104/1104
  islands 2698, marks 806, carriers 1892
  compactness test, over the 1474 islands the area test admits:
    largest mark    2.857  zain/ar/thuluth-inspired 153x111 t=61 area 10632
    smallest stroke 3.433  rua/ar/thuluth-inspired 255x274 t=95 area 30987
    margin 0.576 (20.2%)
  area test, over the 1370 islands the compactness test admits:
    largest mark    0.100  shsh/ar/minimal 131x77 t=39 area 5912
    smallest stroke 0.100  shsh/ar/minimal 131x78 t=39 area 5919
  least compact island that actually carried a ring: 3.587  warda/ar/thuluth-inspired right
```

The margin that matters is the first one: once the area test has taken the small
islands away, the largest thing compactness calls a mark and the smallest thing
it calls a stroke are 20.2% apart.
Both ends were confirmed by eye, on rasters painted island by island: the 2.857
island is the two fused nuqtas of ز in `زين`, the 3.433 island is the ى of
`رؤى`.
The second margin is zero by construction - `شش` has two three-dot clusters that
differ by seven pixels and the 10% line falls between them - and it is harmless
here, because compactness has already refused every cluster that a ring could
have reached; the least compact island that actually carried a ring in the whole
sweep measures 3.587 and is a letter.

The number a newly pinned face has to re-measure is 20.2%.

### 3. The under-metal count

`countGlyphPixelsUnderRingMetal` scanned the ring's bounding box only, and
exempted two capsules: the fillet `drawBar` lays, and a second one running from
the ring *centre* into the anchor.
The second is metal the solver never lays, and it covered the corridor between
the hole and the stroke, so a detached mark parked there was invisible.
The scan is now the bounding box of the ring *and* the fillet, the metal test is
the annulus or the fillet, and the exemption is the fillet and nothing else -
the same `insideCapsule` predicate on the same segment `drawBar` fills.

Measured over the 32 committed rings:

```
node <scratchpad>/pass4/exempt4.mjs \
  docs/goals/overnight-launch/lab/stencils/production/render-report.json
```

```
32 rings, annulus 119424px total: fix pass 4 exempts 30428 (25.5%, the drawn
fillet only), fix pass 3 exempted 37063 (31.0%, fillet plus the ring-centre
capsule), the pre-pass-3 46 px anchor disc exempted 42502 (35.6%)
```

25.5% is not small, and it is honest: the fillet is `IDENTITY_RING_WELD_WIDTH`
(39 px) across and it crosses an annulus that is 18 px wide, so a quarter of the
annulus really is weld metal.
What changed is that the exemption is now the shape the solver draws rather than
a shape drawn around it.

The corridor that used to be exempt, on one ring seat and one detached mark:

```
node <scratchpad>/pass4/exempt-diff.mjs
```

```
ring 752,440 anchor 741,483
detached mark 10x23 at 726,452 = 230 pixels
  fix pass 3 (drawn fillet + centre capsule exempt): welded 50
  fix pass 4 (drawn fillet exempt only)            : welded 153
```

103 pixels of that mark used to be unmeasurable and now count.
The synthetic probe itself no longer reaches the gate, because the widened
search below moves the ring clear of the mark instead:

```
corepack pnpm --filter @jewelo/jobs exec tsx <scratchpad>/pass4/probe4.mts
```

```
live engine (search on)   body only        rings [...,{"x":752,"y":440,...}] welded 0 punched 0
live engine (search on)   mark 726,455,743,467 (234 px)  rings [...,{"x":785,"y":439,...}] welded 0 punched 0
first seat, pass 4 count  mark 726,455,743,467 (234 px)  THREW identity_ring_welded_to_glyph:pixels=460
first seat, pass 3 count  mark 726,455,743,467 (234 px)  THREW identity_ring_welded_to_glyph:pixels=409
```

The third and fourth lines are the same engine with the placement search removed,
so the ring stays at the lab's single seat: the pass 4 count sees 51 pixels of
that mark that the pass 3 count did not.

### 4. The placement search, and the names that used to die

Under fix pass 3 five cells threw where the pre-fix engine had rendered:
`Maji` in Kufi (`identity_ring_welded_to_glyph:pixels=38`), `أمير` in Kufi
(`identity_ring_punched_ink:pixels=12`) and `قق` in classic, diwani and
signature (`identity_ring_welded_to_glyph:pixels=217`).
The search kept the least-bad seat when it could not reach cost 0 and the gate
then refused the piece, so a customer lost a name because the ring could not find
a seat that existed.

Three things widen it, all inside validated configuration:

- the ring may now be pushed *inward* as well as outward, by
  `IDENTITY_RING_MAX_INWARD_SHIFT` (half the outward travel), because a ring
  already against the canvas edge has no outward room left;
- the x candidates are collected once, deduplicated, so a clamp onto the canvas
  margin costs one candidate instead of collapsing all 25 shifts onto the same
  column (review 3, finding 7);
- and when no seat above the first anchor is clean the search tries the next
  anchor: the topmost pixel of each other carrier island, and then the topmost
  pixel in each of `IDENTITY_RING_ANCHOR_OUTER_SPANS`, the narrower bands toward
  the end of the name. That last one is what `قق` needs: both ق join into one
  island, so widening the band inward always returns the same shoulder under the
  four dots, and only a band pushed the other way finds the lower shoulder with
  clear air above it.

```
corepack pnpm --filter @jewelo/jobs exec tsx <scratchpad>/pass3/adv3-regress.mts
```

```
Maji     kufi     3ce45ed (committed)  OK   rings [{"x":44,"y":281,...},{"x":710,"y":392,...}]
Amir-ar  kufi     3ce45ed (committed)  OK   rings [{"x":149,"y":460,...},{"x":940,"y":198,...}]
qq-ar    classic  3ce45ed (committed)  OK   rings [{"x":91,"y":648,...},{"x":873,"y":330,...}]
qq-ar    diwani   3ce45ed (committed)  OK   rings [{"x":91,"y":648,...},{"x":873,"y":330,...}]
qq-ar    signature3ce45ed (committed)  OK   rings [{"x":91,"y":648,...},{"x":873,"y":330,...}]
Ali      classic  3ce45ed (committed)  OK   rings [{"x":185,"y":492,...},{"x":942,"y":425,anchorX:893,anchorY:451}]
```

(The label `3ce45ed (committed)` is the script's own; it is the working tree.)
`Ali` is the one to look at: the right anchor moved from `856,279`, the tittle,
to `893,451`, the shoulder of the i.
Every one of the 552 solves in the union corpus now finds a seat at cost 0.
There is no name in the corpus the solver has to refuse.

### 5. The harness measures the bytes now

`render-stencils.mts` read `welded` and `punched` off `rendered.construction`,
which the solver had already thrown on, so the assertion could not fail; and
`aboveAnchor` was arithmetic on two numbers the engine claimed.
Both are measured now.

For each cell the script renders the same name a second time through the public
API with the construction in the ring-free set, decodes both PNGs, and maps the
rings-off decode back into pre-recentre coordinates, where the ring centres the
engine claims are also expressed.
Pre-ring ink under the annulus outside the fillet is `welded`; pre-ring ink
inside the hole is `punched`.
That is a comparison of two files against a claim, with no engine counter in it.
`aboveAnchor` is now the lowest row of the measured hole, found by walking the
decoded image outward from the point that landed in it, against the anchor the
manifest claims mapped through the transform the manifest claims.

`measure-stencils.mts` read both sides of `CLAIM` out of the manifest.
Every measured number it uses now comes from its own `decodeMask` and
`findMaskHoles` of the file on disk; only the claim is read from the manifest.

The measurement is live, which a gate that always reads zero has to prove. The
same two decoded PNGs, measured against the ring geometry the engine claims and
against the same rings pushed 60 px down into the lettering:

```
corepack pnpm --filter @jewelo/jobs exec tsx <scratchpad>/pass4/harness-negative.mts
```

```
Ali/en/classic  pre-ring ink read back from the rings-off PNG: 145550 px
  at the claimed ring centres          {"welded":0,"punched":0}
  at the same rings pushed 60 px down  {"welded":85,"punched":60}
أمير/ar/kufi  pre-ring ink read back from the rings-off PNG: 128242 px
  at the claimed ring centres          {"welded":0,"punched":0}
  at the same rings pushed 60 px down  {"welded":1411,"punched":1793}
```

### 6. The runs

```
corepack pnpm --filter @jewelo/jobs render-stencils \
  /Users/sanchay/hq/projects/devonel/jewelo/docs/goals/overnight-launch/lab/stencils/production
```

```
WELDED-GLYPH 0/16 lab cells have ink welded into ring metal
LUMINANCE 16/16
SINGLE-PIECE 16/16
MATRIX SINGLE-PIECE 432/432
MATRIX MOVED-INK 0/432
MATRIX RECENTRE-DOWNSCALED 297/432
MATRIX WELDED-GLYPH 0/432 cells have ink welded into ring metal
MATRIX RINGS 432/432 cells have exactly 2 ring holes, each clear of the stroke it is welded to, with no punched-out and no welded-in ink
MATRIX RING HOLE SIZE min 1119 max 1437 mean 1325
```

448 of 448 rings-on cells pass, with welded and punched measured off the decoded
PNGs rather than reported by the engine, exit code 0.
The `matrix/` subdirectory was deleted rather than committed.

```
corepack pnpm --filter @jewelo/jobs measure-stencils \
  /Users/sanchay/hq/projects/devonel/jewelo/docs/goals/overnight-launch/lab/stencils/production render-report.json
```

```
SINGLE-PIECE 16/16
MATCH 16/16
CLAIM 16/16
```

The tamper, which is the point of the rewrite. One claimed ring centre in a copy
of the manifest is moved 20 px and nothing else changes:

```
node <scratchpad>/pass4/tamper.mjs <production> <scratchpad>/pass4/tampered
corepack pnpm --filter @jewelo/jobs measure-stencils <scratchpad>/pass4/tampered render-report.json
```

```
tampered asma-en-classic.png: claimed ring centre 150,400 -> 170,400
CLAIM FAILED 1/16
  asma-en-classic.png: ring 0 claimed at 170.0,391.0 but measured at 149.8,386.7
MATCH 16/16
```

exit status 1. `MATCH` still passes, because the bytes did not change; only the
claim moved, and only `CLAIM` can see that.

The Python oracle, which shares no code with either:

```
<scratchpad>/venv/bin/python <scratchpad>/compare.py \
  docs/goals/overnight-launch/lab/stencils/production
```

```
ALL IDENTICAL 16/16
```

### 7. `materializePromptSnapshot`

`presentation.ts` left every failure of the snapshot RPC to the stale sweeper.
That is right for a transport fault and wrong for a raise: the RPC
(`20260827060000_caleums_prompt_registry.sql:284-289`) raises deterministically
for four conditions that depend only on rows, and
`recover_stale_generation_tasks`
(`20260907020000_dependent_view_terminal_gate.sql:150-172`) has no attempt cap on
`attempt = 0 and status = 'queued'` and bumps `updated_at`, so one such raise
becomes an outbox row every two minutes for ever.

The failure is classified now. A 4xx whose body carries SQLSTATE `P0001` with one
of the four known messages, or `22023`, is a property of the task: it goes
through `blockPreSpendTerminally` with `prompt_snapshot_rejected:<class>`, which
carries no prompt text and no customer name. Anything else is rethrown and the
sweeper keeps it.

```
corepack pnpm --filter @jewelo/jobs exec tsx <scratchpad>/pass4/snapshot-negatives.mts
```

```
P0001 release does not match task pin     outcome {"status":"operator_review","attempt":2}
  terminal_error_code prompt_snapshot_rejected:release_pin
P0001 invalid compiled prompt length      outcome {"status":"operator_review","attempt":2}
  terminal_error_code prompt_snapshot_rejected:length
P0001 compiled prompt checksum mismatch   outcome {"status":"operator_review","attempt":2}
  terminal_error_code prompt_snapshot_rejected:checksum
P0001 invalid prompt variable snapshot    outcome {"status":"operator_review","attempt":2}
  terminal_error_code prompt_snapshot_rejected:variables
22023 invalid_parameter_value             outcome {"status":"operator_review","attempt":2}
  terminal_error_code prompt_snapshot_rejected:invalid_argument
P0001 a message this job does not know    RETHROWN to the sweeper
500 internal error                        RETHROWN to the sweeper
503 upstream unavailable                  RETHROWN to the sweeper
fetch never answered                      RETHROWN to the sweeper
```

The task is at attempt 2 and the stubbed `mark_task_pre_spend_blocked` answers
with the error the live RPC raises for a task whose attempt is not 0, so every
terminal case has to fall through to the `fail` path. No request leaves the
machine.

## D-020: outline-level ring anchors with a no-refusal fallback

Fix passes 2, 3 and 4 each answered "is this metal a letter or a mark" on the
finished raster, and each answer was falsified by a name outside the corpus it
was tuned on: an eroded-ink rule swallowed the nuqta of `Noor`, an island-area
ratio admitted the tittle of the i in `Ali` at 13.5%, and the compactness
classifier that replaced it left a 4.4% gap between the largest mark (3.288) and
the smallest carrier (3.433) with a fused nuqta pair sitting inside it.

The question has an exact answer one step earlier. HarfBuzz already returns each
glyph's contours and each glyph's GDEF class, so the carrier is chosen from the
font, before anything is painted:

- for each end of the name, the outermost base glyph on the canvas, ordered by
  the measured glyph box rather than by buffer position, so Latin and Arabic ask
  the same question without either knowing which way the script runs;
- of that glyph, the largest contour by area, among contours that clear
  `IDENTITY_RING_CARRIER_MIN_CONTOUR_AREA_FRACTION` of the glyph's own largest
  contour, `IDENTITY_RING_CARRIER_MIN_CONTOUR_GLYPH_HEIGHT_FRACTION` of the
  glyph's box height and `IDENTITY_RING_CARRIER_MIN_RUN_HEIGHT_FRACTION` of the
  whole run's ink box height;
- never a glyph whose GDEF class is `IDENTITY_GLYPH_CLASS_MARK` (3): a dot, a
  tittle, a hamza carried as a mark, a tanwin, a shadda.

That contour is rasterised on its own, grown by the same two thickening passes
the piece got, intersected with the painted mask and with the eroded body, and
the anchor is the outer top corner of what is left. `IDENTITY_RING_ANCHOR_SPANS`,
`IDENTITY_RING_ANCHOR_OUTER_SPANS`, `IDENTITY_RING_ANCHOR_MIN_ISLAND_FRACTION`,
`IDENTITY_RING_MARK_MAX_COMPACTNESS`, `ringAnchorCarrier` and the Chebyshev
distance transform they needed are deleted; there is one anchor rule, not two.

`Ali` in Playfair is the rule in one line. Glyph 2 is the `i`: two contours,
`[0 area 7027 height 95]` is the tittle and `[1 area 29026 height 389]` is the
stem. The carrier is contour 1, the anchor is `898,451` on the stem, and the
tittle is left whole beside the ring instead of under it.

`نور` in Kufi is the other half. Glyph 2 is GDEF class 3, the nuqta of the ن,
`87x93` at 12.9% of the run height; it is excluded before any pixel is counted,
and the right ring seats on glyph 3, the ن body, at `897,348`.

### Never a refusal

The seat search keeps the lift and the outward and inward shifts, and two things
change. `IDENTITY_RING_MAX_LIFT` is the canvas rather than `IDENTITY_RING_BAND`
(package review finding 1: the lift is measured from the anchor pixel inside the
letter, not from the letter top, so `Zoë` needed 123 px and the 110 cap refused
it in all six styles). And when nothing above a carrier is clean the search
returns nothing instead of keeping the least-bad seat: the solver steps one glyph
inward, up to `IDENTITY_RING_ANCHOR_CANDIDATES`, and when no carrier on either
end works the piece is built with a bar suspension - a thin rail
`IDENTITY_RING_BAR_DEPTH` below the topmost ink, spanning the lettering, with a
ring above each of its ends whose whole annulus clears the name. The construction
reports `ringPlacement` as `welded`, `bar` or `none`, and a `bar` piece routes to
operator review (pipeline fix 1 owns that routing).

`identity_ring_punched_ink` and `identity_ring_welded_to_glyph` are unchanged and
still gate every piece; what changed is that placement no longer walks into them.

### The exemption is gone

`countGlyphPixelsUnderRingMetal` exempts exactly the pixels `drawBar` writes and
nothing else (adversarial review 3, finding 2; package review finding 2). The
second capsule, the one running from the ring centre into the anchor, was metal
the solver never lays and it covered the corridor between the hole and the
stroke - 30.8% of every annulus, unmeasurable.

### The hole is gated

`IDENTITY_RING_WELD_START_GAP` is `IDENTITY_RING_WELD_WIDTH / 2` (19.5 px)
instead of 4, so the fillet's top cap lands exactly on the hole boundary and
cannot enter it. Package review finding 5 measured the old behaviour: holes of
1186 to 1424 px against an ideal `pi * 24^2 = 1810`, 66% to 79%, and no gate.
`measureRingHoles` now compares each hole against
`IDENTITY_RING_HOLE_MIN_AREA_FRACTION` of `pi * INNER^2` scaled by both recentre
axes and throws `identity_ring_hole_too_small:hole=N,size=S,min=M`.

Measured over the union corpus below, 1152 holes: the smallest is 96.4% of its
cell's ideal (`iman-ar-kufi`, 1660 against 1722) and the largest is 101.0%. The
floor is 90%.

### The small ones

- `round3` on the SVG became six decimal places (`IDENTITY_SVG_PRECISION`), which
  is lossless for any upem a font can declare rather than only for the 1000-upem
  faces that happen to be pinned (finding 6).
- `bridgeAll` re-labels after its last bar and returns when the piece converged
  on it, instead of throwing at exactly 64 bars (finding 7).
- `regionAt` refuses a non-integer coordinate instead of indexing at a fractional
  offset and returning `undefined` typed as `number` (finding 8).
- `label4` throws when the pixel buffer is not `width * height` long, instead of
  reading `undefined` and counting the missing tail as ink (finding 9).
- `recentre` reports the scale it applied, `output / input` per axis, because the
  resample truncates each axis independently; `recentreScaleY` is the new field
  and every consumer maps y through it (finding 10).
- `identity_stencil_empty_outline` and `identity_fit_overflow` are
  `IdentitySolverError` codes, so the caller classifies them like every other
  identity refusal. `IdentitySolverError` moved to `packages/identity/src/errors.ts`
  because `shaping.ts` raises two of them and the solver imports `shaping.ts`
  (finding 11).

### The union corpus

48 names x 2 scripts x 6 live styles = 576 cells, each rendered twice (rings on,
and again ring-free so the harness has an independent pre-ring mask). The list is
the 17 ZIP regression names, the 4 lab names, the 18 stress names adversarial
review 3 named, and 12 added here: `Zoë`, `Bartholomewsonlongest`, and ten common
Gulf given names in both scripts (Fatima, Mariam, Salem, Rashid, Hamdan, Shaikha,
Moza, Saeed, Latifa, Jassim).

```
corepack pnpm --filter @jewelo/jobs render-stencils \
  /Users/sanchay/hq/projects/devonel/jewelo/docs/goals/overnight-launch/lab/stencils/production
```

```
WELDED-GLYPH 0/16 lab cells have ink welded into ring metal
LUMINANCE 16/16
SINGLE-PIECE 16/16
MATRIX SINGLE-PIECE 576/576
MATRIX MOVED-INK 0/576
MATRIX RECENTRE-DOWNSCALED 375/576
MATRIX WELDED-GLYPH 0/576 cells have ink welded into ring metal
MATRIX BAR-FALLBACK 0/576 cells needed the bar suspension
MATRIX RING HOLE FLOOR 576/576 cells have every ring hole at or above 90% of the ideal area
MATRIX RINGS 576/576 cells have exactly 2 ring holes, each clear of the stroke it is welded to, with no punched-out and no welded-in ink
MATRIX RING HOLE SIZE min 1408 max 1792 mean 1686
```

Exit code 0. Every cell prints its own `CELL` line with the carrier it chose as
`glyphIndex:contourIndex`, the anchor, the ring centres, the placement, the
measured punched and welded counts and the measured hole sizes against that
cell's floor. No cell needed the bar: the fallback is proved by construction and
by the probe below, not by a name in this corpus, and that is the honest claim -
it exists so that the first name that needs it gets a pendant instead of a
refusal.

### The adversarial-3 probe

```
corepack pnpm --filter @jewelo/jobs exec tsx <scratchpad>/d020/adv3-probe.mts
```

```
(a) body only            place welded rings [[121,457,153,483],[898,457,866,483]] welded 0 punched 0 passed true holes [1792,1792]
(b) corridor mark        place welded rings [[121,457,153,483],[919,452,863,478]] welded 0 punched 0 passed true holes [1792,1792] markPixelsUnderMetalAtThePass3Seat {"annulus":231}
(c) wall to the canvas   THREW identity_ring_punched_ink:pixels=98
(d) wall at the shoulder THREW identity_ring_welded_to_glyph:pixels=196
```

(b) is finding 2. The mark is the 18x14 detached blob parked in the corridor
between the right ring hole and the stroke. Fix pass 3 exempted that corridor,
kept the seat at `898,457` and reported `welded 0`; the scan now counts those 231
pixels, so the seat moves to `919,452` and the mark stays a mark. (c) and (d) are
synthetic pieces that fill the canvas so no seat and no rail can clear the ink:
both gates still fire and the engine still fails closed rather than shipping a
ring welded across the lettering.

## Fix pass 5 (P1-5), 8 September 2026

Closes `docs/goals/road-to-gold/reviews/identity-engine-adversarial-4.md`: two
blockers, three majors and three minors. Every number below is a measurement of
the run named above it, not a restatement of the engine's intention.

### Blocker 1. The weld fillet may only cover the metal it welds to

`countGlyphPixelsUnderRingMetal` took a fourth argument: the plane of ink that
belongs to some glyph contour other than the carrier this ring sits on
(`allContourPixels` minus `carrierPixelsFor`). A pixel under the fillet counts
as welded unless it is off that plane. `findSeat` uses the same function, so the
search no longer proposes a seat whose stem crosses a mark, and the post-draw
scan measures the same statement on the finished mask. Ink that belongs to no
contour at all - a bridging bar, the pixel of skin the thickening pass grows
outside every outline - is in neither plane and is not held against the ring;
the stricter reading, "any pre-ring ink under the fillet that is not carrier
ink", was measured too and rejected the outer seat of `أسماء` in Kufi and of
`أمير` in `minimal` on a single pixel each.

`apps/jobs/scripts/render-stencils.mts` re-derives the same rule without
importing it: it shapes the outlines itself from the pinned bytes, decodes the
rings-off render, and attributes each pre-ring pixel under a fillet by
point-in-polygon, with the carrier the report names winning wherever contours
overlap (Arabic letters join, and a letter's counter is a contour nested inside
its body) out to the published `IDENTITY_THICKEN_PASSES`. A bar ring's fillet is
excused only over the rail, which the harness rebuilds from the reported
pre-ring glyph box and the published bar constants.

```
corepack pnpm --filter @jewelo/jobs render-stencils \
  docs/goals/overnight-launch/lab/stencils/production
```

```
MATRIX FILLET-FOREIGN 0/576 cells have pre-ring ink of another contour under a weld fillet
MATRIX WELDED-GLYPH 0/576 cells have ink welded into ring metal
```

Before the fix the same harness, with the same rule, reported
`MATRIX FILLET-FOREIGN 49/576`, worst `li-ar-minimal:1289`, `omar-en-classic:242`,
`qq-en-classic:215`, while the engine still reported `welded 0` on every one of
them.

`fillet3.mts` rerun over its ten mark-carrying names in all six styles, with its
two absolute imports repointed from the reviewer's worktree to this checkout -
otherwise it would measure the engine that worktree holds - and nothing else
changed:

```
for st in classic minimal diwani signature kufi thuluth-inspired; do
  tsx <scratchpad>/fix5/fillet3.mts $st
done
```

60 cells: 56 welded and 4 on the bar. Every welded cell reports
`owners[...]` with no `cls3` entry at all - the madda of `آية`, the hamza of
`أمير` and `أسماء` and the damma of `مُحَمَّدٌ` are whole and the rings sit on
letter strokes. The four bar cells (`آية` in `classic`, `diwani` and
`signature`, `مُحَمَّدٌ` in `thuluth-inspired`) do report `cls3` under the fillet -
271, 271, 271 and 9 pixels - because `fillet3.mts` predates the bar rule and
does not know the rail: a bar ring's fillet foot sits inside the rail, and the
rail grips the topmost ink of the name along its whole span by construction.
That ink is the joint, not a swallowed mark, and the piece still measures one
component with the mark whole (`<scratchpad>/fix5/aya-ar-classic.png`).

The `أمير` line the review printed as
`ring1 filletLen=148 preInkUnderFillet=3178 owners[4:0:cls3=1540 5:0:cls1=761]`
now reads `owners[5:0:cls1=...]` alone.

`carriers.mts` rerun unchanged (same two import paths). Its `minH` column is the
*old* rule written out inside the probe, so it still prints the defect: on `أمير`
in `minimal` it shows `minH263` disqualifying the three base glyphs of heights
261, 227 and 193 and leaving one carrier. The engine's own answer for the same
cell is now `carrier 0:0@0,4:0@0` with a span ratio of 0.87.

### Blocker 2. Two rings, two ends

The height floor a carrier contour has to clear is measured against the tallest
*base* glyph of the run now, not against the run's ink box, so a madda or a
damma can no longer raise the floor above the letters the ring hangs from
(`IDENTITY_RING_CARRIER_MIN_TALLEST_HEIGHT_FRACTION`). The pair is chosen
jointly: the left ring works inward from the leftmost base glyph and the right
ring inward from the rightmost, the two may not settle on the same glyph while
any other glyph of the run carries a contour a ring could sit on, and the left
glyph must sit left of the right glyph on the canvas. When no such pair has a
clean seat the piece goes to the bar rather than sharing a glyph. Each ring
records which entry of its side's candidate list it used
(`glyphIndex:contourIndex@candidateIndex` in every `CELL` line and in
`construction.ringCarriers`), which is minor 3: `-Ali-` steps inward and says so.

`identity_ring_span_too_narrow:span=S,min=M` is the measurement on the decoded
PNG: the distance between the two ring hole centroids against
`IDENTITY_RING_MIN_SPAN_FRACTION` of the measured ink width of the finished
piece.

The 18 cells the review names, before and after (ratio of ring separation to
measured ink width; before is this pass's own measurement of the reviewer's
frozen `adv4/matrix/matrix` PNGs against the ring centres its
`matrix-report.json` records):

| cell | before | after | after placement |
| --- | --- | --- | --- |
| `niki-ar-minimal` | 0.091 | 0.72 | welded 0:0@0, 3:0@0 |
| `tasneem-ar-minimal` | 0.091 | 0.91 | bar |
| `maji-ar-classic`, `-diwani`, `-signature` | 0.095 | 0.79 | welded 1:0@0, 5:0@0 |
| `ali-ar-classic`, `-diwani`, `-signature` | 0.096 | 0.63 | welded 1:0@0, 3:0@0 |
| `titi-ar-thuluth-inspired` | 0.104 | 0.91 | bar |
| `tasneem-ar-thuluth-inspired` | 0.109 | 0.59 | welded 1:0@1, 4:0@0 |
| `taim-ar-minimal` | 0.112 | 0.82 | welded 0:0@0, 2:0@0 |
| `taim-ar-thuluth-inspired` | 0.129 | 0.31 | welded 1:0@1, 2:0@0 |
| `li-ar-classic`, `-diwani`, `-signature` | 0.137 | 0.84 | welded 1:0@0, 2:0@0 |
| `titi-ar-minimal` | 0.139 | 0.63 | welded 0:0@0, 3:0@0 |
| `shams-ar-minimal` | 0.169 | 0.69 | welded 0:0@0, 2:0@0 |
| `amir-ar-minimal` | 0.235 | 0.87 | welded 0:0@0, 4:0@0 |

Over the whole 576-cell matrix the ratio went from `min 0.091 p05 0.448 p50
0.857`, with 19 cells below 0.30, to `min 0.307 p05 0.505 p50 0.846` with none.
The floor is 0.25: below the smallest measured piece by 5.7 points, above 17 of
the 19 collapsed cells, and reached by nothing in the corpus - the collapse is
prevented by the placement rule and this gate is the measurement that says so.
`-Ali-` in `classic` measures 0.480, which the review calls out as legitimate.

A one-letter name is the only input the placement rule lets the two rings share
a glyph on, and refusing it would be refusing a customer's name, which D-020
does not do: the shared-glyph pair is measured against the same fraction before
it is drawn and the piece goes to the bar instead. No cell of the 576-cell
matrix shares a glyph, so nothing that hangs from two letters passes through
that branch, and the 16 production stencils reproduce byte for byte with it in
place (`<scratchpad>/fix5/reproduce.mts`, `REPRODUCED 16/16`).

```
tsx <scratchpad>/fix5/span-probe.mts
ب ar minimal placement=bar    span=752.0 inkW=837 ratio=0.898
ا ar classic placement=welded carriers=0:0@0,0:0@0 span=79.0 inkW=164 ratio=0.482
O en classic placement=welded carriers=0:0@0,0:0@0 span=167.0 inkW=575 ratio=0.290
```

The gate itself is driven the other way by a negative probe: one copy of the
engine that differs from the committed one in a single named way, the
shared-glyph pre-check removed, so both rings really do land on one stroke.

```
tsx <scratchpad>/fix5/neg/span-negative.mts
ب ar minimal        THREW identity_ring_span_too_narrow:span=83,min=199
ج ar minimal        THREW identity_ring_span_too_narrow:span=154,min=155
ق ar kufi           THREW identity_ring_span_too_narrow:span=129,min=146
ل ar thuluth        THREW identity_ring_span_too_narrow:span=84,min=121
ه ar classic        THREW identity_ring_span_too_narrow:span=83,min=128
```

### Major 3. The bar fallback, taken

Option A. The rail is now as wide as the weld fillet it carries
(`IDENTITY_RING_BAR_WIDTH = IDENTITY_RING_WELD_WIDTH`), because at 24 px the
39 px fillet's foot reached rows of the name the rail did not grip - 67 pixels
of the madda of `آية`. Its rings are placed at the lowest row at which both of
them punch nothing and carry no letter under their metal, searched from the rail
upward instead of clamped to the canvas margin, and the punch test runs against
the name *and* the rail, because a ring seated so low that its hole bites the
rail both shrinks the hole and cuts the rail in two (`إيج` in
`thuluth-inspired` did exactly that at 1503 px against a floor of 1629).

It is not a probe-only path: 20 of the 576 matrix cells are built on the bar,
led by `آية` in `classic`, `diwani` and `signature`, where the madda covers the
whole top of the alef at one end and the search will not weld through it.

```
MATRIX BAR-FALLBACK 20/576: omar-ar-thuluth-inspired aya-ar-classic aya-ar-diwani
aya-ar-signature tasneem-ar-minimal titi-ar-thuluth-inspired li-ar-thuluth-inspired
ij-ar-thuluth-inspired qq-ar-classic qq-ar-minimal qq-ar-diwani qq-ar-signature
bartholomewsonlongest-en-classic bartholomewsonlongest-en-minimal
bartholomewsonlongest-en-diwani bartholomewsonlongest-en-signature
bartholomewsonlongest-en-kufi bartholomewsonlongest-en-thuluth-inspired
salem-ar-thuluth-inspired shaikha-ar-thuluth-inspired
```

Every one of them measures one piece, two ring holes above the lettering,
`punched 0 welded 0 foreign 0`, and every hole at or above the floor. `acb2706`
routes a `bar` construction to operator review before spend, so none of them
reaches a customer as the welded piece the lab proved.

### Major 4. What GDEF decides, and where it decides nothing

`<scratchpad>/fix5/gdefmargin.mts` shapes the 48-name matrix corpus on all six
live faces and counts what the font actually says:

```
kufi/en    cairo.ttf                 glyphs=259 classes=[[0,259]]            class3=0
minimal/ar ScheherazadeNew-Regular   glyphs=207 classes=[[1,199],[2,1],[3,7]] class3=7
thuluth/ar rakkas.ttf                glyphs=196 classes=[[0,1],[1,193],[2,2]] class3=0
classic/ar NotoNaskhArabic-Regular   glyphs=286 classes=[[1,201],[3,85]]      class3=85
kufi/ar    NotoKufiArabic-Regular    glyphs=286 classes=[[1,201],[3,85]]      class3=85
classic/en PlayfairDisplay-SemiBold  glyphs=259 classes=[[1,259]]             class3=0
```

So the claim "excluded by the font's own glyph data, never by a pixel-area
threshold" holds on the two Noto faces and nowhere else. What holds everywhere
is the tie-break: the carrier is the largest contour by area of the glyph, and a
dot is never that. The two fractions only refuse a glyph whose largest contour
is not letter-like, and their margin is measured:

```
smallest height fraction reached by a real letter body, per face
cairo 0.714  ScheherazadeNew 0.472  rakkas 0.508  Naskh 1.000  NotoKufi 1.000
PlayfairDisplay 0.435 (the w of the longest stress name)
tallest satellite contour where a dot is its own contour
cairo 0.129 (Shaikha)  NotoKufi 0.108 (Moza)
```

0.435 against a floor of 0.4 is 3.5 points, which is thin, so the floor is 0.3:
real bodies clear it by 13.5 points and the tallest dot contour is 17 points
below it. Lowering it cannot let a dot take a ring, because the largest contour
of a glyph is always admitted by it and a dot is not the largest contour; what
it stops is a letter being refused for no reason. `shaping.ts`, the engine
manifest, the engine README and the D-020 detail in
`docs/DECISION-REGISTER.md` all say this now instead of the old claim.

### Major 5. The bare `measure-stencils` cross-checks the claim

`DEFAULT_DIR` is `docs/goals/overnight-launch/lab/stencils/production` and
`DEFAULT_MANIFEST` is `render-report.json`, so the invocation with no arguments
reads the solver report and runs the cross-check.

```
corepack pnpm --filter @jewelo/jobs measure-stencils
```

```
SINGLE-PIECE 16/16
MATCH 16/16
CLAIM 16/16
```

Before this the same command printed `MATCH 16/16 CLAIM -/-` against
`stencils/lab`, last written in `7b76e5a` with pre-D-020 hole sizes.

The other half of major 5 is the stale ringed PNGs. `stencils/lab/` is not
touched: its own `lab-manifest.json` names `make_stencil.py`, the Python lab
renderer, as its generator, so those files are lab-sourced and are inputs to the
prompt lab. `stencils/manifest.json` marks exactly four files as
`stencil_source: production` - `asma-ar-classic.png`, `noor-ar-classic.png`,
`layla-ar-classic.png` and `muhammad-ar-classic.png` - and both their bytes and
their manifest rows predated D-019, let alone D-020: the rows still described a
1485x805 Pango render on engine release `caleums-arabic-v3` while the files on
disk were 1024x1024. They are byte copies of the freshly rendered production
stencils now and their rows carry that render's own report, which
`measure-stencils docs/goals/overnight-launch/lab/stencils manifest.json`
confirms as `MATCH 32/32`. Every lab-sourced file in that directory is
unchanged.

The third ruler, the Python oracle, reads the regenerated production stencils
and agrees with `report.measured` on ink, components, holes, hole sizes,
bounding box and canvas, and finds no enclosed region at or below the pinhole
floor:

```
<scratchpad>/p3-3/venv/bin/python <scratchpad>/fix5/oracle.py
PYTHON ORACLE AGREES 16/16
```

### Minors

2. An enclosed region at or below `IDENTITY_STENCIL_PINHOLE_MAX_AREA` is a
   casting pinhole. Measured pass by pass, the cause is the ring pass alone -
   the same names carry none after thickening and after bridging and one to
   seven once the rings and their fillets are drawn - so `fillPinholes` runs on
   the finished raster after the recentre, where every pass that can make a void
   has already run, and `identity_stencil_pinhole:count=N` refuses any that
   survive into the encoded bytes. The floor is the gap in the corpus: over the
   576 finished pieces the 2270 enclosed regions run 9, 10, 11 ... 15 and then
   jump straight to 23, so 16 closes every void on the low side of that gap and
   leaves the smallest legitimate region 44% above it. The review found the two
   `muhammad-en` cells because the reported hole list is capped at eight
   entries; the real count before this was 29 regions at or below 16 px spread
   over the matrix.
3. Each ring records its candidate index; see blocker 2.
4. `IDENTITY_RING_MAX_LIFT` is 320 rows, not the canvas. The deepest lift any
   accepted seat used over the matrix is 144 rows (`zoe-en-kufi`), and
   `seatSearchSteps` is reported per piece: `min 4 max 216080 mean 5793`.

### The whole run, and what it costs

```
export PATH=$HOME/.local/share/mise/installs/node/24.18.1/bin:$PATH
corepack pnpm --filter @jewelo/jobs render-stencils \
  docs/goals/overnight-launch/lab/stencils/production
```

```
LUMINANCE 16/16
SINGLE-PIECE 16/16
WELDED-GLYPH 0/16 lab cells have ink welded into ring metal
MATRIX SINGLE-PIECE 576/576
MATRIX MOVED-INK 0/576
MATRIX RECENTRE-DOWNSCALED 377/576
MATRIX WELDED-GLYPH 0/576 cells have ink welded into ring metal
MATRIX RING SPAN RATIO min 0.307 p05 0.505 p50 0.846 max 0.941 over 576 cells
MATRIX FILLET-FOREIGN 0/576 cells have pre-ring ink of another contour under a weld fillet
MATRIX PINHOLES 0/576 cells carry an enclosed region of 16 px or less
MATRIX SEAT-SEARCH steps min 4 max 216080 mean 5793; deepest accepted lift 144 rows (zoe-en-kufi.png)
MATRIX BAR-FALLBACK 20/576
MATRIX RING HOLE FLOOR 576/576 cells have every ring hole at or above 90% of the ideal area
MATRIX RINGS 576/576 cells have exactly 2 ring holes, each clear of the stroke it is welded to, with no punched-out and no welded-in ink
MATRIX RING HOLE SIZE min 1408 max 1792 mean 1686
```

Exit code 0. Eight of the sixteen production stencils changed bytes; the other
eight are byte-identical to `f221b44`, which is what it looks like when a fix
touches only the cells that were wrong.

The one number that is worse than before: the placement search costs up to
216080 seats on a name where several carriers have to be tried before a pair
works, against a mean of 5793. It is bounded now (`IDENTITY_RING_MAX_LIFT`),
and it is spent once per pendant, before any provider call.

## Fix pass 6 (P1-5), 8 September 2026

Closes `docs/goals/road-to-gold/reviews/identity-engine-adversarial-5.md`: two
blockers, two of the three majors, and minors 1, 2 and 4.
Major 4 is a product question for Omran and is left open on purpose; the
presentation layer's routing is untouched.
Every number below is a measurement of the run named above it.

### Blocker 1. The two rings hang level, and a gate measures it

The pass-5 search took the first clean seat on the left, then the first clean
seat on the right, and never looked at the shape the two of them made together.
Over the 547 welded cells of pass 5 the line through the two holes was p50 4.7
degrees off horizontal, p90 15.3, p95 23.9, max 64.7; `لي` in `minimal`, a live
style, hung at 64.7 degrees with every gate green.

Three changes, in the order they matter.

1. The anchor is a ladder, not a point (`carrierAnchors`). Every rung is a
   column of the carrier contour's load-bearing metal and the topmost pixel of
   that column - the outer edge of the stroke first, then inward one
   `IDENTITY_RING_ANCHOR_SHOULDER_STEP` at a time, with the lab's own anchor
   (the topmost row of the contour) placed among them by its column.
2. `findSeat` returns the column it settled on **and every row above the seat
   that is also clean**, not just the first clean seat, so a ring can be raised
   to meet its partner.
3. `addRings` scores pairs. Every left carrier x left rung x right carrier x
   right rung the ordering rules allow is scored on the finished shape, in this
   order: whether it breaks the overhang gate, whether it breaks the tilt gate,
   the tilt, how far the two rings sit from the top line of the name, the worse
   side's overhang, and last the metal lifted off the letters. The rows within
   the two ladders are chosen by the same idea: most level first, then nearest
   the name's top line.

The fourth key is not decoration. Without it the search answered "the outermost
rung that works", and `Ali` in `classic` came out level, balanced, and hanging
from the bottom serifs of the `A` and the `i` - a pendant that reads upside
down. The top line of the name's own ink is where a jump ring belongs.

The gate is `identity_ring_tilt_too_steep:deg=D,max=M`, measured on the decoded
PNG as the angle of the line through the two ring hole centroids off horizontal.
`IDENTITY_RING_MAX_TILT_DEGREES` is 15: that line is the line the chain makes,
so it is the angle the name reads at on the neck, and past about 15 degrees a
piece reads as sideways rather than as tilted. It is not fitted to the corpus.

Tilt over the 576-cell matrix, before and after:

| | p50 | p90 | p95 | max |
| --- | --- | --- | --- | --- |
| pass 5, 547 welded cells | 4.7 | 15.3 | 23.9 | 64.7 (`li-ar-minimal`) |
| pass 6, 568 welded cells | 0.0 | 0.0 | 0.0 | 11.7 (`li-en-kufi`) |

The only cells above 1 degree are `li-en-kufi` 11.7, `noor-ar-kufi` 11.0,
`muhammad-ar-thuluth-inspired` 7.3, `omar-ar-thuluth-inspired` 5.1,
`jiji-ar-thuluth-inspired` 4.7, `li-ar-kufi` 3.8 and the three `layla-ar` Naskh
cells at 3.2. One cell fails the gate: `ij-en-kufi` at 18.1, a two-letter stress
string in Latin Kufi whose ring columns are 230 px apart, so 76 rows of
difference is already 18 degrees. It is refused, not shipped.

### Blocker 2. A ring near each end, and a gate measures that too

`identity_ring_overhang_too_wide:side=S,fraction=F,max=M` measures the ink
outside the nearer ring hole on each side, over the measured ink width, on the
decoded PNG. `IDENTITY_RING_MAX_OVERHANG_FRACTION` is 0.30: past a third of the
piece hanging off one side, the pendant tips instead of hanging.

What made the pass-5 collapse possible was the single anchor. A letter that
carries dots directly above it - the ta marbuta of `عائشة` and `موزة`, the final
qaf, the shin of `شمس` - has no clean corridor from a ring down to its one
anchor point, because the ring is seated a little outward of the anchor and the
fillet then runs back under the dots; the search's only move was to step inward
to the next letter, and with both sides doing that both rings ended in one
corner. On a bowl the outer column's top is most of a letter-height below the
topmost row and out from under the dots, so the ring lifts above the dots and
the fillet lands on the letter's outer shoulder from above.

Overhang over the matrix, worst side per cell:

| | p50 | p90 | p95 | max |
| --- | --- | --- | --- | --- |
| pass 6, 568 welded cells | 0.041 | 0.117 | 0.164 | 0.288 (`jiji-en-kufi`) |

One cell fails: `salem-ar-thuluth-inspired` at 0.306, where Rakkas climbs so
steeply that the last letter offers no load-bearing metal near the end of the
piece. It is refused.

The names the review named, in the two live-adjacent styles it asked for
(`<scratchpad>/fix6/names2.mts`, 43 Arabic and 20 Latin names x `classic` and
`minimal`, 126 cells, 126 welded, 0 refused, every tilt 0.0):

```
عائشة ar classic  span 0.917 tilt 0.0 over 0.041  cand 0/0
عائشة ar minimal  span 0.917 tilt 0.0 over 0.041  cand 0/0
موزة  ar classic  span 0.917 tilt 0.0 over 0.041  cand 0/0
موزة  ar minimal  span 0.917 tilt 0.0 over 0.041  cand 0/0
آمنة  ar classic  span 0.722 tilt 0.0 over 0.233  cand 0/1
آمنة  ar minimal  span 0.897 tilt 0.0 over 0.056  cand 0/0
فاطمة ar classic  span 0.917 tilt 0.0 over 0.041  cand 0/0
فاطمة ar minimal  span 0.917 tilt 0.0 over 0.041  cand 0/0
رقية  ar classic  span 0.917 tilt 0.0 over 0.041  cand 0/0
رقية  ar minimal  span 0.914 tilt 0.0 over 0.043  cand 0/0
شمس   ar classic  span 0.917 tilt 0.0 over 0.041  cand 0/0
شمس   ar minimal  span 0.917 tilt 0.0 over 0.041  cand 0/0
خالد  ar classic  span 0.917 tilt 0.0 over 0.041  cand 0/0
خالد  ar minimal  span 0.917 tilt 0.0 over 0.041  cand 0/0
آلاء  ar classic  span 0.907 tilt 0.0 over 0.046  cand 0/0
آلاء  ar minimal  span 0.895 tilt 0.0 over 0.057  cand 0/0
قق    ar classic  span 0.911 tilt 0.0 over 0.044  cand 0/0
قق    ar minimal  span 0.897 tilt 0.0 over 0.051  cand 0/0
```

Against pass 5, where the same names measured overhang 0.66, 0.570, 0.636,
0.498, 0.564 and 0.426 and `قق` had no welded seat at all. The ring hole
separation gate moved with them: `MATRIX RING SPAN RATIO min 0.516 p05 0.791
p50 0.917 max 0.934`, against `min 0.307 p05 0.505 p50 0.846` in pass 5.

### Major 3. The rail is deleted, not repaired

Option B. The rail was measured, not repaired, and it was not a load path: on
`قق` it touched the name along 11% of its span so the pendant hung from the two
nuqta of the final qaf through a 24 px bridge, on `آية` in `classic` it covered
37.6% of the madda, on `تسنيم` in `minimal` it touched 11%, and no gate scanned
under it. Making it honest means bridging the rail down to every base glyph and
scanning under the rail exactly as a fillet is scanned - the weld machinery a
second time, with weaker evidence - and the object that comes out is a nameplate
on a bar, a different product the shop has never approved. Whether that product
is sellable is major 4, and building one does not answer it.

So `drawBarSuspension` is gone, `IDENTITY_RING_BAR_WIDTH` and
`IDENTITY_RING_BAR_DEPTH` are gone, and `IdentityRingPlacement` is `welded` or
`none`, where `none` means a construction that carries its own suspension and
never a failure. A name that cannot seat two rings under the gates raises
`identity_no_ring_seat`, which reaches the caller as a terminal pre-spend block
with a code and no customer text - the same routing, and the same outcome for
the shopper, that `identity_bar_fallback` already produced with its default on,
without a piece that pretends to be a pendant.

The proof is the 20 cells pass 5 sent to the bar. Thirteen of them are welded
now, level, balanced, and on the outermost carrier of each side:

```
omar-ar-thuluth-inspired  welded 0:0@0,2:0@0  span 0.91 tilt 5.1 over 0.044
aya-ar-classic            welded 1:0@0,5:0@0  span 0.90 tilt 0.0 over 0.050
aya-ar-diwani             welded 1:0@0,5:0@0  span 0.90 tilt 0.0 over 0.050
aya-ar-signature          welded 1:0@0,5:0@0  span 0.90 tilt 0.0 over 0.050
tasneem-ar-minimal        welded 0:0@0,4:0@0  span 0.92 tilt 0.0 over 0.041
titi-ar-thuluth-inspired  welded 0:0@0,2:0@0  span 0.77 tilt 0.0 over 0.187
li-ar-thuluth-inspired    welded 0:0@0,1:0@0  span 0.87 tilt 0.0 over 0.065
ij-ar-thuluth-inspired    welded 0:0@0,2:0@0  span 0.86 tilt 0.9 over 0.068
qq-ar-classic             welded 1:0@0,3:0@0  span 0.91 tilt 0.0 over 0.044
qq-ar-minimal             welded 0:0@0,1:0@0  span 0.90 tilt 0.0 over 0.051
qq-ar-diwani              welded 1:0@0,3:0@0  span 0.91 tilt 0.0 over 0.044
qq-ar-signature           welded 1:0@0,3:0@0  span 0.91 tilt 0.0 over 0.044
shaikha-ar-thuluth-inspired welded 0:0@0,2:0@0 span 0.69 tilt 0.0 over 0.268
```

Seven are refused: `salem-ar-thuluth-inspired` on overhang, and the six
`bartholomewsonlongest-en-*` cells on `identity_no_ring_seat` - a
21-character stress string, not a name. `ij-en-kufi` is refused on tilt; in pass 5 it
shipped welded with its two holes 28.5 degrees out of level (rings at 351,151
and 636,306), which is the failure this pass exists to find. That is 8 refusals in 576 cells, 1.4%, against
20 bar cells, 3.5%, and none of the 8 is a real customer name in a live style.

### Major 5. The harness measures, it does not agree

`render-stencils.mts` no longer imports a single placement or exemption constant
from the engine. Its header states what is still shared and why: the shaper
(the outlines come from the same pinned bytes through `shapeText` and
`identityStencilSvg`), the rasteriser (the piece under test is the PNG the
production path wrote) and the decoder (`decodeMask`). Those three are the
subject of the measurement; there is no second rasteriser to render the same
stencil twice, and a different shaper would be measuring a different pendant.
Everything else - the ownership rule, the growth radius a carrier's ownership
reaches, the ring and fillet capsule geometry and the hole floor - is restated
in this file as `HARNESS_*` constants.

And it reports the difference rather than assuming equality:

```
MATRIX WELDED-DELTA 0/568 cells where this harness and the engine disagree on welded ink
MATRIX PUNCHED-DELTA 0/568 cells where this harness and the engine disagree on punched ink
```

That is now a falsifiable statement: change `HARNESS_OWNERSHIP_GROWTH` or the
capsule width in one place and the count moves.

### Minors

1. `fillPinholes` no longer fills a counter. Every small enclosed region of the
   finished raster is traced back through the recentre transform to the raster
   as the rasteriser painted it. A region that still holds at least
   `IDENTITY_STENCIL_COUNTER_REMNANT_FRACTION` (0.05) of the counter it came
   from, scaled, is that counter and is left open, so
   `identity_stencil_pinhole` refuses the piece. Below that, the thickening
   closed the counter outright and what is left is a sliver of void, which is
   filled. Measured: thirty `e` in Kufi has a 114 px counter as the rasteriser
   paints it and 13 to 29 px in the finished piece - 0.11 to 0.25 - and every
   one of them stays open, so the piece is refused with
   `identity_stencil_pinhole:count=4` instead of coming out with four counters
   welded solid and `passed: true`. The one-pixel region in `إبراهيم` in
   `classic` is 0.0005 of the 2380 px counter it came from and is filled, which
   is what a caster does with it. `pinholesFilled` counts regions, as its own
   type doc always said it did.
2. The shared-glyph welded branch keeps its own gate margin,
   `IDENTITY_RING_SHARED_GLYPH_MIN_SPAN_FRACTION` at 0.45, because the general
   0.25 floor was justified against multi-letter pieces and `م` in `minimal`
   cleared it by 2.8%. Measured over 102 one-letter cells (`ا ب م ن ه و ي ع س
   ق` and `A B e i M O Z`, six styles each,
   `<scratchpad>/fix6/single.mts`): every one is welded on its single glyph,
   the smallest span ratio is 0.617 (`ا` in `kufi`), the largest 0.917, the
   worst tilt 9.5 degrees, and nothing is refused. The pass-5 counterexample,
   `م` in `minimal` at 0.257, measures 0.816 now.
4. `shaping.ts` cited `carrierSeats`, a function that has never existed. It
   names `carrierCandidates` and `addRings`.

### The run

```
export PATH=$HOME/.local/share/mise/installs/node/24.18.1/bin:$PATH
corepack pnpm --filter @jewelo/jobs render-stencils <repo>/docs/goals/overnight-launch/lab/stencils/production
```

```
LUMINANCE 16/16
SINGLE-PIECE 16/16
MATRIX REFUSED 8/576: ij-en-kufi.png:identity_ring_tilt_too_steep:deg=18.1,max=15 bartholomewsonlongest-en-classic.png:identity_no_ring_seat:left=6,right=6,steps=420888 bartholomewsonlongest-en-minimal.png:identity_no_ring_seat:left=6,right=6,steps=420888 bartholomewsonlongest-en-diwani.png:identity_no_ring_seat:left=6,right=6,steps=420888 bartholomewsonlongest-en-signature.png:identity_no_ring_seat:left=6,right=6,steps=420888 bartholomewsonlongest-en-kufi.png:identity_no_ring_seat:left=6,right=6,steps=434956 bartholomewsonlongest-en-thuluth-inspired.png:identity_no_ring_seat:left=6,right=6,steps=420888 salem-ar-thuluth-inspired.png:identity_ring_overhang_too_wide:side=right,fraction=0.306,max=0.3
MATRIX SINGLE-PIECE 568/568
MATRIX MOVED-INK 0/568
MATRIX RECENTRE-DOWNSCALED 518/568
MATRIX WELDED-GLYPH 0/568 cells have ink welded into ring metal
MATRIX RING SPAN RATIO min 0.516 p05 0.791 p50 0.917 max 0.934 over 568 cells
MATRIX FILLET-FOREIGN 0/568 cells have pre-ring ink of another contour under a weld fillet
MATRIX PINHOLES 0/568 cells carry an enclosed region of 16 px or less
MATRIX SEAT-SEARCH steps min 461 max 489843 mean 49258; deepest accepted lift 346 rows (muhammad-ar-thuluth-inspired.png)
MATRIX RING TILT p50 0.0 p90 0.0 p95 0.0 max 11.7 over 568 cells
MATRIX RING OVERHANG p50 0.041 p90 0.117 p95 0.164 max 0.288 over 568 cells
MATRIX WELDED-DELTA 0/568 cells where this harness and the engine disagree on welded ink
MATRIX PUNCHED-DELTA 0/568 cells where this harness and the engine disagree on punched ink
MATRIX RING HOLE FLOOR 568/568 cells have every ring hole at or above 90% of the ideal area
MATRIX RINGS 568/568 cells have exactly 2 ring holes, each clear of the stroke it is welded to, with no punched-out and no welded-in ink
MATRIX RING HOLE SIZE min 1408 max 1792 mean 1497
exit 0
```

The bare `measure-stencils`, which reads the production directory and its
manifest, and the Python oracle, which shares code with neither:

```
corepack pnpm --filter @jewelo/jobs measure-stencils
SINGLE-PIECE 16/16
MATCH 16/16
CLAIM 16/16

<scratchpad>/p3-3/venv/bin/python <scratchpad>/fix6/oracle.py
PYTHON ORACLE AGREES 16/16
```

`corepack pnpm build --force` exits 0. `corepack pnpm --filter @jewelo/identity
lint` and `--filter @jewelo/jobs lint` both exit 0 with no output.

The number that got worse: the placement search now costs a mean of 49258 seats
per piece against 5793, and up to 489843 on a name where every carrier and every
rung has to be tried. It is bounded (`IDENTITY_RING_MAX_LIFT`, six rungs, six
carriers a side), it is spent once per pendant before any provider call, and the
summed-area pre-filter added in this pass is what keeps it to seconds rather
than minutes.
