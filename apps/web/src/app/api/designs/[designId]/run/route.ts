import {
  authenticatedUser,
  jsonError,
  readJson,
  supabaseRequest,
} from "../../../../../lib/backend/supabase-rest";
import { attemptImmediateDispatch } from "../../../../../lib/backend/trigger-dispatch";

export async function POST(
  request: Request,
  context: { params: Promise<{ designId: string }> },
) {
  try {
    const { designId } = await context.params;
    const { bearer, config } = await authenticatedUser(request);
    const { idempotencyKey } = await readJson<{ idempotencyKey: string }>(
      request,
      ["idempotencyKey"],
    );
    const rows = await supabaseRequest<Array<Record<string, unknown>>>(
      config,
      "/rest/v1/rpc/start_studio_run",
      {
        method: "POST",
        body: JSON.stringify({
          p_design_id: designId,
          p_run_key: `run:${idempotencyKey}`,
        }),
      },
      bearer,
    );
    const created = rows[0];
    if (!created?.run_id) throw new Error("Run RPC returned no result");
    const dispatch = await attemptImmediateDispatch(String(created.run_id));
    return Response.json({ ...created, ...dispatch }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
