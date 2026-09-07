import { afterEach, describe, expect, it, vi } from "vitest";

import {
  functions,
  presentationTask,
  runPresentationTask,
  staleMediaRecovery,
  videoPoll,
  videoSubmit,
} from "./functions";
import { JOB_EVENTS } from "./client";
import type { dispatchPendingOutbox } from "@jewelo/jobs/outbox";

const ids = (list: { id(): string }[]) => list.map((fn) => fn.id());

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Inngest job functions", () => {
  it("serves the customer-facing functions and holds the crons back by default", () => {
    expect(ids(functions)).toEqual([
      "presentation-task",
      "video-submit",
      "video-poll",
    ]);
  });

  it("registers the outbox crons only where they are explicitly enabled", async () => {
    vi.resetModules();
    vi.stubEnv("INNGEST_CRON_ENABLED", "1");
    const enabled = await import("./functions");
    expect(ids(enabled.functions)).toEqual([
      "presentation-task",
      "video-submit",
      "video-poll",
      "outbox-recovery",
      "stale-media-recovery",
    ]);
  });

  it("leaves duplicate detection to the durable outbox dispatch key", () => {
    // A function-level idempotency key on `event.data.taskId` would swallow the
    // legitimate re-dispatches (operator retry, stale sweeper) for 24 hours.
    expect(presentationTask.opts.idempotency).toBeUndefined();
    expect(presentationTask.opts.retries).toBe(0);
    expect(presentationTask.opts.concurrency).toEqual([
      { key: '"openai-image"', limit: expect.any(Number) },
    ]);
  });

  it("keeps every paid submission on a single, non-retried attempt", () => {
    expect(videoSubmit.opts.retries).toBe(0);
    expect(staleMediaRecovery.opts.retries).toBe(0);
  });

  it("polls video without holding a fal submission slot", () => {
    expect(videoPoll.opts.concurrency).toBeUndefined();
  });

  it("scopes the dependent-view dispatch to the run it just finished", async () => {
    // Unscoped, a customer-triggered function claims every principal's pending
    // outbox rows and bypasses the INNGEST_CRON_ENABLED guard on the crons.
    const step = { run: async <T,>(_id: string, handler: () => T | Promise<T>) => handler() };
    const dispatch = vi.fn<typeof dispatchPendingOutbox>(async () => ({
      accepted: [],
      pending: [],
    }));
    await runPresentationTask("task-1", step, {
      execute: async () => ({ status: "ready" as const, attempt: 1, runId: "run-9" }),
      dispatch,
    });
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0]![3]).toEqual({ aggregateId: "run-9" });
  });

  it("dispatches nothing when the still did not become ready", async () => {
    const step = { run: async <T,>(_id: string, handler: () => T | Promise<T>) => handler() };
    const dispatch = vi.fn<typeof dispatchPendingOutbox>(async () => ({
      accepted: [],
      pending: [],
    }));
    await runPresentationTask("task-1", step, {
      execute: async () => ({ status: "operator_review" as const, attempt: 3 }),
      dispatch,
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("maps every durable outbox operation to exactly one event name", () => {
    expect(new Set(Object.values(JOB_EVENTS)).size).toBe(3);
    expect(presentationTask.opts.triggers).toEqual([
      { event: JOB_EVENTS.still_execute },
    ]);
    expect(videoSubmit.opts.triggers).toEqual([
      { event: JOB_EVENTS.video_submit },
    ]);
    expect(videoPoll.opts.triggers).toEqual([{ event: JOB_EVENTS.video_poll }]);
  });
});
