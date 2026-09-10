import { describe, expect, it, vi } from "vitest";
import { emptyDraft } from "./model";
import { samples } from "./catalogue";
import { buildPersonalizedPreviewRequest, previewRequestBody } from "./previewHandoff";
import {
  capturePreviewRequest,
  loadRun,
  parseSubmission,
  PipelineError,
  startPersonalizedRun,
  watchRun,
  type PipelineDeps,
} from "./previewPipeline";

const REQUEST_KEY = "9f1b1a0c-1111-4222-8333-444455556666";
const preview = () =>
  buildPersonalizedPreviewRequest(
    { ...emptyDraft, name: "Noor" },
    samples[0]!,
    { id: "preview-uuid", locale: "en" },
  );

type Call = { path: string; init: RequestInit; body: Record<string, unknown> };

function harness(
  responses: Array<{ status?: number; body: Record<string, unknown> }>,
) {
  const calls: Call[] = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const next = responses[calls.length] ?? { body: {} };
    calls.push({
      path: String(input),
      init,
      body: init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {},
    });
    return new Response(JSON.stringify(next.body), {
      status: next.status ?? 200,
      headers: { "content-type": "application/json" },
    });
  });
  const deps: PipelineDeps = {
    session: { accessToken: vi.fn(async () => "anon-token") },
    fetchImpl: fetchImpl as unknown as typeof fetch,
  };
  return { calls, deps, fetchImpl };
}

describe("starting a personalized run", () => {
  it("creates a draft, approves it with the customer's own confirmation, and returns the run", async () => {
    const { calls, deps } = harness([
      { status: 201, body: { id: "draft-1" } },
      {
        status: 201,
        body: {
          approved_design_id: "design-1",
          revision_id: "rev-1",
          run_id: "run-1",
          dispatchState: "accepted",
          acceptedCount: 4,
          pendingCount: 0,
        },
      },
    ]);
    const handles = await startPersonalizedRun({
      request: preview(),
      spellingConfirmed: true,
      requestKey: REQUEST_KEY,
      deps,
    });
    expect(handles).toEqual({ designId: "design-1", revisionId: "rev-1", runId: "run-1" });
    expect(calls[0]!.path).toBe("/api/designs/drafts");
    expect(calls[0]!.body).toMatchObject({ locale: "en" });
    expect((calls[0]!.body.specification as Record<string, unknown>).origin).toBe("caleums-atelier");
    expect(calls[1]!.path).toBe("/api/revisions/approve");
    expect(calls[1]!.body).toMatchObject({ draftId: "draft-1", idempotencyKey: REQUEST_KEY });
    expect((calls[1]!.body.specification as Record<string, unknown>).spellingConfirmed).toBe(true);
    expect((calls[1]!.init.headers as Record<string, string>).authorization).toBe("Bearer anon-token");
  });

  it("refuses to approve without the customer's spelling confirmation", async () => {
    const { calls, deps } = harness([{ status: 201, body: { id: "draft-1" } }]);
    await expect(
      startPersonalizedRun({ request: preview(), spellingConfirmed: false, requestKey: REQUEST_KEY, deps }),
    ).rejects.toThrow(/spelling/i);
    expect(calls.map((call) => call.path)).toEqual(["/api/designs/drafts"]);
  });

  it("reuses the same request key on a retry so a second attempt replays instead of buying another run", async () => {
    const first = harness([
      { status: 201, body: { id: "draft-1" } },
      { status: 500, body: { error: "Internal error", code: "internal" } },
    ]);
    await expect(
      startPersonalizedRun({ request: preview(), spellingConfirmed: true, requestKey: REQUEST_KEY, deps: first.deps }),
    ).rejects.toBeInstanceOf(PipelineError);
    const second = harness([
      { status: 201, body: { id: "draft-2" } },
      { status: 200, body: { approved_design_id: "design-1", revision_id: "rev-1", run_id: "run-1", dispatchState: "accepted", acceptedCount: 0, pendingCount: 0 } },
    ]);
    const handles = await startPersonalizedRun({
      request: preview(),
      spellingConfirmed: true,
      requestKey: REQUEST_KEY,
      deps: second.deps,
    });
    expect(second.calls[1]!.body.idempotencyKey).toBe(first.calls[1]!.body.idempotencyKey);
    expect(handles.runId).toBe("run-1");
  });

  it("starts another run for a design that already exists instead of creating a duplicate design", async () => {
    const { calls, deps } = harness([
      { status: 201, body: { run_id: "run-2", dispatchState: "accepted", acceptedCount: 4, pendingCount: 0 } },
    ]);
    const handles = await startPersonalizedRun({
      request: preview(),
      spellingConfirmed: true,
      requestKey: REQUEST_KEY,
      deps,
      existingDesignId: "design-1",
    });
    expect(calls[0]!.path).toBe("/api/designs/design-1/run");
    expect(calls[0]!.body).toEqual({ idempotencyKey: REQUEST_KEY });
    expect(handles).toEqual({ designId: "design-1", runId: "run-2" });
  });

  it("classifies every honest-degrade trigger the backend can answer with", async () => {
    const cases: Array<[{ status: number; body: Record<string, unknown> }, string]> = [
      [{ status: 429, body: { error: "daily spend guard exceeded", code: "spend_guard" } }, "spend_guard"],
      [{ status: 409, body: { error: "daily generation quota exceeded", code: "state_conflict" } }, "daily_limit"],
      [{ status: 409, body: { error: "one active generation run allowed", code: "run_active" } }, "run_active"],
      [{ status: 401, body: { error: "Unauthorized", code: "unauthenticated" } }, "unauthenticated"],
    ];
    for (const [response, reason] of cases) {
      const { deps } = harness([{ status: 201, body: { id: "draft-1" } }, response]);
      await expect(
        startPersonalizedRun({ request: preview(), spellingConfirmed: true, requestKey: REQUEST_KEY, deps }),
      ).rejects.toMatchObject({ reason });
    }
  });

  it("treats a rejected dispatch as a degrade even though the row was written", async () => {
    const { deps } = harness([
      { status: 201, body: { id: "draft-1" } },
      { status: 202, body: { approved_design_id: "d", revision_id: "r", run_id: "run-1", dispatchState: "pending", acceptedCount: 0, pendingCount: 1, errorCode: "not_configured" } },
    ]);
    await expect(
      startPersonalizedRun({ request: preview(), spellingConfirmed: true, requestKey: REQUEST_KEY, deps }),
    ).rejects.toMatchObject({ reason: "dispatch" });
  });
});

