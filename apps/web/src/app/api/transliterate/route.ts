import {
  OpenAIArabicNameTransliterator,
  arabicTransliterationProfile,
  type ArabicTransliterationResult,
} from "@jewelo/ai";

import {
  ApiError,
  authenticatedUser,
  jsonError,
} from "../../../lib/backend/supabase-rest";
import {
  BoundedTtlMap,
  checkRateLimit,
  clientIp,
  createRateLimitStore,
} from "../../../lib/backend/request-guard";
import { webGuardLimits } from "@jewelo/config";

const MAX_BODY_BYTES = 1024;
const WINDOW_MS = webGuardLimits.transliterateWindowMs;
const REQUESTS_PER_WINDOW = webGuardLimits.transliterateRequestsPerWindow;
// Both maps are bounded by age and by entry count: this route is reachable by
// any authenticated anonymous principal and spends real provider budget, so an
// unbounded key space here is both a memory leak and a spend hole.
const requestWindows = createRateLimitStore();
const resultCache = new BoundedTtlMap<ArabicTransliterationResult>(
  webGuardLimits.transliterateCacheMaxEntries,
  webGuardLimits.transliterateCacheTtlMs,
);

interface ArabicNameTransliterator {
  transliterate(name: string): Promise<ArabicTransliterationResult>;
}

function sameOrigin(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site")
    throw new Response("Cross-site request rejected", { status: 403 });
  const origin = request.headers.get("origin");
  const targetHost =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    new URL(request.url).host;
  if (origin && new URL(origin).host !== targetHost)
    throw new Response("Same-origin request required", { status: 403 });
}

/**
 * The limiter key is the last proxy hop - the only one the caller cannot forge -
 * combined with the authenticated principal, so neither rotating a header nor
 * minting a new anonymous principal alone resets the window.
 */
function clientKey(request: Request, principalId: string) {
  return `${clientIp(request)}|${principalId}`;
}

function assertRateLimit(request: Request, principalId: string) {
  const verdict = checkRateLimit(
    requestWindows,
    clientKey(request, principalId),
    REQUESTS_PER_WINDOW,
    WINDOW_MS,
  );
  if (!verdict.allowed)
    throw new Response("Too many transliteration requests", { status: 429 });
}

function validLatinName(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length >= 2 &&
    value.trim().length <= 36 &&
    /^[\p{Script=Latin}\p{M} .'-]+$/u.test(value.trim())
  );
}

/**
 * This route spends real OpenAI budget, so it is closed twice.
 *
 * It is a customer route and carries the same authenticated anonymous principal
 * as every other one: an unauthenticated caller could otherwise drive provider
 * spend that no run, reservation or daily cap accounts for. And it refuses
 * outright unless the deployment is in real provider mode, so a mock or preview
 * environment - which has no spend ceiling of its own - can never reach OpenAI
 * through it.
 */
function assertRealProviderMode() {
  if (process.env.PROVIDER_MODE !== "real")
    throw new Response(
      "transliteration_unavailable:Arabic name refinement is unavailable here.",
      { status: 503 },
    );
}

export async function handleTransliteration(
  request: Request,
  createTransliterator: () => ArabicNameTransliterator = () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey)
      throw new Response(
        "transliteration_unavailable:Arabic name refinement is unavailable here.",
        { status: 503 },
      );
    return new OpenAIArabicNameTransliterator(
      apiKey,
      arabicTransliterationProfile.model,
    );
  },
  authenticate: (request: Request) => Promise<unknown> = authenticatedUser,
) {
  try {
    sameOrigin(request);
    const principal = (await authenticate(request)) as
      | { user?: { id?: string } }
      | undefined;
    assertRateLimit(request, String(principal?.user?.id ?? "anonymous"));
    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > MAX_BODY_BYTES)
      throw new Response("Request body is too large", { status: 413 });
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES)
      throw new Response("Request body is too large", { status: 413 });
    const input = JSON.parse(raw) as { name?: unknown };
    if (typeof input.name === "string" && input.name.trim().length > 64)
      throw new Response("invalid_input:Name is limited to 64 characters", {
        status: 422,
      });
    if (!validLatinName(input.name))
      throw new Response("Enter a valid Latin-script name", { status: 400 });
    const name = input.name.trim();
    // After the free validation, before anything that can cost money.
    assertRealProviderMode();
    const cacheKey = name.toLocaleLowerCase("en");
    const cached = resultCache.get(cacheKey);
    const result = cached ?? (await createTransliterator().transliterate(name));
    resultCache.set(cacheKey, result);
    return Response.json(result, {
      headers: { "cache-control": "private, max-age=3600" },
    });
  } catch (error) {
    if (error instanceof ApiError) return jsonError(error);
    if (error instanceof Response) {
      const text = await error.text();
      const [code, ...rest] = text.split(":");
      const structured =
        rest.length > 0 ? { error: rest.join(":"), code } : { error: text };
      return Response.json(structured, {
        status: error.status,
        headers: { "cache-control": "no-store" },
      });
    }
    return Response.json(
      { error: "Arabic refinement failed" },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}

export async function POST(request: Request) {
  return handleTransliteration(request);
}
