import {
  adminConfig,
  jsonError,
  readJson,
  supabaseRequest,
} from "../../../../lib/backend/supabase-rest";
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
    if (input.command !== "preview_request.mark_contacted" && !input.designId)
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
    } else if (input.command === "preview_request.mark_contacted") {
      // Only a `new` capture transitions, so a repeated click is a no-op and
      // never rewrites contacted_at. The current row is still returned.
      const note = input.payload?.note;
      const patched = await supabaseRequest<Array<Record<string, unknown>>>(
        admin,
        `/rest/v1/preview_requests?id=eq.${encodeURIComponent(input.targetId)}&status=eq.new`,
        {
          method: "PATCH",
          headers: { prefer: "return=representation" },
          body: JSON.stringify({
            status: "contacted",
            contacted_at: new Date().toISOString(),
            operator_note:
              typeof note === "string" ? note.slice(0, 2000) : undefined,
          }),
        },
      );
      result = patched.length
        ? patched
        : await supabaseRequest<Array<Record<string, unknown>>>(
            admin,
            `/rest/v1/preview_requests?id=eq.${encodeURIComponent(input.targetId)}&select=id,status,contacted_at&limit=1`,
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
