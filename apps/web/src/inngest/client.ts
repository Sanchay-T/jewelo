import "server-only";

import { Inngest } from "inngest";

import type { DispatchOperation } from "@jewelo/data/outbox-dispatch";

/**
 * Inngest is the durable job engine (user-instructed replacement for
 * Trigger.dev, 7 September 2026). The functions are served from this Next.js
 * app at `/api/inngest`, so there is no separate worker deployable.
 *
 * Cloud vs self-hosted is a one-variable switch:
 *   - `INNGEST_BASE_URL` unset  -> Inngest Cloud (event/signing keys from Cloud)
 *   - `INNGEST_BASE_URL` set    -> the self-hosted `inngest start` server
 * Everything else is identical.
 */
export const JOB_APP_ID = "jewelo-caleums";

/** Event names. One per durable outbox operation, plus the internal poll loop. */
export const JOB_EVENTS = {
  still_execute: "jewelo/presentation.requested",
  video_submit: "jewelo/video.submit.requested",
  video_poll: "jewelo/video.poll.requested",
} as const satisfies Record<DispatchOperation, string>;

export type JobEventName = (typeof JOB_EVENTS)[DispatchOperation];

export interface JobEventData {
  taskId: string;
  pollCount?: number;
}

/**
 * `isDev` is decided explicitly rather than inferred: a self-hosted server is a
 * production server that happens not to be Inngest Cloud, so signature
 * verification must stay on whenever a signing key exists.
 */
function isDevelopmentServer(): boolean {
  const explicit = process.env.INNGEST_DEV;
  if (explicit === "1" || explicit === "true") return true;
  if (explicit === "0" || explicit === "false") return false;
  return !process.env.INNGEST_SIGNING_KEY;
}

/**
 * "Configured" means the dispatch can actually reach an Inngest server:
 * a Cloud/self-hosted event key, or a local dev server that needs none.
 */
export function jobEngineConfigured(): boolean {
  return Boolean(process.env.INNGEST_EVENT_KEY) || isDevelopmentServer();
}

export const inngest = new Inngest({
  id: JOB_APP_ID,
  eventKey: process.env.INNGEST_EVENT_KEY,
  signingKey: process.env.INNGEST_SIGNING_KEY,
  baseUrl: process.env.INNGEST_BASE_URL,
  isDev: isDevelopmentServer(),
});

/**
 * Cron functions claim work from the shared `outbox_events` table with
 * service-role credentials, so exactly one environment may register them.
 * A developer's local `inngest dev` must never steal a live shopper's task.
 */
export function cronFunctionsEnabled(): boolean {
  return process.env.INNGEST_CRON_ENABLED === "1";
}

export function integerFromEnv(
  name: string,
  fallback: number,
  max = 32,
): number {
  const parsed = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(max, Math.trunc(parsed)));
}
