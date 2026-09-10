# Live shopper QA - LOG A

Target: `https://jewelo-staging-gqumd.ondigitalocean.app`
Session: agent-browser isolated `liveqa-a` (never the user's profile).
Date: 7 September 2026.
`GET /api/health` -> `200 {"status":"ok","service":"jewelo-web","contractVersion":"foundation-v1"}`

Capture per step: screenshot, DOM state (sample id / exact flag / image src / alt / render key / quiet note / view states), `agent-browser console`, `agent-browser errors`, `agent-browser network requests`.

---

## Journey 1 - 390x844, `/en/design/new`, Arabic أسماء

| # | Action | Observed | Screenshot |
| --- | --- | --- | --- |
| 01 | Open `/en/design/new` at 390x844 | h1 "Your name, made precious."; sample `classic-Studio` `data-sample-exact=true` src `/atelier/v1/asma-studio.png`; quiet note "Shown in 18K yellow gold with no stones. Your gold and stones appear in your personalized preview."; "02 Review" disabled; "Preview my piece" enabled | `390-01-landing.png` |
| 02 | Click script "Arabic" | sample `arabic` exact=true src `/atelier/v1/asma-arabic.png`; alt "Photographic أسماء example, Classical, Classic, Yellow gold, No stones, 32 mm, Cable chain" | `390-02-script-arabic.png` |
| 03 | Fill name `أسماء` (placeholder was already أسماء, field empty) | input value `أسماء`; accordion header "01 Name أسماء · Arabic"; helper "Enter the exact spelling you want. You can correct it here at any time."; "YOUR SPELLING · TEXT ONLY أسماء" | `390-03-name-typed.png` |
| 04 | Expand "02 Style & Arrangement" | Constructions Classical / Origami ribbon / Framed minimal / Diamond rails; letterings Classic / Minimal / Diwani / Kufi / Signature / Thuluth inspired | `390-04-style-section-open.png` |
| 05 | Click construction "Framed minimal" | transient heading "Updating preview", then sample `arabic-framed-v5` **exact=true** src `/atelier/v5/arabic-framed-studio.png`; render key construction "Framed minimal" | `390-05-construction-framed-minimal.png` |
| 06 | Click lettering "Kufi" | sample id stays `arabic-framed-v5`, src unchanged, **exact=false**; chip "Sample for this look"; note "Sample of this framed minimal look, shown in Classic lettering. A photograph of this design is coming."; render key lettering "Kufi", outline `/atelier/geometry/v1/arabic-kufi-asma.svg` | `390-06-lettering-kufi.png` |
| 07 | Tier 2: click gold "Rose gold" | **image did not change**: sampleId `arabic-framed-v5`, src `/atelier/v5/arabic-framed-studio.png`, alt unchanged; quiet note unchanged | `390-07-gold-rose.png` |
| 08 | Tier 2: click stones "Accent" (gem default) | **image did not change** (same sampleId/src); "YOUR SELECTIONS" now `18K Rose gold`, `Accent · Lab diamond`; header "03 Gold & Stones 18K Rose gold · Accent · Lab diamond" | `390-08-stones-accent.png` |
| 09 | Pre-preview state | size/chain kept at 32 mm · Cable; "Preview my piece" enabled | `390-09-before-preview.png` |
| 10 | Click "Preview my piece" | Stage 2 Review: h1 "Your piece, in every light."; design summary rows with Edit; "Price unconfirmed", "Checkout is coming soon."; checkbox "I confirm the spelling and selected details are correct, and start my personalized preview. أسماء"; "Confirm the spelling above and we photograph this piece with your name."; four view tiles "Preview ready"; "Add to bag" disabled | `390-10-review-stage.png` |
| 11 | Review before confirm | checkbox unchecked, "Add to bag" disabled | `390-11-review-before-confirm.png` |
| 12 | Tick spelling checkbox (T0 = 11:22:12 IST) | run starts. "YOUR PERSONALIZED PREVIEW" - Studio / On skin / Close-up / Dark all "Waiting to start" | `390-12-confirm-checked.png` |
| 13 | Poll (14 s cadence, 224 s total) | T0+12 s: Studio "Being prepared", others "Waiting to start". T0+26 s: all four "Being prepared" plus the terminal degrade block. No further change through T0+223 s. | `390-13-run-t12.png`, `390-13-run-t26.png` |
| 14 | Terminal state | **"Your personalized preview is being prepared. We will send it to you."** with channel picker WhatsApp / Phone / Email, field "Number with country code", button "Send this to me". Labelled sample still on screen with its "Sample for this look" chip. No broken jewelry, no borrowed photo, no percentage. | `390-14-degrade-contact-form.png`, `390-14b-degrade-full.png` |
| 15 | Pick WhatsApp, fill `+971501234567` | WhatsApp `aria-pressed=true`; input type `tel` value `+971501234567` | `390-15-contact-whatsapp-filled.png` |
| 16 | Click "Send this to me" | **"Saved. Our team has your request."** / **"Reference 6d650b10-218a-47f5-8795-b6dd32dee1c8"**; `POST /api/preview-requests` -> 201 | `390-16-saved-reference.png` |
| 17 | Click "Add to bag" | bag drawer opens automatically, header count 1 | `390-17-added-to-bag.png` |
| 18 | Bag drawer | "Your bag (1)" / "NAME PENDANT · YOUR DESIGN" / أسماء / "18K Rose gold · 32 mm" / "Cable" / "Accent · Lab diamond" / "Price unconfirmed" / qty 1 / Edit / Remove / "New piece" / "Saved locally on this device. Prices are unconfirmed; no order has been placed." / "Checkout unavailable" (disabled) | `390-18-bag-drawer.png` |

Time from ticking the confirm checkbox to the terminal honest-degrade state: **between 12 s and 26 s** (state changed between the T0+12 s and T0+26 s polls).

Network on journey 1 (path only): `POST /api/designs/drafts` 201, `POST /api/revisions/approve` 201, repeated `GET /api/state?designId=9130baf0-74c7-499d-8312-75bc014ff290` 200, `POST /api/preview-requests` 201, all `/atelier/v5/*.png` 200. No 4xx, no 5xx.
Console: empty. Page errors: empty.

Design id seen in network: `9130baf0-74c7-499d-8312-75bc014ff290`. Preview-request reference on screen: `6d650b10-218a-47f5-8795-b6dd32dee1c8`.

| 19 | Reload `/en/design/new` | **Reconstructed**: still on Review stage, design summary intact (أسماء · Arabic / Framed minimal · Kufi / 18K Rose gold · Accent · Lab diamond / 32 mm · Cable), four views "Being prepared", **same "Reference 6d650b10-218a-47f5-8795-b6dd32dee1c8"**, bag count 1. Only network calls: `GET /en/design/new` 200 and `GET /api/state?designId=9130baf0-...` 200 | `390-19-after-reload.png` |
| 20 | "Back to design" | design stage, family still `arabic-framed-v5` (view had rotated to On skin on the review slideshow) | `390-20-back-to-design.png` |
| 21 | Tier 2 edit: gem "Ruby" | **image did not change**: sampleId `arabic-framed-v5`, src `/atelier/v5/arabic-framed-studio.png`, alt unchanged. Header now "18K Rose gold · Accent · Ruby" | `390-21-tier2-edit-ruby.png` |
| 22 | Return to Review after the edit | the run/reference block is replaced by "Confirm the spelling above and we photograph this piece with your name." and the checkbox is unticked again - the changed specification requires a fresh confirmation. Honest, but note the earlier reference is no longer shown once the spec changes | `390-22-review-after-tier2-edit.png` |

---

## Journey 2 - 1440x900, `/en/design/new`, English, Asma & Fatima

Started a clean shopper with "New piece" from the bag drawer (bag kept the Journey 1 item).

| # | Action | Observed | Screenshot |
| --- | --- | --- | --- |
| 01 | 1440x900, "New piece" | fresh design stage, English default, sample `classic-Studio` exact=true `/atelier/v1/asma-studio.png`; all four accordions expanded on desktop | `1440-01-start.png` |
| 02 | Click "Two names" | second name field appears; "Connection layout" appears: Side by side / Connected heart / Stacked / Infinity / Interlocked | `1440-02-two-names.png` |
| 03 | Fill "Asma" and "Fatima" | sample `heart` **exact=true** src `/atelier/v2/heart-studio-repaired.png` (Connected heart is the default layout); alt "Photographic Asma and Fatima example, Classical, Classic, Yellow gold, No stones, 32 mm, Cable chain" | `1440-03-names-typed.png` |
| 04 | Click layout "Stacked" | sample `stacked` **exact=true** src `/atelier/v2/stacked-studio.png`; render key layout "Stacked", outlines asma + fatima | `1440-04-layout-stacked.png` |
| 05 | Tier 2: "Yellow gold", "No stones" (already the defaults, clicked explicitly) | **image did not change** (`stacked`, `/atelier/v2/stacked-studio.png`); pendant fully visible at 1440, no letters cut; pressed set = English / Two names / Classical / Classic / Stacked / Yellow gold / No stones / 32 mm / Cable | `1440-05-tier2-yellow-nostones.png` |
| 06 | Click "Preview my piece" | Review stage; summary "Asma & Fatima · English", "Classical · Classic · Stacked", "18K Yellow gold · No stones", "32 mm · Cable"; checkbox "…and start my personalized preview. Asma & Fatima"; "Add to bag" disabled | `1440-06-review-stage.png` |
| 07 | Tick spelling checkbox (T0) | T0+1 s: "Starting your personalized preview." | `1440-07-confirm-checked.png`, `1440-08-run-t1.png` |
| 08 | Poll (13 s cadence, 224 s total) | T0+14 s: all four views "Being prepared" plus the terminal degrade block. No further change through T0+224 s | `1440-08-run-t14.png` |
| 09 | Terminal state | **"Your personalized preview is being prepared. We will send it to you."** with WhatsApp / Phone / Email picker | `1440-09-degrade-contact-form.png` |
| 10 | Click "Email", fill `qa@example.com` | field switches to `type=email`, label "Email address", placeholder `name@example.com` | `1440-10-contact-email-filled.png` |
| 11 | Click "Send this to me" | **"Saved. Our team has your request."** / **"Reference 7905a9c1-a1f3-421a-9817-ac3463caa8ae"**; `POST /api/preview-requests` 201 | `1440-11-saved-reference.png` |
| 12 | Click "Add to bag" | drawer opens: "Your bag (2)" with أسماء and "Asma & Fatima", each with quantity, Edit, Remove; "New piece"; "Checkout unavailable" disabled | `1440-12-bag-drawer.png` |
| 13 | Reload | **Reconstructed**: Review stage, "Asma & Fatima · English / Classical · Classic · Stacked / 18K Yellow gold · No stones / 32 mm · Cable", four "Being prepared", **same Reference 7905a9c1-…**, bag 2 | `1440-13-after-reload.png` |
| 14 | "Back to design" | design stage, sample still `stacked` `/atelier/v2/stacked-studio.png` | `1440-14-back-to-design.png` |
| 15 | Tier 2 edit: "White gold" | **image did not change** (`stacked`, same src, same alt); selections now "18K White gold" | `1440-15-tier2-edit-white-gold.png` |

Time from ticking the confirm checkbox to the terminal honest-degrade state: **between 1 s and 14 s**.

Network on journey 2 (path only): `POST /api/designs/drafts` 201, `POST /api/revisions/approve` 201, repeated `GET /api/state?designId=9eab7411-d0d2-4f8a-ac4a-b03fbb3313ba` 200, `POST /api/preview-requests` 201. No 4xx, no 5xx.
Console: empty. Page errors: empty.

---

## Journey 3 - `/ar/design/new` RTL, 390x844 and 1440x900

The local draft from Journey 2 (Asma & Fatima, Stacked, white gold) carried over, which is itself proof that the local draft survives a locale change.

| # | Action | Observed | Screenshot |
| --- | --- | --- | --- |
| ar-01 | Open `/ar/design/new` at 390x844 | `<html dir="rtl" lang="ar">`, computed body direction `rtl`. h1 "اسمك، قطعة ثمينة."; steps "01 التصميم / 02 المراجعة"; "محفوظ على هذا الجهاز"; sections "01 الاسم / 02 الأسلوب والتنسيق / 03 الذهب والأحجار / 04 المقاس والسلسلة / + لمسات شخصية"; action "معاينة قطعتي"; view tiles الاستوديو / على الجسم / عن قرب / خلفية داكنة laid out right to left. Arabic alt text: "صورة تجريبية لـAsma وFatima، كلاسيكية، كلاسيكي، ذهب أصفر، بدون أحجار، 32 مم، سلسلة كابل" | `390-ar-01-start.png` |
| ar-01 | Quiet note in Arabic | **"المعروض: ذهب أصفر عيار ١٨ بدون أحجار. لون ذهبك وأحجارك تظهر في معاينتك الشخصية."** (Arabic-Indic numeral ١٨) | same |
| ar-02 | Expand "03 الذهب والأحجار" | options ذهب أصفر / ذهب أبيض / ذهب وردي, بدون أحجار / لمسة / ترصيع جزئي / ترصيع كامل | `390-ar-02-gold-section.png` |
| ar-03 | Tier 2 click "ذهب وردي" (rose gold) | **pendant did not change**: sampleId `stacked`, src `/atelier/v2/stacked-studio.png`, alt unchanged; selections now "18K ذهب وردي"; quiet note unchanged | `390-ar-03-tier2-rose-gold.png` |
| ar-04 | Click "معاينة قطعتي" | **review stage reached**: h1 "قطعتك في كل ضوء."; "راجع التفاصيل واحفظ قطعتك في الحقيبة."; "العودة للتصميم"; summary rows with "تعديل"; checkbox "أؤكد صحة كتابة الاسم والتفاصيل المحددة، وابدأوا معاينتي الشخصية."; "معاينتك الشخصية / أكّد كتابة الاسم أعلاه لنبدأ تصوير قطعتك باسمك."; "أضف إلى الحقيبة" disabled | `390-ar-04-review-stage.png` |
| ar-05 | Resize to 1440x900 on the same review page | RTL desktop layout holds | `1440-ar-01-review-stage.png` |
| ar-06 | "العودة للتصميم" at 1440 | Arabic design stage, `dir=rtl`, sample `stacked-dark` `/atelier/v2/stacked-dark.png` (the review slideshow had rotated to the Dark view) | `1440-ar-02-design-stage.png` |
| ar-07 | Tier 2 click "لمسة" (Accent) at 1440 | **pendant did not change**: sampleId `stacked-dark`, same src, same alt; selections now "لمسة · ألماس مختبري" | `1440-ar-03-tier2-accent.png` |
| ar-08 | Click "معاينة قطعتي" at 1440 | **review stage reached** in RTL: summary column on the right, preview panel on the left, tiles ordered right to left, Arabic confirm checkbox present, "أضف إلى الحقيبة" disabled | `1440-ar-04-review-stage.png` |

Journey 3 did not tick the confirm checkbox, so no third run was created.

---

## Cross-cutting observations

**Anonymous session persistence.** `localStorage` keys after the whole session: `caleums.atelier.v1` (draft + bag) and `jewelo:anonymous-session:v1` (Supabase anonymous session). After each reload the same preview-request reference, the same design summary and the same bag count came back. Header shows "Saved on this device". Final state: bag 2, "Your piece, in every light.".

**Console.** Zero console output across all three journeys. Verified the capture works by injecting `console.warn`/`console.error` at the end, which were captured - so the empty result is real, not a broken probe.

**Page errors.** Zero.

**Network.** Final sweep of a cold load of `/ar/design/new` then `/en/design/new`: 54 requests, all 200, no 3xx/4xx/5xx. Across the journeys the only API calls were `POST /api/designs/drafts` (201), `POST /api/revisions/approve` (201), repeated `GET /api/state?designId=…` (200), `POST /api/preview-requests` (201).

**Ids seen on screen or in the network panel.**

| Journey | designId (network) | Reference on screen |
| --- | --- | --- |
| 1 (أسماء, Framed minimal, Kufi, rose, accent) | `9130baf0-74c7-499d-8312-75bc014ff290` | `6d650b10-218a-47f5-8795-b6dd32dee1c8` |
| 2 (Asma & Fatima, Stacked, yellow, no stones) | `9eab7411-d0d2-4f8a-ac4a-b03fbb3313ba` | `7905a9c1-a1f3-421a-9817-ac3463caa8ae` |

No run id is surfaced in the UI; only the preview-request reference is.

**Defects / rough edges found (no source edited).**

1. Untranslated string on the Arabic review stage: **"Checkout is coming soon."** stays English while every neighbouring string is Arabic (both 390 and 1440). Seen at `390-ar-04-review-stage.png` and `1440-ar-04-review-stage.png`.
2. Untranslated accessible name on the Arabic slideshow control: **"Play slideshow" / "Pause slideshow"**, while its siblings are "الزاوية السابقة" / "الزاوية التالية". Both widths.
3. After a captured request, editing any Tier 2 option and returning to Review drops the "Saved. Our team has your request. / Reference …" block back to "Confirm the spelling above and we photograph this piece with your name." with the checkbox unticked. Honest (the specification changed, so the old capture no longer describes it) but the shopper loses sight of the reference they were just given. Recorded, not classified as a dead end.

Nothing observed that qualifies as: a missing-photo dead end, a borrowed photo presented as the shopper's own, broken jewelry, a fake percentage, or an error state.

**Sticky bar / bottom reach.** At 1440 scrolled to `document.body.scrollHeight`, the footer lockup and the sticky action bar do not occlude the confirm block or the "YOUR PERSONALIZED PREVIEW" panel (`1440-16-page-bottom-sticky-bar.png`). The contact form's "Send this to me" button was clicked successfully at both 390 and 1440.

**Tier 2 never-changes-design, every click tested (before -> after on `data-sample-id` + `src` + `alt`):**

| Journey | Tier 2 click | sample id | src | changed? |
| --- | --- | --- | --- | --- |
| 1 @390 | Rose gold | `arabic-framed-v5` | `/atelier/v5/arabic-framed-studio.png` | no |
| 1 @390 | Accent (Lab diamond) | `arabic-framed-v5` | `/atelier/v5/arabic-framed-studio.png` | no |
| 1 @390 | gem Ruby (post-run edit) | `arabic-framed-v5` | `/atelier/v5/arabic-framed-studio.png` | no |
| 2 @1440 | Yellow gold | `stacked` | `/atelier/v2/stacked-studio.png` | no |
| 2 @1440 | No stones | `stacked` | `/atelier/v2/stacked-studio.png` | no |
| 2 @1440 | White gold (post-run edit) | `stacked` | `/atelier/v2/stacked-studio.png` | no |
| 3 @390 ar | ذهب وردي | `stacked` | `/atelier/v2/stacked-studio.png` | no |
| 3 @1440 ar | لمسة | `stacked-dark` | `/atelier/v2/stacked-dark.png` | no |

Session closed with `agent-browser --session liveqa-a close`. The user's Chrome profile was never opened.
