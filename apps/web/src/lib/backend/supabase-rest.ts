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
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase ${response.status}: ${error.slice(0, 500)}`);
  }
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

export function jsonError(error: unknown): Response {
  if (error instanceof Response) return error;
  const message = error instanceof Error ? error.message : "Unexpected error";
  const status = /Unauthorized|authentication required/i.test(message)
    ? 401
    : /quota|spend guard|active|cannot be|not found/i.test(message)
      ? 409
      : 400;
  return Response.json(
    { error: message },
    { status, headers: { "cache-control": "no-store" } },
  );
}
