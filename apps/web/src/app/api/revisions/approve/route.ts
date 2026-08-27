import {
  authenticatedUser,
  jsonError,
  readJson,
  supabaseRequest,
} from "../../../../lib/backend/supabase-rest";
import { attemptImmediateDispatch } from "../../../../lib/backend/trigger-dispatch";

export async function POST(request: Request) {
  try {
    const { bearer, config } = await authenticatedUser(request);
    const input = await readJson<{
      draftId: string;
      specification: Record<string, unknown>;
      idempotencyKey: string;
    }>(request, ["draftId", "specification", "idempotencyKey"]);
    const result = await supabaseRequest<
      Array<{
        approved_design_id: string;
        revision_id: string;
        run_id: string;
        task_id: string;
      }>
    >(
      config,
      "/rest/v1/rpc/approve_and_start_studio",
      {
        method: "POST",
        body: JSON.stringify({
          p_draft_id: input.draftId,
          p_specification: input.specification,
          p_approval_key: `approve:${input.idempotencyKey}`,
          p_run_key: `run:${input.idempotencyKey}`,
        }),
      },
      bearer,
    );
    const created = result[0];
    if (!created) throw new Error("Approval RPC returned no result");
    const dispatch = await attemptImmediateDispatch(created.run_id);
    const revisions = await supabaseRequest<
      Array<{ identity_anchor: Record<string, unknown> }>
    >(
      config,
      `/rest/v1/design_revisions?id=eq.${encodeURIComponent(created.revision_id)}&select=identity_anchor`,
      {},
      bearer,
    );
    return Response.json(
      {
        ...created,
        canonical_identity_anchor: revisions[0]?.identity_anchor,
        ...dispatch,
      },
      {
        status:
          dispatch.acceptedCount === 0 && dispatch.pendingCount === 0
            ? 200
            : dispatch.dispatchState === "accepted"
              ? 201
              : 202,
      },
    );
  } catch (error) {
    return jsonError(error);
  }
}
