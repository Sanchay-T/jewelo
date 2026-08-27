import { queue, schedules, task } from "@trigger.dev/sdk";
import {
  executePresentationTask,
  productionPresentationDependencies,
} from "../presentation";
import { dispatchPendingOutbox } from "../outbox";
import { videoPollTask, videoSubmissionTask } from "./video";

const openAIImageQueue = queue({
  name: "openai-image",
  concurrencyLimit: Math.max(
    1,
    Math.min(32, Number(process.env.OPENAI_STILL_CONCURRENCY_LIMIT ?? 4)),
  ),
});

export const studioPresentationTask = task({
  id: "presentation-task-v1",
  queue: openAIImageQueue,
  retry: {
    // Paid retries are driven by durable provider-attempt state, never by an
    // interrupted Trigger process whose provider acceptance may be unknown.
    maxAttempts: 1,
    factor: 2,
    minTimeoutInMs: 2_000,
    maxTimeoutInMs: 30_000,
    randomize: true,
  },
  run: async (payload: { taskId: string }) => {
    const dependencies = productionPresentationDependencies();
    const result = await executePresentationTask(
      payload.taskId,
      dependencies.repository,
      dependencies.generator,
      dependencies.verifier,
      dependencies.nameReader,
    );
    if (result.status === "ready")
      await dispatchPendingOutbox(process.env, dispatchOutboxEvent);
    return result;
  },
});

const outboxQueue = queue({ name: "outbox-dispatch", concurrencyLimit: 1 });

export const outboxRecoveryTask = schedules.task({
  id: "outbox-recovery-v1",
  cron: "* * * * *",
  queue: outboxQueue,
  retry: {
    maxAttempts: 5,
    factor: 2,
    minTimeoutInMs: 1_000,
    maxTimeoutInMs: 60_000,
    randomize: true,
  },
  run: async () => dispatchPendingOutbox(process.env, dispatchOutboxEvent),
});

export const staleMediaRecoveryTask = schedules.task({
  id: "stale-media-recovery-v1",
  cron: "*/2 * * * *",
  queue: outboxQueue,
  retry: { maxAttempts: 1 },
  run: async () => {
    const recovered = await recoverStaleTasks(process.env);
    const dispatched = await dispatchPendingOutbox(
      process.env,
      dispatchOutboxEvent,
    );
    return { recovered, dispatched };
  },
});

async function recoverStaleTasks(
  environment: Record<string, string | undefined>,
) {
  const url = environment.SUPABASE_URL;
  const key = environment.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase jobs configuration missing");
  const staleBefore = new Date(Date.now() - 2 * 60 * 1_000).toISOString();
  const response = await fetch(
    `${url}/rest/v1/rpc/recover_stale_generation_tasks`,
    {
      method: "POST",
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ p_stale_before: staleBefore, p_limit: 100 }),
    },
  );
  if (!response.ok)
    throw new Error(`Stale task recovery failed:${response.status}`);
  return response.json() as Promise<
    Array<{ task_id: string; recovery_action: string; outbox_id?: string }>
  >;
}

async function dispatchOutboxEvent(
  payload: {
    taskId: string;
    operation: "still_execute" | "video_submit" | "video_poll";
    pollCount?: number;
  },
  options: {
    idempotencyKey: string;
    idempotencyKeyTTL: "30d";
    ttl: "1h";
    tags: string[];
  },
) {
  if (payload.operation === "video_submit")
    return videoSubmissionTask.trigger({ taskId: payload.taskId }, options);
  if (payload.operation === "video_poll")
    return videoPollTask.trigger(
      { taskId: payload.taskId, pollCount: payload.pollCount ?? 0 },
      options,
    );
  return studioPresentationTask.trigger({ taskId: payload.taskId }, options);
}
