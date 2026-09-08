/**
 * P7-5 / DS-9. What the error tracker and the analytics client are allowed to
 * do, in a module a browser can import.
 *
 * Its own file rather than a block in `index.ts` because that barrel re-exports
 * `load-env`, which reads `node:fs`: importing the barrel from the studio's
 * client bundle or from the Edge instrumentation is a build failure. This file
 * imports nothing but `zod`, so `@jewelo/config/observability` is safe in every
 * runtime, and `index.ts` re-exports it so existing server-side importers see
 * no difference.
 */

import { z } from "zod";

/* ------------------------------------------------------------------------- */
/* These are numbers, so they are validated configuration and not literals in */
/* `packages/observability`. They are constants rather than environment        */
/* variables because none of them is an environment's decision: the DSN and    */
/* the project key are (`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`,               */
/* `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`), and with those      */
/* empty none of this runs at all.                                            */
/* ------------------------------------------------------------------------- */

export const observabilityLimitsSchema = z.object({
  /**
   * Fraction of transactions traced. Zero: the shop is buying error reports,
   * not a performance product, and every traced transaction is billable
   * volume. Raising it is a deliberate edit here, not a console setting.
   */
  tracesSampleRate: z.number().min(0).max(1),
  /**
   * Fraction of errors sent. One: an error the shop never hears about is the
   * defect this task exists to close.
   */
  errorSampleRate: z.number().min(0).max(1),
  /**
   * How long a browser or server flush may hold the process before the report
   * is abandoned. A shopper's answer must never wait on the error tracker.
   */
  flushTimeoutMs: z.number().int().min(250).max(10_000),
  /** Breadcrumbs kept with a report. Enough to see the last few steps. */
  maxBreadcrumbs: z.number().int().min(0).max(100),
});
export type ObservabilityLimits = z.infer<typeof observabilityLimitsSchema>;

export const observabilityLimits: ObservabilityLimits =
  observabilityLimitsSchema.parse({
    tracesSampleRate: 0,
    errorSampleRate: 1,
    flushTimeoutMs: 2_000,
    maxBreadcrumbs: 20,
  });
