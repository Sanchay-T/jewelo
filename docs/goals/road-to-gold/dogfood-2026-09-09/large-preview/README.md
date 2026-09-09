# Larger preview - local follow-up proof, 9 September 2026

Task P6-10. Integrated source: `57189c5aa53a1ba7f525d1b48898a704629d7ebb`, pushed on `codex/overnight-launch-2026-09-08`. The lead drove the local page in their own in-app browser; these screenshots and DOM measurements record those observations. This is focused local evidence, not a completed staging viewport ladder or a real customer photograph.

At 390x844 the main photograph is 436.8 px tall. Once the full panel scrolls away, an 81 px reminder stays at the top; its inspection button opens a 390x844 dialog. The name-first action focuses `pendant-name`, placing the input at y=305.9 px while the reminder is hidden. At the bottom of the desktop form, the corrected panel is y=16 px and h=583.3 px. RTL 390x844 and short mobile sizes 320x568/390x600 have separate captures below. Three additional initial captures at 1280x720, 1024x768 and 768x1024 were viewed on the built production server after the 13/13 build at `57189c5`; panel heights are 424, 472 and 728 px respectively. Mobile deliberately uses a scrolling full photograph: its whole dock need not fit above the fold on short screens.

`en-1440x900-bottom` is diagnostic **before the correction**: its panel begins at y=-166.7 px. `desktop-1440-bottom-fixed` is the replacement acceptance capture. Keep the earlier file only as reproduction evidence, never as a passing final check. The initial desktop capture predates that focused correction; the final bottom capture verifies the repaired boundary.

## Evidence index

Each row links the lead's original screenshot and measurement. JSON values are browser geometry and visible demonstration-page text; they contain no provider credentials or private reference URLs.

| State | Screenshot | DOM measurement |
| --- | --- | --- |
| Desktop bottom - corrected | [Screenshot](desktop-1440-bottom-fixed.png) | [Measurement](desktop-1440-bottom-fixed.json) |
| Desktop bottom - before fix, diagnostic only | [Screenshot](en-1440x900-bottom.png) | [Measurement](en-1440x900-bottom.json) |
| Desktop initial | [Screenshot](en-1440x900-initial.png) | [Measurement](en-1440x900-initial.json) |
| Mobile compact reminder and form | [Screenshot](en-390x844-compact-form.png) | [Measurement](en-390x844-compact-form.json) |
| Mobile enlarged inspection | [Screenshot](en-390x844-enlarged.png) | [Measurement](en-390x844-enlarged.json) |
| Mobile large initial photograph | [Screenshot](en-390x844-large-initial.png) | [Measurement](en-390x844-large-initial.json) |
| Mobile name action and focused input | [Screenshot](en-390x844-start-name-focus.png) | [Measurement](en-390x844-start-name-focus.json) |
| 320x568 compact reminder | [Screenshot](mobile-320x568-compact.png) | [Measurement](mobile-320x568-compact.json) |
| 320x568 initial photograph | [Screenshot](mobile-320x568-top.png) | [Measurement](mobile-320x568-top.json) |
| 390x600 initial photograph | [Screenshot](mobile-390x600-top.png) | [Measurement](mobile-390x600-top.json) |
| RTL compact reminder | [Screenshot](rtl-390x844-compact.png) | [Measurement](rtl-390x844-compact.json) |
| RTL initial photograph | [Screenshot](rtl-390x844-top.png) | [Measurement](rtl-390x844-top.json) |
| Built production server 1280x720 - initial | [Screenshot](built-1280x720.png) | [Measurement](built-1280x720.json) |
| Built production server 1024x768 - initial | [Screenshot](built-1024x768.png) | [Measurement](built-1024x768.json) |
| Built production server 768x1024 - initial | [Screenshot](built-768x1024.png) | [Measurement](built-768x1024.json) |
| Built review 390x600 - reduced motion | [Screenshot](built-review-390x600-reduced-motion.png) | [Measurement](built-review-390x600-reduced-motion.json) |
| Built review 390x600 - compact reminder and controls | [Screenshot](built-review-390x600-controls.png) | [Measurement](built-review-390x600-controls.json) |
| Built review 390x600 - complete enlarged photograph | [Screenshot](built-review-390x600-enlarged.png) | [Measurement](built-review-390x600-enlarged.json) |

The lead also personally checked the built review step at 390x600: reduced-motion playback stopped, the compact reminder measured 81 px while review controls remained accessible, and enlarged inspection showed the complete photograph in a 390x600 modal. These are local browser observations; the reduced-motion behavior was observed by the lead, while the linked DOM files record geometry and visible text.

## Build, review and remaining proof

The lead reports full `corepack pnpm build`: **13 successful, 13 total**, exit 0, through `57189c5`; two final independent source reviews were clean above minor. No tests ran or changed. The follow-up adds the dictionary key `Start with your name` / `ابدأ باسمك`.

The earlier seven-item UI acceptance, full dictionary changes and broader local layout matrix remain in [Umayr UI proof](../umayr-ui/README.md). Those earlier captures do not substitute for a final seven-viewport staging pass after this follow-up. At this checkpoint, deployment, final staging RTL/reduced-motion coverage and real API photographs remain pending. The current prompt qualification is recorded in [Image lab](../../../overnight-launch/IMAGE-LAB.md#9-september-follow-up---shared-still-compiler-and-studio-candidate-c).

The separate identity/jobs work in the original checkout remains excluded. PROGRESS.md and HANDOVER.md are unchanged under the original brief's explicit boundary.
