import "server-only";

interface SupabaseConfig {
  url: string;
  key: string;
}

function requireValue(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function userConfig(): SupabaseConfig {
  return {
    url: process.env.SUPABASE_URL ?? requireValue("NEXT_PUBLIC_SUPABASE_URL"),
    key:
      process.env.SUPABASE_PUBLISHABLE_KEY ??
      requireValue("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  };
}

export function adminConfig(): SupabaseConfig {
  return {
    url: requireValue("SUPABASE_URL"),
    key: requireValue("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

export function bearerFrom(request: Request): string {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer "))
    throw new Response("Unauthorized", { status: 401 });
  return authorization.slice(7);
}

export async function supabaseRequest<T>(
  config: SupabaseConfig,
  path: string,
  init: RequestInit = {},
  bearer = config.key,
): Promise<T> {
  const response = await fetch(`${config.url}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: config.key,
      authorization: `Bearer ${bearer}`,
      "content-type": "application/json",
      ...init.headers,
    },
  });
  if (!response.ok)
    throw supabaseFailure(response.status, await response.text());
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function authenticatedUser(request: Request) {
  const bearer = bearerFrom(request);
  const config = userConfig();
  const user = await supabaseRequest<{ id: string }>(
    config,
    "/auth/v1/user",
    {},
    bearer,
  );
  return { bearer, config, user };
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
  }
}

const text = (value: unknown) => (typeof value === "string" ? value : "");

function supabaseFailure(status: number, body: string): ApiError {
  let code = "";
  let message = "";
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    code = text(parsed.code);
    message =
      text(parsed.message) ||
      text(parsed.msg) ||
      text(parsed.error_description) ||
      text(parsed.error);
  } catch {
    // non-JSON provider body
  }
  if (code === "P0001")
    return /one active generation run/i.test(message)
      ? new ApiError(message, 409, "run_active")
      : /spend guard|generation limit|budget exhausted/i.test(message)
        ? new ApiError(message, 429, "spend_guard")
        : new ApiError(message, 409, "state_conflict");
  if (code === "P0002" || code === "PGRST116" || status === 404)
    return new ApiError(message || "Not found", 404, "not_found");
  if (["PGRST202", "PGRST102", "22P02", "23502"].includes(code))
    return new ApiError(message || "Invalid input", 422, "invalid_input");
  if (status === 401 || status === 403)
    return new ApiError(
      message || (status === 401 ? "Unauthorized" : "Forbidden"),
      status,
      status === 401 ? "unauthenticated" : "forbidden",
    );
  console.error("supabase_request_failed", {
    status,
    body: body.slice(0, 500),
  });
  return new ApiError("Internal error", 500, "internal");
}

const PLAIN_ERROR_RULES: Array<[RegExp, number, string]> = [
  [/unauthorized|authentication required/i, 401, "unauthenticated"],
  [/not found/i, 404, "not_found"],
  [/required|invalid|unknown action|malformed|must be/i, 422, "invalid_input"],
  [/only a current|cannot|already|active/i, 409, "state_conflict"],
];

function errorResponse(error: string, status: number, code: string): Response {
  return Response.json(
    { error, code },
    { status, headers: { "cache-control": "no-store" } },
  );
}

export function jsonError(error: unknown): Response {
  if (error instanceof Response) return error;
  if (error instanceof ApiError)
    return errorResponse(error.message, error.status, error.code);
  const message = error instanceof Error ? error.message : "Unexpected error";
  const rule = PLAIN_ERROR_RULES.find(([pattern]) => pattern.test(message));
  if (!rule) {
    console.error("api_route_failed", message);
    return errorResponse("Internal error", 500, "internal");
  }
  return errorResponse(message, rule[1], rule[2]);
}

export async function readJson<T extends Record<string, unknown>>(
  request: Request,
  required: Array<keyof T & string> = [],
): Promise<T> {
  const body = (await request.json().catch(() => {
    throw new Error("malformed body");
  })) as T;
  for (const field of required)
    if (body[field] === undefined || body[field] === null || body[field] === "")
      throw new Error(`${field} required`);
  return body;
}
