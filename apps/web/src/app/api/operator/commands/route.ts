import {
  allowedFulfillmentTransitions,
  fulfillmentTransitionCommandSchema,
  isPreviewRequestCommand,
  previewRequestCommandSchema,
  previewRequestIssueMessage,
} from "@jewelo/contracts";
import {
  adminConfig,
  ApiError,
  jsonError,
  readJson,
  supabaseRequest,
  validated,
} from "../../../../lib/backend/supabase-rest";
import { previewRequestCommandWrite } from "../../../../lib/backend/preview-requests";
import {
  assertSameOrigin,
  requireOperatorSession,
} from "../../../../lib/backend/operator-session";
import { attemptImmediateDispatch } from "../../../../lib/backend/job-dispatch";

type CommandEnvelope = Record<string, unknown> & {
  command: string;
  designId?: string;
  targetId: string;
  payload?: Record<string, unknown>;
  idempotencyKey: string;
};

/**
 * One audit row, written only where something actually changed.
 *
 * Security review 2 M-3: the insert used to sit after the branches and ran
 * whether or not a row matched, so a command against a missing id, or a status
 * transition the database refused, still left a line saying the operator did
 * it. The trail now records the effect: each branch calls this after it has a
 * row in its hand, and `detail` carries the status before and after so the
 * trail can be read without re-deriving the state machine.
 */
async function auditCommand(
  admin: { url: string; key: string },
  input: CommandEnvelope,
  detail: { from: string | null; to: string | null } & Record<string, unknown>,
) {
  await supabaseRequest(admin, "/rest/v1/audit_events", {
    method: "POST",
    body: JSON.stringify({
      design_id: input.designId,
      actor_type: "operator",
      action: `operator.${input.command}`,
      detail: {
        targetId: input.targetId,
        idempotencyKey: input.idempotencyKey,
        ...detail,
      },
    }),
  });
}

const statusOf = (row: Record<string, unknown> | undefined) =>
  row?.status === undefined || row.status === null ? null : String(row.status);

