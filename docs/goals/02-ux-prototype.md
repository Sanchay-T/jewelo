# Goal 02 — responsive logged-in product studio

## Completion condition

Deliver a production-quality frontend prototype of the frozen journey using typed mock services, with desktop/mobile behavior, transitions, accessibility, and every important loading/error/partial state.

## Required work

- Build the app shell, create/configure experience, generation progress, large inspection studio, linked Product/Worn/Motion tabs, direction filmstrip, run history, refinement, review, quote/order states.
- Use `docs/previews/` as visual targets while applying `docs/UX-AUDIT.md` corrections.
- Preserve 1:1 product, 4:5 worn, and 9:16 motion intent without viewport overflow.
- Implement keyboard/touch/zoom, reduced motion, RTL structural support, semantic status, and responsive short-viewport behavior.
- Keep data behind typed mock ports so Phase 03 can replace it without redesigning components.

## Verification

Playwright covers happy, partial, retry, failure, resume, and commercial paths. Capture desktop/mobile visual baselines, console/network results, accessibility checks, keyboard navigation, and reduced-motion evidence. `ux-verifier` and `adversarial-reviewer` review the rendered app.

## Stop condition

Draft PR into integration. No real database, auth provider, workflow vendor, or paid model call.
