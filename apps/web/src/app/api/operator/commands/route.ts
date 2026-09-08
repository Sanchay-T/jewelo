import {
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
} from "../../../../lib/backend/supabase-rest";
import { previewRequestCommandWrite } from "../../../../lib/backend/preview-requests";
import { requireOperatorSession } from "../../../../lib/backend/operator-session";
import { attemptImmediateDispatch } from "../../../../lib/backend/job-dispatch";

/** A browser form on another origin must not be able to drive an operator
 * command with the operator's own cookie. */
function assertSameOrigin(request: Request, mutation = false) {
  if (request.headers.get("sec-fetch-site") === "cross-site")
    throw new Response("Cross-site request rejected", { status: 403 });
  if (!mutation) return;
  const origin = request.headers.get("origin");
  const targetHost =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    new URL(request.url).host;
  const originHost = (() => {
    try {
      return origin ? new URL(origin).host : "";
    } catch {
      return "";
    }
  })();
  if (!originHost || originHost !== targetHost)
    throw new Response("Same-origin request required", { status: 403 });
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request, true);
    requireOperatorSession(request);
    const admin = adminConfig();
    const input = await readJson<{
      command: string;
      designId?: string;
      targetId: string;
      payload?: Record<string, unknown>;
      idempotencyKey: string;
    }>(request, ["command", "targetId", "idempotencyKey"]);
    // An honest-degrade capture can exist without a design, so `designId` is
    // required per command instead of for the whole envelope.
    if (!isPreviewRequestCommand(input.command) && !input.designId)
      throw new Error("designId required");
    // Every design-scoped command has already been rejected above without one.
    const designId = input.designId ?? "";
    let result: unknown;
    if (input.command === "issue_quote") {
      result = await supabaseRequest(
        admin,
        `/rest/v1/quotes?id=eq.${encodeURIComponent(input.targetId)}&design_id=eq.${encodeURIComponent(designId)}&status=eq.requested`,
        {
          method: "PATCH",
          headers: { prefer: "return=representation" },
          body: JSON.stringify({
            status: "issued",
            total: input.payload?.total,
            issued_at: new Date().toISOString(),
            expires_at: input.payload?.expiresAt,
          }),
        },
      );
    } else if (input.command === "review_task") {
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
    } else if (input.command === "fulfillment_transition") {
      result = await supabaseRequest(
        admin,
        `/rest/v1/orders?id=eq.${encodeURIComponent(input.targetId)}`,
        {
          method: "PATCH",
          headers: { prefer: "return=representation" },
          body: JSON.stringify({ status: input.payload?.status }),
        },
      );
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
      result = await supabaseRequest(admin, "/rest/v1/rpc/request_video_task", {
        method: "POST",
        body: JSON.stringify({
          p_run_id: input.payload?.runId,
          p_kind: input.payload?.kind,
          p_source_task_id: input.targetId,
          p_request_key: input.idempotencyKey,
        }),
      });
    } else
      return Response.json(
        { error: "Unknown operator command", code: "not_found" },
        { status: 404 },
      );
    await supabaseRequest(admin, "/rest/v1/audit_events", {
      method: "POST",
      body: JSON.stringify({
        design_id: input.designId,
        actor_type: "operator",
        action: `operator.${input.command}`,
        detail: {
          targetId: input.targetId,
          idempotencyKey: input.idempotencyKey,
        },
      }),
    });
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