export async function POST(request: Request) {
  try {
    assertSameOrigin(request, true);
    requireOperatorSession(request);
    const admin = adminConfig();
    const input = await readJson<CommandEnvelope>(request, [
      "command",
      "targetId",
      "idempotencyKey",
    ]);
    // An honest-degrade capture can exist without a design, so `designId` is
    // required per command instead of for the whole envelope.
    if (!isPreviewRequestCommand(input.command) && !input.designId)
      throw new Error("designId required");
    let result: unknown;
    if (input.command === "review_task") {
      // The status the task is in before the RPC decides it, so the audit row
      // can say what changed rather than what was asked for.
      const [before] = await supabaseRequest<Array<Record<string, unknown>>>(
        admin,
        `/rest/v1/generation_tasks?id=eq.${encodeURIComponent(input.targetId)}&select=id,status&limit=1`,
      );
      result =
        input.payload?.decision === "retry"
          ? await supabaseRequest(
              admin,
              "/rest/v1/rpc/operator_retry_generation_task",
              {
                method: "POST",
                body: JSON.stringify({
                  p_task_id: input.targetId,
                  p_retry_key: input.idempotencyKey,
                  p_reason: input.payload?.reason,
                }),
              },
            )
          : await supabaseRequest(
              admin,
              "/rest/v1/rpc/transition_generation_task",
              {
                method: "POST",
                body: JSON.stringify({
                  p_task_id: input.targetId,
                  p_from: [
                    "blocked",
                    "failed",
                    "retrying",
                    "queued",
                    "generating",
                    "verifying",
                  ],
                  p_to: "failed",
                  p_patch: {
                    terminal_error_code: String(
                      input.payload?.reason ?? "operator_rejected",
                    ).slice(0, 120),
                  },
                }),
              },
            );
      // The RPC raises when it refuses, so a row in hand is a real transition.
      const task = result as Record<string, unknown> | undefined;
      if (task?.id)
        await auditCommand(admin, input, {
          from: statusOf(before),
          to: statusOf(task),
          decision: input.payload?.decision === "retry" ? "retry" : "reject",
        });
    } else if (input.command === "fulfillment_transition") {
      // Security review 2 M-4. The status is one of the four the `orders` check
      // constraint accepts, the ids are ids, and the filter carries the design:
      // an order id belonging to another design is now no rows rather than a
      // write. Nothing of the body is echoed back on a refusal.
      const command = validated(
        fulfillmentTransitionCommandSchema,
        input,
        "command",
      );
      const filter = `id=eq.${encodeURIComponent(command.targetId)}&design_id=eq.${encodeURIComponent(command.designId)}`;
      const [before] = await supabaseRequest<Array<Record<string, unknown>>>(
        admin,
        `/rest/v1/orders?${filter}&select=id,status&limit=1`,
      );
      // Fix review 3, MN-3. A command against an order id that matches nothing
      // used to PATCH nothing and answer `200 {}`, so the operator surface said
      // "done" about an order the shop does not have; and any of the four
      // statuses could be written from any other, so a piece at quality check
      // could go back to confirmed with the audit trail calling it a move. The
      // row decides now: no row is a 404, and the from-status names the only
      // statuses that may follow it.
      if (!before) throw new ApiError("Unknown order", 404, "not_found");
      const from = statusOf(before);
      const allowed = allowedFulfillmentTransitions(from ?? "");
      if (!allowed.includes(command.payload.status))
        throw new ApiError(
          allowed.length
            ? `An order in ${from} can only move to ${allowed.join(", ")}`
            : `An order in ${from} cannot move further`,
          422,
          "invalid_input",
        );
      const patched = await supabaseRequest<Array<Record<string, unknown>>>(
        admin,
        `/rest/v1/orders?${filter}`,
        {
          method: "PATCH",
          headers: { prefer: "return=representation" },
          body: JSON.stringify({ status: command.payload.status }),
        },
      );
      result = patched;
      if (patched.length)
        await auditCommand(admin, input, {
          from: statusOf(before),
          to: statusOf(patched[0]),
        });
    } else if (isPreviewRequestCommand(input.command)) {
      // The queue writes a customer's contact history, so the envelope is
      // validated against the contract rather than handed to PostgREST as it
      // arrived. A note longer than the column, or a target that is not an id,
      // is a 422 with the offending path and nothing of the body echoed back.
      const parsed = previewRequestCommandSchema.safeParse(input);
      if (!parsed.success)
        throw new ApiError(
          previewRequestIssueMessage(parsed.error),
          422,
          "invalid_input",
        );
      const write = previewRequestCommandWrite(
        parsed.data.command,
        parsed.data.payload?.note,
      );
      // Only a row in one of the command's `from` statuses transitions, so a
      // repeated click is a no-op and never rewrites `contacted_at`. The
      // current row is still returned.
      //
      // Security review 2 M-3: this branch writes no audit row of its own. The
      // `preview_requests_operator_audit` trigger
      // (`supabase/migrations/20260907010000_preview_requests.sql`) already
      // writes one, with the status before and after, and only when a row
      // actually changed - so a `mark_contacted` on a request the shop already
      // fulfilled leaves the trail alone instead of claiming a contact.
      const patched = Object.keys(write.patch).length
        ? await supabaseRequest<Array<Record<string, unknown>>>(
            admin,
            `/rest/v1/preview_requests?id=eq.${encodeURIComponent(parsed.data.targetId)}&${write.statusFilter}`,
            {
              method: "PATCH",
              headers: { prefer: "return=representation" },
              body: JSON.stringify(write.patch),
            },
          )
        : [];
      result = patched.length
        ? patched
        : await supabaseRequest<Array<Record<string, unknown>>>(
            admin,
            `/rest/v1/preview_requests?id=eq.${encodeURIComponent(parsed.data.targetId)}&select=id,status,contacted_at,operator_note&limit=1`,
          );
    } else if (input.command === "request_video") {
      result = await supabaseRequest<Record<string, unknown>>(
        admin,
        "/rest/v1/rpc/request_video_task",
        {
          method: "POST",
          body: JSON.stringify({
            p_run_id: input.payload?.runId,
            p_kind: input.payload?.kind,
            p_source_task_id: input.targetId,
            p_request_key: input.idempotencyKey,
          }),
        },
      );
      // The RPC is idempotent on the request key, so a repeat returns the same
      // task; the row is the proof one exists, and its status is the effect.
      const task = result as Record<string, unknown> | undefined;
      if (task?.id)
        await auditCommand(admin, input, {
          from: null,
          to: statusOf(task),
          taskId: String(task.id),
        });
    } else
      return Response.json(
        { error: "Unknown operator command", code: "not_found" },
        { status: 404 },
      );
    const resultRecord = Array.isArray(result)
      ? (result[0] as Record<string, unknown> | undefined)
      : (result as Record<string, unknown> | undefined);
    const dispatchAggregateId =
      input.command === "request_video"
        ? String(resultRecord?.id ?? "")
        : input.command === "review_task" && input.payload?.decision === "retry"
          ? input.targetId
          : "";
    const dispatch = dispatchAggregateId
      ? await attemptImmediateDispatch(dispatchAggregateId)
      : undefined;
    return Response.json({ ...(resultRecord ?? {}), ...(dispatch ?? {}) });
  } catch (error) {
    return jsonError(error);
  }
}
