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

// Customer-visible asset columns. `bucket_id` and `object_path` are read for
// the signing call and dropped before the response: a private storage path is
// not something the browser ever needs, and publishing it hands an attacker the
// exact key to ask the storage API for.
const ASSET_READ_COLUMNS = [
  "id",
  "run_id",
  "task_id",
  "presentation_view",
  "provider",
  "model",
  "prompt_release",
  "input_asset_ids",
  "attempt",
  "verification_result",
  "mime_type",
  "created_at",
] as const;
const ASSET_COLUMNS = [...ASSET_READ_COLUMNS, "bucket_id", "object_path"].join(
  ",",
);

// The audit trail a customer may read: what happened, to which design, when.
// The `detail` payload is operator lineage - task ids, reservation cents,
// outbox ids - and stays server-side.
const AUDIT_READ_COLUMNS = [
  "id",
  "design_id",
  "actor_type",
  "action",
  "created_at",
] as const;
const AUDIT_COLUMNS = AUDIT_READ_COLUMNS.join(",");

/** Projected in code as well as in the query, so the shape holds either way. */
function project(
  row: Record<string, unknown>,
  columns: readonly string[],
): Record<string, unknown> {
  return Object.fromEntries(columns.map((column) => [column, row[column]]));
}

/**
 * The verifier record is customer-visible lineage, but a name-rejected attempt
 * records the private storage paths of the images it threw away. Those never
 * leave the server.
 */
function customerVerification(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const rest = { ...(value as Record<string, unknown>) };
  delete rest.rejectedObjectPaths;
  return rest;
}

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
            table === "generation_tasks"
              ? TASK_COLUMNS
              : table === "assets"
                ? ASSET_COLUMNS
                : table === "audit_events"
                  ? AUDIT_COLUMNS
                  : "*"
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
        // Projected, not spread: the private location stays on this server.
        const projected = project(asset, ASSET_READ_COLUMNS);
        return {
          ...projected,
          verification_result: customerVerification(asset.verification_result),
          signed_url: relative?.startsWith("http")
            ? relative
            : `${config.url}/storage/v1${relative}`,
        };
      }),
    );
    rows.audit_events = (
      rows.audit_events as Array<Record<string, unknown>>
    ).map((event) => project(event, AUDIT_READ_COLUMNS));
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
