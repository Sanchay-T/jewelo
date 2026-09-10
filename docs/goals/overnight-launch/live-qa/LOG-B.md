# Live QA log B - staging responsive sweep and concurrency

Target: https://jewelo-staging-gqumd.ondigitalocean.app
Agent: browser-qa (session B). Isolated agent-browser sessions `liveqa-b1`, `liveqa-b2`. No source edits.
Started 7 September 2026.

Expected end state (per dispatch): remote data mode + `PROVIDER_MODE=mock`, so a real run is created but images are mock
placeholders. The honest terminal state is "Your personalized preview is being prepared. We will send it to you."
plus a contact form. Never a missing-photo dead end, never another design's photo shown as the shopper's.

Screenshots: `docs/goals/overnight-launch/live-qa/b-<width>-<step>-<what>.png`.

---
## Part 1 - Width 320x700 (session liveqa-b1)

Spec: Arabic, one name أسماء, Framed minimal, Kufi, Rose gold, Accent (Lab diamond), 32 mm, Cable.
Storage cleared before the run, so this is a fresh anonymous principal.

| # | Action | Observed | Screenshot |
| --- | --- | --- | --- |
| s01 | Open `/en/design/new` at 320x700 | Design stage. H1 "Your name, made precious.", sample `classic-Studio` = `/atelier/v1/asma-studio.png`, bottom bar "Price unconfirmed / Preview my piece". | `b-320-s01-design-start.png` |
| s02 | Click Arabic, fill name أسماء | Sample switches to `arabic` = `/atelier/v1/asma-arabic.png`. Panel "YOUR SPELLING · TEXT ONLY / أسماء" renders the Arabic correctly (no reversed or disconnected glyphs). | `b-320-s02-name-arabic.png` |
| s03 | Expand "Style & Arrangement", click Framed minimal, click Kufi | Sample = `arabic-framed-v5` `/atelier/v5/arabic-framed-studio.png`, `data-sample-exact=false`. Honest label shown: "Sample for this look" + "Sample of this framed minimal look, shown in Classic lettering. A photograph of this design is coming." Tiles for Origami ribbon / Framed minimal / Minimal / Diwani / Kufi / Signature / Thuluth carry "Sample coming". | `b-320-s03-tier1-framed-kufi.png` |
| s04 | Expand "Gold & Stones", click Rose gold, click Accent | Sample id, image src and alt are **unchanged** (`arabic-framed-v5`, same 4 files). "YOUR SELECTIONS" now reads "18K Rose gold / Accent · Lab diamond". Tier-2 never changes the displayed design: confirmed. | `b-320-s04-tier2-rose-accent.png` |
| s05 | Click "Preview my piece" | Review stage. Rows: Name أسماء · Arabic / Framed minimal · Kufi / 18K Rose gold · Accent · Lab diamond / 32 mm · Cable, each with Edit. "Personal by design. Checkout is coming soon." "YOUR PERSONALIZED PREVIEW / Confirm the spelling above and we photograph this piece with your name." | `b-320-s05-review.png` |
| s06 | Check "I confirm the spelling and selected details are correct…" | Run starts. Network: `POST /api/designs/drafts` 201, `POST /api/revisions/approve` 201, then `GET /api/state?designId=…` polling 200. Four view rows go "Waiting to start". | `b-320-s06-confirm-run-started.png` |
| s07-s08 | Wait (polled every 20 s for 2 min) | At +20 s Studio "Being prepared", others "Waiting to start". At **+40 s** all four "Being prepared" **and** the honest terminal text appeared: "Your personalized preview is being prepared. We will send it to you." plus WhatsApp / Phone / Email + "Number with country code" + "Send this to me". Stable through +120 s. No missing-photo dead end; the labelled sample stays on screen. | `b-320-s07-wait-degrade.png`, `b-320-s08-terminal-full.png` |
| s09 | Click Phone, fill `+971501234567` | Field accepts the number, "Send this to me" enabled. | `b-320-s09-contact-phone.png` |
| s10 | Click "Send this to me" | `POST /api/preview-requests` 201. Panel becomes "Saved. Our team has your request." + "Reference 60473f3e-ae53-4775-a6d6-da3b83ca1c88". | `b-320-s10-request-captured.png` |
| s11 | Click "Add to bag" | Bag drawer opens, count 1. Line: "NAME PENDANT · YOUR DESIGN / أسماء / 18K Rose gold · 32 mm / Cable / Accent · Lab diamond / Price unconfirmed", qty stepper, Edit, Remove, "Saved locally on this device. Prices are unconfirmed; no order has been placed.", "Checkout unavailable" (disabled). Thumbnail is the same framed-minimal sample that was on screen. | `b-320-s11-bag.png` |
| s12 | Reload | Full reconstruction: review stage, confirm checkbox still checked, four rows "Being prepared", "Saved. Our team has your request. Reference 60473f3e-…", bag count 1, same sample `arabic-framed-v5`. | `b-320-s12-reload.png` |

