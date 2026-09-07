/**
 * Readiness is bound to the two things a customer run cannot start without:
 * durable Supabase truth, and an Inngest job engine that will accept and
 * execute a dispatched event.
 */
export function GET() {
  const eventKey = process.env.INNGEST_EVENT_KEY;
  const signingKey = process.env.INNGEST_SIGNING_KEY;
  const supabaseConfigured = Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  // Signature verification is on whenever a signing key exists and dev mode is
  // not forced. The self-hosted `inngest start` server rejects a prefixed key
  // and is configured with bare hex; Inngest Cloud issues `signkey-<env>-<hex>`,
  // which the SDK strips. Both are production keys.
  const devMode =
    process.env.INNGEST_DEV === "1" || process.env.INNGEST_DEV === "true";
  const keyEnvironment =
    !signingKey || devMode
      ? "dev"
      : signingKey.startsWith("signkey-branch-") ||
          signingKey.startsWith("signkey-test-")
        ? "branch"
        : "prod";
  const configured = Boolean(eventKey && signingKey);
  const ready = supabaseConfigured && configured;

  return Response.json(
    {
      status: ready ? "ready" : "not_ready",
      dependencies: {
        supabase: supabaseConfigured ? "configured" : "missing",
        inngest: {
          configured,
          keyEnvironment,
          // Absent means Inngest Cloud; present means the self-hosted server.
          transport: process.env.INNGEST_BASE_URL ? "self_hosted" : "cloud",
          cronsRegistered: process.env.INNGEST_CRON_ENABLED === "1",
        },
        openai: process.env.OPENAI_API_KEY ? "configured" : "missing",
      },
    },
    {
      status: ready ? 200 : 503,
      headers: { "cache-control": "no-store" },
    },
  );
}
