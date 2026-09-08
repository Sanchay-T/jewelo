import "server-only";

import {
  previewRequestContactSchema,
  previewRequestSpecificationSchema,
} from "@jewelo/contracts";
import { notificationSweepLimits, parseNotificationEnv } from "@jewelo/config";
import {
  createNotificationSender,
  previewRequestNotificationMessage,
  type NotificationResult,
  type NotificationSender,
} from "@jewelo/ai/notification";

import { inngest, PREVIEW_REQUEST_CREATED_EVENT } from "./client";

/**
 * P7-3 / DS-8. Somebody in the shop is told a request arrived.
 *
 * The event carries the request id and nothing else. Everything the message
 * says is loaded here with the service role, so a customer request body can
 * never decide what the shop is told, and the shopper's contact detail never
 * travels through the job engine's event store.
 *
 * Idempotence is a database claim, not an engine feature. The function updates
 * `preview_requests.notified_at` where it is still null and only continues if
 * that update returned a row; a re-delivered event, an Inngest retry and a
 * manual replay all lose that race exactly once. If the send then fails the
 * claim is released, so the next attempt announces the request rather than
 * swallowing it.
 */

/** Only what the message needs. `contact` is PII and stays server-side. */
const NOTIFICATION_COLUMNS =
  "id,locale,created_at,specification,contact,notified_at";

interface ClaimedRow {
  id: string;
  locale: string;
  created_at: string;
  specification: unknown;
  contact: unknown;
}

export type NotificationOutcome =
  | { status: "not_configured" }
  | { status: "already_notified"; requestId: string }
  | { status: "sent"; requestId: string; transport: NotificationResult["transport"]; delivered: boolean };

interface Dependencies {
  admin: () => { url: string; key: string };
  sender: () => NotificationSender;
  to: () => string | undefined;
  queueUrl: (locale: string) => string;
}

function environment(): Record<string, string | undefined> {
  return {
    NOTIFICATION_TRANSPORT: process.env.NOTIFICATION_TRANSPORT,
    NOTIFICATION_TO: process.env.NOTIFICATION_TO,
    NOTIFICATION_FROM: process.env.NOTIFICATION_FROM,
    NOTIFICATION_SMTP_HOST: process.env.NOTIFICATION_SMTP_HOST,
    NOTIFICATION_SMTP_PORT: process.env.NOTIFICATION_SMTP_PORT,
    NOTIFICATION_SMTP_SECURITY: process.env.NOTIFICATION_SMTP_SECURITY,
    NOTIFICATION_SMTP_USER: process.env.NOTIFICATION_SMTP_USER,
    NOTIFICATION_SMTP_PASSWORD: process.env.NOTIFICATION_SMTP_PASSWORD,
    NOTIFICATION_SMTP_TIMEOUT_MS: process.env.NOTIFICATION_SMTP_TIMEOUT_MS,
  };
}

/**
 * The operator queue lives under a locale segment. The shop reads English, and
 * the link is built from the deployed app URL rather than from the request, so
 * a spoofed `Host` header can never point the shop at another origin.
 */
function operatorQueueUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3011";
  return `${base.replace(/\/+$/u, "")}/en/operator`;
}

function productionDependencies(): Dependencies {
  return {
    admin: () => ({
      url: process.env.SUPABASE_URL ?? "",
      key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    }),
    sender: () => createNotificationSender(parseNotificationEnv(environment())),
    to: () => process.env.NOTIFICATION_TO?.trim() || undefined,
    queueUrl: operatorQueueUrl,
  };
}

async function claim(
  admin: { url: string; key: string },
  requestId: string,
): Promise<ClaimedRow | undefined> {
  const response = await fetch(
    `${admin.url}/rest/v1/preview_requests?id=eq.${encodeURIComponent(requestId)}&notified_at=is.null&select=${NOTIFICATION_COLUMNS}`,
    {
      method: "PATCH",
      headers: {
        apikey: admin.key,
        authorization: `Bearer ${admin.key}`,
        "content-type": "application/json",
        prefer: "return=representation",
      },
      body: JSON.stringify({ notified_at: new Date().toISOString() }),
    },
  );
  if (!response.ok)
    throw new Error(`preview_request_notification_claim_failed:${response.status}`);
  const rows = (await response.json()) as ClaimedRow[];
  return rows[0];
}

