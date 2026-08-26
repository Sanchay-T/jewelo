import { hasOperatorSession } from "../../../lib/backend/operator-session";
import {
  adminConfig,
  authenticatedUser,
  jsonError,
  supabaseRequest,
} from "../../../lib/backend/supabase-rest";

export async function GET(request: Request) {
  try {
    const operator = hasOperatorSession(request);
    const customer = await authenticatedUser(request);
    const config = operator ? adminConfig() : customer.config;
    const bearer = operator ? config.key : customer.bearer;
    const tables = [
      "designs",
      "design_drafts",
      "design_revisions",
      "generation_runs",
      "generation_tasks",
      "assets",
      "quotes",
      "orders",
      "audit_events",
    ] as const;
    const results = await Promise.all(
      tables.map((table) =>
        supabaseRequest<Array<Record<string, unknown>>>(
          config,
          `/rest/v1/${table}?select=*&order=created_at`,
          {},
          bearer,
        ),
      ),
    );
    const rows = Object.fromEntries(
      tables.map((table, index) => [table, results[index] ?? []]),
    );
    const assets = await Promise.all(
      (rows.assets as Array<Record<string, unknown>>).map(async (asset) => {
        const path = String(asset.object_path);
        const signed = await supabaseRequest<{
          signedURL?: string;
          signedUrl?: string;
        }>(
          config,
          `/storage/v1/object/sign/${String(asset.bucket_id)}/${path
            .split("/")
            .map(encodeURIComponent)
            .join("/")}`,
          { method: "POST", body: JSON.stringify({ expiresIn: 300 }) },
          bearer,
        );
        const relative = signed.signedURL ?? signed.signedUrl;
        return {
          ...asset,
          signed_url: relative?.startsWith("http")
            ? relative
            : `${config.url}/storage/v1${relative}`,
        };
      }),
    );
    return Response.json(
      {
        role: operator ? "operator" : "customer",
        principalId: operator ? "operator-session" : customer.user.id,
        ...rows,
        assets,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return jsonError(error);
  }
}
