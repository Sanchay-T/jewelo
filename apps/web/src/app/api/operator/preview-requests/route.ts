import { requireOperatorSession } from "../../../../lib/backend/operator-session";
import {
  adminConfig,
  jsonError,
  supabaseRequest,
} from "../../../../lib/backend/supabase-rest";
import {
  isPreviewRequestStatus,
  operatorPreviewRequest,
  OPERATOR_PREVIEW_REQUEST_COLUMNS,
  type PreviewRequestRow,
} from "../../../../lib/backend/preview-requests";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/** The operator queue for honest-degrade captures, newest first. */
export async function GET(request: Request) {
  try {
    requireOperatorSession(request);
    const parameters = new URL(request.url).searchParams;
    const status = parameters.get("status") ?? "";
    const requested = Number(parameters.get("limit") ?? DEFAULT_LIMIT);
    const limit = Number.isFinite(requested)
      ? Math.min(Math.max(Math.trunc(requested), 1), MAX_LIMIT)
      : DEFAULT_LIMIT;
    if (status && !isPreviewRequestStatus(status))
      return Response.json(
        { error: "Unknown preview request status", code: "invalid_input" },
        { status: 422, headers: { "cache-control": "no-store" } },
      );
    const rows = await supabaseRequest<PreviewRequestRow[]>(
      adminConfig(),
      `/rest/v1/preview_requests?select=${OPERATOR_PREVIEW_REQUEST_COLUMNS}&order=created_at.desc&limit=${limit}${
        status ? `&status=eq.${encodeURIComponent(status)}` : ""
      }`,
    );
    return Response.json(
      { previewRequests: rows.map(operatorPreviewRequest) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return jsonError(error);
  }
}
