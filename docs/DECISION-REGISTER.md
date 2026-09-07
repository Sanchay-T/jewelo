# Decision register

**Updated:** 7 September 2026

| ID | Decision | Status | Revisit trigger |
| --- | --- | --- | --- |
| D-001 | Next.js 16.2/React 19 on DigitalOcean App Platform (`blr`) | accepted | measured hosting/runtime incompatibility |
| D-002 | pnpm workspace + Turborepo | accepted | repository remains one inseparable app after Goal 02 |
| D-003 | Supabase Mumbai as system of record, Auth, Realtime, Storage | accepted; project re-provisioned 7 Sep 2026 as `jewelo-caleums` (the old project belonged to a login this machine no longer has) | data residency, measured scale, or platform failure |
| D-004 | SQL migrations/RLS + generated Supabase types; no competing ORM migration source | accepted | proved developer/transaction limitation |
| D-005 | Trigger.dev Cloud for durable AI jobs and concurrency | **superseded by D-017 on 7 Sep 2026** (free credits exhausted until 1 October and the user chose not to continue); the durable-execution requirements it recorded still stand | - |
| D-006 | Direct OpenAI GPT Image 2 snapshot for product and worn stills | accepted default | jewelry evaluation gate fails or superior tested profile |
| D-007 | fal.ai as Seedance inference gateway | accepted | access, licensing, quota, or reliability gate fails |
| D-008 | Seedance 2.0 Fast for four 4-second previews | accepted showcase default | conversion/cost evidence favors selected-only or another tested profile |
| D-009 | Seedance 2.0 Standard for optional selected final motion | accepted | quality/cost/identity gate fails |
| D-010 | Deterministic canonical pendant identity precedes generation | accepted invariant | never; implementation may evolve |
| D-011 | Four product pipelines run concurrently; each independently unlocks worn + motion in parallel | accepted invariant | provider limitation forces a documented temporary queue policy |
| D-012 | Anonymous guest first, link identity for durable account/commerce | accepted | legal/fraud requirements |
| D-013 | Modular monolith with web + jobs deployables | accepted | tracing proves independent service boundary |
| D-014 | Managed remote dev/previews; no required Docker/local infra | accepted | explicit user reversal or vendor outage strategy |
| D-015 | No autonomous/open-source media-agent framework in production execution | accepted | a framework proves simpler without duplicating Trigger or adding another runtime |
| D-016 | Motion, Embla, react-zoom-pan-pinch, react-dropzone, native short MP4 video | accepted UI foundation | accessibility/performance evidence requires replacement |
| D-017 | Inngest is the durable job engine, self-hosted as a second DigitalOcean App Platform component; functions are served by `apps/web` at `/api/inngest`; Inngest Cloud is a one-variable switch (`INNGEST_BASE_URL`) | accepted 7 Sep 2026 on user instruction | Inngest Cloud account exists and its free tier suits the load, or a measured operability failure of the self-hosted server |
| D-018 | Runway MCP serving `gpt-image-2` is the bench for all prompt and stencil work; OpenAI stays the production still provider, wired fail-closed and called only at the phase 5 gate in `docs/ROAD-TO-GOLD.md` | accepted 7 Sep 2026 on user instruction | Runway stops serving the same model as production, so lab results no longer transfer |

## D-018 detail

Runway is not taking a locked provider role, so this does not reopen D-006.
It serves the same model the production adapter calls, and the lab already invokes
the production identity renderer unmodified, so a prompt proven on Runway is the
prompt OpenAI runs. The lab's output is a text prompt plus reference images, both
provider neutral. Credits are effectively unlimited for this work, which removes
cost as a reason to stop short of real generation and leaves only correctness.
Iterating against the paid OpenAI endpoint is now a mistake, not a shortcut.

## D-017 detail

- Chosen because Inngest Cloud was not signed in when the replacement had to
  ship. The fallback in the goal document is what was built.
- Self-hosted server: Docker Hub `inngest/inngest:v1.44.0-amd64`, `inngest start`,
  `internal_ports: [8288]`, one instance, no public ingress route.
- Persistence: `--postgres-uri` on the Supabase IPv4 **session** pooler with
  `search_path=inngest`. Queue and run state are in-process (in-memory Redis
  with SQLite snapshots) and App Platform has no persistent volume, so a restart
  loses in-flight run state. That is tolerable only because Supabase plus the
  outbox and the two-minute stale sweeper remain the durable truth, and it is
  the main reason to move to Cloud or add `--redis-uri` later.
- Exactly-once: the outbox `dispatch_idempotency_key` is sent as the Inngest
  event id. No function-level `idempotency` key, so a legitimate re-dispatch
  under a new key still runs.
- `INNGEST_CRON_ENABLED=1` is set on exactly one environment, because the cron
  functions claim work from the shared outbox with service-role credentials.

## Capacity gates

- OpenAI project quota must support the intended four-way GPT Image 2 fan-out and progressive worn work.
- fal account concurrency must be verified at four or higher before `preview_all` is launch-ready.
- Provider limits and model-spend ceilings remain configuration with measured evidence.