Backend truth read from `GET /api/state` with the page's own bearer (values redacted):
run `ee438d1d-9969-453b-a8a1-ef7887ddd573` status `complete`, `actual_spend_cents: 0`; five tasks
(studio/on_skin/close_up/dark `image.*`, motion_preview `video.preview`) all `ready`, attempt 1, no terminal error;
five assets of **69 bytes** (PNG) and 18 bytes (MP4) - the mock placeholders.
The UI correctly refuses to present those bytes as the shopper's photograph and shows the honest degrade instead. This is the expected end state.

- Console: **empty** (no logs, no errors). `agent-browser errors`: empty.
- Network: 88 requests, **0 failures** (no 4xx/5xx). Paths seen: `/api/designs/drafts` 201, `/api/revisions/approve` 201, `/api/state` 200 x14, `/api/preview-requests` 201, `/atelier/v5/*.png` 200, `_next/static/*` 200, supabase `/auth/v1/signup` 200.
- Visual defects at 320: none observed. Bottom bar "Price unconfirmed" wraps to two lines but does not clip or overlap "Add to bag".

## Part 1 - Width 768x1024 (session liveqa-b1)

Same spec. Storage cleared, fresh anonymous principal. Layout is two-column: left controls, right sticky preview panel; fixed bottom action bar 86 px.

| # | Action | Observed | Screenshot |
| --- | --- | --- | --- |
| s01 | Open at 768x1024 | Design stage, sample `classic-Studio`. | `b-768-s01-design-start.png` |
| s02 | Arabic + أسماء | Sample `arabic` `/atelier/v1/asma-arabic.png`, alt "Photographic أسماء example…". | `b-768-s02-name-arabic.png` |
| s03 | Framed minimal + Kufi | `arabic-framed-v5`, exact=false, "Sample for this look" badge on the photo, note "Sample of this framed minimal look, shown in Classic lettering. A photograph of this design is coming." | `b-768-s03-tier1-framed-kufi.png` |
| s04 | Rose gold + Accent | Same sample id and same four image files. "YOUR SELECTIONS" chips: Framed minimal · Kufi / 18K Rose gold / Accent · Lab diamond / 32 mm · Cable. | `b-768-s04-tier2-rose-accent.png` |
| s05 | Preview my piece | Review stage; "Confirm the spelling above and we photograph this piece with your name." | `b-768-s05-review.png` |
| s06 | Confirm checkbox | Four rows "Waiting to start". | `b-768-s06-confirm-run-started.png` |
| s07-s08 | Wait | Terminal honest degrade at **+25 s**: "Your personalized preview is being prepared. We will send it to you." | `b-768-s07-wait-degrade.png`, `b-768-s08-terminal-full.png` |
| s09 | Phone + `+971501234567` | Accepted. | `b-768-s09-contact-phone.png` |
| s10 | Send this to me | `POST /api/preview-requests` 201; "Saved. Our team has your request. Reference **b77c96d6-cfd9-4e87-81ae-fc39ed515376**". | `b-768-s10-request-captured.png` |
| s11 | Add to bag | Drawer "Your bag (1)" with the same framed-minimal thumbnail and the correct spec. | `b-768-s11-bag.png` |
| s12 | Reload | Review stage, degrade panel and reference restored; bag 1. | `b-768-s12-reload.png` |

- Console: empty. Page errors: none.
- Network: 93 requests, **0 failures**.
- Defects at 768: see "Cross-width defects" below (D1 confirm-checkbox resets on reload; D2 "Design example" label on the review stage; D3 "Asma example" caption on an أسماء photo).

## Part 1 - Width 1024x768 (session liveqa-b1)

