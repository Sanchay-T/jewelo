import {
  authenticatedUser,
  jsonError,
  supabaseRequest,
} from "../../../../lib/backend/supabase-rest";
import {
  customerPreviewRequest,
  PREVIEW_REQUEST_COLUMNS,
  type PreviewRequestRow,
} from "../../../../lib/backend/preview-requests";

/** Reload of the shopper's own captured request. RLS scopes it to the owner. */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { bearer, config } = await authenticatedUser(request);
    const rows = await supabaseRequest<PreviewRequestRow[]>(
      config,
      `/rest/v1/preview_requests?select=${PREVIEW_REQUEST_COLUMNS}&id=eq.${encodeURIComponent(id)}&limit=1`,
      {},
      bearer,
    );
    const found = rows[0];
    if (!found)
      return Response.json(
        { error: "Preview request not found", code: "not_found" },
        { status: 404, headers: { "cache-control": "no-store" } },
      );
    return Response.json(customerPreviewRequest(found), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return jsonError(error);
  }
}
