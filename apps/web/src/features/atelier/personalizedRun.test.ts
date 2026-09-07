import { describe, expect, it } from "vitest";
import {
  classifyStartFailure,
  customerViewStatus,
  pastCeiling,
  preflightRefusal,
  resumeSubmission,
  shouldStartRun,
  shouldWatchRun,
  startAttemptKey,
  PERSONALIZED_RUN_CEILING_MS,
  dispatchRejected,
  heroSlot,
  readPersonalizedRun,
  slotFor,
  type StatePayload,
} from "./personalizedRun";

const RUN = "run-1";
const task = (view: string, status: string, extra: Record<string, unknown> = {}) => ({
  id: `task-${view}`,
  run_id: RUN,
  presentation_view: view,
  status,
  attempt: 1,
  ...extra,
});
const asset = (view: string, provider = "openai") => ({
  id: `asset-${view}`,
  run_id: RUN,
  presentation_view: view,
  provider,
  signed_url: `https://storage.test/${view}.png?token=short-lived`,
});
const payload = (
  tasks: Record<string, unknown>[],
  assets: Record<string, unknown>[] = [],
  status = "running",
): StatePayload => ({
  generation_runs: [{ id: RUN, design_id: "design-1", revision_id: "rev-1", status }],
  generation_tasks: tasks,
  assets,
});

describe("reading a personalized run out of /api/state", () => {
  it("maps every database task state onto its own view", () => {
    const run = readPersonalizedRun(
      payload([
        task("studio", "ready"),
        task("on_skin", "generating"),
        task("close_up", "verifying"),
        task("dark", "retrying"),
        task("motion_preview", "queued"),
      ], [asset("studio")]),
      RUN,
    )!;
    expect(run.slots.map((slot) => [slot.view, slot.state])).toEqual([
      ["Studio", "ready"],
      ["On skin", "generating"],
      ["Close-up", "verifying"],
      ["Dark", "retrying"],
    ]);
    expect(run.outcome).toBe("personalized");
    expect(run.settled).toBe(false);
    expect(heroSlot(run)?.imageUrl).toContain("studio.png");
  });

  it("treats Studio ready with blocked dependent views as a partial success, never a failed run", () => {
    const run = readPersonalizedRun(
      payload(
        [
          task("studio", "ready"),
          task("on_skin", "blocked", { terminal_error_code: "style_anchor_missing:ee78f9a4" }),
          task("close_up", "blocked", { terminal_error_code: "style_anchor_missing:44f3b981" }),
          task("dark", "blocked", { terminal_error_code: "style_anchor_missing:ba0b8433" }),
        ],
        [asset("studio")],
        "partial",
      ),
      RUN,
    )!;
    expect(run.outcome).toBe("personalized");
    expect(run.settled).toBe(true);
    expect(run.ready).toEqual(["Studio"]);
    expect(slotFor(run, "Dark")).toMatchObject({
      state: "blocked",
      errorCode: "style_anchor_missing:ba0b8433",
      presentable: false,
    });
    expect(heroSlot(run)).toBeDefined();
  });

  it("never presents a mock placeholder asset as the customer's photograph", () => {
    const run = readPersonalizedRun(
      payload(
        [task("studio", "ready"), task("on_skin", "ready"), task("close_up", "ready"), task("dark", "ready")],
        [asset("studio", "mock"), asset("on_skin", "mock"), asset("close_up", "mock"), asset("dark", "mock")],
        "complete",
      ),
      RUN,
    )!;
    expect(run.ready).toEqual([]);
    expect(heroSlot(run)).toBeUndefined();
    // Every task succeeded, so nothing can still change: this degrades honestly.
    expect(run.settled).toBe(true);
    expect(run.outcome).toBe("unavailable");
  });

  it("stays pending while any view can still progress and reports a ready view without an asset as not presentable", () => {
    const run = readPersonalizedRun(
      payload([task("studio", "ready"), task("on_skin", "queued")]),
      RUN,
    )!;
    expect(run.outcome).toBe("pending");
    expect(run.settled).toBe(false);
    expect(slotFor(run, "Studio")?.presentable).toBe(false);
    expect(slotFor(run, "Close-up")?.state).toBe("absent");
  });

  it("degrades a fully failed or cancelled run to unavailable", () => {
    const run = readPersonalizedRun(
      payload(
        [
          task("studio", "failed", { terminal_error_code: "identity_rejected" }),
          task("on_skin", "cancelled"),
          task("close_up", "failed"),
          task("dark", "failed"),
        ],
        [],
        "partial",
      ),
      RUN,
    )!;
    expect(run.outcome).toBe("unavailable");
    expect(run.settled).toBe(true);
  });

  it("does not spin for ever on dependent views a blocked studio still can never release", () => {
    // The three model views carry dependency_task_id and no outbox row; only a
    // ready studio still releases them, so a blocked studio strands them queued.
    const run = readPersonalizedRun(
      payload(
        [
          task("studio", "blocked", { terminal_error_code: "identity_engine_unsupported" }),
          task("on_skin", "queued"),
          task("close_up", "queued"),
          task("dark", "queued"),
        ],
        [],
        "operator_review",
      ),
      RUN,
    )!;
    expect(run.slots.filter((slot) => slot.reachable)).toEqual([]);
    expect(run.settled).toBe(true);
    expect(run.outcome).toBe("unavailable");
    expect(run.slots.map((slot) => customerViewStatus(slot))).toEqual([
      "preparing", "preparing", "preparing", "preparing",
    ]);
  });

  it("keeps dependent views honestly waiting while the studio still can still succeed", () => {
    const run = readPersonalizedRun(
      payload([task("studio", "generating"), task("on_skin", "queued"), task("close_up", "queued"), task("dark", "queued")]),
      RUN,
    )!;
    expect(run.settled).toBe(false);
    expect(run.slots.map((slot) => customerViewStatus(slot))).toEqual([
      "working", "waiting", "waiting", "waiting",
    ]);
  });

  it("describes a view to the customer without ever exposing a terminal error code", () => {
    const run = readPersonalizedRun(
      payload([
        task("studio", "ready"),
        task("on_skin", "blocked", { terminal_error_code: "style_anchor_missing:ee78f9a4-6ace-428c-9f12-4e6101188190" }),
        task("close_up", "verifying"),
        task("dark", "retrying"),
      ], [asset("studio")]),
      RUN,
    )!;
    expect(run.slots.map((slot) => customerViewStatus(slot))).toEqual([
      "ready", "preparing", "checking", "waiting",
    ]);
  });

  it("returns nothing for a run this principal cannot see, and never invents a state", () => {
    expect(readPersonalizedRun(payload([task("studio", "ready")]), "other-run")).toBeUndefined();
    const run = readPersonalizedRun(payload([task("studio", "something-new")]), RUN)!;
    expect(slotFor(run, "Studio")?.state).toBe("queued");
  });
});

