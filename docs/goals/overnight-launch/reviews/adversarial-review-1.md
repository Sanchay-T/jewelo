# Adversarial review 1 (fresh-context reviewer, 11:35 IST 7 Sep 2026, branch at a4679fa)

Gates rerun by the reviewer: typecheck 0, lint 0, test 0 (16/16), test:atelier 75/75, scan-secrets passed, no JWT/key material on HEAD.

## Blockers
- B1 Personalized runs carry no construction and no English lettering (prompt variables fixed at 14; stencil pinned to Playfair), yet the review stage labels the result "Your piece" with the chosen construction. Fix: preflight classifies non-Classical constructions and non-Classic English lettering as unsupported (capture path, no spend) until the prompt carries them; alt text drops the construction. Proper fix later: migration widening the prompt variable set.
- B2 `/api/transliterate` was an unauthenticated, uncapped real OpenAI endpoint (client-controlled x-forwarded-for rate limit). Fix: authenticated principal required and 503 unless PROVIDER_MODE=real.

## Majors
- M1 Exactly-once relies on Inngest event-id dedup on a self-hosted server whose queue state is in-process. Mitigation: guard a repeated dispatch key from opening a new paid attempt; real mode is off tonight.
- M2 `dispatch-dependent-outbox` claimed outbox rows across all principals (bypassing the cron guard). Fix: scope by run id.
- M3 Reload mid-flight could create a second run (write-ahead persistence missing). Fix: remember before start; restore startedFor.
- M4 `/api/state` returned `select=*` on assets and audit_events (object paths, lineage). Fix: column allow-lists.
- M5 Spend trigger fails open if the policy row is missing; reconcile could be refused at the ceiling. Fix: fail closed; single UPDATE in reconcile.
- M6 One shop tablet is one principal; daily limit 6 blocks the seventh shopper. Fix: policy values raised (30 runs, 6000 cents per principal), copy says "This device".
- M7 Degrade headline promised delivery before contact capture. Fix: pre-capture copy asks for contact; the promise appears after capture.
- M8 Nothing on the deployed app can produce a personalized photograph in mock mode; every shopper lands in honest degrade. Recorded in the handoff as the state of the launch.

## Minors fixed
m1 forbidden `resolveSample` deleted; m2 bag fallback cannot cross script/construction; m3 sample thumbnails in the rail are labelled; m10 startedFor cleared on failure; m12 dates.

## Minors documented, not fixed tonight
m4 sibling note drops the lettering difference; m5 `basis: "script"` latent; m6 readiness discloses configuration; m7 unbounded maps in transliterate; m8 operator-session secret throw; m9 CTA disabled while a sample image loads (up to 15 s); m11 one tablet shares bag and reference across shoppers (use Reset or a private window per customer).

## What held
Tier 1/Tier 2 split (no Tier 2 click changes the design; construction never substituted), mock assets never shown as the shopper's photo, secret hygiene.
