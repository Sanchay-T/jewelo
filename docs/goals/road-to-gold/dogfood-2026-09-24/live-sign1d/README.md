# Deployment 7645b3b0 (1cc6ae2c, SIGN-1d) - browser pass

- English run page (d078a258, يوسف): viewport 1470x730, no horizontal overflow (scrollWidth 1470), 5 signed images, 0 broken (01).
- Arabic `/ar/design/new`: `dir=rtl`, `lang=ar`, no horizontal overflow, shop sample views load (02).
- Not covered: the six narrower viewports and reduced motion. This session's browser (Claude in Chrome) renders at a fixed 1470x730 whatever the window size, the page refuses framing (`frame-ancestors`), and a scripted popup is blocked, so no narrower viewport and no `prefers-reduced-motion: reduce` could be emulated. SIGN-1d and SP-2e2e change no layout; the seven-viewport sweep stays open for the next session with a resizable browser.
