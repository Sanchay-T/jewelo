import { queue, schedules, task } from "@trigger.dev/sdk";
import {
  executePresentationTask,
  productionPresentationDependencies,
} from "../presentation";
import { dispatchPendingOutbox } from "../outbox";
import { videoSubmissionTask } from "./video";

const openAIImageQueue = queue({
  name: "openai-image",
  concurrencyLimit: Math.max(
    1,
    Math.min(32, Number(process.env.OPENAI_STILL_CONCURRENCY_LIMIT ?? 2)),
  ),
});

export const studioPresentationTask = task({
  id: "presentation-task-v1",
  queue: openAIImageQueue,
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
  run: async () =>
    dispatchPendingOutbox(process.env, (payload, options) =>
      payload.taskKind === "video"
        ? videoSubmissionTask.trigger({ taskId: payload.taskId }, options)
        : studioPresentationTask.trigger({ taskId: payload.taskId }, options),
    ),
});
