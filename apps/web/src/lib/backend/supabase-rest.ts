import "server-only";

import { pipelineLimits } from "@jewelo/config";
import { reportError } from "@jewelo/observability/server";

interface SupabaseConfig {
  url: string;
  key: string;
}

function requireValue(name: string): string {
  const value = process.env[name];
  if (!value) {
    // A missing server credential is an operator problem, never a client hint.
    console.error("server_configuration_missing", name);
    throw new ApiError("Internal error", 500, "internal");
  }
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
    throw new ApiError("Unauthorized", 401, "unauthenticated");
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
  // PostgREST answers 201/204 with an empty body unless representation is
  // requested; parsing that as JSON is what turned committed writes into 500s.
  const payload = await response.text();
  return (payload ? (JSON.parse(payload) as T) : (undefined as T));
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
      : /spend guard|generation limit/i.test(message)
        ? new ApiError(message, 429, "spend_guard")
        : new ApiError(message, 409, "state_conflict");
  if (code === "P0002" || code === "PGRST116" || status === 404)
    return new ApiError(message || "Not found", 404, "not_found");
  if (code === "23505")
    return new ApiError(message || "State conflict", 409, "state_conflict");
  if (["PGRST202", "PGRST102", "22P02", "23502", "22023"].includes(code))
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
  [/only a current|cannot|already|active|expired/i, 409, "state_conflict"],
];

function errorResponse(error: string, status: number, code: string): Response {
  return Response.json(
    { error, code },
    { status, headers: { "cache-control": "no-store" } },
  );
}

/**
 * P7-5 / DS-9. Every route's last line, so it is also where a failure is
 * reported from.
 *
 * Only the failures nobody expected are reported: a 5xx, or a throw that
 * matched no rule and became `internal`. A 404 for a design that is gone and a
 * 422 for a name that is too long are the API working, and an error tracker
 * full of them is an error tracker nobody reads. The report is queued before
 * the response is built and never awaited, so the shopper's answer is not one
 * millisecond slower for it; with `SENTRY_DSN` empty it does nothing at all.
 */
export function jsonError(error: unknown): Response {
  if (error instanceof Response) return error;
  if (error instanceof ApiError) {
    if (error.status >= 500)
      reportError(error, { code: error.code, status: error.status });
    return errorResponse(error.message, error.status, error.code);
  }
  const message = error instanceof Error ? error.message : "Unexpected error";
  const rule = PLAIN_ERROR_RULES.find(([pattern]) => pattern.test(message));
  if (!rule) {
    console.error("api_route_failed", message);
    reportError(error, { code: "internal", status: 500 });
    return errorResponse("Internal error", 500, "internal");
  }
  return errorResponse(message, rule[1], rule[2]);
}

export async function readJson<T extends Record<string, unknown>>(
  request: Request,
  required: Array<keyof T & string> = [],
): Promise<T> {
  // Security review 2 L-6: the body used to be buffered whole before any bound
  // applied, so a route that reads JSON had no size of its own. The declared
  // length is refused first, from validated configuration rather than a literal
  // here; a caller that lies about it still meets the schema on the far side.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > pipelineLimits.requestBodyMaxBytes)
    throw new ApiError("Request body is too large", 413, "payload_too_large");
  const body = (await request.json().catch(() => {
    throw new Error("malformed body");
  })) as T;
  for (const field of required)
    if (body[field] === undefined || body[field] === null || body[field] === "")
      throw new Error(`${field} required`);
  return body;
}

/**
 * Runtime validation at the edge of a route.
 *
 * Structural, not a `zod` import: the schemas live in `@jewelo/contracts` and
 * the web app has no direct provider or library dependency of its own. A
 * failure is the existing `invalid_input` 422, with the first field path and
 * message so the client can point at the field, and never the raw input.
 */
type ValidationResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: { issues: Array<{ path: PropertyKey[]; message: string }> };
    };
export interface Validator<T> {
  safeParse(value: unknown): ValidationResult<T>;
}

export function validated<T>(
  schema: Validator<T>,
  value: unknown,
  label = "specification",
): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const path = [label, ...(issue?.path ?? [])].map(String).join(".");
  throw new ApiError(
    `Invalid ${path}: ${issue?.message ?? "invalid value"}`,
    422,
    "invalid_input",
  );
}
