export const healthPayload = {
  status: "ok",
  service: "jewelo-web",
  contractVersion: "foundation-v1",
} as const;

export function readinessPayload(input: Record<string, string | undefined>) {
  const supabaseConfigured = Boolean(
    input.NEXT_PUBLIC_SUPABASE_URL &&
    input.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const triggerConfigured = Boolean(
    input.TRIGGER_PROJECT_REF && input.TRIGGER_SECRET_KEY,
  );

  return {
    status: "ready",
    service: "jewelo-web",
    connectivityChecked: false,
    dependencies: {
      supabase: supabaseConfigured
        ? "configured-not-checked"
        : "not-configured",
      trigger: triggerConfigured ? "configured-not-checked" : "not-configured",
    },
  } as const;
}
