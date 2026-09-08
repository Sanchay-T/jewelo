import "server-only";

import {
  previewRequestContactSchema,
  previewRequestSpecificationSchema,
} from "@jewelo/contracts";
import { parseNotificationEnv } from "@jewelo/config";
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
