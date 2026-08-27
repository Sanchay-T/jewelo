import { afterEach, describe, expect, it, vi } from "vitest";

import { triggerTask } from "./trigger-dispatch";

describe("server Trigger dispatch", () => {
  afterEach(() => {
    delete process.env.TRIGGER_API_URL;
    delete process.env.TRIGGER_DEV_BRANCH;
  });

  it("targets the still task with durable idempotency and the dev branch", async () => {
    process.env.TRIGGER_API_URL = "https://trigger.example";
    process.env.TRIGGER_DEV_BRANCH = "caleums-final-e2e";
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ id: "trigger-run-1" }),
    );
    await expect(
      triggerTask(
        "trigger-secret-test",
        { taskId: "task-1", operation: "still_execute" },
        {
          idempotencyKey: "outbox-1",
          idempotencyKeyTTL: "30d",
          ttl: "1h",
          tags: ["caleums", "task:task-1", "outbox:event-1"],
        },
        fetcher,
      ),
    ).resolves.toEqual({ id: "trigger-run-1" });
    expect(fetcher).toHaveBeenCalledWith(
      "https://trigger.example/api/v1/tasks/presentation-task-v1/trigger",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer trigger-secret-test",
          "x-trigger-branch": "caleums-final-e2e",
        }),
      }),
    );
    const body = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(body.options).toMatchObject({
      idempotencyKey: "outbox-1",
      idempotencyKeyTTL: "30d",
      ttl: "1h",
    });
  });

  it("routes recovery polling without resubmitting video", async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      Response.json({ id: "trigger-video-poll" }),
    );
    await triggerTask(
      "trigger-secret-test",
      { taskId: "video-1", operation: "video_poll", pollCount: 4 },
      {
        idempotencyKey: "recovery-video-1",
        idempotencyKeyTTL: "30d",
        ttl: "1h",
        tags: [],
      },
      fetcher,
    );
    expect(String(fetcher.mock.calls[0]?.[0])).toContain("video-poll-v1");
    const body = JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body));
    expect(body.payload).toEqual({ taskId: "video-1", pollCount: 4 });
  });
});
