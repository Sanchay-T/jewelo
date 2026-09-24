# SIGN-1c live check, deployment c195a33b (2e6c50ff)

Run d078a258 (يوسف classical, status operator_review: studio, close-up and dark ready, on-skin blocked), opened fresh at 1440x900 on the staging link after the deploy.

- At page load the five signed image links expired at 1790263597 (280 s after signing).
- At 276 s after load all five links had been replaced (5 of 5 changed), new expiry 1790263839; 0 broken images. A settled operator_review run keeps re-signing on the 240 s cadence, as SIGN-1b/1c intend.
- Measured in the page with `document.images` and the token `exp` claim; screenshots before (01) and after (02) the re-sign.