/** Puts the request back in the unannounced set after a failed send. */
async function release(
  admin: { url: string; key: string },
  requestId: string,
): Promise<void> {
  await fetch(
    `${admin.url}/rest/v1/preview_requests?id=eq.${encodeURIComponent(requestId)}`,
    {
      method: "PATCH",
      headers: {
        apikey: admin.key,
        authorization: `Bearer ${admin.key}`,
        "content-type": "application/json",
        prefer: "return=minimal",
      },
      body: JSON.stringify({ notified_at: null }),
    },
  );
}

/**
 * The body, exported so it can be driven without a live Inngest run.
 */
export async function notifyPreviewRequest(
  requestId: string,
  overrides: Partial<Dependencies> = {},
): Promise<NotificationOutcome> {
  const dependencies = { ...productionDependencies(), ...overrides };
  const to = dependencies.to();
  // No shop address means there is nothing to send to. That is a deployment
  // state, not a failure: the request is already durable and visible in the
  // operator queue, so the job reports it and stops instead of retrying.
  if (!to) {
    console.warn("preview_request_notification_not_configured", { requestId });
    return { status: "not_configured" };
  }
  const admin = dependencies.admin();
  if (!admin.url || !admin.key)
    throw new Error("preview_request_notification_supabase_missing");

  const row = await claim(admin, requestId);
  if (!row) return { status: "already_notified", requestId };

  try {
    // A row written by an earlier contract version must not wedge the job; the
    // parse failure is reported as itself, not as a mail failure.
    const specification = previewRequestSpecificationSchema.parse(
      row.specification,
    );
    const contact = previewRequestContactSchema.parse(row.contact);
    const message = previewRequestNotificationMessage(
      {
        requestId: row.id,
        locale: row.locale === "ar" ? "ar" : "en",
        createdAt: row.created_at,
        specification,
        contact,
        queueUrl: dependencies.queueUrl(row.locale),
      },
      to,
    );
    const result = await dependencies.sender().send(message);
    return {
      status: "sent",
      requestId: row.id,
      transport: result.transport,
      delivered: result.delivered,
    };
  } catch (error) {
    await release(admin, requestId);
    throw error;
  }
}

/* ------------------------------------------------------------------------- */
/* The sweep.                                                                 */
/*                                                                            */
/* Storyline review 1, B3. Announcing was a single best-effort send on the     */
/* create path of `POST /api/preview-requests`, and best effort is exactly     */
/* what it says: an Inngest outage, a deployment without a shop address, or a  */
/* shopper who replayed an existing request left a captured request that       */
/* nobody was told about, and no job ever looked at the unannounced set        */
/* again. On 9 September 2026 that set held 13 rows.                          */
/*                                                                            */
/* The sweep closes it. Every two minutes it reads the rows whose             */
/* `notified_at` is still null (the `preview_requests_unnotified` index) and   */
/* re-emits `preview-request/created` with the same event id the route uses,   */
/* so the claim function does the rest: Inngest deduplicates the id, and the   */
/* `notified_at` claim in the database makes the message exactly one even if   */
/* it did not.                                                                */
/* ------------------------------------------------------------------------- */

/** One announcement event, in the id shape the route sends. */
export interface AnnouncementEvent {
  id: string;
  name: typeof PREVIEW_REQUEST_CREATED_EVENT;
  data: { previewRequestId: string };
}

export function announcementEvent(requestId: string): AnnouncementEvent {
  return {
    id: `preview-request-created:${requestId}`,
    name: PREVIEW_REQUEST_CREATED_EVENT,
    data: { previewRequestId: requestId },
  };
}

