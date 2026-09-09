export * from "./load-env";
export * from "./observability";
export * from "./sellable";
import {
  sellableArabicLetteringSchema,
  sellableConstructionsSchema,
  sellableEnglishLetteringSchema,
} from "./sellable";
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
  PHOTO_MASK_WORK_WIDTH: z.coerce
    .number()
    .int()
    .min(192)
    .max(1536)
    .default(384),
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
  PHOTO_REGISTRATION_SCALE_MIN: z.coerce
    .number()
    .min(0.05)
    .max(1)
    .default(0.25),
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
  PHOTO_REGISTRATION_SCALE_SPAN: z.coerce.number().min(1).max(4).default(1.6),
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
    // M1 / D-022. Which looks the shop sells, validated against the contract's
    // own option lists in `./sellable`. Listed here so a bad entry fails the
    // build (`next.config.ts` calls `parseBrowserEnv`) rather than the page.
    NEXT_PUBLIC_SELLABLE_CONSTRUCTIONS: sellableConstructionsSchema,
    NEXT_PUBLIC_SELLABLE_ENGLISH_LETTERING: sellableEnglishLetteringSchema,
    NEXT_PUBLIC_SELLABLE_ARABIC_LETTERING: sellableArabicLetteringSchema,
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

/**
 * P7-3 / DS-8. Telling the shop a request arrived.
 *
 * `NOTIFICATION_TRANSPORT` is the whole switch: `log` records the message in the
 * job log and sends nothing, `smtp` submits it to a mail server. The default is
 * `log`, because the Supabase project has no custom SMTP host configured
 * (checked through the Management API on 9 September 2026: every `smtp_*` auth
 * setting is null) and the shop has no sending account yet. A deployment that
 * gains one flips one variable.
 *
 * The SMTP keys are optional in the schema and required by
 * `assertNotificationConfigured` exactly when the transport is `smtp`, so a mock
 * checkout still validates and a deployment cannot select `smtp` with nothing to
 * send through.
 */
const notificationFields = {
  NOTIFICATION_TRANSPORT: z.preprocess(
    blankToUndefined,
    z.enum(["log", "smtp"]).default("log"),
  ),
  /** The shop's address. Without it nothing is composed and nothing is sent. */
  NOTIFICATION_TO: optionalOf(z.string().min(3).max(320)),
  NOTIFICATION_FROM: optionalOf(z.string().min(3).max(320)),
  NOTIFICATION_SMTP_HOST: optionalOf(z.string().min(1).max(253)),
  NOTIFICATION_SMTP_PORT: z.preprocess(
    blankToUndefined,
    z.coerce.number().int().min(1).max(65535).default(587),
  ),
  /**
   * `starttls` is submission on 587; `implicit-tls` is the wrapped connection on
   * 465. Named rather than inferred from the port, because a host that listens
   * for implicit TLS on another port would otherwise be undeployable.
   */
  NOTIFICATION_SMTP_SECURITY: z.preprocess(
    blankToUndefined,
    z.enum(["starttls", "implicit-tls"]).default("starttls"),
  ),
  NOTIFICATION_SMTP_USER: optionalOf(z.string().min(1).max(320)),
  NOTIFICATION_SMTP_PASSWORD: optionalOf(z.string().min(1).max(512)),
  /** One notification must never hold a job step open longer than this. */
  NOTIFICATION_SMTP_TIMEOUT_MS: z.preprocess(
    blankToUndefined,
    z.coerce.number().int().min(1_000).max(120_000).default(15_000),
  ),
} as const;

/** The keys the `smtp` transport cannot run without. */
const NOTIFICATION_SMTP_REQUIRED = [
  "NOTIFICATION_TO",
  "NOTIFICATION_FROM",
  "NOTIFICATION_SMTP_HOST",
  "NOTIFICATION_SMTP_USER",
  "NOTIFICATION_SMTP_PASSWORD",
] as const;

/**
 * One implementation of "this transport is deployable", called from both
 * `notificationEnvSchema` and `jobsEnvSchema`, so the sender factory and the
 * deployed jobs environment can never disagree about it.
 */
function assertNotificationConfigured(
  value: Record<string, unknown>,
  context: z.RefinementCtx,
): void {
  if (value.NOTIFICATION_TRANSPORT !== "smtp") return;
  for (const key of NOTIFICATION_SMTP_REQUIRED)
    if (!value[key])
      context.addIssue({
        code: "custom",
        path: [key],
        message: `${key} is required when NOTIFICATION_TRANSPORT=smtp`,
      });
}