| # | Action | Observed | Screenshot |
| --- | --- | --- | --- |
| s01 | Open at 1024x768 | Design stage, sample `classic-Studio`. | `b-1024-s01-design-start.png` |
| s02 | Arabic + أسماء | Sample `arabic`. | `b-1024-s02-name-arabic.png` |
| s03 | Framed minimal + Kufi | `arabic-framed-v5`, exact=false, labelled sibling note present. | `b-1024-s03-tier1-framed-kufi.png` |
| s04 | Rose gold + Accent | Sample unchanged. | `b-1024-s04-tier2-rose-accent.png` |
| s05 | Preview my piece | Review stage. | `b-1024-s05-review.png` |
| s06 | Confirm checkbox | Four rows "Waiting to start". | `b-1024-s06-confirm-run-started.png` |
| s07-s08 | Wait | Terminal honest degrade at **+26 s**. | `b-1024-s07-wait-degrade.png`, `b-1024-s08-terminal-full.png` |
| s09-s10 | Phone + send | `POST /api/preview-requests` 201; Reference **34f55123-59e6-4e4c-af13-c332149e3ed2**. | `b-1024-s09-contact-phone.png`, `b-1024-s10-request-captured.png` |
| s11 | Add to bag | Bag (1), correct spec. | `b-1024-s11-bag.png` |
| s12 | Reload | Reconstructed. | `b-1024-s12-reload.png` |
| s13 | Sticky-panel reachability sweep at 1024x768 | At `scrollY=0` the fixed 86 px bar covers the carousel controls ("Previous view", play/pause, "Next view"), the "Dark" tile and one "Edit" link. At 50 % and 100 % scroll nothing is covered and the whole selections panel is visible. So the short-desktop viewport hides controls **only until you scroll**; nothing is permanently unreachable. | `b-1024-s13-review-bottom-reach.png` |

- Console: empty. Page errors: none. Network: 95 requests, **0 failures**.

## Part 1 - Width 390x600 (short viewport) (session liveqa-b1)

Mobile single-column layout: the preview photo is **inline, not sticky** at this width (`position` of every ancestor is static; photo box 350x302). Fixed bottom action bar is 74 px.

| # | Action | Observed | Screenshot |
| --- | --- | --- | --- |
| s01 | Open at 390x600 | Design stage. | `b-390x600-s01-design-start.png` |
| s02 | Arabic + أسماء | Sample `arabic`. | `b-390x600-s02-name-arabic.png` |
| s03 | Framed minimal + Kufi | `arabic-framed-v5`, exact=false, labelled. | `b-390x600-s03-tier1-framed-kufi.png` |
| s04 | Rose gold + Accent | Sample unchanged. | `b-390x600-s04-tier2-rose-accent.png` |
| s04b | Scroll to page bottom on the design stage | Nothing covered by the bar (`hidden: []`), no horizontal overflow (`scrollWidth 390`), footer + "Preview my piece" both visible. Mid-scroll the bar transiently covers the stone tiles, but they scroll clear. | `b-390x600-s04b-scrolled-bottom.png`, `b-390x600-s04c-full-page.png` |
| s05 | Preview my piece | Review stage. | `b-390x600-s05-review.png` |
| s06 | Confirm checkbox | Four rows "Waiting to start". | `b-390x600-s06-confirm-run-started.png` |
| s07-s08 | Wait | Terminal honest degrade at **+26 s**. | `b-390x600-s07-wait-degrade.png`, `b-390x600-s08-terminal-full.png` |
| s09-s10 | Phone + send | 201; Reference **9e7fc5cf-77a1-4bce-bb72-28fdecfe770f**. | `b-390x600-s09-contact-phone.png`, `b-390x600-s10-request-captured.png` |
| s11 | Add to bag | Bag (1). | `b-390x600-s11-bag.png` |
| s12 | Reload | Review stage, degrade + reference restored, bag 1. | `b-390x600-s12-reload.png` |
| s13 | Overlap sweep on the review stage at 0 / 33 / 66 / 100 % scroll | Only at 33 % are "Back to design" and the "Your design" heading behind the bar; at 0 / 66 / 100 % nothing is covered. `hOverflow: false` at every position. Everything reachable by scrolling. | `b-390x600-s13-review-bottom-reach.png` |
| s14 | Re-tick the confirm checkbox after reload | Checkbox becomes checked, "Add to bag" re-enables, and **no new API call fires** (no second `/api/designs/drafts` or `/api/revisions/approve`); the stored `runId` stays `2414889c-3b03-493d-b193-5d9d33198097`. Idempotent. | `b-390x600-s14-recheck-after-reload.png` |

- Console: empty. Page errors: none. Network: 94 requests, **0 failures**.

---

## Part 2 - Concurrency, two isolated sessions at 390x844

