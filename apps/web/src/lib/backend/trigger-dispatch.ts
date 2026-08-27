import "server-only";

import {
  dispatchPendingOutbox,
  type DispatchOperation,
  type OutboxDispatchSummary,
  type TriggerDispatchOptions,
} from "@jewelo/data/outbox-dispatch";

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
  const triggerKey = process.env.TRIGGER_SECRET_KEY;
  if (!triggerKey) throw new Error("trigger_dispatch_not_configured");
  return dispatchPendingOutbox(
    {
      SUPABASE_URL: admin.url,
      SUPABASE_SERVICE_ROLE_KEY: admin.key,
    },
    (payload, options) => triggerTask(triggerKey, payload, options),
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
      error instanceof Error ? error.message : "trigger_dispatch_failed";
    console.error("immediate_dispatch_failed", { aggregateId, error: message });
    return {
      dispatchState: "pending",
      acceptedCount: 0,
      pendingCount: 1,
      errorCode: message.startsWith("trigger_dispatch_not_configured")
        ? "not_configured"
        : message.startsWith("trigger_dispatch_rejected")
          ? "rejected"
          : "dispatch_failed",
    };
  }
}

export async function triggerTask(
  triggerKey: string,
  payload: {
    taskId: string;
    operation: DispatchOperation;
    pollCount?: number;
  },
  options: TriggerDispatchOptions,
  fetcher: typeof fetch = fetch,
) {
  const taskIdentifier =
    payload.operation === "still_execute"
      ? "presentation-task-v1"
      : payload.operation === "video_submit"
        ? "video-submit-v1"
        : "video-poll-v1";
  const baseUrl = process.env.TRIGGER_API_URL ?? "https://api.trigger.dev";
  const response = await fetcher(
    `${baseUrl}/api/v1/tasks/${taskIdentifier}/trigger`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${triggerKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        payload:
          payload.operation === "video_poll"
            ? { taskId: payload.taskId, pollCount: payload.pollCount ?? 0 }
            : { taskId: payload.taskId },
        options,
      }),
    },
  );
  if (!response.ok)
    throw new Error(`trigger_dispatch_rejected:${response.status}`);
  const result = (await response.json()) as { id?: string };
  if (!result.id) throw new Error("trigger_dispatch_missing_run_id");
  return { id: result.id };
}