interface SweepDependencies {
  admin: () => { url: string; key: string };
  /** The shop's address; without one there is nobody to announce to. */
  to: () => string | undefined;
  send: (events: AnnouncementEvent[]) => Promise<unknown>;
  now: () => Date;
}

/**
 * The rows the sweep may announce: unannounced, older than the floor, oldest
 * first, capped by the validated batch. Only the id is selected - the message
 * is composed by the claim function with the service role, so no contact detail
 * is read here and none can travel in an event.
 */
export function unannouncedRequestsQuery(before: string): string {
  return `/rest/v1/preview_requests?select=id&notified_at=is.null&created_at=lt.${encodeURIComponent(before)}&order=created_at.asc&limit=${notificationSweepLimits.notificationSweepBatch}`;
}

export type SweepOutcome =
  | { status: "not_configured" }
  | { status: "swept"; requestIds: string[] };

/**
 * The body, exported so it can be driven without a live Inngest run. `send` is
 * injectable so a harness can print the ids a sweep would emit and emit
 * nothing.
 */
export async function sweepUnannouncedRequests(
  overrides: Partial<SweepDependencies> = {},
): Promise<SweepOutcome> {
  const dependencies: SweepDependencies = {
    admin: () => ({
      url: process.env.SUPABASE_URL ?? "",
      key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    }),
    to: () => process.env.NOTIFICATION_TO?.trim() || undefined,
    send: (events) => inngest.send(events),
    now: () => new Date(),
    ...overrides,
  };
  // No shop address means every event this sweep sent would end in
  // `not_configured`. Reporting the deployment state and stopping is honest;
  // emitting 50 events every two minutes to a function that cannot send is not.
  if (!dependencies.to()) return { status: "not_configured" };
  const admin = dependencies.admin();
  if (!admin.url || !admin.key)
    throw new Error("preview_request_notification_supabase_missing");
  const before = new Date(
    dependencies.now().getTime() -
      notificationSweepLimits.notificationSweepMinAgeMs,
  ).toISOString();
  const response = await fetch(`${admin.url}${unannouncedRequestsQuery(before)}`, {
    headers: {
      apikey: admin.key,
      authorization: `Bearer ${admin.key}`,
      accept: "application/json",
    },
  });
  if (!response.ok)
    throw new Error(
      `preview_request_notification_sweep_read_failed:${response.status}`,
    );
  const rows = (await response.json()) as { id: string }[];
  const requestIds = rows.map((row) => row.id).filter(Boolean);
  if (requestIds.length === 0) return { status: "swept", requestIds };
  await dependencies.send(requestIds.map(announcementEvent));
  console.warn("preview_request_notification_swept", {
    count: requestIds.length,
  });
  return { status: "swept", requestIds };
}

export const previewRequestNotificationSweep = inngest.createFunction(
  {
    id: "preview-request-notification-sweep",
    name: "New request notification sweep",
    triggers: [{ cron: "*/2 * * * *" }],
    // Two ticks must never read the same unannounced set at once; the event id
    // and the database claim would still make it one message, but the second
    // tick's work is pure waste.
    concurrency: 1,
    // The sweep is the backstop, and the next tick is two minutes away: a read
    // that fails is retried by the clock rather than by the engine.
    retries: 0,
  },
  async ({ step }) => step.run("sweep-unannounced", () => sweepUnannouncedRequests()),
);

export const previewRequestNotification = inngest.createFunction(
  {
    id: "preview-request-notification",
    name: "New request notification",
    triggers: [{ event: PREVIEW_REQUEST_CREATED_EVENT }],
    // One mail server connection at a time; a shop makes a handful of requests
    // an hour and a submission host rate-limits parallel sessions.
    concurrency: 1,
    // Safe to retry: the claim is the idempotency boundary and a failed send
    // releases it, so a retry sends exactly once and a duplicate sends nothing.
    retries: 3,
  },
  async ({ event, step }) =>
    step.run("notify-shop", () =>
      notifyPreviewRequest(String(event.data.previewRequestId)),
    ),
);
