import { hasOperatorSession } from "../../../lib/backend/operator-session";
import {
  adminConfig,
  authenticatedUser,
  jsonError,
  supabaseRequest,
} from "../../../lib/backend/supabase-rest";

// Customer-visible task columns only: dispatch keys, provider URLs and
// reservation accounting stay server-side.
const TASK_COLUMNS = [
  "id",
  "run_id",
  "owner_principal_id",
  "presentation_view",
  "status",
  "attempt",
  "task_profile",
  "aspect_ratio",
  "terminal_error_code",
  "cancel_requested_at",
  "created_at",
  "updated_at",
  "input_asset_ids",
  "prompt_release",
  "model_release",
].join(",");

const DESIGN_SCOPED = new Set([
  "design_drafts",
  "design_revisions",
  "generation_runs",
  "assets",
  "quotes",
  "orders",
  "audit_events",
]);

export async function GET(request: Request) {
  try {
    const operator = hasOperatorSession(request);
    const customer = operator ? null : await authenticatedUser(request);
    const config = customer ? customer.config : adminConfig();
    const bearer = customer ? customer.bearer : config.key;
    const designId = new URL(request.url).searchParams.get("designId");
    const scope = (table: string) => {
      if (!designId) return "";
      if (table === "designs")
        return `&id=eq.${encodeURIComponent(designId)}`;
      if (DESIGN_SCOPED.has(table))
        return `&design_id=eq.${encodeURIComponent(designId)}`;
      return "";
    };
    const tables = [
      "designs",
      "design_drafts",
      "design_revisions",
      "generation_runs",
      "generation_tasks",
      "assets",
      "price_snapshots",
      "quotes",
      "orders",
      "audit_events",
    ] as const;
    const results = await Promise.all(
      tables.map((table) =>
        supabaseRequest<Array<Record<string, unknown>>>(
          config,
          `/rest/v1/${table}?select=${
            table === "generation_tasks" ? TASK_COLUMNS : "*"
          }&order=created_at${scope(table)}`,
          {},
          bearer,
        ),
      ),
    );
    const rows = Object.fromEntries(
      tables.map((table, index) => [table, results[index] ?? []]),
    );
    if (designId) {
      // generation_tasks has no design_id column; scope it through its run.
      const runIds = new Set(
        (rows.generation_runs as Array<Record<string, unknown>>).map((run) =>
          String(run.id),
        ),
      );
      rows.generation_tasks = (
        rows.generation_tasks as Array<Record<string, unknown>>
      ).filter((task) => runIds.has(String(task.run_id)));
    }
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
    const { price_snapshots: estimates, ...rest } = rows;
    return Response.json(
      {
        role: operator ? "operator" : "customer",
        principalId: customer ? customer.user.id : "operator-session",
        ...rest,
        estimates,
        assets,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return jsonError(error);
  }
}