describe("classifying why a run could not start", () => {
  it("recognises the per-principal daily allowance behind the shared conflict code", () => {
    expect(
      classifyStartFailure({ code: "state_conflict", message: "daily generation quota exceeded" }),
    ).toBe("daily_limit");
  });
  it("recognises the spend guard, the active run and the auth boundary", () => {
    expect(classifyStartFailure({ code: "spend_guard", message: "daily spend guard exceeded" })).toBe("spend_guard");
    expect(classifyStartFailure({ code: "run_active", message: "one active generation run allowed" })).toBe("run_active");
    expect(classifyStartFailure({ code: "unauthenticated", message: "Unauthorized" })).toBe("unauthenticated");
    expect(classifyStartFailure({ code: "invalid_input", message: "layout required" })).toBe("invalid");
    expect(classifyStartFailure({ message: "Failed to fetch" })).toBe("unavailable");
  });
  it("treats only the fixed dispatch vocabulary as a rejected dispatch", () => {
    for (const errorCode of ["not_configured", "rejected", "dispatch_failed"])
      expect(dispatchRejected({ errorCode })).toBe(true);
    // An idempotent replay publishes nothing new and is a healthy run.
    expect(dispatchRejected({ dispatchState: "accepted", acceptedCount: 0, pendingCount: 0 })).toBe(false);
    expect(dispatchRejected({ dispatchState: "accepted", acceptedCount: 4, pendingCount: 0 })).toBe(false);
  });
});

