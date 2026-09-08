import { pipelineLimits } from "@jewelo/config";
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
 * The verifier fields the atelier actually reads. `VerificationResult` in
 * `@jewelo/contracts` is what `supabase-jewelo-client.ts` casts this object to,
 * `mock-client.ts` reads `exactText`, and `passed` is the flag the SQL gates
 * and the operator console key on. Nothing else in the browser touches this
 * record.
 *
 * Fix-2 review M5: `notes` was on this list and is unbounded model prose. The
 * verifier writes it after being shown the approved name and asked to explain a
 * failure, so it can carry a misread spelling and the model's own vocabulary
 * back to the shopper's browser. Nothing in `apps/web` reads it from the
 * payload - `supabase-jewelo-client.ts:119` supplies its own line - so it is
 * off the list; an operator still reads the whole record on the asset row,
 * server-side.
 */
const VERIFICATION_FIELDS = [
  "status",
  "passed",
  "exactText",
  "identityScore",
] as const;

/**
 * Pipeline fix review 1 finding 11. This used to be a denylist that removed
 * `rejectedObjectPaths` and published everything else, so the job's whole
 * verification record reached the browser: `nameCheck.readText` (what the model
 * thought was engraved on somebody's pendant), `nameCheck.scriptOk`, and
 * `modelReportedMatch`, which names a model's opinion in a shopper's payload.
 * A denylist also publishes by default: any field a later job adds is public
 * until someone remembers to remove it.
 *
 * It is an allowlist now. Everything else - the whole `nameCheck` block
 * included - stays on the server, where the operator reads it on the asset row.
 */
function customerVerification(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    VERIFICATION_FIELDS.filter((field) => field in record).map((field) => [
      field,
      record[field],
    ]),
  );
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

/**
 * One asset, signed and projected for the browser.
 *
 * Lifted out of the map in `GET` so a refusal here can be caught per asset
 * rather than taking the whole payload down with it (fix-3 review minor 11).
 */
async function signAsset(
  asset: Record<string, unknown>,
  config: { url: string; key: string },
  bearer: string,
) {
  const path = String(asset.object_path);
  // Fix-2 review minor 10. Per-segment encoding keeps a `/` inside a name
  // part of that name, and nothing more: `encodeURIComponent` leaves `.`
  // untouched, so `..` survived it and was resolved by whatever normalises
  // the path, and an empty segment collapses. Both are refused here, before
  // anything is signed, exactly as the job-side signer refuses them
  // (`apps/jobs/src/presentation.ts:signedStorageUrl`). The bucket is a path
  // segment too and is encoded rather than interpolated.
  const segments = path.split("/");
  if (
    segments.some((segment) => !segment || segment === "." || segment === "..")
  )
    throw new Error("signed_storage_path_invalid");
  const signed = await supabaseRequest<{
    signedURL?: string;
    signedUrl?: string;
  }>(
    config,
    `/storage/v1/object/sign/${encodeURIComponent(
      String(asset.bucket_id),
    )}/${segments.map(encodeURIComponent).join("/")}`,
    {
      method: "POST",
      // Pipeline fix review 1 finding 6: the customer-facing signer kept the
      // literal every other call site had already given up.
      body: JSON.stringify({
        expiresIn: pipelineLimits.signedUrlExpirySeconds,
      }),
    },
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
}

export async function GET(request: Request) {
  try {
    const operator = hasOperatorSession(request);
    const customer = operator ? null : await authenticatedUser(request);
    const config = customer ? customer.config : adminConfig();
    const bearer = customer ? customer.bearer : config.key;
    const designId = new URL(request.url).searchParams.get("designId");
    const scope = (table: string) => {
      if (!designId) return "";
      if (table === "designs") return `&id=eq.${encodeURIComponent(designId)}`;
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
    // Fix-3 review minor 11: one asset with a bad segment used to throw out of
    // `Promise.all` and take the whole response with it, so the shopper lost
    // all four views over one unsignable row. A refused asset is dropped from
    // the payload and named in the server log instead: three verified views is
    // a degraded page, no views is a broken one, and the object path never
    // reaches the browser either way.
    const assets = (
      await Promise.all(
        (rows.assets as Array<Record<string, unknown>>).map(async (asset) => {
          try {
            return await signAsset(asset, config, bearer);
          } catch (error) {
            console.error("state_asset_dropped", {
              assetId: String(asset.id ?? "unknown"),
              reason:
                error instanceof Error ? error.message : "asset_sign_failed",
            });
            return undefined;
          }
        }),
      )
    ).filter((asset) => asset !== undefined);
    rows.audit_events = (
      rows.audit_events as Array<Record<string, unknown>>
    ).map((event) => project(event, AUDIT_READ_COLUMNS));
    const { price_snapshots: estimates, ...rest } = rows;
    return Response.json(
      {
        role: operator ? "operator" : "customer",
        principalId: customer ? customer.user.id : "operator-session",
        // Fix-2 review minor 11: how long the browser may hold one of the
        // signed URLs above, derived from the same validated expiry this route
        // signs with. The atelier used to carry its own literal, which a lower
        // configured expiry would have silently turned into expired URLs.
        signedUrlRefreshAfterMs: pipelineLimits.signedUrlRefreshAfterMs,
        // Fix-3 review minor 8: the floor a client falls back to when the
        // window above is missing from a payload, so degrading shortens the
        // hold instead of switching the cache off and re-opening the iOS
        // Safari decode defect for the length of a rolling deploy.
        signedUrlRefreshFloorMs: pipelineLimits.signedUrlRefreshFloorMs,
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
