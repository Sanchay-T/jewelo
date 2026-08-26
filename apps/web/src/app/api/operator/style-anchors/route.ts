import { createHash } from "node:crypto";
import { isPromptProfile } from "@jewelo/ai";
import { requireOperatorSession } from "../../../../lib/backend/operator-session";
import {
  adminConfig,
  jsonError,
  supabaseRequest,
} from "../../../../lib/backend/supabase-rest";

const STYLE_PROFILES = new Set([
  "image.packshot",
  "image.worn",
  "image.macro_gift",
  "image.dark_editorial",
  "image.studio_hero",
  "image.billboard",
]);

export async function GET(request: Request) {
  try {
    requireOperatorSession(request);
    const config = adminConfig();
    const releases = await supabaseRequest<Array<Record<string, unknown>>>(
      config,
      "/rest/v1/style_anchor_releases?select=id,profile,version,source_task_id,status,checksum_sha256,approval_note,created_by,created_at&order=profile,version.desc",
    );
    const publications = await supabaseRequest<Array<Record<string, unknown>>>(
      config,
      "/rest/v1/style_anchor_publications?select=profile,release_id,published_by,published_at&order=profile",
    );
    return Response.json(
      { releases, publications },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    requireOperatorSession(request);
    const input = (await request.json()) as Record<string, unknown>;
    const config = adminConfig();
    if (input.action === "register") {
      const profile = String(input.profile ?? "");
      const sourceTaskId = String(input.sourceTaskId ?? "");
      const objectPath = String(input.objectPath ?? "");
      const approvalNote = String(input.approvalNote ?? "");
      if (!isPromptProfile(profile) || !STYLE_PROFILES.has(profile))
        throw new Error("Unknown style anchor profile");
      if (!objectPath.startsWith(`${profile}/`))
        throw new Error("Style anchor path must be scoped by profile");
      const artifact = await fetch(
        `${config.url}/storage/v1/object/style-anchors/${objectPath
          .split("/")
          .map(encodeURIComponent)
          .join("/")}`,
        {
          headers: {
            apikey: config.key,
            authorization: `Bearer ${config.key}`,
          },
        },
      );
      if (!artifact.ok)
        throw new Error(`Style anchor artifact unavailable:${artifact.status}`);
      const bytes = new Uint8Array(await artifact.arrayBuffer());
      if (!bytes.byteLength) throw new Error("Style anchor artifact is empty");
      const checksum = createHash("sha256").update(bytes).digest("hex");
      const release = await supabaseRequest<Record<string, unknown>>(
        config,
        "/rest/v1/rpc/create_style_anchor_release",
        {
          method: "POST",
          body: JSON.stringify({
            p_profile: profile,
            p_source_task_id: sourceTaskId,
            p_bucket_id: "style-anchors",
            p_object_path: objectPath,
            p_checksum_sha256: checksum,
            p_approval_note: approvalNote,
            p_created_by: "operator:http-session",
          }),
        },
      );
      return Response.json({ release }, { status: 201 });
    }
    if (input.action === "publish") {
      const publication = await supabaseRequest<Record<string, unknown>>(
        config,
        "/rest/v1/rpc/publish_style_anchor_release",
        {
          method: "POST",
          body: JSON.stringify({
            p_release_id: String(input.releaseId ?? ""),
            p_expected_current_release_id: String(
              input.expectedCurrentReleaseId ?? "",
            ),
            p_published_by: "operator:http-session",
          }),
        },
      );
      return Response.json({ publication });
    }
    throw new Error("Unknown style anchor action");
  } catch (error) {
    return jsonError(error);
  }
}
