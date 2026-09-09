# Umayr UI fixes — local proof, 9 September 2026

Source range: `16130fdd6dc9ea84cdcaf788139aee805cc4e531` → `12d3191ae5ff3d668c3e75e4b5b905745108f505` on `codex/overnight-launch-2026-09-08`. All seven UI items are implemented and locally verified, followed by four review fixes. These changes have not been deployed.

## Verification boundary

The lead drove the real local pages at `http://localhost:3011/en/design/new` and `/ar/design/new` in their own in-app browser, captured DOM measurements and reviewed screenshots. The clean committed checkout at `73fbb670707cb77bb6968d090353b17a462275f7` produced the main layout and mock-flow matrix. Focused final captures verify the review name and failed-start reload fix through `12d3191ae5ff3d668c3e75e4b5b905745108f505`. The `clean-*.json`/`.png` files record those observations.

`corepack pnpm build` on clean `73fbb67`: **13 successful, 13 total**, zero cache hits, 52.127 s. `corepack pnpm --filter @jewelo/web lint`: exit 0. Final `12d3191`: `corepack pnpm build` exited 0 with **13 successful, 13 total**, 12 cached, 10.167 s; web lint exited 0. [Build log](clean-final-build.log), [lint log](clean-final-lint.log). Two final independent read-only source reviews reported no findings above minor at `12d3191`.

The original checkout retained unrelated in-flight work, including protected identity/jobs changes. An earlier server CPU timeout in that dirty checkout is excluded from the clean proof. No tests ran or changed, no deployment occurred, and PROGRESS.md/HANDOVER.md were untouched. Mock output remains refused; no real customer photograph or production acceptance is claimed. The partial-real-photo branch was source-reviewed, not exercised with a paid real image.

## Seven-item acceptance ledger

| Item | Task | Commit | Change | Browser result |
|---|---|---|---|---|
| 1 | P6-8 | `97bcfd1ea8ab5ba0d1e840aa2bb8d8b4b20949dd` | One pending/refused preview state | Observed: fresh mock refusal in 23.445 s for Umayr and 10.64 s for عمير; four placeholders and zero preview sample images after attempt. Controlled failed-start reload also preserves the fallback and sends zero new draft requests; explicit re-confirmation sends one. |
| 2 | P6-8 | `db4bca24c6821abaafe0bcfd7286a6a8d0e676c1` | Single shop sample label | Observed: one hero sample, one shop-sample label, one ownership sentence; no example text in preview. |
| 3 | P6-8 | `758a1e7e2b3a3af3c1afb635a9284d97c0073fa1` | Copy strip and name echoes | Observed: Language label, no header jargon or spelling echo; input and selections heading remain. Item 5 tile names are intentional additional occurrences. The review summary retains the exact name in both locales and sizes. |
| 4 | P6-8 | `06d51290fbffd336bfa2e2181b6900d84c36bb90` | Sellable-only looks | Observed: one construction, one English lettering option and six Arabic options. Widened environment shows two construction options in both locales/sizes; restoring defaults selects Classical and keeps the name. |
| 5 | P6-9 | `c5710f76611c43ed1e14e3739e6efd420024ac89` | Own name in lettering faces | Observed: Umayr in English and عمير in all six Arabic lettering faces; browser font status loaded. |
| 6 | P6-8 | `1b6e350130ce9b2b06125a1c8ce3c024734bf357` | Viewport-sized preview | Observed: panel height at most viewport height minus 124 px and tile strip visible at top/bottom across all five required sizes. Additional 320×568 and 390×600 checks covered the top of the page only. Short-height input focus intentionally releases sticky preview. |
| 7 | P6-8 | `908659f7b2bbdf42191777b0307ed787fcf26566` | Immediate Arabic keyboard hint | Observed: first Latin U shows refusal and keyboard hint before blur, with lang=ar and dir=rtl; both interface languages. |

Both routes were observed at **1440×900 and 390×844** for sample ownership, copy, option counts, name faces and first-keystroke hints. Layout covered top and bottom at **1440×900, 1280×720, 1024×768, 768×1024 and 390×844**. Extra **320×568 and 390×600** checks covered the top of the page only. These are local browser observations, not automated tests.

Representative evidence: [English refusal timing](clean-en-1440x900-timing.json), [Arabic refusal timing](clean-ar-timing.json), [Arabic mobile refusal and layout](clean-ar-390x844-refusal-bottom-reduced.json), [Arabic mobile lettering](clean-ar-390x844-lettering.png), [English Arabic-script hint](clean-en-1440x900-arabic-hint.json), [320 px layout](clean-ar-320x568-refusal-top.json). The other `clean-*` filenames name their route language, viewport and state. Only clean matrix captures are retained here; earlier diagnostic captures were moved outside the repository and are not acceptance evidence.

