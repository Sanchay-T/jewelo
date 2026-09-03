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
      .mockResolvedValueOnce(
        Response.json([
          {
            id: "event-1",
            aggregate_id: "aggregate-1",
            payload: { taskId: "task-1" },
            dispatch_idempotency_key: "dispatch-1",
            attempt_count: 0,
          },
        ]),
      )
      .mockResolvedValueOnce(Response.json(true));
    await expect(
      dispatchPendingOutbox(
        {
          SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "service-role-test",
        },
        trigger,
        fetcher,
      ),
    ).resolves.toEqual({
      accepted: [{ outboxId: "event-1", triggerRunId: "run-1" }],
      pending: [],
    });
    expect(trigger).toHaveBeenCalledWith(
      { taskId: "task-1", operation: "still_execute" },
      expect.objectContaining({ idempotencyKey: "dispatch-1" }),
    );
    expect(fetcher.mock.calls[2]?.[0]).toContain("ack_outbox_event");
  });

  // Video generation was removed on 2026-09-03. A legacy video event must never
  // be retargeted at the still pipeline; it is rejected so the row stays visible.
  it("rejects a legacy video event instead of dispatching it", async () => {
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
      .mockResolvedValueOnce(
        Response.json([
          {
            id: "event-video",
            aggregate_id: "aggregate-video",
            payload: { taskId: "task-video", taskKind: "video" },
            dispatch_idempotency_key: "dispatch-video",
            attempt_count: 0,
          },
        ]),
      )
      .mockResolvedValueOnce(Response.json(true));
    await expect(
      dispatchPendingOutbox(
        {
          SUPABASE_URL: "https://example.supabase.co",
          SUPABASE_SERVICE_ROLE_KEY: "service-role-test",
        },
        trigger,
        fetcher,
      ),
    ).resolves.toEqual({
      accepted: [],
      pending: [
        {
          outboxId: "event-video",
          errorCode: "outbox_video_generation_removed",
        },
      ],
    });
    expect(trigger).not.toHaveBeenCalled();
    expect(fetcher.mock.calls[2]?.[0]).toContain("nack_outbox_event");
  });

  it("nacks one rejected event without losing accepted siblings", async () => {
    const trigger = vi
      .fn()
      .mockRejectedValueOnce(new Error("provider offline"))
      .mockResolvedValueOnce({ id: "run-2" });
    const events = ["event-1", "event-2"].map((id, index) => ({
      id,
      aggregate_id: "aggregate-1",
      payload: { taskId: `task-${index + 1}` },
      dispatch_idempotency_key: `dispatch-${index + 1}`,
      attempt_count: 0,
    }));
    let claimIndex = 0;
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.includes("outbox_events?")) return Response.json(events);
      if (url.includes("claim_outbox_event"))
        return Response.json([events[claimIndex++]]);
      return Response.json(true);
    });
    const result = await dispatchPendingOutbox(
      {
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-test",
      },
      trigger,
      fetcher,
    );
    expect(result.accepted).toHaveLength(1);
    expect(result.pending).toHaveLength(1);
    expect(
      fetcher.mock.calls.some(([url]) =>
        String(url).includes("nack_outbox_event"),
      ),
    ).toBe(true);
  });
});
