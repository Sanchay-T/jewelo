# Staging journey, deployment 08d63e17 (2026-09-08)

Driven by the lead in the in-app browser against `https://jewelo-staging-gqumd.ondigitalocean.app` (PROVIDER_MODE=mock).
The in-app browser cannot save screenshots to disk, so the record is DOM measurements plus what the lead saw.
The pane was hidden for part of the run; visual layout at 390x844 is therefore not trusted here, only the DOM numbers.

## 1440x900

- Landing, scroll 0: `sticky {top:339,bottom:1115}`, `actionBar {top:814,bottom:900}`. Same numbers as session 1; P6-1 stays open.
- Typed `Rania`, clicked "Preview my piece": no backend call (only `GET /api/state?designId=d305b6ac… 200`). Same as session 1 defect 6.
- Ticked "I confirm the spelling…": `POST /api/designs/drafts 201`, `POST /api/revisions/approve 201`, then 7 polls of `GET /api/state?designId=a141ebb2-8500-460c-9f40-e8030670831b 200` and polling stopped, i.e. the run reached a terminal state.
- Page after the run: the four tiles read "Being prepared", the caption reads "Rania · Being prepared", and the fallback copy "We could not photograph your piece here. Leave one way to reach you and we will send it." is shown with WhatsApp/Phone/Email fields.
- Every `<img>` on the page is an `asma-*.png` example (six images, natural width 1122). No mock asset is shown as the customer's piece. Honest degrade confirmed.
- No customer copy says AI, generate, prompt or magic.

## 390x844

- `scrollWidth 390 == innerWidth 390`, no horizontal overflow.
- Fallback copy top at 1970 px document offset; 8 leaf nodes read "Being prepared" (4 tiles + 4 strip labels).
- Same six example images, same alt text.

## Not done in this pass

- 1280x720, 1024x768, 768x1024, 390x600, 320x568, RTL, reduced motion: not driven this session. Phase 1 is an engine phase; the customer surface did not change since session 1, whose viewport pass stands. Full ladder is owed again when Phase 6 touches the surface.