Reduced-motion media query matched true; autoplay was false. At a simulated 390×350 viewport with the contact input focused, the input occupied y=77.89–127.89 px and the 340 px preview became static so it could scroll away. This verifies short-viewport form access, not a physical phone keyboard: [measurement](clean-en-short-viewport-contact-focus.json), [screenshot](clean-en-short-viewport-contact-focus.png).

## Review fixes

| Commit | Fix |
|---|---|
| `9ea54d46a1980aa8488870c3ec73e38e74cf008e` | Persist stopped-attempt honesty across reload and partial completion. |
| `73fbb670707cb77bb6968d090353b17a462275f7` | Release sticky preview while a short viewport input is focused. |
| `71b76bfc8c570a18235e5fc285ba386346cade4a` | Restore the exact name in the review summary without restoring the design-step echo. |
| `12d3191ae5ff3d668c3e75e4b5b905745108f505` | Require fresh spelling confirmation before retrying a restored failed start. |

## Focused final checks

Widening the construction setting produced two options in both locales at both required sizes: [counts](clean-wide-option-counts.json). Restoring defaults removed the hidden selection, selected Classical and kept the Arabic name: [restored draft](clean-restored-default-ar.json). Review names were checked in English and Arabic at desktop and mobile sizes: [English desktop](clean-final-review-name-en-1440x900.json), [English mobile](clean-final-review-name-en-390x844.json), [Arabic desktop](clean-final-review-name-ar-1440x900.json), [Arabic mobile](clean-final-review-name-ar-390x844.json).

For the failed-start check, the lead blocked the local `/api/designs/drafts` request for a fresh Lina draft, then confirmed spelling. The contact fallback appeared. After removing the network block and reloading, spelling remained checked, contact remained visible, preview images stayed at zero and new draft requests stayed at zero: [reload](clean-failed-start-after-reload.json), [request count](clean-failed-start-no-auto-retry.json). Explicit untick/re-tick with the controlled block restored sent exactly one draft request and retained the fallback: [explicit retry](clean-failed-start-explicit-retry.json). The network block was removed after verification. This is a controlled browser network failure, not a provider check.

## Dictionary changes

Eight keys added, nine removed, zero changed values on retained keys. English keys and Arabic values below are exact source strings.

### Added

| English key | Arabic value |
|---|---|
| Your photograph is being made. About two minutes. | جارٍ تصوير قطعتك. نحو دقيقتين. |
| The shop will photograph it and send it to you. | سيصوّرها المتجر ويرسلها إليك. |
| Language | اللغة |
| Shop sample · Asma | عينة من المتجر · أسماء |
| A shop sample. Yours is photographed after you confirm the spelling. | عينة من المتجر. تُصوَّر قطعتك بعد تأكيد التهجئة. |
| Enter the exact Arabic spelling, or choose English. | اكتب الاسم بالعربية كما تريده تمامًا، أو اختر الإنجليزية. |
| Your keyboard is in English; switch it to Arabic or choose English above. | لوحة مفاتيحك بالإنجليزية؛ بدّلها إلى العربية أو اختر الإنجليزية أعلاه. |
| This sample photo could not load. | تعذّر تحميل صورة العينة. |

### Removed

| English key | Arabic value |
|---|---|
| Language / script | اللغة / الكتابة |
| Asma example | مثال أسماء |
| Sample for this look | عينة لهذا الأسلوب |
| Not yet photographed; the shop will confirm this look by hand | لم تُصوَّر بعد؛ سيؤكد المتجر هذا الشكل يدويًا |
| Sample look, not your piece | قطعة نموذجية، ليست قطعتك |
| This is a sample look from the shop, not your piece. Your own piece is photographed after you confirm the spelling of your name. | هذه قطعة نموذجية من المتجر، وليست قطعتك. تُصوَّر قطعتك بعد أن تؤكد تهجئة اسمك. |
| This example photo could not load. | تعذّر تحميل صورة المثال. |
| THE NAME ATELIER | مشغل الأسماء |
| CALEUMS — THE NAME COLLECTION | CALEUMS — مجموعة الأسماء |

Inline copy also changed: `Design example` / `مثال التصميم` became `Shop sample` / `عينة من المتجر`; English photograph alt text uses “sample” instead of “example”. The material explanation, photograph-switch labels, caption state line, `About this example` / `عن هذا المثال` disclosure and paragraphs, and `YOUR SPELLING · TEXT ONLY` / `النص المطلوب · ليس معاينة للقطعة` echo were removed. Existing Arabic photo alt wording remains unchanged. The final review-name fix changes a value, not dictionary copy.

## Existing behavior for a later product decision

Changing the interface locale clears the other locale’s draft and bag under the deliberate existing isolation boundary in `deviceState.ts:86–88` at base `16130fd`. This behavior predates these UI changes and was preserved. Whether to retain a shopper’s draft across interface-language changes is a separate product decision; choosing English or Arabic lettering inside the form is a different control.
