import { z } from "zod";

const url = z.url();
const nonEmpty = z.string().min(1);

export const browserEnvSchema = z
  .object({
    NEXT_PUBLIC_APP_URL: url.default("http://localhost:3000"),
    NEXT_PUBLIC_SUPABASE_URL: url.optional(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: nonEmpty.optional(),
    NEXT_PUBLIC_POSTHOG_KEY: nonEmpty.optional(),
    NEXT_PUBLIC_POSTHOG_HOST: url.optional(),
    NEXT_PUBLIC_SENTRY_DSN: url.optional(),
  })
  .superRefine((value, context) => {
    const hasUrl = value.NEXT_PUBLIC_SUPABASE_URL !== undefined;
    const hasKey = value.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY !== undefined;
    if (hasUrl !== hasKey) {
      context.addIssue({
        code: "custom",
        message:
          "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set together",
      });
    }
  });

export const trustedWebEnvSchema = z.object({
  SUPABASE_URL: url,
  SUPABASE_SERVICE_ROLE_KEY: nonEmpty,
});

export const jobsEnvSchema = trustedWebEnvSchema.extend({
  TRIGGER_PROJECT_REF: nonEmpty,
  TRIGGER_SECRET_KEY: nonEmpty,
  PROVIDER_MODE: z.literal("mock").default("mock"),
});

export const ciEnvSchema = z.object({
  CI: z.enum(["true", "false"]).optional(),
  JEWELO_ENV: z.enum(["test", "development"]).default("test"),
  PROVIDER_MODE: z.literal("mock").default("mock"),
});

export function parseBrowserEnv(input: Record<string, string | undefined>) {
  const exposed = Object.fromEntries(
    Object.entries(input).filter(([key]) => key.startsWith("NEXT_PUBLIC_")),
  );
  return browserEnvSchema.parse(exposed);
}

export function assertBrowserSafeEnv(
  input: Record<string, string | undefined>,
): void {
  const forbidden = Object.keys(input).filter(
    (key) => !key.startsWith("NEXT_PUBLIC_") && input[key] !== undefined,
  );
  if (forbidden.length > 0) {
    throw new Error(
      `Server-only environment keys cannot enter browser config: ${forbidden.join(", ")}`,
    );
  }
}
