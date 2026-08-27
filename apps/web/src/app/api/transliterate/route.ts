import {
  OpenAIArabicNameTransliterator,
  arabicTransliterationProfile,
  type ArabicTransliterationResult,
} from "@jewelo/ai";

const MAX_BODY_BYTES = 1024;
const WINDOW_MS = 60_000;
const REQUESTS_PER_WINDOW = 20;
const requestWindows = new Map<string, { count: number; resetAt: number }>();
const resultCache = new Map<string, ArabicTransliterationResult>();

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

function clientKey(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local"
  );
}

function assertRateLimit(request: Request) {
  const now = Date.now();
  const key = clientKey(request);
  const active = requestWindows.get(key);
  if (!active || active.resetAt <= now) {
    requestWindows.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  active.count += 1;
  if (active.count > REQUESTS_PER_WINDOW)
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

export async function handleTransliteration(
  request: Request,
  createTransliterator: () => ArabicNameTransliterator = () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey)
      throw new Response("Arabic refinement unavailable", { status: 503 });
    return new OpenAIArabicNameTransliterator(
      apiKey,
      arabicTransliterationProfile.model,
    );
  },
) {
  try {
    sameOrigin(request);
    assertRateLimit(request);
    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > MAX_BODY_BYTES)
      throw new Response("Request body is too large", { status: 413 });
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES)
      throw new Response("Request body is too large", { status: 413 });
    const input = JSON.parse(raw) as { name?: unknown };
    if (!validLatinName(input.name))
      throw new Response("Enter a valid Latin-script name", { status: 400 });
    const name = input.name.trim();
    const cacheKey = name.toLocaleLowerCase("en");
    const cached = resultCache.get(cacheKey);
    const result = cached ?? (await createTransliterator().transliterate(name));
    resultCache.set(cacheKey, result);
    return Response.json(result, {
      headers: { "cache-control": "private, max-age=3600" },
    });
  } catch (error) {
    if (error instanceof Response)
      return Response.json(
        { error: await error.text() },
        { status: error.status, headers: { "cache-control": "no-store" } },
      );
    return Response.json(
      { error: "Arabic refinement failed" },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}

export async function POST(request: Request) {
  return handleTransliteration(request);
}
