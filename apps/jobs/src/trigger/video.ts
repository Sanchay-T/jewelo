import { queue, task } from "@trigger.dev/sdk";
import { markVideoPollTimeout, pollVideoTask, submitVideoTask } from "../video";

const falVideoQueue = queue({
  name: "fal-video",
  concurrencyLimit: Math.max(
    1,
    Math.min(32, Number(process.env.FAL_VIDEO_CONCURRENCY_LIMIT ?? 2)),
  ),
});

export const videoPollTask = task({
  id: "video-poll-v1",
  queue: falVideoQueue,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 2_000,
    maxTimeoutInMs: 30_000,
  },
  run: async (payload: { taskId: string; pollCount: number }) => {
    const result = await pollVideoTask(payload.taskId);
    if (result.status === "pending" && payload.pollCount < 60)
      await videoPollTask.trigger(
        { taskId: payload.taskId, pollCount: payload.pollCount + 1 },
        {
          delay: "10s",
          idempotencyKey: `video-poll:${payload.taskId}:${payload.pollCount + 1}`,
        },
      );
    if (result.status === "pending" && payload.pollCount >= 60)
      return markVideoPollTimeout(payload.taskId);
    return result;
  },
});

export const videoSubmissionTask = task({
  id: "video-submit-v1",
  queue: falVideoQueue,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 2_000,
    maxTimeoutInMs: 30_000,
  },
  run: async (payload: { taskId: string }) => {
    const result = await submitVideoTask(payload.taskId);
    if (result.status === "submitted")
      await videoPollTask.trigger(
        { taskId: payload.taskId, pollCount: 0 },
        {
          delay: "10s",
          idempotencyKey: `video-poll:${payload.taskId}:${result.attempt}:0`,
        },
      );
    return result;
  },
});
