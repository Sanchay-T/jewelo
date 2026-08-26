import { queue, task } from "@trigger.dev/sdk";
import {
  executePresentationTask,
  productionPresentationDependencies,
} from "../presentation";

const falImageQueue = queue({
  name: "fal-image",
  concurrencyLimit: Math.max(
    1,
    Math.min(32, Number(process.env.FAL_CONCURRENCY_LIMIT ?? 2)),
  ),
});

export const studioPresentationTask = task({
  id: "presentation-task-v1",
  queue: falImageQueue,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 2_000,
    maxTimeoutInMs: 30_000,
    randomize: true,
  },
  run: async (payload: { taskId: string }) => {
    const dependencies = productionPresentationDependencies();
    return executePresentationTask(
      payload.taskId,
      dependencies.repository,
      dependencies.generator,
      dependencies.verifier,
    );
  },
});

export const outboxRecoveryTask = task({
  id: "outbox-recovery-v1",
  retry: {
    maxAttempts: 5,
    factor: 2,
    minTimeoutInMs: 1_000,
    maxTimeoutInMs: 60_000,
    randomize: true,
  },
  run: async () => {
    const environment = process.env;
    const url = environment.SUPABASE_URL;
    const key = environment.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase jobs configuration missing");
    const response = await fetch(
      `${url}/rest/v1/outbox_events?state=in.(pending,failed)&available_at=lte.${encodeURIComponent(new Date().toISOString())}&order=created_at&limit=50`,
      { headers: { apikey: key, authorization: `Bearer ${key}` } },
    );
    if (!response.ok) throw new Error(`Outbox read failed:${response.status}`);
    const events = (await response.json()) as Array<{
      id: string;
      payload: { taskId?: string };
      dispatch_idempotency_key: string;
      attempt_count: number;
    }>;
    for (const event of events) {
      if (!event.payload.taskId) continue;
      await studioPresentationTask.trigger(
        { taskId: event.payload.taskId },
        { idempotencyKey: event.dispatch_idempotency_key },
      );
      await fetch(`${url}/rest/v1/outbox_events?id=eq.${event.id}`, {
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
      });
    }
    return { dispatched: events.length };
  },
});
