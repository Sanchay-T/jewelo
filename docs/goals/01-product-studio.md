# Goal 01 — product studio and complete UX states

## Objective

Build the responsive Jewelo customer and operator experience against typed mock gateways, implementing the approved UX corrections before real persistence/providers.

## Completion condition

A user can complete the full mocked journey on desktop and mobile: guest start, inspiration/customization, generation progress, progressive/partial results, large variation inspection, product/worn/motion tabs, refinement/run history, selected design, estimate/quote/order forms, and resume.

## Required work

- Implement the design system and routes from the product/UX docs and preview references.
- Use a large inspection canvas plus variation filmstrip; do not reduce decision-making to four tiny cards.
- Keep Product, Worn, and Motion representations linked to one variation.
- Implement loading, queued, running, partial, retrying, failed, cancelled, completed, resume, and stale/reconnect states.
- Implement zoom/pan, keyboard navigation, touch targets, explicit video controls, short-viewport fit, reduced motion, and RTL.
- Use typed gateway interfaces and deterministic fixtures; no database/provider SDK in components.
- Show honest estimate/range language and preserve previous mocked runs on refine/regenerate.
- Add visual/accessibility tests and Storybook or equivalent component-state coverage if justified.

## Constraints

No real Supabase persistence, Trigger runs, provider calls, or commerce side effects.

## Verification

Playwright happy/partial/failure/resume/refinement journeys; desktop/mobile/short viewport; keyboard; reduced motion; RTL; axe; screenshot comparison; zero console errors; UX verifier and adversarial review.

## Stop condition

Draft PR into the integration branch. Do not begin Supabase integration.
