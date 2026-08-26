import { isPromptProfile, validatePromptTemplate } from "@jewelo/ai";
import {
  operatorSessionScope,
  requireOperatorSession,
} from "../../../../lib/backend/operator-session";
import {
  adminConfig,
  supabaseRequest,
} from "../../../../lib/backend/supabase-rest";
import {
  createMockPromptRelease,
  listMockPromptReleases,
  promptVariableMetadata,
  publishMockPromptRelease,
  type StoredPromptRelease,
} from "../../../../lib/backend/operator-prompt-store";

const MAX_BODY_BYTES = 32 * 1024;
const mockMode = () =>
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_JEWELO_DATA_MODE !== "remote";

function requestId(request: Request) {
  return (
    request.headers.get("x-request-id")?.slice(0, 100) ?? crypto.randomUUID()
  );
}

function assertSameOrigin(request: Request, mutation = false) {
  if (request.headers.get("sec-fetch-site") === "cross-site")
    throw new Response("Cross-site request rejected", { status: 403 });
  if (mutation) {
    const origin = request.headers.get("origin");
    const targetHost =
      request.headers.get("x-forwarded-host") ??
      request.headers.get("host") ??
      new URL(request.url).host;
    const originHost = (() => {
      try {
        return origin ? new URL(origin).host : "";
      } catch {
        return "";
      }
    })();
    if (!originHost || originHost !== targetHost)
      throw new Response("Same-origin request required", { status: 403 });
  }
}

function releaseDto(release: StoredPromptRelease) {
  return {
    id: release.id,
    profile: release.profile,
    version: release.version,
    template: release.template,
    parsedVariables: release.parsed_variables,
    changeNote: release.change_note,
    createdBy: release.created_by,
    createdAt: release.created_at,
  };
}

function assertExactKeys(input: Record<string, unknown>, allowed: string[]) {
  const unexpected = Object.keys(input).filter((key) => !allowed.includes(key));
  if (unexpected.length)
    throw new Error(
      `Unexpected prompt action fields: ${unexpected.join(", ")}`,
    );
}

function failure(error: unknown, id: string) {
  if (error instanceof Response)
    return Response.json(
      { error: error.statusText || "Request rejected", requestId: id },
      { status: error.status, headers: { "cache-control": "no-store" } },
    );
  const message = error instanceof Error ? error.message : "Unexpected error";
  const status = /authentication/i.test(message)
    ? 401
    : /changed; refresh/i.test(message)
      ? 409
      : /not found/i.test(message)
        ? 404
        : 400;
  return Response.json(
    { error: message, requestId: id },
    { status, headers: { "cache-control": "no-store" } },
  );
}

export async function GET(request: Request) {
  const id = requestId(request);
  try {
    requireOperatorSession(request);
    assertSameOrigin(request);
    const scope = operatorSessionScope(request);
    const profile = new URL(request.url).searchParams.get("profile") ?? "";
    if (!isPromptProfile(profile)) throw new Error("Unknown prompt profile");
    let publication: { release_id: string; published_at: string } | undefined;
    let releases: StoredPromptRelease[];
    if (mockMode()) {
      const stored = listMockPromptReleases(scope, profile);
      publication = stored.publication
        ? {
            release_id: stored.publication.id,
            published_at: stored.publication.publishedAt,
          }
        : undefined;
      releases = stored.releases;
    } else {
      const admin = adminConfig();
      const [publications, releaseRows] = await Promise.all([
        supabaseRequest<Array<{ release_id: string; published_at: string }>>(
          admin,
          `/rest/v1/prompt_profile_publications?profile=eq.${encodeURIComponent(profile)}&select=release_id,published_at`,
        ),
        supabaseRequest<StoredPromptRelease[]>(
          admin,
          `/rest/v1/prompt_releases?profile=eq.${encodeURIComponent(profile)}&select=id,profile,version,template,parsed_variables,change_note,created_by,created_at&order=version.desc&limit=20`,
        ),
      ]);
      publication = publications[0];
      releases = releaseRows;
    }
    if (!publication) throw new Error("Prompt publication not found");
    return Response.json(
      {
        profile,
        activeReleaseId: publication.release_id,
        publishedAt: publication.published_at,
        allowedVariables: promptVariableMetadata(profile),
        releases: releases.map(releaseDto),
        requestId: id,
      },
      { headers: { "cache-control": "no-store", "x-request-id": id } },
    );
  } catch (error) {
    return failure(error, id);
  }
}

export async function POST(request: Request) {
  const id = requestId(request);
  try {
    requireOperatorSession(request);
    assertSameOrigin(request, true);
    const scope = operatorSessionScope(request);
    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > MAX_BODY_BYTES)
      throw new Error("Prompt request body is too large");
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES)
      throw new Error("Prompt request body is too large");
    const input = JSON.parse(body) as Record<string, unknown>;
    if (input.action === "create") {
      assertExactKeys(input, ["action", "profile", "template", "changeNote"]);
      if (typeof input.profile !== "string" || !isPromptProfile(input.profile))
        throw new Error("Unknown prompt profile");
      if (
        typeof input.template !== "string" ||
        typeof input.changeNote !== "string"
      )
        throw new Error("Template and change note are required");
      if (!input.changeNote.trim() || input.changeNote.length > 500)
        throw new Error("Change note must be 1–500 characters");
      const parsed = validatePromptTemplate(input.profile, input.template);
      let release: StoredPromptRelease;
      if (mockMode())
        release = createMockPromptRelease({
          scope,
          profile: input.profile,
          template: input.template,
          changeNote: input.changeNote.trim(),
        });
      else {
        release = await supabaseRequest<StoredPromptRelease>(
          adminConfig(),
          "/rest/v1/rpc/create_prompt_release",
          {
            method: "POST",
            body: JSON.stringify({
              p_profile: input.profile,
              p_template: input.template,
              p_parsed_variables: parsed.variables,
              p_change_note: input.changeNote.trim(),
              p_created_by: "operator:cookie-session",
            }),
          },
        );
      }
      return Response.json(
        { ...releaseDto(release), requestId: id },
        { headers: { "cache-control": "no-store", "x-request-id": id } },
      );
    }
    if (input.action === "publish") {
      assertExactKeys(input, [
        "action",
        "releaseId",
        "expectedCurrentReleaseId",
      ]);
      if (
        typeof input.releaseId !== "string" ||
        typeof input.expectedCurrentReleaseId !== "string"
      )
        throw new Error("Release and current publication are required");
      if (mockMode())
        publishMockPromptRelease({
          scope,
          releaseId: input.releaseId,
          expectedCurrentReleaseId: input.expectedCurrentReleaseId,
        });
      else
        await supabaseRequest(
          adminConfig(),
          "/rest/v1/rpc/publish_prompt_release",
          {
            method: "POST",
            body: JSON.stringify({
              p_release_id: input.releaseId,
              p_expected_current_release_id: input.expectedCurrentReleaseId,
              p_published_by: "operator:cookie-session",
            }),
          },
        );
      return Response.json(
        { requestId: id },
        { headers: { "cache-control": "no-store", "x-request-id": id } },
      );
    }
    throw new Error("Unknown prompt action");
  } catch (error) {
    return failure(error, id);
  }
}
