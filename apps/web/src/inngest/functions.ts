import "server-only";

import {
  executePresentationTask,
  productionPresentationDependencies,
} from "@jewelo/jobs/presentation";
import { dispatchPendingOutbox } from "@jewelo/jobs/outbox";
import {
  markVideoPollTimeout,
  pollVideoTask,
  submitVideoTask,
} from "@jewelo/jobs/video";

import { sendJobEvent } from "../lib/backend/job-dispatch";
import {
  cronFunctionsEnabled,
  inngest,
  integerFromEnv,
  JOB_EVENTS,
} from "./client";

/** Mirrors the old `openai-image` Trigger queue: one shared, keyed sub-queue. */
const openAIImageConcurrency = {
  key: '"openai-image"',
  limit: integerFromEnv("OPENAI_STILL_CONCURRENCY_LIMIT", 4),
} as const;

/** Mirrors the old `fal-video` Trigger queue. */
const falVideoConcurrency = {
  key: '"fal-video"',
  limit: integerFromEnv("FAL_VIDEO_CONCURRENCY_LIMIT", 2),
} as const;

const MAX_VIDEO_POLLS = 60;

/**
 * Next narrows `process.env`, so the service-role pair is read explicitly.
 * These credentials only ever exist in this server runtime.
 */
function jobEnvironment(): Record<string, string | undefined> {
  return {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

/**
 * One paid still.
 *
 * `retries: 0` on purpose: a process-level retry cannot prove whether OpenAI
 * accepted and charged for the interrupted attempt. Paid retries are owned by
 * durable attempt state in Postgres (`reserveAttempt`, attempt budget 3) and
 * re-dispatched by `stale-media-recovery`.
 *
 * There is deliberately NO function-level `idempotency` key. The outbox
 * re-dispatches the same `taskId` legitimately - an operator retry and the
 * two-minute stale sweeper both write a fresh `dispatch_idempotency_key` - and
 * a function-level key on `event.data.taskId` would silently swallow those for
 * 24 hours. Exactly-once is carried by the event `id`, which is that durable
 * dispatch key (see `sendJobEvent`).
 *
 * The provider call stays inside a single `step.run`. `executePresentationTask`
 * is one closure over a reservation, an attempt counter and a regeneration
 * loop; splitting it across steps would require serialising `GeneratedMedia`
 * (the raw provider image bytes) into Inngest step state, which both bloats the
 * run and puts customer media outside private Supabase Storage.
 */
/**
 * The subset of the Inngest step tooling this body uses. Deliberately untyped
 * in its return: `step.run` answers `Jsonify<T>`, which is the same JSON this
 * function already returns, and pinning the generic here would only fight it.
 */
interface StepRunner {
  run(id: string, handler: () => unknown): Promise<unknown>;
}

type PresentationOutcome = Awaited<ReturnType<typeof executePresentationTask>>;

/**
 * The body, exported so the outbox scoping below is unit-testable without a
 * live Inngest run.
 */
export async function runPresentationTask(
  taskId: string,
  step: StepRunner,
  overrides: {
    execute?: (taskId: string) => Promise<PresentationOutcome>;
    dispatch?: typeof dispatchPendingOutbox;
  } = {},
) {
  const execute =
    overrides.execute ??
    ((id: string) => {
      const dependencies = productionPresentationDependencies();
      return executePresentationTask(
        id,
        dependencies.repository,
        dependencies.generator,
        dependencies.verifier,
        dependencies.nameReader,
      );
    });
  const dispatch = overrides.dispatch ?? dispatchPendingOutbox;
  const result = (await step.run("execute-presentation-task", () =>
    execute(taskId),
  )) as PresentationOutcome;
  // A ready still releases its dependent views through the same outbox.
  // Scoped to this run: an unscoped sweep claims other principals' pending rows
  // from inside a customer-triggered function, which both bypasses the
  // INNGEST_CRON_ENABLED guard on the recovery crons and races them.
  if (result.status === "ready" && result.runId) {
    const runId = result.runId;
    await step.run("dispatch-dependent-outbox", () =>
      dispatch(jobEnvironment(), sendJobEvent, fetch, { aggregateId: runId }),
    );
  }
  return result;
}

export const presentationTask = inngest.createFunction(
  {
    id: "presentation-task",
    name: "Presentation still",
    triggers: [{ event: JOB_EVENTS.still_execute }],
    concurrency: [openAIImageConcurrency],
    retries: 0,
  },
  async ({ event, step }) =>
    runPresentationTask(String(event.data.taskId), step),
);

/**
 * Reconciles the "database committed but the dispatch never landed" window.
 * Concurrency 1 so two ticks can never race for the same outbox lease.
 */
export const outboxRecovery = inngest.createFunction(
  {
    id: "outbox-recovery",
    name: "Outbox recovery",
    triggers: [{ cron: "* * * * *" }],
    concurrency: 1,
    retries: 3,
  },
  async ({ step }) =>
    step.run("dispatch-pending-outbox", () =>
      dispatchPendingOutbox(jobEnvironment(), sendJobEvent),
    ),
);

/**
 * Re-dispatches tasks whose worker died mid-flight. Same cadence as the
 * Trigger schedule it replaces.
 */
export const staleMediaRecovery = inngest.createFunction(
  {
    id: "stale-media-recovery",
    name: "Stale media recovery",
    triggers: [{ cron: "*/2 * * * *" }],
    concurrency: 1,
    retries: 0,
  },
  async ({ step }) => {
    const recovered = await step.run("recover-stale-tasks", () =>
      recoverStaleTasks(jobEnvironment()),
    );
    const dispatched = await step.run("dispatch-pending-outbox", () =>
      dispatchPendingOutbox(jobEnvironment(), sendJobEvent),
    );
    return { recovered, dispatched };
  },
);

/**
 * `retries: 0` for the same reason as the still: a retried submission cannot
 * prove whether fal already accepted a paid request.
 */
export const videoSubmit = inngest.createFunction(
  {
    id: "video-submit",
    name: "Video submit",
    triggers: [{ event: JOB_EVENTS.video_submit }],
    concurrency: [falVideoConcurrency],
    retries: 0,
  },
  async ({ event, step }) => {
    const taskId = String(event.data.taskId);
    const result = await step.run("submit-video", () => submitVideoTask(taskId));
    if (result.status === "submitted")
      await step.sendEvent("start-video-poll", {
        name: JOB_EVENTS.video_poll,
        data: { taskId, pollCount: 0 },
      });
    return result;
  },
);

/**
 * One durable run polls to completion with `step.sleep` between attempts,
 * instead of re-triggering itself once per poll.
 *
 * It carries no fal concurrency key: the rate-limited resource is submission,
 * not status reads, and a sleeping run would otherwise hold a submission slot
 * for the full ten-minute poll window.
 */
export const videoPoll = inngest.createFunction(
  {
    id: "video-poll",
    name: "Video poll",
    triggers: [{ event: JOB_EVENTS.video_poll }],
    retries: 3,
  },
  async ({ event, step }) => {
    const taskId = String(event.data.taskId);
    const start = Number(event.data.pollCount ?? 0);
    for (let pollCount = start; pollCount < MAX_VIDEO_POLLS; pollCount += 1) {
      const result = await step.run(`poll-video-${pollCount}`, () =>
        pollVideoTask(taskId),
      );
      if (result.status !== "pending") return result;
      await step.sleep(`wait-${pollCount}`, "10s");
    }
    return step.run("mark-video-poll-timeout", () =>
      markVideoPollTimeout(taskId),
    );
  },
);

/**
 * Cron functions claim work from the shared outbox with service-role
 * credentials. Registering them from a developer's machine would let a local
 * `inngest dev` steal a live shopper's task, so they are opt-in per
 * environment through `INNGEST_CRON_ENABLED=1`.
 */
export const functions = [
  presentationTask,
  videoSubmit,
  videoPoll,
  ...(cronFunctionsEnabled() ? [outboxRecovery, staleMediaRecovery] : []),
];

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
