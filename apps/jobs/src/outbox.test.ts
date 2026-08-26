import { describe, expect, it, vi } from "vitest";
import { dispatchPendingOutbox } from "./outbox";

describe("scheduled outbox dispatch", () => {
  it("triggers with the persisted key before marking published", async () => {
    const trigger = vi.fn(async () => ({ id: "run-1" }));
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json([
          {
            id: "event-1",
            payload: { taskId: "task-1" },
            dispatch_idempotency_key: "dispatch-1",
            attempt_count: 0,
          },
        ]),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(
      dispatchPendingOutbox(
        {
          SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "service-role-test",
        },
        trigger,
        fetcher,
      ),
    ).resolves.toEqual({ dispatched: 1 });
    expect(trigger).toHaveBeenCalledWith(
      { taskId: "task-1" },
      { idempotencyKey: "dispatch-1" },
    );
    expect(fetcher.mock.calls[1]?.[1]).toMatchObject({ method: "PATCH" });
  });

  it("preserves the durable video dispatch kind", async () => {
    const trigger = vi.fn(async () => ({ id: "video-run" }));
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json([
          {
            id: "event-video",
            payload: { taskId: "task-video", taskKind: "video" },
            dispatch_idempotency_key: "dispatch-video",
            attempt_count: 0,
          },
        ]),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await dispatchPendingOutbox(
      {
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-test",
      },
      trigger,
      fetcher,
    );
    expect(trigger).toHaveBeenCalledWith(
      { taskId: "task-video", taskKind: "video" },
      { idempotencyKey: "dispatch-video" },
    );
  });
});
