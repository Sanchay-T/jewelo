import { jewelryDraftSpecificationSchema } from "@jewelo/contracts";

import {
  authenticatedUser,
  jsonError,
  readJson,
  supabaseRequest,
  validated,
} from "../../../../../lib/backend/supabase-rest";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ draftId: string }> },
) {
  try {
    const { draftId } = await context.params;
    const { bearer, config } = await authenticatedUser(request);
    const input = await readJson<Record<string, unknown>>(request);
    // The client patches by sending the whole merged specification, so the same
    // schema that guards creation guards the edit.
    const specification =
      input.specification === undefined
        ? undefined
        : validated(jewelryDraftSpecificationSchema, input.specification);
    const rows = await supabaseRequest<Array<Record<string, unknown>>>(
      config,
      `/rest/v1/design_drafts?id=eq.${encodeURIComponent(draftId)}`,
      {
        method: "PATCH",
        headers: { prefer: "return=representation" },
        body: JSON.stringify({
          specification,
          spelling_confirmed: input.spellingConfirmed,
          revision_token: input.revisionToken,
        }),
      },
      bearer,
    );
    if (!rows[0])
      return Response.json(
        { error: "Draft not found", code: "not_found" },
        { status: 404 },
      );
    return Response.json(rows[0]);
  } catch (error) {
    return jsonError(error);
  }
}
