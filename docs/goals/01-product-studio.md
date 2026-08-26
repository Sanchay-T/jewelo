# Goal 01 — product studio and complete UX states

## Objective

Build the responsive Jewelo customer and operator experience against typed mock gateways, implementing the approved progressive four-variation experience before real persistence/providers.

## Completion condition

A user can complete the full mocked journey on desktop and mobile: guest start, inspiration/customization, generation progress, four independently arriving directions, large variation inspection, product/worn/motion views, partial/retry/failure states, refinement/run history, selected design, estimate/quote/order forms, and resume.

## Required work

- Implement the design system and routes from the product/UX docs and preview references.
- Use the approved libraries:
  - Motion for presence/layout/state transitions and reduced-motion behavior;
  - Embla Carousel for the direction filmstrip;
  - `react-zoom-pan-pinch` for real pointer/wheel/keyboard/touch inspection;
  - `react-dropzone` for reference selection;
  - native `<video>` for short MP4 motion previews.
- Use one large inspection canvas plus variation filmstrip; do not reduce decision-making to four tiny cards.
- Keep Product, Worn, and Motion representations linked to one variation ID and identity fingerprint.
- Model each representation independently as `queued`, `generating`, `verifying`, `ready`, `retrying`, `failed`, `cancelled`, or `unavailable`.
- Simulate real progressive concurrency:
  - four product slots begin together;
  - the first product may arrive while three remain active;
  - its worn and motion preview begin immediately;
  - sibling timing/failure never blocks a ready direction.
- Preserve slot dimensions and animate skeleton -> real asset without grid reflow or distracting entrance effects.
- Never use fake percentage completion. Use actual task/state counts and meaningful status copy.
- Implement zoom/pan, keyboard variation navigation, 44px touch targets, explicit video play/pause/scrub/previous/next controls, short-viewport fit, reduced motion, and RTL.
- Separate video scrubbing from variation navigation gesture zones.
- Implement honest queue backpressure states, including a mock fal capacity of two while four previews are requested.
- Use typed gateway interfaces and deterministic fixtures; no database/provider SDK in components.
- Show honest estimate/range language and preserve previous mocked runs on refine/regenerate.
- Add component-state coverage through Storybook or an equivalent documented test harness when it improves reviewability.

## Timing fixtures

Include deterministic scenarios:

```text
fast-all        four products overlap; downstream worn/motion fan out progressively
slow-sibling    one product is slow while three complete
partial         one product permanently fails
quota-2         only two motion previews run while two remain queued
retry           one identity failure retries independently
resume          page reload reconstructs the same run
cancel          queued/dependent tasks stop; ready assets remain
```

## Constraints

No real Supabase persistence, Trigger runs, OpenAI/fal calls, or commerce side effects. Do not import provider SDKs into the UI.

## Verification

- Playwright happy/partial/quota/retry/failure/resume/refinement/cancel journeys;
- desktop, mobile, short viewport, keyboard, touch assumptions, reduced motion, RTL;
- axe accessibility checks;
- screenshot/visual comparison;
- zero console/network errors;
- assert first product is visible before mocked batch completion;
- assert worn/motion state belongs to the correct variation;
- assert unfinished output cannot be selected;
- UX verifier and fresh adversarial review.

## Stop condition

Open a draft PR into the integration branch. Do not begin Supabase integration or Goal 02.
