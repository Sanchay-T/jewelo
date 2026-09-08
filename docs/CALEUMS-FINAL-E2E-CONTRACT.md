> UI reset — 5 September 2026: customer UI and prior screen/flow proposals were discarded by the user. Read `docs/START-HERE.md` and `docs/OMRAN-BUSINESS-CONTEXT.md` first. Customer-journey prescriptions below are superseded for brainstorming; retained backend contracts do not approve a new UI.

# Caleums final E2E contract

**Status:** frozen integration source of truth

**Pipeline brief:** final v5, 27 August 2026

**Pipeline release:** `caleums-final-media-v2`

**Applies to:** final Caleums implementation, verification, and release work

This document supersedes older goal examples, the one-view seed, the ZIP's
Runway transport notes, and every Studio-parent or chained-edit graph. The ZIP
remains authoritative for the approved identity solver, prompt semantics, shot
pack, ratios, and anchor source task IDs. Its expiring `<REHOST:taskId>` values
are identifiers, never usable assets.

## Customer and browser contract

The browser persists an invisible anonymous Supabase Auth session, reconstructs
designs/runs/tasks/assets after reload, receives Realtime changes with polling
fallback, and renders sibling milestones progressively. It never selects a
provider, model, prompt, style anchor, solver, or paid-call parameter.

```text
queued -> generating -> verifying -> ready
                     -> retrying -> blocked/operator review
                     -> cancelled
```

Provider keys, the Supabase service-role key, raw provider payloads, private
prompt templates, private object paths, and durable provider URLs are
server-only. Browser media access uses short-lived owner-scoped signed URLs.

## Deterministic identity gate

The versioned deterministic solver and immutable canonical pendant PNG own
approved spelling, Unicode/script normalization, glyph order, pendant geometry,
attachments, dimensions, and identity fingerprint. The PNG must exist, pass
the deterministic validation report, and be stored privately before any model
call. Models render and verify that identity; they never decide or silently
alter it.

`caleums-identity-v4` is the versioned identity engine (D-019; it replaces the
release identifier `caleums-arabic-v3`). It preserves the exact approved NFC
characters and shapes them with HarfBuzz over the bytes of the pinned font file,
opened directly and hashed into `fontSha256Measured`, never resolved by family
name; fused marks/groups, two physically connected hollow jump rings, and a hard
exactly-one-connected-component mask gate follow. `exactCharactersPreserved` is
the measurement "no glyph id 0 in the shaped buffer and every NFC code point
covered by a cluster", not an assertion. It stores an immutable PNG, checksum,
solver/font/runtime report, and fingerprint before provider-attempt reservation.

Jump-ring anchors are chosen at the outline level, before rasterisation (D-020).
For each end of the name the engine takes the outermost base glyph on the canvas
and the largest contour of that glyph's outline; a glyph the font's GDEF table
classes as a mark, and any contour too small against its own glyph or too short
against the tallest base glyph of the run, is never a carrier. That contour is
rasterised on its own to find its anchor ladder - the columns of its
load-bearing metal and the top of each, from the outer edge of the stroke
inward - and a ring is seated above a rung, lifting and shifting until its hole
punches no name ink out and no name ink lies under its metal outside the weld.

The weld exempts less than the weld metal: a pixel under the fillet is excused
only when it is metal of the carrier contour the ring is being welded to, so a
fillet that runs a stem across a madda, a hamza or a damma is refused where
before it swallowed the mark and reported the piece clean.

The two rings are chosen together, because a pendant hangs from both. The left
ring is sought from the leftmost base glyph inward and the right ring from the
rightmost inward, the two may never settle on the same glyph while another
eligible base glyph exists, and the left glyph must sit left of the right glyph
on the canvas. Every allowed pair of carriers and rungs is scored on the shape
it makes - whether it breaks a gate, then how far off level the two holes sit,
then how much of the piece hangs outboard of the nearer ring on the worse side,
then how much metal is lifted off the letters - and the best pair is the one
that is drawn.

Three measurements on the encoded bytes say whether that worked, and none of
them asks the search what it believed. `identity_ring_span_too_narrow`: the two
hole centroids sit at least a validated fraction of the finished ink width
apart. `identity_ring_tilt_too_steep`: the line through the two holes, which is
the line the chain makes, is within a validated angle of horizontal, so the name
does not read sideways on the neck. `identity_ring_overhang_too_wide`: the ink
outside the nearer hole on either side is within a validated fraction of the ink
width, so no end of the piece is cantilevered.

