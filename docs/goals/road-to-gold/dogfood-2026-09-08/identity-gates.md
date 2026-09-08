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
