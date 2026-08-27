export function GET() {
  const triggerKey = process.env.TRIGGER_SECRET_KEY;
  const supabaseConfigured = Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const ready = supabaseConfigured && Boolean(triggerKey);

  return Response.json(
    {
      status: ready ? "ready" : "not_ready",
      dependencies: {
        supabase: supabaseConfigured ? "configured" : "missing",
        trigger: {
          configured: Boolean(triggerKey),
          keyEnvironment: triggerKey?.startsWith("tr_prod_")
            ? "prod"
            : triggerKey?.startsWith("tr_dev_")
              ? "dev"
              : "unknown",
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
