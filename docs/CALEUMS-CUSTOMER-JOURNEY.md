# CALEUMS customer journey

This is the customer-facing path a new session should implement against.
It is the review prototype that landed with the stills board.
It is **not** live `/en` until a landing skin is chosen.

Read this before changing compose, sit, atelier, loading, or request UI.

Related:

- Contract for the four cameras: `docs/CALEUMS-FINAL-E2E-CONTRACT.md`
- Sit / one-piece / never-blank: `docs/rnd/sit-and-size.md`
- Share wire (ASCII screens): `docs/ux-share/CALEUMS-JOURNEY-WIREFRAME.md`
- BLNG spirit, not clone: `docs/ux-share/BLNG-AUDIT.md`
- Review code: `apps/web/src/features/review/README.md`

## Path

```text
LANDING      one still · BEGIN WITH YOUR NAME
    ↓
COMPOSE      name + four look photographs
    ↓
SIT          three sit photographs · 22 | 32 · CAST THIS NAME
    ↓
ATELIER      four cameras of that one piece, filling in
    ↓
REQUEST      spelling · WhatsApp or send
```

Wait is not a separate URL.
Wait **is** atelier with veiled understudy stills.

```text
/en/review                 picker of six landing skins
/en/review/v1 … v6         landing chrome only
/en/review/{skin}/compose  name + looks
/en/review/{skin}/sit      sits + size + CAST
/en/review/{skin}/atelier  wait / first still / inspect
```

Static click-through (no Next required):

```text
apps/web/public/review/preview.html
python3 -m http.server 8771 --directory apps/web/public/review
open http://127.0.0.1:8771/preview.html#v1
```

## Locks

| Item | Lock |
| --- | --- |
| Looks | WINDOW, HALO, RAILS, DROP (photographs) |
| Sits | Bar, Drop, Window. Drop = upright stacked letters, never 90°. Bridge parked. |
| Size | 22 mm and 32 mm. Default 32. Footer on Sit, not its own page. |
| Finish / metal | No finish screen. 18K yellow, accent, 45 cm chain. |
| Style | One customer style. EN / AR is the script of the name. |
| Video | Out of this path. Dark 9:16 is a still. |
| Email | Not before gold. Needed only to send if WhatsApp is unused. |
| Generate | Four cameras of **one** chosen piece, not four competing styles. |
| Commerce | Request this piece. Not add to bag. Shopify unproved. |
| Copy | No Omran, no AI, no Generate, no Prompt, no Magic. |

Landing skins V1–V6 change **only the first screen**.
After BEGIN they share this path.
V1 Altar is the canonical landing.

## Four cameras (paid stills, later)

Independent GPT Image 2 stills of the same piece:

| UI | Profile | Ratio |
| --- | --- | --- |
| Studio | `image.packshot` | 1:1 |
| On skin | `image.worn` | 4:5 |
| Close | `image.macro_gift` | 1:1 |
| Dark | `image.dark_editorial` | 9:16 |

First verified still reveals immediately.
Siblings keep going.
Browser subscribes to Supabase.
Never poll OpenAI.
Never fake a percent.

The review prototype **simulates** those states on a timer.
It does not call GPT Image 2.

## Loading / preview-while-casting

Every photograph is a StillSlot with reserved aspect.
Never blank.

While a camera is pending, the last catalog still for `look × sit × name-length` stays in the slot (the understudy), under a cream veil and a 1px gold hairline.
When the camera is ready, the veil lifts.
Pending thumbs are not inspectable as the finished piece.
Request enables when **one** camera is ready.

Catalog preview (before CAST) is free and local:
short / medium / long stills swap as the name is typed.
That is not a paid render.

## Motion (vitrine)

Light and paper may move.
The gold's geometry may not morph, squash, scale-pop, or Ken Burns.

Easing: `cubic-bezier(0.16, 1, 0.3, 1)` for rooms, 400ms crossfade for stills.
No spring.
`prefers-reduced-motion`: instant opacity, static veil.

Libraries already in the web app: Motion, `react-zoom-pan-pinch`, CSS scroll-snap.
Do not add GSAP, Lenis, Three, shadcn, Lottie.

## What a new PC does **not** need

- `context/` WhatsApp transcripts and private media
- `.tmp/` R&D stills (gigabytes, not the customer set)
- `test-content-img-1.png`

Those stay local and untracked on purpose.

## What a new PC **does** need from this landing

- This file
- `apps/web/src/features/review/` and `apps/web/src/app/[locale]/review/`
- `apps/web/public/review/stills/` plus `preview.html`
- `docs/rnd/sit-and-size.md`
- `docs/ux-share/`
- The locked stack docs listed in `docs/START-HERE.md`
