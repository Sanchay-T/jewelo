# Cost and latency model

**Assumptions dated:** 26 August 2026  
All values are planning estimates. `usage_ledger` and provider-call records replace these assumptions with observed production data.

## Default showcase run

- four 1:1 product stills through direct OpenAI GPT Image 2;
- four matching 4:5 worn stills;
- four fast 9:16 Seedance motion previews, one per verified product direction;
- optional one selected standard-quality final motion;
- deterministic identity checks before structured visual verification;
- one bounded retry for classified transient failures; identity retries consume a separate small budget.

## Current planning estimate

OpenAI image billing varies by input/output settings and must be measured directly. The still-image number below remains a conservative planning reservation until Goal 05 records real usage.

fal lists Seedance 2.0 Fast 720p at approximately $0.2419 per generated second and standard Seedance 2.0 720p at approximately $0.3024 per second.

| Unit | Count | Planning unit cost | Estimate |
| --- | ---: | ---: | ---: |
| Product still | 4 | $0.20 proxy | $0.80 |
| Worn still | 4 | $0.20 proxy | $0.80 |
| Fast preview, 4 seconds | 4 | ~$0.9676 | ~$3.87 |
| Structured verification | — | budget | ~$0.08 |
| **Preview-all run before retries** | | | **~$5.55/design** |
| Optional selected final, 6 seconds | 1 | ~$1.8144 | ~$1.81 |
| **Preview-all + selected final** | | | **~$7.36/design** |

Initial reservations:

```text
showcase.preview_all ceiling     $6.50
showcase.with_selected_final     $8.50
cost_optimized selected-only     separately profiled after evaluation
```

Do not start provider work that exceeds the user/organization reservation without explicit policy approval.

## Why preview-all is explicit

Generating four motion previews materially improves the observed/demo experience but is not free. Therefore:

- the locked showcase profile enables four fast previews;
- the product records the profile used on each run;
- organization budgets and feature entitlements control access;
- a lower-cost selected-only profile remains available without changing architecture;
- the UI never silently downgrades quality or skips promised media.

## Concurrency versus cost

Parallelism reduces wall-clock latency, not unit inference cost.

```text
4 concurrent product stills
  each verified result immediately starts:
    1 worn still + 1 fast motion preview concurrently
```

This pipeline maximizes useful-result speed while preserving per-call cost attribution. Provider queues prevent a burst from becoming uncontrolled spend.

## Provider capacity gates

### OpenAI

GPT Image 2 rate limits are tier-based. Four concurrent product calls are permitted only after the project’s effective IPM/concurrency behavior is validated. Worn calls unlock progressively and are throttled through the same named queue.

### fal.ai

New fal accounts start at two concurrent requests and may increase automatically with purchased credits. Four-preview mode requires a verified fal concurrency limit of at least four. Below that limit, Trigger queues the remaining jobs and the UI displays `queued`.

## Infrastructure baseline

- Supabase Pro begins at its published managed-service price and includes plan allowances for compute, storage, egress, and users; verify current pricing at provisioning time.
- Trigger.dev plan selection is driven by environment concurrency, preview branches, retention, and observability.
- DigitalOcean App Platform, Sentry, PostHog, OpenAI, and fal are separate plan/usage costs.
- AI generation dominates ordinary application infrastructure for the foreseeable future.

## Monthly model-spend scenarios

Using the ~$5.55 preview-all estimate before optional final motion and retries:

| Completed showcase runs / month | Planning model spend |
| ---: | ---: |
| 500 | ~$2,775 |
| 5,000 | ~$27,750 |
| 50,000 | ~$277,500 |

Using preview-all plus selected final (~$7.36):

| Completed runs / month | Planning model spend |
| ---: | ---: |
| 500 | ~$3,680 |
| 5,000 | ~$36,800 |
| 50,000 | ~$368,000 |

At volume, negotiate provider terms, benchmark lower-cost profiles, cache/reuse approved media where product-correct, and measure conversion value from four motion previews. Do not lower quality invisibly.

## Guardrails

- reserve expected maximum spend transactionally before outbox dispatch;
- organization daily/monthly spend caps;
- per-user generation/regeneration limits;
- profile-level entitlements (`preview_all`, `selected_only`, `final_upgrade`);
- provider-specific queue and rate limits;
- maximum attempts by error class;
- actual cost and latency stored per provider call;
- alert on cost per successful direction/run, retry rate, verifier rejection, and orphaned media;
- cancellation stops queued work and dependent tasks;
- previews/tests use synthetic names and explicit bounded budgets;
- fal output is copied immediately into private Jewelo storage.

## Product latency targets

These are product targets, not provider guarantees:

- revision acceptance and run creation: < 1 second p95;
- all four product calls dispatched: < 2 seconds after workflow start;
- first useful product: < 30 seconds p50, < 75 seconds p95;
- four product directions: < 90 seconds p95;
- worn and fast motion for each variation begin immediately after its product passes QA;
- first motion preview: target < 2 minutes p50;
- full product/worn/preview set: target < 4 minutes p95;
- optional selected final motion: target < 2 minutes p50, < 5 minutes p95;
- leaving or reloading never loses progress.

The UI reports real task states rather than fake percentage completion.

## Review triggers

Revisit preview-all defaults when:

- motion-preview usage does not materially improve customer inspection/conversion;
- average successful-run cost exceeds the approved ceiling;
- fal latency/concurrency repeatedly misses the experience target;
- a cheaper Seedance profile passes the same identity/quality gate;
- a business tenant requests a different cost-quality profile.
