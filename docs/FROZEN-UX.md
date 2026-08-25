# Frozen UX direction

The screenshots in `docs/previews/` are visual references, not permission to copy bugs. The product should retain the premium cream/gold character while correcting inspection, progress, accessibility, and commercial trust.

## Desktop studio

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Jewelo / design                          saved · run state · account      │
├───────────────┬──────────────────────────────────┬───────────────────────┤
│ CONFIGURE     │ INSPECT                          │ DIRECTIONS / RUN      │
│ identity      │ large selected media             │ direction filmstrip  │
│ material      │ Product · Worn · Motion          │ task-level progress  │
│ dimensions    │ zoom · compare · identity proof  │ retry · run history  │
│ reference     │                                  │                       │
├───────────────┴──────────────────────────────────┴───────────────────────┤
│ estimate / generate / select / quote action                              │
└──────────────────────────────────────────────────────────────────────────┘
```

## Mobile studio

```text
TOP BAR
IDENTITY SUMMARY
LARGE MEDIA STAGE
Product · Worn · Motion
DIRECTION FILMSTRIP
PRIMARY ACTION
CONFIGURE and RUN DETAILS in accessible sheets
```

## Required state design

Each representation can be `queued`, `generating`, `ready`, `retrying`, `failed`, `cancelled`, or `unavailable`. The UI must not present placeholders as selectable finished output.

```text
Direction 1  Product ready   Worn ready      Motion ready
Direction 2  Product ready   Worn generating Motion unavailable
Direction 3  Product retry   Worn blocked     Motion blocked
Direction 4  Product ready   Worn ready       Motion queued
```

## Interaction requirements

- One large inspection surface; four directions live in a filmstrip.
- Product, worn, and motion are linked representations of one direction.
- Zoom supports pan, wheel, pointer, keyboard, and touch.
- Motion navigation and scrubbing use separate controls/gesture zones.
- A customer can leave generation and resume later.
- Regeneration preserves run history; refinement creates a new revision.
- Estimate ranges clearly state assumptions and confidence.
- Every meaningful action has disabled, loading, success, retry, and error behavior.

## Accessibility gates

- Full keyboard operation and visible focus.
- 44px minimum touch targets for icon-only controls.
- Reduced-motion behavior and pauseable autoplay.
- Useful live-region status without repetitive announcements.
- Status never encoded by color alone.
- Correct semantic direction and layout testing for Arabic/RTL.
- Text alternatives for generated media and explicit identity text outside images.
- Responsive verification on short mobile viewports, not only common screenshots.
