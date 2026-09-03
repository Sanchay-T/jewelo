# Decision register

**Updated:** 3 September 2026

| ID | Decision | Status | Revisit trigger |
| --- | --- | --- | --- |
| D-001 | Next.js 16.2/React 19 on DigitalOcean App Platform (`blr`) | accepted | measured hosting/runtime incompatibility |
| D-002 | pnpm workspace + Turborepo | accepted | repository remains one inseparable app after Goal 02 |
| D-003 | Supabase Mumbai as system of record, Auth, Realtime, Storage | accepted | data residency, measured scale, or platform failure |
| D-004 | SQL migrations/RLS + generated Supabase types; no competing ORM migration source | accepted | proved developer/transaction limitation |
| D-005 | Trigger.dev Cloud for durable AI jobs and concurrency | accepted | cost/regional/operability threshold breached |
| D-006 | Direct OpenAI GPT Image 2 snapshot for product and worn stills | accepted default | jewelry evaluation gate fails or superior tested profile |
| D-007 | fal.ai as Seedance inference gateway | **withdrawn 2026-09-03** (superseded by D-017) | reopening requires an explicit product decision |
| D-008 | Seedance 2.0 Fast for four 4-second previews | **withdrawn 2026-09-03** (superseded by D-017) | reopening requires an explicit product decision |
| D-009 | Seedance 2.0 Standard for optional selected final motion | **withdrawn 2026-09-03** (superseded by D-017) | reopening requires an explicit product decision |
| D-010 | Deterministic canonical pendant identity precedes generation | accepted invariant | never; implementation may evolve |
| D-011 | Four still pipelines run concurrently; the studio still independently unlocks its dependent stills in parallel | accepted invariant | provider limitation forces a documented temporary queue policy |
| D-012 | Anonymous guest first, link identity for durable account/commerce | accepted | legal/fraud requirements |
| D-013 | Modular monolith with web + jobs deployables | accepted | tracing proves independent service boundary |
| D-014 | Managed remote dev/previews; no required Docker/local infra | accepted | explicit user reversal or vendor outage strategy |
| D-015 | No autonomous/open-source media-agent framework in production execution | accepted | a framework proves simpler without duplicating Trigger or adding another runtime |
| D-016 | Motion, Embla, react-zoom-pan-pinch, react-dropzone | accepted UI foundation | accessibility/performance evidence requires replacement |
| D-017 | **2026-09-03: video/motion generation removed; image-only.** Jewelo generates still images only through direct OpenAI GPT Image 2. fal.ai, Seedance, the `video-submit-v1`/`video-poll-v1` Trigger tasks, the `fal-video` queue, and the `request_video_task` RPC are gone. Trigger.dev, the outbox, and the still pipeline stay. | accepted (explicit user decision) | an explicit product decision to reintroduce motion |

## Capacity gates

- OpenAI project quota must support the intended four-way GPT Image 2 fan-out and progressive worn work.
- Provider limits and model-spend ceilings remain configuration with measured evidence.