When no pair of carriers meets those gates the engine raises
`identity_no_ring_seat`. That is a terminal pre-spend block with a code and no
customer text, and the run goes to the shop rather than to a provider.
`ringPlacement` has three values, `welded`, `frame` and `none`; `none` means a
construction that carries its own suspension and the caller asked for no rings.
The rail that used to catch this case is gone: measured, it touched `قق` along
11% of its span and the pendant hung from two nuqta through a 24 px bridge, so
it was a picture of a suspension rather than one.

The stencil is the whole physical piece, not only the name (D-021, P2-2b). The
construction the shopper chose is a shape input to the engine and part of the
fingerprint. `classical` and `origami-ribbon` are the lettering alone - the
ribbon's folded facets are a finish, so the stencil says nothing about them and
no gate claims them. `framed-minimal` draws a rectangular frame with softly
rounded corners around the name, welded at the baseline in two places, with the
two rings in its top corners; `diamond-rails` draws a straight rail above and
below the name, welded to each in two places, with the two rings at the outer
ends of the top rail. Both are drawn from validated engine constants with the
same capsule primitive as the bridges, the name is resampled to make room for
its structure and refused with `identity_carrier_no_room` if the structure
cannot fit, and the structure may only add metal
(`identity_carrier_moved_ink`). `ringPlacement` is then `frame` and
`carrier.kind` says which structure; the report carries the rail centrelines,
the outer box, the name box, the welds and the ring anchors in pixels, so a
verifier registers the pendant the shopper chose rather than a bare name against
a photograph of a framed piece. Every ring gate above still runs on the encoded
bytes: the two rings are level by construction and the tilt is measured anyway.

The measured ring gates (`identity_ring_punched_ink`,
`identity_ring_welded_to_glyph`, `identity_ring_hole_too_small`,
`identity_ring_span_too_narrow`, `identity_ring_tilt_too_steep`,
`identity_ring_overhang_too_wide`) stay as post-draw measurements that must be
zero, or in range, for the piece that was drawn.
`identity_stencil_pinhole` is the same statement for the piece itself: an
enclosed region of a few pixels is a casting pinhole rather than a counter or a
ring hole, and the gate refuses any that survive into the encoded bytes. A
counter is never filled to get past it: every small region is traced back
through the recentre transform to the raster as the rasteriser painted it, and
one that still holds a validated fraction of the counter it came from is left
open, so a name whose counters did not cast is refused rather than welded solid.

The ring rule is not a fingerprint input. The fingerprint hashes the engine
release, the pipeline release, the script, the approved text, the style, the
layout, the connector, the measured font sha and the sha of the encoded PNG, so
any change to how a ring is seated already moves the fingerprint through the PNG
sha, and `caleums-identity-v4` continues to name this engine.

All six styles are live in both scripts since 2026-08-27: `classic` and
`diwani` and `signature` on Noto Naskh Arabic, `minimal` on Scheherazade New,
`kufi` on Noto Kufi Arabic with Cairo for its Latin column, and
`thuluth-inspired` on Rakkas, with Playfair Display SemiBold as the Latin face
for everything but Kufi. `LIVE_IDENTITY_STYLES` in
`packages/identity/src/caleums-arabic-v3.ts` is the source of truth and
`engines/caleums-arabic-v3/manifest.json` mirrors it. Amiri was retired for
`classic` on 2026-08-27 because it stacks lam-ya under HarfBuzz while the
approved renders were flat. `classic`, `diwani` and `signature` pin one face, so
their stencils are byte-identical and no verifier can tell a delivered Naskh
from a delivered diwani; DS-4 limits what the shop sells to what phase 3 proves.
Two-name Arabic layouts still enter explicit operator review before spend. The
customer-facing Contemporary selection is the UI alias for certified `classic`.
English goes through the same solver, not a separate renderer.

## Independent still graph

There is no Studio-parent image graph and no chained still edit. Each still is
an independent idempotent OpenAI Images edit request receiving, in this order:

1. the same immutable deterministic silhouette;
2. the exact pinned shot-specific style anchor;
3. an optional owner-approved inspiration image, if one exists;
4. the task's immutable compiled prompt and customer configuration;
5. canvas size/aspect as an API request parameter, never prompt prose.

Default customer fanout is concurrent and progressive:

