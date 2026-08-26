import {
  authenticatedUser,
  jsonError,
  supabaseRequest,
} from "../../../../../lib/backend/supabase-rest";

export async function POST(
  request: Request,
  context: { params: Promise<{ designId: string }> },
) {
  try {
    const { designId } = await context.params;
    const { bearer, config } = await authenticatedUser(request);
    const { idempotencyKey } = (await request.json()) as {
      idempotencyKey: string;
    };
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
    return Response.json(rows[0], { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
