# UX audit and redesign decisions

This is a product-level audit of the MVP journey, not an instruction to reproduce its implementation.

## High-severity problems corrected

### 1. Four small cards are not an inspection experience

Detailed jewelry cannot be evaluated in four equal small squares. The new studio uses one large selected canvas and a compact variation filmstrip. Product, worn and motion are tabs for the same direction.

### 2. The interface can imply a result exists when it does not

Empty and pending slots must not be selectable. Each representation has an explicit state: queued, generating, ready, retrying, failed or unavailable. The primary action is enabled only for a ready direction.

### 3. Generation is treated too much like a single success/failure

The new progress rail reports each task independently. Successful product images remain available if a worn image or video fails. Retry acts on the failed unit only.

### 4. Regeneration destroys trust when it replaces prior work

A new generation creates a new run. Run history is retained, named and comparable. “Refine this direction” is distinct from “Create four fresh directions.”

### 5. Product, worn and motion can drift from one another

Every representation visibly carries the same variation ID and canonical identity fingerprint. The customer can open an identity panel and compare the exact name geometry.

### 6. Motion interactions conflict

Scrubbing and horizontal navigation should not compete for the same gesture. The redesign uses explicit previous/next controls, a large scrub target and optional keyboard/swipe navigation outside the scrub region.

### 7. Portrait video can overflow short viewports

The 9:16 stage is constrained by both available width and height (`min()` sizing). Controls remain outside the media and do not cover the jewelry.

### 8. “Pinch to zoom” must be real

The production viewer should use a tested pan/zoom implementation with pointer, wheel, keyboard and touch support. A simple scale toggle without panning is not sufficient.

### 9. Price certainty is overstated

The configurator shows a clearly labeled estimate range. Final quote/order snapshots include assumptions, gold-price timestamp, modelled weight and confidence. Exact pricing is not presented until the business rules allow it.

### 10. Long waits lack an exit path

Customers can leave safely, receive a completion notification and resume. The generation run is not tied to the browser request.

## New desktop information architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Jewelo / Design name                         saved · run status · account    │
├──────────────┬──────────────────────────────────────────┬───────────────────┤
│ CONFIGURE    │ INSPECT                                  │ DIRECTIONS / RUN  │
│              │                                          │                   │
│ identity     │  large selected representation           │  run progress     │
│ material     │  Product · Worn · Motion                  │  variation 1..4   │
│ dimensions   │  zoom · compare · identity               │  retry / history  │
│ reference    │                                          │                   │
├──────────────┴──────────────────────────────────────────┴───────────────────┤
│ estimate + generation / selected-direction commercial action               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## New mobile information architecture

```text
TOP BAR
DESIGN IDENTITY SUMMARY
LARGE MEDIA STAGE
Product · Worn · Motion
VARIATION FILMSTRIP
PRIMARY ACTION
CONFIGURE / RUN DETAILS as accessible bottom sheets
```

## Accessibility acceptance criteria

- Keyboard can reach every control and change variations/views.
- Focus remains visible against cream, gold and dark media surfaces.
- All icon-only actions have names and 44px minimum touch targets.
- Motion respects `prefers-reduced-motion` and autoplay can be paused.
- Status changes use an appropriate live region without noisy repetition.
- Text is not embedded only in images.
- Color never carries status alone.
- Media has useful alternatives and decorative elements are hidden.
- Arabic/RTL is tested structurally, not merely translated.
