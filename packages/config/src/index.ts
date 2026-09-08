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

/**
 * P2-2. Every number the photograph mask and the stencil registration use.
 *
 * They live here, not as literals in `apps/jobs/src/photo-mask.ts`, because
 * each one was measured on the image lab corpus
 * (`docs/goals/overnight-launch/ledger.jsonl`) and a later session has to be
 * able to re-measure it without editing business code. Each field carries a
 * schema floor so it cannot be tuned to nothing from a deployment console: a
 * mask whose hysteresis ratio is 0 is a mask that accepts every pixel, and a
 * registration whose bounds are infinite never reports `registration_failed`.
 *
 * The contact sheet script (`apps/jobs/scripts/mask-contact-sheet.mts`) parses
 * this block on its own with `parsePhotoMaskEnv`, so measuring the corpus does
 * not require Supabase credentials; `jobsEnvSchema` carries the same fields so
 * the deployed verifier reads exactly the same validated values.
 */
const photoMaskFields = {
  // The mask runs on a downscaled copy. At 384 px on the long side the lab's
  // 1920 px packshots keep a measured thin feature of 4 to 8 px, which is what
  // the close radius is sized against; halving the working width halves that
  // and the close can then no longer be smaller than the feature it must not
  // swallow.
  PHOTO_MASK_WORK_WIDTH: z.coerce.number().int().min(192).max(1536).default(384),
  // The gradient magnitude percentile that seeds the hysteresis, taken over
  // the gradient's own distribution rather than an absolute number. Measured,
  // not Otsu: a single Otsu cut on this corpus shatters the gradient into 84
  // to 4,263 components (phase 2 plan review, B1). Swept over the corpus at
  // 0.85, 0.88, 0.90, 0.92 and 0.94; 0.88 gave the highest floor on the studio
  // passes (p05 0.29 against 0.25 at 0.90 and 0.21 at 0.92).
  PHOTO_MASK_GRADIENT_HIGH_PERCENTILE: z.coerce
    .number()
    .min(0.5)
    .max(0.999)
    .default(0.88),
  // Weak edges are kept when they touch a strong one. Canny's classic 2:1
  // band. Swept at 0.4, 0.5, 0.55, 0.6 and 0.75 over the corpus: 0.4 scores a
  // hair higher (p05 0.29 against 0.26) but lets the soft drop shadow under
  // `classical-en-a1` grow into the mask as a solid band, and 0.75 breaks the
  // outline on the low-contrast rows. 0.5 is the value where no mask the lead
  // opens has a shadow in it and the registration failure count is at its
  // minimum of 9.
  PHOTO_MASK_HYSTERESIS_LOW_RATIO: z.coerce
    .number()
    .min(0.05)
    .max(0.95)
    .default(0.5),
  // The first close, before any stroke width is known, as a fraction of the
  // working width. It only has to seal the one or two pixel breaks the
  // hysteresis leaves; the second pass replaces it with the measured radius.
  PHOTO_MASK_SEED_CLOSE_FRACTION: z.coerce
    .number()
    .min(0.001)
    .max(0.05)
    .default(0.003),
  // Which percentile of the bounded ink runs counts as "the stroke". Not the
  // median and not the mode: on a Playfair name both of those land on the
  // stem, about 15 px on a 384 px working copy, and half a stem closes the
  // counters of `A`, `s` and `m` into one blob (measured, `classical-en-a1`).
  // The tenth percentile lands on the hairline, which is the thinnest feature
  // the close must not swallow.
  PHOTO_MASK_STROKE_PERCENTILE: z.coerce
    .number()
    .min(0.01)
    .max(0.9)
    .default(0.1),
  // The measured close radius is this many stroke widths. Below one half a
  // hairline the outline stays broken; much above it the close swallows the
  // counters of `a`, `s` and `o`, which are the holes the ring gate reads.
  PHOTO_MASK_CLOSE_STROKE_FACTOR: z.coerce
    .number()
    .min(0.1)
    .max(2)
    .default(0.5),
  // A ceiling on that radius as a fraction of the working width, so a stroke
  // width measured on a blown-out image cannot close the whole frame.
  PHOTO_MASK_CLOSE_RADIUS_MAX_FRACTION: z.coerce
    .number()
    .min(0.005)
    .max(0.1)
    .default(0.01),
  // Components smaller than this fraction of the frame are speckle. It is not
  // an opening: an opening at 1.5% of the width emptied two of the 49 passing
  // masks outright and is wider than a Playfair hairline (B1). Dropping a
  // whole component that covers under 0.05% of the frame removes dust without
  // thinning anything that survives.
  PHOTO_MASK_MIN_COMPONENT_FRACTION: z.coerce
    .number()
    .min(0.00001)
    .max(0.05)
    .default(0.0005),
  // How close a region's mean colour has to be to the measured background for
  // that region to be a hole rather than metal, as a mean absolute RGB
  // distance in 0-255. This is a region decision taken after the edges have
  // segmented the frame, not a global colour cut: the reference is the
  // background the frame border actually has, and it is re-measured per image.
  // Measured on the lab packshots: polished gold sits about 90 from the
  // seamless cream backdrop on this scale and a soft drop shadow sits about
  // 15. Swept at 20, 25, 30 and 40 over the corpus: at 20 the shadow under
  // `classical-en-a1` is classified as metal and joins the piece as a solid
  // band, and 25 gives the highest floor on the studio passes (min 0.276
  // against 0.250 at 30 and 0.252 at 40).
  PHOTO_MASK_BACKGROUND_TOLERANCE: z.coerce
    .number()
    .min(1)
    .max(128)
    .default(25),
  // Registration bounds. A similarity transform outside any of these is
  // reported as `registration_failed`, never as a low IoU: the two mean
  // different things and only one of them is evidence about the pendant.
  PHOTO_REGISTRATION_SCALE_MIN: z.coerce.number().min(0.05).max(1).default(0.25),
  PHOTO_REGISTRATION_SCALE_MAX: z.coerce.number().min(1).max(20).default(4),
  PHOTO_REGISTRATION_ROTATION_MAX_DEGREES: z.coerce
    .number()
    .min(0)
    .max(180)
    .default(30),
  // Translation bound as a fraction of the working width, measured from the
  // frame centre. The lab packshots are centred; a pendant whose centroid sits
  // more than a third of the frame from the centre is not the piece the
  // stencil describes.
  PHOTO_REGISTRATION_TRANSLATION_MAX_FRACTION: z.coerce
    .number()
    .min(0.05)
    .max(1)
    .default(0.35),
  // The coarse grid the multi-start search is triaged on. Moments alone put
  // the stencil in the wrong place on these packshots because the chain is in
  // the photo mask and not in the stencil, which inflates the area ratio; a
  // single descent from that start stalled at IoU 0.30 on `classical-en-a1`.
  // So several scale and rotation starts are scored cheaply here and only the
  // winner is refined at the full score width.
  PHOTO_REGISTRATION_COARSE_WIDTH: z.coerce
    .number()
    .int()
    .min(48)
    .max(512)
    .default(96),
  // How many geometric scale starts, spread over the span below around the
  // moment estimate. 5 starts at span 1.6 cover 0.63x to 1.6x of it.
  PHOTO_REGISTRATION_SCALE_STARTS: z.coerce
    .number()
    .int()
    .min(1)
    .max(15)
    .default(5),
  PHOTO_REGISTRATION_SCALE_SPAN: z.coerce
    .number()
    .min(1)
    .max(4)
    .default(1.6),
  // Coordinate-descent rounds; each round halves the step in all four
  // parameters. Eight rounds take the scale step from 12% to 0.09%.
  PHOTO_REGISTRATION_REFINE_ROUNDS: z.coerce
    .number()
    .int()
    .min(1)
    .max(32)
    .default(8),
  // The grid the IoU is scored on. Independent of the mask working width so a
  // finer mask does not make the search quadratically slower.
  PHOTO_REGISTRATION_SCORE_WIDTH: z.coerce
    .number()
    .int()
    .min(96)
    .max(1024)
    .default(256),
} as const;