describe("refusing before spending, and giving up watching", () => {
  const spec = (over: Partial<Parameters<typeof preflightRefusal>[0]> = {}) => ({
    script: "English",
    names: ["Asma"],
    construction: "Classical",
    lettering: "Classic",
    ...over,
  });
  it("never starts a run the Arabic identity engine cannot solve", () => {
    expect(preflightRefusal(spec({ script: "Arabic", names: ["أسماء", "فاطمة"] }))).toBe("arabic_two_name");
    expect(preflightRefusal(spec({ script: "Arabic", names: ["أسماء"] }))).toBeUndefined();
    expect(preflightRefusal(spec({ names: ["Asma", "Fatima"] }))).toBeUndefined();
  });
  it("never starts a run for a look the prompt and the stencil cannot carry", () => {
    // Neither the pinned prompt variables nor the Latin stencil carry the
    // construction or the English lettering, so a run for these would
    // photograph a Classical Playfair pendant and call it "Your piece".
    expect(preflightRefusal(spec({ construction: "Diamond rails", lettering: "Signature" })))
      .toBe("unsupported_construction");
    expect(preflightRefusal(spec({ lettering: "Signature" }))).toBe("unsupported_lettering");
    expect(preflightRefusal(spec({ construction: "Origami ribbon" }))).toBe("unsupported_construction");
    expect(preflightRefusal(spec())).toBeUndefined();
    // arabicStyle IS threaded into the specification, the compiled prompt and
    // the Arabic identity engine, which fails closed on its own for a style it
    // has not certified. Arabic lettering is therefore not refused here.
    expect(preflightRefusal(spec({ script: "Arabic", names: ["أسماء"], lettering: "Kufi" })))
      .toBeUndefined();
    expect(preflightRefusal(spec({ script: "Arabic", names: ["أسماء"], construction: "Framed minimal", lettering: "Kufi" })))
      .toBe("unsupported_construction");
  });
  it("opens the honest capture path once a run has run past its ceiling", () => {
    expect(pastCeiling(1_000, 1_000 + PERSONALIZED_RUN_CEILING_MS)).toBe(true);
    expect(pastCeiling(1_000, 2_000)).toBe(false);
  });
  it("never tells a shopper to come back tomorrow for the business's own global cap", () => {
    expect(classifyStartFailure({ code: "spend_guard", message: "global daily generation limit exceeded" })).toBe("busy");
    expect(classifyStartFailure({ code: "spend_guard", message: "global daily spend guard exceeded" })).toBe("busy");
    expect(classifyStartFailure({ code: "state_conflict", message: "daily generation quota exceeded" })).toBe("daily_limit");
  });
});

describe("buying exactly one run per specification", () => {
  const base = {
    enabled: true,
    loaded: true,
    stage: "review" as const,
    confirmed: true,
    signature: "spec-a",
  };
  it("starts once the customer confirms their own spelling on the review stage", () => {
    expect(shouldStartRun(base)).toBe(true);
  });
  it("never starts twice for the same specification, however often the box is ticked", () => {
    expect(shouldStartRun({ ...base, startedFor: "spec-a" })).toBe(false);
  });
  it("starts a fresh run for a changed specification, and never before confirmation", () => {
    expect(shouldStartRun({ ...base, startedFor: "spec-a", signature: "spec-b" })).toBe(true);
    expect(shouldStartRun({ ...base, confirmed: false })).toBe(false);
    expect(shouldStartRun({ ...base, stage: "design" })).toBe(false);
    expect(shouldStartRun({ ...base, loaded: false })).toBe(false);
    expect(shouldStartRun({ ...base, enabled: false })).toBe(false);
  });
});

describe("one submission per specification, across a reload", () => {
  const key = "3f6d4e2a-1111-4222-8333-444455556666";
  it("resumes a stored run and watches it", () => {
    expect(resumeSubmission({ signature: "sig-a", requestKey: key, runId: "run-1" }, "sig-a"))
      .toEqual({ startedFor: "sig-a", phase: "watching" });
  });
  it("blocks a second run when the reload lost the run id", () => {
    // The submission is written BEFORE the first request, so a tab that
    // reloaded mid-start still finds it. Re-confirming must not buy a second
    // run; the honest capture path opens instead.
    expect(resumeSubmission({ signature: "sig-a", requestKey: key }, "sig-a"))
      .toEqual({ startedFor: "sig-a", phase: "degraded", reason: "unavailable" });
    expect(
      shouldStartRun({
        enabled: true,
        loaded: true,
        stage: "review",
        confirmed: true,
        signature: "sig-a",
        startedFor: resumeSubmission({ signature: "sig-a", requestKey: key }, "sig-a")!.startedFor,
      }),
    ).toBe(false);
  });
  it("ignores a submission that belongs to a different specification", () => {
    expect(resumeSubmission({ signature: "sig-a", requestKey: key }, "sig-b")).toBeUndefined();
    expect(resumeSubmission(undefined, "sig-a")).toBeUndefined();
  });
  it("replays one approval when a failed start is retried", () => {
    // approve_and_start_studio is keyed on (principal, approval key): reusing
    // the key returns the same run instead of buying a second one.
    expect(startAttemptKey({ signature: "sig-a", requestKey: key }, "sig-a", "fresh")).toBe(key);
    expect(startAttemptKey({ signature: "sig-a", requestKey: key, runId: "run-1" }, "sig-a", "fresh")).toBe("fresh");
    expect(startAttemptKey({ signature: "sig-b", requestKey: key }, "sig-a", "fresh")).toBe("fresh");
    expect(startAttemptKey(undefined, "sig-a", "fresh")).toBe("fresh");
  });
  it("stops polling durable state once the honest capture path has opened", () => {
    expect(shouldWatchRun({ enabled: true, runId: "run-1", stalled: false })).toBe(true);
    expect(shouldWatchRun({ enabled: true, runId: "run-1", stalled: true })).toBe(false);
    expect(shouldWatchRun({ enabled: true, runId: undefined, stalled: false })).toBe(false);
    expect(shouldWatchRun({ enabled: false, runId: "run-1", stalled: false })).toBe(false);
  });
});
