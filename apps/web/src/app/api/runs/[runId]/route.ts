import {
  authenticatedUser,
  jsonError,
  supabaseRequest,
} from "../../../../lib/backend/supabase-rest";

export async function GET(
  request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await context.params;
    const { bearer, config } = await authenticatedUser(request);
    const [runs, tasks, assets] = await Promise.all([
      supabaseRequest<Array<Record<string, unknown>>>(
        config,
        `/rest/v1/generation_runs?id=eq.${encodeURIComponent(runId)}`,
        {},
        bearer,
      ),
      supabaseRequest<Array<Record<string, unknown>>>(
        config,
        `/rest/v1/generation_tasks?run_id=eq.${encodeURIComponent(runId)}&order=created_at`,
        {},
        bearer,
      ),
      supabaseRequest<Array<Record<string, unknown>>>(
        config,
        `/rest/v1/assets?run_id=eq.${encodeURIComponent(runId)}&order=created_at`,
        {},
        bearer,
      ),
    ]);
    if (!runs[0])
      return Response.json({ error: "Run not found" }, { status: 404 });
    const signedAssets = await Promise.all(
      assets.map(async (asset) => {
        const bucket = String(asset.bucket_id);
        const objectPath = String(asset.object_path);
        const signed = await supabaseRequest<{
          signedURL?: string;
          signedUrl?: string;
        }>(
          config,
          `/storage/v1/object/sign/${encodeURIComponent(bucket)}/${objectPath
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
      { run: runs[0], tasks, assets: signedAssets },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return jsonError(error);
  }
}