describe("reading and capturing", () => {
  it("scopes the state read to the design and maps the run", async () => {
    const { calls, deps } = harness([
      {
        body: {
          generation_runs: [{ id: "run-1", design_id: "design-1", status: "running" }],
          generation_tasks: [{ id: "t", run_id: "run-1", presentation_view: "studio", status: "generating", attempt: 1 }],
          assets: [],
        },
      },
    ]);
    const run = await loadRun(deps, { designId: "design-1", runId: "run-1" });
    expect(calls[0]!.path).toBe("/api/state?designId=design-1");
    expect(run?.outcome).toBe("pending");
  });

  it("posts the capture with the same request key and returns the operator's reference", async () => {
    const { calls, deps } = harness([{ status: 201, body: { id: "req-1", status: "new" } }]);
    const body = previewRequestBody({
      request: preview(),
      contact: { channel: "whatsapp", value: "+971501234567" },
      requestKey: REQUEST_KEY,
      manifestId: "sample-assets",
      sampleShown: true,
      generationRunId: "run-1",
    });
    const record = await capturePreviewRequest({ deps, body });
    expect(calls[0]!.path).toBe("/api/preview-requests");
    expect(calls[0]!.body.requestKey).toBe(REQUEST_KEY);
    expect(record).toEqual({ id: "req-1", status: "new" });
  });
});

describe("submission continuity across a reload", () => {
  it("accepts a well formed record and rejects anything else", () => {
    const stored = {
      version: 1,
      signature: "sig",
      requestKey: REQUEST_KEY,
      runId: "run-1",
      startedAt: 1,
    };
    expect(parseSubmission(JSON.stringify(stored))).toEqual(stored);
    expect(parseSubmission(null)).toBeUndefined();
    expect(parseSubmission("not json")).toBeUndefined();
    expect(parseSubmission(JSON.stringify({ ...stored, version: 2 }))).toBeUndefined();
    expect(parseSubmission(JSON.stringify({ ...stored, runId: 7 }))).toBeUndefined();
    expect(parseSubmission(JSON.stringify({ ...stored, startedAt: "now" }))).toBeUndefined();
  });
});

describe("polling stops when there is nothing left to learn", () => {
  const settledPayload = {
    generation_runs: [{ id: "run-1", design_id: "design-1", status: "partial" }],
    generation_tasks: [
      { id: "t1", run_id: "run-1", presentation_view: "studio", status: "blocked", attempt: 1 },
      { id: "t2", run_id: "run-1", presentation_view: "on_skin", status: "queued", attempt: 0 },
    ],
    assets: [],
  };

  it("stops after the first read of a settled run", async () => {
    // A settled run cannot change again without a new run, so continuing to
    // poll would only mint a fresh signed URL for every asset every 3 seconds.
    vi.useFakeTimers();
    try {
      const { deps, fetchImpl } = harness(
        Array.from({ length: 8 }, () => ({ body: settledPayload })),
      );
      const updates: Array<string | undefined> = [];
      const stop = watchRun({
        deps,
        handles: { designId: "design-1", runId: "run-1" },
        onUpdate: (run) => updates.push(run?.outcome),
        intervalMs: 1000,
      });
      await vi.waitFor(() => expect(updates.length).toBe(1));
      expect(updates[0]).toBe("unavailable");
      const readsAfterSettle = fetchImpl.mock.calls.length;
      await vi.advanceTimersByTimeAsync(5000);
      expect(fetchImpl.mock.calls.length).toBe(readsAfterSettle);
      stop();
    } finally {
      vi.useRealTimers();
    }
  });
});