export const notificationEnvSchema = z
  .object(notificationFields)
  .superRefine(assertNotificationConfigured);
export type NotificationConfig = z.infer<typeof notificationEnvSchema>;

/**
 * The notification block on its own, so a process that cannot supply the whole
 * jobs environment (the Next.js build has no service-role pair) can still build
 * a sender from validated values. Same fields and same rule as `jobsEnvSchema`.
 */
export function parseNotificationEnv(
  input: Record<string, string | undefined>,
): NotificationConfig {
  return notificationEnvSchema.parse(input);
}

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
  // P7-5 / DS-9. Server-side error tracking. Optional and empty by default:
  // the Sentry account does not exist yet, and with no DSN
  // `@jewelo/observability` never imports the SDK, so nothing initialises and
  // no request leaves the box. The browser DSN is its own public key in
  // `browserEnvSchema`; this one must never be exposed.
  SENTRY_DSN: optionalUrl,
  ...notificationFields,
});

/* ------------------------------------------------------------------------- */
/* Storyline review 1 M2. What a real-mode worker refuses to spend against.    */
/*                                                                            */
/* The day's money is governed by `public.runtime_policy`, which an operator   */
/* can change from the database at any time; P5-1 tightened it and it was      */
/* found back at 6000 cents and 100 attempts, which is a `PROVIDER_MODE=real`  */
/* flip away from four hundred cents a run against a six thousand cent ceiling */
/* with a hundred paid attempts per task. These two numbers are the deployment */
/* saying what it will tolerate in that row before it spends anything; the     */
/* worker reads the row and refuses pre-spend when the row is looser. Mock     */
/* mode never reads them - there is nothing to protect.                        */
/*                                                                            */
/* They are ceilings on the policy, not the policy: raising one here does not  */
/* let a run spend more, it only lets the database's own number be that high.  */
/* ------------------------------------------------------------------------- */
const realModeSpendCeilingFields = {
  /**
   * The largest `runtime_policy.global_max_reserved_spend_cents` a real-mode
   * worker will spend against. 800 cents is two four-view runs at the shipped
   * 20-cent still estimate plus room for one retry; more than that is a day
   * nobody signed off.
   */
  REAL_MODE_MAX_RESERVED_SPEND_CENTS: z.preprocess(
    blankToUndefined,
    z.coerce.number().int().min(1).max(100_000).default(800),
  ),
  /**
   * The largest `runtime_policy.provider_attempt_budget` a real-mode worker
   * will spend against. Matches `pipelineLimits.providerAttemptBudget`, the
   * value the column is meant to hold.
   */
  REAL_MODE_MAX_ATTEMPT_BUDGET: z.preprocess(
    blankToUndefined,
    z.coerce.number().int().min(1).max(10).default(3),
  ),
} as const;

export const realModeSpendCeilingSchema = z.object(realModeSpendCeilingFields);
export type RealModeSpendCeilings = z.infer<typeof realModeSpendCeilingSchema>;

/** The two ceilings alone, for a worker that has no reason to parse the rest. */
export function realModeSpendCeilings(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): RealModeSpendCeilings {
  return realModeSpendCeilingSchema.parse(env);
}

