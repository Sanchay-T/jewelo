export type DispatchOperation =
  | "still_execute"
  | "video_submit"
  | "video_poll";

interface OutboxEvent {
  id: string;
  aggregate_id: string;
  payload: {
    taskId?: string;
    taskKind?: "still" | "video";
    operation?: DispatchOperation;
    pollCount?: number;
  };
  dispatch_idempotency_key: string;
  attempt_count: number;
}

type ClaimedOutboxEvent = OutboxEvent;

export interface TriggerDispatchOptions {
  idempotencyKey: string;
  idempotencyKeyTTL: "30d";
  ttl: "1h";
  tags: string[];
}

export interface TriggerDispatchResult {
  id: string;
}

export interface OutboxDispatchSummary {
  accepted: Array<{ outboxId: string; triggerRunId: string }>;
  pending: Array<{ outboxId: string; errorCode: string }>;
}

interface DispatchEnvironment {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

function operationFor(event: OutboxEvent): DispatchOperation {
  return (
    event.payload.operation ??
    (event.payload.taskKind === "video" ? "video_submit" : "still_execute")
  );
}

function sanitizedError(error: unknown): string {
  return (error instanceof Error ? error.message : "dispatch_failed")
    .replaceAll(/\s+/g, " ")
    .slice(0, 240);
}

export async function dispatchPendingOutbox(
  environment: DispatchEnvironment,
  trigger: (
    payload: {
      taskId: string;
      operation: DispatchOperation;
      pollCount?: number;
    },
    options: TriggerDispatchOptions,
  ) => Promise<TriggerDispatchResult>,
  fetcher: typeof fetch = fetch,
  scope: { aggregateId?: string } = {},
): Promise<OutboxDispatchSummary> {
  const url = environment.SUPABASE_URL;
  const key = environment.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase jobs configuration missing");
  const headers = {
    apikey: key,
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
  };
  const aggregateFilter = scope.aggregateId
    ? `&aggregate_id=eq.${encodeURIComponent(scope.aggregateId)}`
    : "";
  const response = await fetcher(
    `${url}/rest/v1/outbox_events?state=in.(pending,failed,dispatching)&available_at=lte.${encodeURIComponent(new Date().toISOString())}${aggregateFilter}&order=created_at&limit=50`,
    { headers },
  );
  if (!response.ok) throw new Error(`Outbox read failed:${response.status}`);
  const events = (await response.json()) as OutboxEvent[];
  const settled = await Promise.all(
    events.map(async (event) => {
      const leaseId = crypto.randomUUID();
      const claim = await fetcher(`${url}/rest/v1/rpc/claim_outbox_event`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          p_event_id: event.id,
          p_lease_id: leaseId,
          p_lease_seconds: 90,
        }),
      }).catch(() => undefined);
      if (!claim?.ok)
        return {
          kind: "pending" as const,
          outboxId: event.id,
          errorCode: `outbox_claim_failed:${claim?.status ?? "network"}`,
        };
      const rows = (await claim.json().catch(() => [])) as ClaimedOutboxEvent[];
      const claimed = rows[0];
      if (!claimed) return undefined;
      if (!claimed.payload.taskId) {
        const error = "outbox_task_id_missing";
        await nack(claimed, leaseId, error, url, headers, fetcher).catch(
          () => undefined,
        );
        return { kind: "pending" as const, outboxId: claimed.id, errorCode: error };
      }
      try {
        const operation = operationFor(claimed);
        const result = await trigger(
          {
            taskId: claimed.payload.taskId,
            operation,
            ...(operation === "video_poll"
              ? { pollCount: claimed.payload.pollCount ?? 0 }
              : {}),
          },
          {
            idempotencyKey: claimed.dispatch_idempotency_key,
            idempotencyKeyTTL: "30d",
            ttl: "1h",
            tags: [
              "caleums",
              `task:${claimed.payload.taskId}`,
              `outbox:${claimed.id}`,
            ],
          },
        );
        if (!result.id) throw new Error("trigger_run_id_missing");
        const acknowledged = await fetcher(
          `${url}/rest/v1/rpc/ack_outbox_event`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              p_event_id: claimed.id,
              p_lease_id: leaseId,
              p_trigger_run_id: result.id,
            }),
          },
        );
        if (!acknowledged.ok)
          throw new Error(`Outbox acknowledge failed:${acknowledged.status}`);
        return {
          kind: "accepted" as const,
          outboxId: claimed.id,
          triggerRunId: result.id,
        };
      } catch (error) {
        const code = sanitizedError(error);
        await nack(claimed, leaseId, code, url, headers, fetcher).catch(
          () => undefined,
        );
        return { kind: "pending" as const, outboxId: claimed.id, errorCode: code };
      }
    }),
  );
  return {
    accepted: settled
      .filter((item) => item?.kind === "accepted")
      .map((item) => ({
        outboxId: item.outboxId,
        triggerRunId: item.triggerRunId,
      })),
    pending: settled
      .filter((item) => item?.kind === "pending")
      .map((item) => ({ outboxId: item.outboxId, errorCode: item.errorCode })),
  };
}

async function nack(
  event: ClaimedOutboxEvent,
  leaseId: string,
  error: string,
  url: string,
  headers: Record<string, string>,
  fetcher: typeof fetch,
) {
  const backoffSeconds = Math.min(300, 15 * 2 ** event.attempt_count);
  const response = await fetcher(`${url}/rest/v1/rpc/nack_outbox_event`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      p_event_id: event.id,
      p_lease_id: leaseId,
      p_error: error,
      p_available_at: new Date(Date.now() + backoffSeconds * 1_000).toISOString(),
    }),
  });
  if (!response.ok) throw new Error(`Outbox nack failed:${response.status}`);
}