Both sessions had `localStorage`/`sessionStorage` cleared first, so each is a distinct anonymous principal.
Clicks were interleaved: name -> construction -> lettering -> metal -> stones, alternating b1/b2, then both
"Preview my piece", then both confirm checkboxes checked from two background shells **within 1 second of each other**.

| | liveqa-b1 | liveqa-b2 |
| --- | --- | --- |
| Name / script | `Noor` / English | `نور` / Arabic |
| Construction · Lettering | Classical · Classic | Diamond rails · Kufi |
| Gold · Stones | 18K Yellow gold · No stones | 18K White gold · Partial pavé · Lab diamond |
| Illustrated sample | `classic-Studio` -> `/atelier/v1/asma-*.png` (exact=true) | `akrw-none` / `akr-white-none-*-v9` -> `/atelier/v8|v9/arabic-kufi-rails-white-none-*.png` (exact=true) |
| Principal (auth user id) | `c921b77a-3e55-4690-87b1-9c2d48194955` | `2c0e8249-fc57-4036-97ed-1dffda78d2bd` |
| Design id | `cd19556e-1e8a-402b-baca-658bb43bfc7d` | `1fa7db0e-ec53-4b21-a7ef-0d61765edbaa` |
| Revision id | `c12ab69a-8b74-4776-9b0b-a1b175472b7c` | `137c129f-570c-482d-87c5-b2108b8baf42` |
| Run id | `f01bf012-1b31-4110-a9b0-67f38855c85f` | `68a6cba9-6f94-42c0-a379-ae882a62c684` |
| Confirm clicked | epoch 1788761290 | epoch 1788761290 (same second) |
| **Time to honest terminal state** | **+27 s** | **+27 s** |
| Contact used | Phone `+971501234567` | Phone `+971509876543` |
| **Preview-request reference** | **`91f70852-28bd-401c-bc31-df78e854ea54`** | **`dc7f70d1-acc5-4463-89ac-a096491b3cc7`** |
| Console output | none | none |
| Failed requests | 0 | 0 |

Screenshots: `b-390x844-c01-b1-start.png` / `-c01-b2-start.png`, `-c02-b1-design.png` / `-c02-b2-design.png`,
`-c03-b1-review.png` / `-c03-b2-review.png`, `-c04-b1-run-started.png` / `-c04-b2-run-started.png`,
`-c05-b1-degrade.png` / `-c05-b2-degrade.png`, `-c06-b1-contact.png` / `-c06-b2-contact.png`,
`-c07-b1-captured.png` / `-c07-b2-captured.png`, `-c13-b2-final-own-design.png`.

Isolation proof, three independent ways:

1. **Different reference ids and run ids** (table above); neither reference ever appeared in the other session.
2. **Visual**: at the terminal state b1 renders "Classical · Classic / 18K Yellow gold · No stones / Noor" over the
   English Classical sample; b2 renders "Diamond rails · Kufi / 18K White gold · Partial pavé · Lab diamond / نور" over
   the Arabic Kufi rails white sample. Neither ever showed the other's construction, script, metal or photo.
3. **RLS**: each session called `GET /api/state?designId=<the other session's designId>` with its own bearer.
   Both got `200` with `designs: 0, runs: 0, tasks: 0`. Cross-tenant read returns nothing.

### Third (repeat) submission from b1, immediately after

Path: "Back to design" -> change the name to `Layla` -> "02 Review" -> tick the confirm checkbox.

Result: **a new run, not a cap message.** `POST /api/designs/drafts` 201 and `POST /api/revisions/approve` 201 fired
again, producing design `5c62fce0-9abd-43dd-99ed-419a3cf001bd`, revision `5d8d5340-5309-4ca4-a926-7a28b4163455`,
run `86680923-8827-4e90-a43d-6e1188add25b` under the **same** principal `c921b77a-…`.
The run reached `complete` with all five tasks `ready` and `actual_spend_cents: 0`, and the UI reached the honest
terminal degrade at **+15 s**. A transient "Photographing" state was observed on the Dark row before it settled.
No daily-limit or spend-cap message appeared, and nothing broke.
Screenshots `b-390x844-c08-b1-third-design.png`, `-c08b-b1-third-design-bottom.png`, `-c08c-b1-bar-hidden-while-input-focused.png`, `-c09-b1-third-review.png`,
`-c10-b1-third-run-started.png`, `-c11-b1-third-degrade.png`.

---

## Cross-width findings

### Confirmed defects