export const jobsEnvSchema = trustedWebEnvSchema
  .extend({
    ...photoMaskFields,
    ...realModeSpendCeilingFields,
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
    //
    // P2-2b (D-021): this is the only construction setting an operator may
    // touch. What a construction *is* - the frame's rail thickness and inset,
    // the rails' gap and overhang, where the rings sit on them - is the drawing
    // and lives in `packages/identity/src/shaping.ts`, inside the fingerprint;
    // a pendant whose geometry could be retuned from a deployment console is a
    // pendant nobody verified. Naming `framed-minimal` here now means a frame
    // with no jump rings at all, not a bare name.
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
    assertNotificationConfigured(value, context);
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

/* ------------------------------------------------------------------------- */
/* The new-request notification sweep.                                        */
/*                                                                            */
/* Storyline review 1, B3. The announcement used to happen in exactly one      */
/* place, the create path of `POST /api/preview-requests`, and the send there  */
/* is best effort: an Inngest outage, a replayed submission or a deployment    */
/* with no shop address left a captured request announced to nobody, and       */
/* nothing ever looked at it again (13 such rows live). The sweep is the       */
/* backstop: every two minutes it re-emits `preview-request/created` for the   */
/* rows that are still unannounced, with the same event id, so the             */
/* `notified_at` claim in the database keeps it exactly one message.           */
/* ------------------------------------------------------------------------- */

export const notificationSweepLimitsSchema = z.object({
  /**
   * Rows one tick may re-announce. The sweep runs every two minutes, so this is
   * also the recovery rate: 50 rows a tick clears any backlog a shop can
   * produce while keeping one tick's work bounded and its Inngest send small.
   */
  notificationSweepBatch: z.number().int().positive().max(500),
  /**
   * How old a row must be before the sweep touches it. The create path emits
   * its own event, and the notification function is allowed to retry; without a
   * floor the sweep would race a request that was captured a second ago and
   * make two attempts at the same claim for no gain.
   */
  notificationSweepMinAgeMs: z.number().int().positive().min(30_000),
});
export type NotificationSweepLimits = z.infer<
  typeof notificationSweepLimitsSchema
>;

export const notificationSweepLimits: NotificationSweepLimits =
  notificationSweepLimitsSchema.parse({
    notificationSweepBatch: 50,
    notificationSweepMinAgeMs: 60_000,
  });

/* ------------------------------------------------------------------------- */
/* Generation pipeline timing and budgets.                                    */
/*                                                                            */
/* Pipeline review 1, findings 2 and 10. Every one of these numbers used to be */
/* a literal in business code: the 180 s provider timeout in                   */
/* `packages/ai/src/studio.ts`, the stale window (two minutes then, derived    */
/* here now) and the sweeper                                                   */
/* limit in `apps/web/src/inngest/functions.ts`, the poll count and interval   */
/* in the same file, `expiresIn: 300` in four storage-signing call sites, and  */
/* the attempt budget 3 in `apps/jobs/src/presentation.ts` and in three SQL    */
/* functions. Two of them contradicted each other in production: the sweeper   */
/* declared a task stale after two minutes while the provider call was still   */
/* allowed to run for three, so a slow but successful generation was charged,  */
/* recovered, blocked and then could not transition back.                      */
/*                                                                            */
/* The stale window is therefore not a number anyone can set: it is derived as */
/* the executor's request cap plus a validated margin, and the cap is itself   */
/* derived as the image timeout plus the two vision timeouts plus the validated */
/* allowance for the local work around them, so the sweeper can never fire     */
/* while a dispatch this process started is still legally running.             */
/*                                                                            */
/* Fix-3 review M4: the cap is not enforced by the deployed runtime. App       */
/* Platform serves the app with a standalone `next start`, which has no        */
/* request-path consumer of `maxDuration`; that export is build metadata for a */
/* serverless host and a hosting hint here. What the cap actually governs is   */
/* this derivation - the stale window is the cap plus the margin - so the two  */
/* numbers stay one invariant. The bound a request really has in production is */
/* DigitalOcean's ingress timeout, recorded under "Request timeout at the      */
/* edge" in docs/DIGITALOCEAN-DEPLOYMENT.md.                                   */
/* ------------------------------------------------------------------------- */

export const pipelineLimitsSchema = z
  .object({
    /** Hard ceiling on one provider image request, aborted by the adapter. */
    providerRequestTimeoutMs: positiveInt.min(30_000).max(600_000),
    /**
     * Hard ceiling on one vision request, aborted by the adapter. Both vision
     * calls a still can make use it: `OpenAIStudioVerifier.verify` and
     * `OpenAINameReader.read` in `packages/ai/src/studio.ts`. A vision read
     * answers in seconds where an image edit takes minutes, so it is its own
     * number rather than the image timeout reused.
     */
    visionRequestTimeoutMs: positiveInt.min(10_000).max(300_000),
    /**
     * Grace added to the bounded provider calls to get the stale window. It
     * covers the work either side of those calls inside one dispatch - the
     * identity render, the reference and anchor downloads, the storage upload,
     * the database writes - so a task is only stale once no live dispatch
     * could still be working on it.
     */
    staleRecoveryMarginMs: positiveInt.min(30_000).max(600_000),
    /**
     * The unbounded local work one dispatch of a still does around its three
     * provider calls: the identity render, the reference, anchor and dependency
     * downloads, the upload of the finished still and the database writes.
     *
     * Fix-2 review M6. It used to be hidden inside `staleRecoveryMarginMs`,
     * which meant the executor's own request cap (`maxDuration` in
     * `apps/web/src/app/api/inngest/route.ts`) was set from nothing: at 300 s
     * the three provider timeouts alone filled the request, so on a host that
     * honours the cap the request was killed after the image had been paid for
     * and the task then sat in `verifying` for the whole margin. It is its own
     * number now, the cap is derived from it, and the stale window is derived
     * from the cap, so the sweeper still cannot fire while a dispatch this
     * process started is legally running.
     */
    localWorkAllowanceMs: positiveInt.min(10_000).max(600_000),
    /** `p_limit` for `recover_stale_generation_tasks`; the RPC caps it at 500. */
    staleRecoveryLimit: positiveInt.max(500),
    /** Poll attempts before a submitted video is declared timed out. */
    videoPollMaxAttempts: positiveInt.max(600),
    /** Sleep between two video polls, in whole seconds. */
    videoPollIntervalSeconds: positiveInt.max(300),
    /** Lifetime of a signed Supabase Storage URL handed to a provider. */
    signedUrlExpirySeconds: positiveInt.min(60).max(3_600),
    /**
     * How long before a signed URL expires the browser must ask for a new one.
     *
     * Fix-2 review minor 11: the atelier held every signed URL for a hard-coded
     * 240 000 ms while the server signed for `signedUrlExpirySeconds`, so
     * lowering the expiry would have left the browser showing URLs that had
     * already expired. The margin is validated here and `/api/state` publishes
     * the difference, so one number governs both sides.
     */
    signedUrlRefreshMarginSeconds: positiveInt.min(10).max(600),
    /**
     * The shortest hold a browser may fall back to, in whole seconds.
     *
     * Fix-3 review minor 8: a client that receives a payload without
     * `signedUrlRefreshAfterMs` - the only way to see one is an older
     * `/api/state` still answering during a rolling deploy - used to switch its
     * URL cache off, which restores the iOS Safari decode defect for the length
     * of the deploy. `/api/state` publishes this alongside the window, so the
     * fallback is a shorter hold rather than no hold. It is validated below to
     * be no longer than the window itself.
     */
    signedUrlRefreshFloorSeconds: positiveInt.min(5).max(120),
    /**
     * Paid attempts one task may make. The database is the authority - the
     * `runtime_policy.provider_attempt_budget` column, which every SQL gate
     * reads - and this is the value that column defaults to, used by the job
     * only when the policy row cannot be read.
     */
    providerAttemptBudget: positiveInt.max(10),
    /**
     * How long one process may reuse a `runtime_policy` read before asking the
     * database again.
     *
     * Storyline review 1 M2: the real-mode spend ceiling gate runs before every
     * dispatch, and a row read per task would put one extra round trip on the
     * pre-spend path of every still. A minute is short enough that tightening
     * the policy takes effect while the shop is still watching it, and long
     * enough that a burst of tasks reads it once.
     */
    policyCacheMs: positiveInt.min(1_000).max(600_000),
    /**
     * The largest JSON body an API route will read into memory.
     *
     * Security review 2 L-6: `readJson` used to buffer the whole body before
     * any schema saw it, so the only bound on a request to a route that reads
     * JSON was the platform's, and a validated shape was checked after the
     * bytes had already been paid for. Every body this app sends is a small
     * object - a specification, a command envelope, a note - so 64 KiB is
     * generous; the prompts route keeps its own tighter 32 KiB template bound.
     */
    requestBodyMaxBytes: positiveInt.min(4_096).max(1_048_576),
  })
  .transform((value) => ({
    ...value,
    /**
     * Derived, never configured: the longest one dispatch of a still may hold
     * its HTTP request, in whole seconds, and the value the executor route's
     * `maxDuration` must carry.
     *
     * A still makes three provider calls in sequence - the image edit
     * (`OpenAIStillAdapter.generate`), the still verification
     * (`OpenAIStudioVerifier.verify`) and the engraved-name read
     * (`OpenAINameReader.read`) - each aborted by its own timeout, plus the
     * local work `localWorkAllowanceMs` covers. Anything less is a cap that
     * kills a request the pipeline is still legally inside.
     */
    executorRequestCapSeconds: Math.ceil(
      (value.providerRequestTimeoutMs +
        2 * value.visionRequestTimeoutMs +
        value.localWorkAllowanceMs) /
        1_000,
    ),
  }))
  .transform((value) => ({
    ...value,
    /** The same cap in milliseconds; the route's literal is checked against it. */
    executorRequestCapMs: value.executorRequestCapSeconds * 1_000,
    /**
     * How long the browser may keep one signed asset URL: the lifetime the
     * signing call asks for, less the refresh margin. Published by
     * `/api/state`; the client never carries a number of its own.
     */
    signedUrlRefreshAfterMs:
      (value.signedUrlExpirySeconds - value.signedUrlRefreshMarginSeconds) *
      1_000,
    /** The same floor in milliseconds; published next to the window above. */
    signedUrlRefreshFloorMs: value.signedUrlRefreshFloorSeconds * 1_000,
    /**
     * Derived, never configured: see the note above.
     *
     * Fix-2 review M6. The window and the request cap are now one invariant:
     * the sweeper may only reclaim a task once no dispatch could still hold its
     * request, which is the cap plus the margin. Deriving it from the same
     * number the route is asserted against is what makes "the sweeper can never
     * fire while a provider call is still legally running" a proved property
     * rather than a coincidence of two independently written numbers.
     */
    staleRecoveryWindowMs:
      value.executorRequestCapSeconds * 1_000 + value.staleRecoveryMarginMs,
  }))
  // A floor longer than the window would make the degraded hold the longer of
  // the two, which is the direction that serves an expired URL.
  .refine(
    (value) => value.signedUrlRefreshFloorMs <= value.signedUrlRefreshAfterMs,
    {
      message:
        "signedUrlRefreshFloorSeconds must not exceed the published refresh window",
    },
  );
export type PipelineLimits = z.infer<typeof pipelineLimitsSchema>;

export const pipelineLimits: PipelineLimits = pipelineLimitsSchema.parse({
  providerRequestTimeoutMs: 180_000,
  visionRequestTimeoutMs: 60_000,
  staleRecoveryMarginMs: 120_000,
  localWorkAllowanceMs: 60_000,
  staleRecoveryLimit: 100,
  videoPollMaxAttempts: 60,
  videoPollIntervalSeconds: 10,
  signedUrlExpirySeconds: 300,
  signedUrlRefreshMarginSeconds: 60,
  // Matched by `SIGNED_URL_REFRESH_FLOOR_MS` in
  // `apps/web/src/features/atelier/previewPipeline.ts`, the assumption a client
  // makes about a server too old to publish this number at all.
  signedUrlRefreshFloorSeconds: 30,
  providerAttemptBudget: 3,
  policyCacheMs: 60_000,
  requestBodyMaxBytes: 65_536,
});

/* ------------------------------------------------------------------------- */
/* The header that carries the real client address.                           */
/*                                                                            */
/* Which header can be believed is a property of the host in front of the app, */
/* not of the code. DigitalOcean App Platform sets `do-connecting-ip` itself   */
/* and overwrites whatever a caller sent, so it is the default and the         */
/* deployed truth; behind any other proxy that header is caller-supplied text  */
/* and trusting it hands an attacker a free reset of every per-source guard.   */
/* Setting `TRUSTED_CLIENT_IP_HEADER` to the empty string means "no header is  */
/* trusted": fall back to the last `x-forwarded-for` hop, the one the proxy    */
/* itself appended.                                                           */
/* ------------------------------------------------------------------------- */

export const trustedClientIpHeaderSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
  z
    .string()
    .max(64)
    .regex(/^[a-z0-9_-]*$/u, "must be a header name, or empty to trust none")
    .default("do-connecting-ip"),
);

export function trustedClientIpHeader(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return trustedClientIpHeaderSchema.parse(env.TRUSTED_CLIENT_IP_HEADER);
}

/* ------------------------------------------------------------------------- */
/* The host this deployment answers to.                                       */
/*                                                                            */
/* Storyline review 1, CSRF minor: the operator routes compared the `Origin`  */
/* header with `x-forwarded-host`, and a caller who sends both sends both, so */
/* the check compared an attacker's value with the attacker's other value. A  */
/* deployment already declares its own address in `NEXT_PUBLIC_APP_URL`, and  */
/* that is a value only the deployment can set. Validated as a URL here so a  */
/* typo is a boot failure rather than a silent refusal of every mutation.     */
/* ------------------------------------------------------------------------- */

export const appHostSchema = z.preprocess(
  blankToUndefined,
  optionalOf(url).transform((value) => (value ? new URL(value).host : undefined)),
);

/** The host of `NEXT_PUBLIC_APP_URL`, or undefined when it is not configured. */
export function configuredAppHost(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): string | undefined {
  return appHostSchema.parse(env.NEXT_PUBLIC_APP_URL) as string | undefined;
}
