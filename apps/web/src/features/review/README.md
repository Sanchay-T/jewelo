# Review prototype

Customer journey implementation for CALEUMS, behind `/[locale]/review`.
Does not replace live `/en`.
Does not call GPT Image 2.

Spec: `docs/CALEUMS-CUSTOMER-JOURNEY.md`.

## Run

Next (when the workspace installs): `/{locale}/review`.

Without Next:

```bash
python3 -m http.server 8771 --directory apps/web/public/review
open http://127.0.0.1:8771/preview.html#v1
```

`preview.html` is the same path as the React flow: landing → compose → sit → CAST → atelier → request.

## Files

| File | Owns |
| --- | --- |
| `still-board.ts` | look × sit × length → JPEG, sibling fallback so slots never blank |
| `vitrine.ts` | motion tokens + simulated CAST timeline |
| `StillSlot.tsx` | understudy still + veil + gold hairline + status word |
| `draft.ts` | session draft + simulated run start time |
| `ReviewExperience.tsx` | picker + six landing skins + chrome |
| `ReviewFlow.tsx` | compose, sit, atelier, request sheet |
| `copy.ts` | EN / AR strings |
| `review.module.css` | ivory / gold tokens |

Catalog stills: `apps/web/public/review/stills/`.
Look map: WINDOW=S03, HALO=S04, RAILS=S18, DROP=S16.
Sit map: bar=`normal`, drop=`downwards`, window=`in-frame`.
Rails has no drop pass; `stillSrc` shows a bar/window sibling instead of a hole.

## Constraints

- Four looks. Three sits. 22 / 32. No finish chips.
- Drop sit is upright stacked letters, never CSS-rotated 90°.
- CAST on atelier is a timer walking `queued → generating → verifying → ready`.
- Request enables at the first ready camera.
- Identity text sits outside the image.