export const photoMaskEnvSchema = z.object(photoMaskFields);
export type PhotoMaskConfig = z.infer<typeof photoMaskEnvSchema>;

export function parsePhotoMaskEnv(
  input: Record<string, string | undefined>,
): PhotoMaskConfig {
  return photoMaskEnvSchema.parse(input);
}

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
    ...photoMaskFields,
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

/**
 * The provider concurrency limit on its own, so a process that cannot supply
 * the whole jobs environment can still validate one limit against the same
 * rule. `jobsEnvSchema` requires the Supabase service-role pair, which the
 * Next.js build does not have, and `apps/web/src/inngest/functions.ts` reads
 * its queue limits while the module graph is being compiled. Same bounds and
 * same default (2) as `OPENAI_STILL_CONCURRENCY_LIMIT` and
 * `FAL_VIDEO_CONCURRENCY_LIMIT` above; a blank string is read as unset rather
 * than as zero, because an empty deploy variable must not take a server down.
 */
export const concurrencyLimitSchema = z.preprocess(
  blankToUndefined,
  z.coerce.number().int().min(1).max(32).default(2),
);

/* ------------------------------------------------------------------------- */
/* Web request-guard configuration.                                           */
/*                                                                            */
/* The numbers the anonymous-facing routes throttle on. They are parsed here   */
/* rather than written as literals in a route so the bounds are stated once,   */
/* validated, and visible next to the rest of the deployment contract.         */
/* ------------------------------------------------------------------------- */

