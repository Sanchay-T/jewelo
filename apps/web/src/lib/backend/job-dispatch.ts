import "server-only";

import {
  dispatchPendingOutbox,
  type DispatchOperation,
  type JobDispatchOptions,
  type JobDispatchResult,
  type OutboxDispatchSummary,
} from "@jewelo/data/outbox-dispatch";

import { inngest, jobEngineConfigured, JOB_EVENTS } from "../../inngest/client";
import { adminConfig } from "./supabase-rest";

export type ImmediateDispatchState =
  | "accepted"
  | "partially_pending"
  | "pending";

/** Fixed vocabulary: a dispatch failure never echoes provider or env detail. */
export type ImmediateDispatchErrorCode =
  | "not_configured"
  | "rejected"
  | "dispatch_failed";

export async function dispatchDurableOutbox(
  aggregateId: string,
): Promise<OutboxDispatchSummary> {
  const admin = adminConfig();
  if (!jobEngineConfigured()) throw new Error("job_dispatch_not_configured");
  return dispatchPendingOutbox(
    {
      SUPABASE_URL: admin.url,
      SUPABASE_SERVICE_ROLE_KEY: admin.key,
    },
    sendJobEvent,
    fetch,
    { aggregateId },
  );
}

export async function attemptImmediateDispatch(aggregateId: string): Promise<{
  dispatchState: ImmediateDispatchState;
  acceptedCount: number;
  pendingCount: number;
  errorCode?: ImmediateDispatchErrorCode;
}> {
  try {
    const summary = await dispatchDurableOutbox(aggregateId);
    const acceptedCount = summary.accepted.length;
    const pendingCount = summary.pending.length;
    return {
      dispatchState:
        pendingCount === 0
          ? "accepted"
          : acceptedCount > 0
            ? "partially_pending"
            : "pending",
      acceptedCount,
      pendingCount,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "job_dispatch_failed";
    console.error("immediate_dispatch_failed", { aggregateId, error: message });
    return {
      dispatchState: "pending",
      acceptedCount: 0,
      pendingCount: 1,
      errorCode: message.startsWith("job_dispatch_not_configured")
        ? "not_configured"
        : message.startsWith("job_dispatch_rejected")
          ? "rejected"
          : "dispatch_failed",
    };
  }
}

/**
 * The only transport. The durable outbox row keeps its dispatch key; Inngest
 * receives that key as the event `id`, which is its exactly-once identity, so
 * a duplicate dispatch of the same outbox event can never start a second run
 * or a second paid provider attempt.
 *
 * A legitimate re-dispatch of the same task (operator retry, stale sweeper)
 * writes a *new* `dispatch_idempotency_key` in the database, so it is a new
 * event and does run. That is why the function itself carries no `idempotency`
 * key: the durable row, not the engine, decides what is a duplicate.
 */
export async function sendJobEvent(
  payload: {
    taskId: string;
    operation: DispatchOperation;
    pollCount?: number;
  },
  options: JobDispatchOptions,
): Promise<JobDispatchResult> {
  if (!jobEngineConfigured()) throw new Error("job_dispatch_not_configured");
  let result: { ids: string[] };
  try {
    result = await inngest.send({
      id: options.idempotencyKey,
      name: JOB_EVENTS[payload.operation],
      data:
        payload.operation === "video_poll"
          ? { taskId: payload.taskId, pollCount: payload.pollCount ?? 0 }
          : { taskId: payload.taskId },
    });
  } catch (error) {
    // The persisted outbox error is a fixed code; the transport detail stays in
    // the server log and the error cause, never in the customer-visible row.
    console.error("job_dispatch_rejected", {
      taskId: payload.taskId,
      operation: payload.operation,
      error: error instanceof Error ? error.message : "unknown",
    });
    throw new Error("job_dispatch_rejected", { cause: error });
  }
  const id = result.ids[0];
  if (!id) throw new Error("job_dispatch_failed:no_event_id");
  return { id };
}
