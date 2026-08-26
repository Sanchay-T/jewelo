interface OutboxEvent {
  id: string;
  payload: { taskId?: string };
  dispatch_idempotency_key: string;
  attempt_count: number;
}

export async function dispatchPendingOutbox(
  environment: Record<string, string | undefined>,
  trigger: (
    payload: { taskId: string },
    options: { idempotencyKey: string },
  ) => Promise<unknown>,
  fetcher: typeof fetch = fetch,
) {
  const url = environment.SUPABASE_URL;
  const key = environment.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase jobs configuration missing");
  const response = await fetcher(
    `${url}/rest/v1/outbox_events?state=in.(pending,failed)&available_at=lte.${encodeURIComponent(new Date().toISOString())}&order=created_at&limit=50`,
    { headers: { apikey: key, authorization: `Bearer ${key}` } },
  );
  if (!response.ok) throw new Error(`Outbox read failed:${response.status}`);
  const events = (await response.json()) as OutboxEvent[];
  let dispatched = 0;
  for (const event of events) {
    if (!event.payload.taskId) continue;
    await trigger(
      { taskId: event.payload.taskId },
      { idempotencyKey: event.dispatch_idempotency_key },
    );
    const published = await fetcher(
      `${url}/rest/v1/outbox_events?id=eq.${event.id}`,
      {
        method: "PATCH",
        headers: {
          apikey: key,
          authorization: `Bearer ${key}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          state: "published",
          published_at: new Date().toISOString(),
          attempt_count: event.attempt_count + 1,
        }),
      },
    );
    if (!published.ok)
      throw new Error(`Outbox publish failed:${published.status}`);
    dispatched += 1;
  }
  return { dispatched };
}
