import { z } from "zod";

const url = z.url();
const nonEmpty = z.string().min(1);

export const browserEnvSchema = z
  .object({
    NEXT_PUBLIC_APP_URL: url.default("http://localhost:3000"),
    NEXT_PUBLIC_JEWELO_DATA_MODE: z.enum(["mock", "remote"]).default("mock"),
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
  SUPABASE_PUBLISHABLE_KEY: nonEmpty.optional(),
  SHOPIFY_STORE_DOMAIN: nonEmpty.optional(),
  SHOPIFY_CLIENT_ID: nonEmpty.optional(),
  SHOPIFY_CLIENT_SECRET: nonEmpty.optional(),
  SHOPIFY_WEBHOOK_SECRET: nonEmpty.optional(),
  OPERATOR_EMAIL: nonEmpty.optional(),
  OPERATOR_PASSPHRASE: nonEmpty.optional(),
  OPERATOR_SESSION_SECRET: nonEmpty.optional(),
});

export const triggerConfigEnvSchema = z.object({
  TRIGGER_PROJECT_REF: nonEmpty,
});

export const jobsEnvSchema = trustedWebEnvSchema
  .extend({
    TRIGGER_PROJECT_REF: nonEmpty,
    TRIGGER_SECRET_KEY: nonEmpty,
    PROVIDER_MODE: z.enum(["mock", "real"]).default("mock"),
    FAL_KEY: nonEmpty.optional(),
    FAL_IMAGE_MODEL: nonEmpty.default("openai/gpt-image-2/edit"),
    OPENAI_API_KEY: nonEmpty.optional(),
    OPENAI_VERIFIER_MODEL: nonEmpty.default("gpt-5.6-luna"),
    FAL_CONCURRENCY_LIMIT: z.coerce.number().int().min(1).max(32).default(2),
    VERIFIER_CONCURRENCY_LIMIT: z.coerce
      .number()
      .int()
      .min(1)
      .max(32)
      .default(4),
    MAX_PROVIDER_ATTEMPTS: z.coerce.number().int().min(1).max(3).default(3),
  })
  .superRefine((value, context) => {
    if (value.PROVIDER_MODE === "real") {
      for (const key of ["FAL_KEY", "OPENAI_API_KEY"] as const) {
        if (!value[key])
          context.addIssue({
            code: "custom",
            path: [key],
            message: `${key} is required in real provider mode`,
          });
      }
    }
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

export function parseJobsEnv(input: Record<string, string | undefined>) {
  return jobsEnvSchema.parse(input);
}

export function parseTriggerConfigEnv(
  input: Record<string, string | undefined>,
) {
  return triggerConfigEnvSchema.parse(input);
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
