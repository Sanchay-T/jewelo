> UI reset — 5 September 2026: customer UI and prior screen/flow proposals were discarded by the user. Read `docs/START-HERE.md` and `docs/OMRAN-BUSINESS-CONTEXT.md` first. Customer-journey prescriptions below are superseded for brainstorming; retained backend contracts do not approve a new UI.

# Goal roadmap

| Goal | Outcome | Explicitly excluded |
| --- | --- | --- |
| 00 Production foundation | exact monorepo, pinned toolchain, managed-service/provider seams, CI, preview configuration, health surface | customer features and paid generation |
| 01 Product studio | complete responsive customer/operator shell and every queued/generating/verifying/ready/retry/failure state using typed mock gateways; Motion/Embla/zoom/upload foundation | real persistence and provider calls |
| 02 Supabase domain | Auth, RLS, SQL schema, private Storage, Realtime, repositories, quota reservations, outbox | real AI generation |
| 03 Durable generation | Trigger.dev four-way variation fan-out, progressive downstream worn+motion release, retry, quota backpressure, partial success, cancellation | paid model activation |
| 04 Identity/prompt/QA | deterministic pendant identity, prompt compiler, releases, validation corpus, verifier contract | broad real generations |
| 05 Real still generation | controlled direct GPT Image 2 four-product/four-worn pipeline, real concurrency, quality/cost evaluation | real Seedance motion and commerce |
| 06 Real motion | fal Seedance 2.0 Fast four-preview pipeline, selected Standard final, player, drift/format/concurrency QA, retry/recovery | full commerce/launch |
| 07 Commerce/operator | estimates, quote/order snapshots, operator workflow, customer communication seams | production launch |
| 08 Hardening/launch | security, load, observability, retention, backup/restore, provider quotas, budgets, deployment, rollback, launch review | post-launch roadmap |

Each goal is a durable outcome, not a generic sprint. It may refine the next goal but must not silently absorb it.
