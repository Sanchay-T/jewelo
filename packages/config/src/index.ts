export * from "./load-env";
import { z } from "zod";

/**
 * Deployment dashboards and `.env` files often carry `KEY=` with an empty
 * value for a variable that is intentionally unset. Treat "" (or whitespace)
 * exactly like an absent variable for every optional field, so an empty
 * `NEXT_PUBLIC_SENTRY_DSN=` line does not fail `z.url().optional()`.
 */
const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;
const optionalOf = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(blankToUndefined, schema.optional());

/**
 * The shape of a pendant construction id as the specification records it
 * (`PendantConstruction` in `@jewelo/contracts`): lower-case words joined by
 * hyphens, such as `framed-minimal`. Matched rather than listed, because the
 * construction list is the contracts package's to own and a second copy here
 * would drift the day a construction is added.
 */
const IDENTITY_CONSTRUCTION_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const url = z.url();
const nonEmpty = z.string().min(1);
const optionalUrl = optionalOf(url);
const optionalNonEmpty = optionalOf(nonEmpty);

export const browserEnvSchema = z
  .object({
    NEXT_PUBLIC_APP_URL: url.default("http://localhost:3000"),
    NEXT_PUBLIC_JEWELO_DATA_MODE: z.enum(["mock", "remote"]).default("mock"),
    NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalNonEmpty,
    NEXT_PUBLIC_POSTHOG_KEY: optionalNonEmpty,
    NEXT_PUBLIC_POSTHOG_HOST: optionalUrl,
    NEXT_PUBLIC_SENTRY_DSN: optionalUrl,
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
  SUPABASE_PUBLISHABLE_KEY: optionalNonEmpty,
  // Inngest is the durable job engine. The keys are optional in the schema so a
  // mock/dev checkout still validates; the dispatch path itself fails closed
  // with `not_configured` when the event key is absent.
  INNGEST_EVENT_KEY: optionalNonEmpty,
  INNGEST_SIGNING_KEY: optionalNonEmpty,
  // Set only when the app talks to a self-hosted Inngest server. Unset means
  // Inngest Cloud, which is the one-variable switch between the two.
  INNGEST_BASE_URL: optionalUrl,
  // Cron functions claim work from the shared outbox, so exactly one deployed
  // environment may register them. Local dev leaves this unset.
  INNGEST_CRON_ENABLED: optionalOf(z.enum(["0", "1"])),
  SHOPIFY_STORE_DOMAIN: optionalNonEmpty,
  SHOPIFY_CLIENT_ID: optionalNonEmpty,
  SHOPIFY_CLIENT_SECRET: optionalNonEmpty,
  SHOPIFY_WEBHOOK_SECRET: optionalNonEmpty,
  OPERATOR_EMAIL: optionalNonEmpty,
  OPERATOR_PASSPHRASE: optionalNonEmpty,
  OPERATOR_SESSION_SECRET: optionalNonEmpty,
});

export const jobsEnvSchema = trustedWebEnvSchema
  .extend({
    PROVIDER_MODE: z.enum(["mock", "real"]).default("mock"),
    FAL_KEY: optionalNonEmpty,
    OPENAI_API_KEY: optionalNonEmpty,
    OPENAI_IMAGE_MODEL: z
      .literal("gpt-image-2-2026-04-21")
      .default("gpt-image-2-2026-04-21"),
    OPENAI_VERIFIER_MODEL: nonEmpty.default("gpt-5.6-luna"),
    OPENAI_STILL_CONCURRENCY_LIMIT: z.coerce
      .number()
      .int()
      .min(1)
      .max(32)
      .default(2),
    FAL_VIDEO_CONCURRENCY_LIMIT: z.coerce
      .number()
      .int()
      .min(1)
      .max(32)
      .default(2),
    OPENAI_STILL_ESTIMATED_COST_CENTS: z.coerce
      .number()
      .int()
      .min(1)
      .default(20),
    FAL_VIDEO_ESTIMATED_COST_CENTS: z.coerce.number().int().min(1).default(40),
    // Motion is out of scope for the launch, so it is off unless a deployment
    // opts in. Off means no fal video task is ever auto-requested and fal
    // credentials are not required to run the studio in real provider mode.
    VIDEO_ENABLED: z
      .preprocess(blankToUndefined, z.enum(["0", "1"]).default("0"))
      .transform((value) => value === "1"),
    // P1-6. Which pipeline release a run pins its identity artifacts and tasks
    // to. It used to be a literal in `presentation.ts`, so bumping the release
    // meant editing business code. The default is the release the migration in
    // `supabase/migrations/20260908120000_pipeline_release_v2.sql` marks
    // active.
    PIPELINE_RELEASE_ID: z.preprocess(
      blankToUndefined,
      nonEmpty.default("caleums-final-media-v2"),
    ),
    // P1-5. Jump rings are on for every pendant; a construction that carries
    // its own suspension (a frame, a rail) can opt out by naming itself here.
    // Comma separated construction ids, empty by default, so the shipped
    // behaviour is rings on everywhere. Ring-free stays empty on staging until
    // P3-7 stops the prompts promising exactly two rings (P1-5a).
    IDENTITY_RINGLESS_CONSTRUCTIONS: z
      .preprocess(blankToUndefined, z.string().default(""))
      .transform((value, context) => {
        const ids = value
          .split(",")
          .map((entry) => entry.trim().toLowerCase())
          .filter((entry) => entry.length > 0);
        for (const id of ids)
          if (!IDENTITY_CONSTRUCTION_ID.test(id))
            context.addIssue({
              code: "custom",
              message: `IDENTITY_RINGLESS_CONSTRUCTIONS: "${id}" is not a construction id (lower-case words joined by hyphens, for example framed-minimal)`,
            });
        return new Set(ids) as ReadonlySet<string>;
      }),
    // P1-5a / adversarial finding 6. The published prompts still promise the
    // model exactly two jump rings, so a ring-free construction would ship a
    // stencil the prompt contradicts. The set may only be non-empty once P3-7
    // has rewritten those prompts and the deployment says so with this flag.
    IDENTITY_RINGLESS_PROMPTS_READY: z
      .preprocess(blankToUndefined, z.enum(["0", "1"]).default("0"))
      .transform((value) => value === "1"),
  })
  .superRefine((value, context) => {
    if (
      value.IDENTITY_RINGLESS_CONSTRUCTIONS.size > 0 &&
      !value.IDENTITY_RINGLESS_PROMPTS_READY
    )
      context.addIssue({
        code: "custom",
        path: ["IDENTITY_RINGLESS_CONSTRUCTIONS"],
        message:
          "IDENTITY_RINGLESS_CONSTRUCTIONS must stay empty until the prompts stop promising two jump rings (P3-7); set IDENTITY_RINGLESS_PROMPTS_READY=1 once P3-7 has shipped",
      });
    if (value.PROVIDER_MODE !== "real") return;
    if (!value.OPENAI_API_KEY)
      context.addIssue({
        code: "custom",
        path: ["OPENAI_API_KEY"],
        message: "OPENAI_API_KEY is required in real provider mode",
      });
    // fal only carries video, so it is required exactly when video is on.
    if (value.VIDEO_ENABLED && !value.FAL_KEY)
      context.addIssue({
        code: "custom",
        path: ["FAL_KEY"],
        message:
          "FAL_KEY is required in real provider mode when VIDEO_ENABLED=1",
      });
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