**D1 - The spelling-confirmation checkbox does not survive a reload, which disables "Add to bag".**
Reproduced at 320x700 and 390x600 (screenshots `b-320-s12-reload.png`, `b-390x600-s12-reload.png`; DOM probe
`{"checked":false,"addToBagDisabled":true}`). After reload the page correctly restores the review stage, the four
view rows, the degrade text and the captured reference, but the confirmation checkbox comes back unchecked and
"Add to bag" is disabled. The page therefore simultaneously says "we have your request, reference …" and
"you have not confirmed the spelling". Re-ticking fixes it and is idempotent - no second run, no second API call,
the stored `runId` is unchanged (`b-390x600-s14-recheck-after-reload.png`). Severity: medium; not a dead end, but a
returning shopper is blocked from the bag until they re-tick, and the two statements contradict each other.

**D2 - "Design example" stays in the sticky bottom bar on the review stage after the shopper's own run started.**
Visible at 768 and 1024 in `b-768-s07-wait-degrade.png` and `b-1024-s07-wait-degrade.png` ("Price unconfirmed /
Design example" next to "Add to bag"), after the run was created and the request captured. Severity: low, copy only.

**D3 - The review-stage CTA label is not stable.**
Normally the review stage before confirmation shows a disabled "Add to bag" (`b-320-s05-review.png`).
After editing a design that already had a completed run and re-entering review through the "02 Review" step chip,
the same bar reads "Preview my piece" instead (`b-390x844-c09-b1-third-review.png`). Both paths work.
Severity: low.

### Copy / i18n observations (not broken behaviour)

- The example caption is `"<example name> · Asma example"`, so on an Arabic design it renders as
  `"أسماء · Asma example"` - an English label mixed into an Arabic string. It is honest (the photo really is an
  Asma/أسماء example, not the shopper's name: with `Noor` typed it still reads "Asma · Asma example"), but the
  "Asma example" half is untranslated. Only checked on `/en`; `/ar` was out of scope for this dispatch.
- No Arabic web font is fetched (only `playfair-display-latin-*.woff2` and `brand/instrument-sans-*.woff2`).
  Arabic renders through the system font. It looked correct in every screenshot on this macOS host; a device
  without an Arabic system font is untested.

### Not defects (verified, so they are not re-reported)

- The sticky bottom action bar disappears while a text input has focus. This is deliberate mobile-keyboard
  avoidance: focusing the name field in b2 removed the bar, blurring it restored it. My first read of this as a
  "missing CTA" was wrong.
- Tier-2 clicks (metal, stones) never change the displayed design. Verified at all four widths: the sample id,
  the four image URLs and the alt text stayed identical across Rose gold and Accent.
- The "sample coming" labelled sibling is explicit and never borrows another construction: the note reads
  "Sample of this framed minimal look, shown in Classic lettering. A photograph of this design is coming."
  and `data-sample-exact=false`.

### Responsive / layout

| Width | Layout | Bar height | Overlap result |
| --- | --- | --- | --- |
| 320x700 | single column, inline preview | 74 px | no clipped text, no horizontal overflow |
| 768x1024 | two column, sticky right preview | 86 px | whole pendant visible, nothing permanently hidden |
| 1024x768 | two column, sticky right preview | 86 px | at `scrollY=0` the bar covers the carousel arrows, play/pause, the "Dark" tile and one "Edit"; all clear after any scroll; `hOverflow: false` |
| 390x600 | single column, preview **not** sticky at this width | 74 px | only at ~33 % scroll are "Back to design" and the "Your design" heading behind the bar; clear at 0 / 66 / 100 %; `hOverflow: false`; page bottom reachable |

### Totals

- Console errors across all six journeys (4 widths + 2 concurrent sessions): **0**. `agent-browser errors`: empty every time.
- Failed network requests (4xx/5xx): **0** out of roughly 500 requests. Every `/api/*` call returned 200 or 201.
- Endpoints exercised: `POST /api/designs/drafts` (201), `POST /api/revisions/approve` (201),
  `GET /api/state?designId=…` (200, polling), `POST /api/preview-requests` (201),
  supabase `POST /auth/v1/signup` (200).
  **`POST /api/designs/{id}/run` was never observed** - the run is created inside the approve call.
- Every journey ended in the expected honest state: "Your personalized preview is being prepared. We will send it
  to you." -> contact form -> "Saved. Our team has your request." + a reference id. No missing-photo dead end,
  no broken jewelry, and no photo of a different design presented as the shopper's.
