# Cost and latency model

**Assumptions dated:** 26 August 2026  
All numbers are planning estimates. Record actual provider usage in `usage_ledger` and update this document from production data.

## Default customer run

- four 1:1 product stills;
- four 4:5 worn stills;
- one selected 9:16, 6-second motion clip;
- one structured verifier pass per generated asset, with deterministic checks first;
- up to one automatic retry for a transient provider failure; identity failures use a bounded retry budget.

## Generation estimate

Runway lists GPT Image 2 high-quality 1K/2K output at 20 credits per image and Gemini Omni Flash image-to-video at 10 credits per second plus one first-frame credit. One Runway credit is $0.01. Jewelo uses OpenAI directly for images, so the image number below is a conservative planning proxy; direct API token usage must be measured.

| Unit | Count | Planning unit cost | Estimate |
| --- | ---: | ---: | ---: |
| Product still | 4 | $0.20 | $0.80 |
| Worn still | 4 | $0.20 | $0.80 |
| Selected 6s motion | 1 | $0.61 | $0.61 |
| Verifier/text overhead | — | budget | $0.05 |
| **Expected before retries** | | | **$2.26/design** |

Set the initial hard reservation at **$2.75 per full run**. Do not start work that would exceed the user/organization budget without explicit approval.

Generating four videos up front would add roughly $1.83 for three likely-unused clips. Therefore motion is selected-first/on-demand.

## Infrastructure baseline

- Supabase Pro begins at $25/month and includes one Micro compute credit, 100 GB Storage, 250 GB cached egress, and 100K MAU.
- Trigger.dev plan is selected by required concurrency/preview branches; start at the smallest commercial plan that supports the active environment policy.
- Vercel, Sentry, and PostHog are separate plan/usage costs.
- AI generation will dominate ordinary application infrastructure for a long time.

## Scenario model

Using $2.26 expected model cost before retries:

| Completed design runs / month | Expected model spend |
| ---: | ---: |
| 500 | ~$1,130 |
| 5,000 | ~$11,300 |
| 50,000 | ~$113,000 |

At volume, negotiate provider pricing, tier still quality, reuse approved assets, and benchmark lower-cost profiles. Do not lower quality invisibly.

## Guardrails

- reserve budget transactionally before dispatch;
- organization daily/monthly spend caps;
- per-user generation/regeneration limits;
- selected-first video;
- provider-specific queue limits;
- maximum attempts by error class;
- store estimated and actual cost per provider call;
- alert on cost per successful design, retry rate, verifier rejection, and orphaned assets;
- cancellation stops queued work and prevents dependent tasks;
- preview/test providers use explicit low-cost profiles and synthetic names.

## Latency targets

These are product targets, not provider guarantees:

- design acceptance and run creation: < 1 second p95;
- first useful product variation: < 30 seconds p50, < 75 seconds p95;
- four product variations: < 90 seconds p95;
- progressive worn results begin immediately after matching product success;
- full still set: < 3 minutes p95;
- selected motion: target < 2 minutes p50, < 5 minutes p95;
- leaving/reloading the page never loses progress.

The UI must communicate real state rather than fake percentage completion.