| UI view  | Task profile           | Ratio | Provider/model                  |
| -------- | ---------------------- | ----: | ------------------------------- |
| Studio   | `image.packshot`       |   1:1 | OpenAI `gpt-image-2-2026-04-21` |
| On Skin  | `image.worn`           |   4:5 | OpenAI `gpt-image-2-2026-04-21` |
| Close Up | `image.macro_gift`     |   1:1 | OpenAI `gpt-image-2-2026-04-21` |
| Dark     | `image.dark_editorial` |  9:16 | OpenAI `gpt-image-2-2026-04-21` |

`image.studio_hero` (9:16) and `image.billboard` (16:9) are registered admin
profiles but are not part of default customer fanout. A failed sibling never
deletes or invalidates ready siblings.

OpenAI verification compares each generated still with the identity silhouette
and approved configuration. `ready` requires exact spelling/script and identity,
correct metal/stones and shot, a coherent pendant, exactly two connected jump
rings with chain attachment, and no added letters, names, charms, or duplicates.
Provider output is copied immediately into private Supabase Storage before the
verification transition.

## Style anchors

Style anchors are immutable private-storage releases with checksum, source task
ID, approval note, publication pointer, and append-only publication history.
They are never inferred, regenerated, substituted, or auto-promoted. A task pins
the exact release at creation. Missing or incomplete releases fail before spend
with `style_anchor_missing:<sourceTaskId>`.

The authoritative source task IDs are:

- worn `ee78f9a4-6ace-428c-9f12-4e6101188190`
- packshot `ddd3862a-05cb-4b95-9b6b-aa8d6453293b`
- macro gift `44f3b981-18bd-4dbf-892e-dcf3f4c9c817`
- dark editorial `ba0b8433-f0f2-4458-82c9-5d3ce88081d6`
- studio hero `d0c0bac4-d2e4-481c-8fff-c658acd807ac`
- billboard `f7de6e1b-4278-4866-97ac-865abeb89560`

## Prompt and lineage registry

Managed immutable profiles are `image.packshot`, `image.worn`,
`image.macro_gift`, `image.dark_editorial`, `image.studio_hero`,
`image.billboard`, `video.preview`, `video.final`, and
`verification.image`. `image.studio` remains readable only for legacy seeded
tasks. Draft/validate/publish/rollback/history reject unknown, malformed, or
missing `{{variables}}`; publication affects only new tasks.

The four customer-facing still profiles are published at `@v2` (P3-7): the image
lab's measured prompt family `caleums-universal-v4.3`, one release per view,
with the shot brief baked in and the pendant construction carried by the
`construction` variable. `construction` is the sixteenth prompt variable and is
allowed but never required, so every earlier release still validates.
`image.studio_hero`, `image.billboard`, `video.preview`, `video.final` and
`verification.image` stay on their earlier releases.

Every run pins the pipeline, identity engine/font, provider model, prompt and
style releases. Every task pins its ratio, dependency/input asset IDs, compiled
prompt snapshot/checksum, dispatch key, reservation, attempts, cost, and output
lineage. The initial call plus at most two automatic retries is the complete
paid-attempt budget. Cancellation and ambiguous callbacks cannot create another
paid attempt with the same idempotency key.

## Motion

Motion alone derives from one verified still. fal Seedance preview is 4 seconds,
9:16; optional final is 6 seconds. Both are 720p and submit
`generate_audio:false`. Submission request/status/result URLs are durable
server-side task lineage; Trigger polls with bounded idempotent runs, then copies
the output to private Storage. Motion failure never blocks quote, checkout,
order, or fulfillment.

## Durable boundaries and commercial safety

- Supabase owns identity, revisions, releases, runs/tasks, immutable assets,
  usage, commerce lineage, audit, outbox, RLS, Realtime, and private Storage.
- Trigger.dev owns outbox dispatch, provider-specific concurrency, durable
  polling, retry/cancel/resume, and recovery. No Redis or custom queue server.
- OpenAI handles all still generation and still verification server-side.
- fal handles video only.
- Shopify retains Draft Order/checkout/payment ownership; the accepted,
  unexpired, spelling-confirmed quote and webhook-deduplication gates remain.

Run creation reserves all default sibling cost atomically. Each provider attempt
reconciles only its own reservation and actual cost once; retry reservation is
guarded again. A pre-spend identity/anchor gate releases that task's reservation.
One active run per principal/design, daily quota, maximum reserved spend,
idempotency constraints, and ordered audit events remain mandatory.

Mock is the default zero-cost mode and exercises task/lineage/storage/state
transitions with an explicit mock anchor. Real mode remains fail-closed until
all exact anchors, credentials, account concurrency, budgets, and coordinator
paid-smoke approval are present.