const positiveInt = z.number().int().positive();

export const webGuardLimitsSchema = z.object({
  /** Hard ceiling on entries in any one in-memory guard map. */
  guardMaxEntries: positiveInt.max(100_000),
  /** Age at which a guard entry is swept even if the source stays quiet. */
  guardEntryTtlMs: positiveInt,
  /** Failures from one source before the backoff starts. */
  failureThreshold: positiveInt,
  /** First backoff, doubled on every further failure. */
  failureBackoffBaseMs: positiveInt,
  /** Ceiling on the doubled backoff, and the age bound of the failure map. */
  failureBackoffMaxMs: positiveInt,
  anonymousSignupsPerWindow: positiveInt,
  anonymousSignupWindowMs: positiveInt,
  transliterateRequestsPerWindow: positiveInt,
  transliterateWindowMs: positiveInt,
  transliterateCacheMaxEntries: positiveInt.max(100_000),
  transliterateCacheTtlMs: positiveInt,
});
export type WebGuardLimits = z.infer<typeof webGuardLimitsSchema>;

export const webGuardLimits: WebGuardLimits = webGuardLimitsSchema.parse({
  guardMaxEntries: 5_000,
  guardEntryTtlMs: 10 * 60_000,
  failureThreshold: 5,
  failureBackoffBaseMs: 2_000,
  failureBackoffMaxMs: 15 * 60_000,
  anonymousSignupsPerWindow: 10,
  anonymousSignupWindowMs: 60_000,
  transliterateRequestsPerWindow: 20,
  transliterateWindowMs: 60_000,
  transliterateCacheMaxEntries: 500,
  transliterateCacheTtlMs: 60 * 60_000,
});

export const webGuardEnvSchema = z.object({
  /** Opt-in to the development operator shortcut. Never set in production. */
  OPERATOR_MOCK_AUTH: optionalOf(z.enum(["0", "1"])),
  /** Presented as `x-readiness-token` by a deploy probe to read the readiness
   * dependency detail without an operator session. */
  READINESS_PROBE_TOKEN: optionalNonEmpty,
});
