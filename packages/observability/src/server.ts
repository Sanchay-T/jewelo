/**
 * P7-5 / DS-9. Server-side error tracking, behind `SENTRY_DSN`.
 *
 * Everything here is a no-op until the shop has a Sentry project and its DSN
 * is in the environment. That is not a flag that has to be remembered: the
 * only reference to `@sentry/nextjs` in this file is a dynamic `import()`
 * inside a DSN check, so an unconfigured deployment never loads vendor code,
 * never starts an integration, and never opens a connection to sentry.io.
 *
 * `reportError` is deliberately fire-and-forget. A shopper's 500 must be
 * answered at the same speed whether or not the shop happens to have error
 * tracking that day, so the report is queued and the response is written
 * immediately; the SDK's own transport flushes it.
 */

import { observabilityLimits } from "@jewelo/config/observability";

import { configured, type ErrorContext } from "./index";

// Type-only import: erased at compile time, so this file still contains no
// vendor module reference that a bundler could pull in eagerly.
import type * as SentryNext from "@sentry/nextjs";

type SentryModule = typeof SentryNext;

let sentry: SentryModule | undefined;
let starting: Promise<SentryModule | undefined> | undefined;

/** The DSN, or undefined when this deployment has no Sentry project. */
function serverDsn(): string | undefined {
  const dsn = process.env.SENTRY_DSN;
  return configured(dsn) ? dsn.trim() : undefined;
}

/**
 * Which deployment a report came from. `JEWELO_DEPLOY_TARGET` is the name the
 * deploy scripts already use for staging and production; `NODE_ENV` is the
 * honest fallback for a laptop.
 */
function environmentName(): string {
  const declared = process.env.JEWELO_DEPLOY_TARGET;
  return configured(declared) ? declared.trim() : (process.env.NODE_ENV ?? "development");
}

/**
 * Strip anything a shopper could have typed before the event leaves the
 * process. Sentry's own `sendDefaultPii` is off, which already excludes
 * headers, cookies and bodies; this removes the two places a name could still
 * arrive - a query string and a cookie header attached by an integration.
 */
function scrub<T extends { request?: unknown }>(event: T): T {
  const request = event.request as
    | { query_string?: unknown; cookies?: unknown; data?: unknown; headers?: Record<string, unknown> }
    | undefined;
  if (request) {
    delete request.query_string;
    delete request.cookies;
    delete request.data;
    if (request.headers) delete request.headers.cookie;
  }
  return event;
}

/**
 * Load and initialise the SDK once, or resolve to nothing when there is no
 * DSN. Concurrent callers share the one promise so a burst of failures cannot
 * initialise the SDK twice.
 */
async function client(): Promise<SentryModule | undefined> {
  if (sentry) return sentry;
  const dsn = serverDsn();
  if (!dsn) return undefined;
  starting ??= (async () => {
    const module = await import("@sentry/nextjs");
    module.init({
      dsn,
      environment: environmentName(),
      tracesSampleRate: observabilityLimits.tracesSampleRate,
      sampleRate: observabilityLimits.errorSampleRate,
      maxBreadcrumbs: observabilityLimits.maxBreadcrumbs,
      sendDefaultPii: false,
      beforeSend: (event) => scrub(event),
      // Security review 2 H-1: the SDK turns every `console.*` call into a
      // breadcrumb attached to the next error, so one job log line naming a
      // shopper would leave the process the day a DSN is set. Console
      // breadcrumbs are dropped; the request and navigation ones stay.
      beforeBreadcrumb: (breadcrumb) =>
        breadcrumb.category === "console" ? null : breadcrumb,
    });
    sentry = module;
    return module;
  })();
  return starting;
}

/**
 * Called once per server runtime from `apps/web/src/instrumentation.ts`.
 * Returns whether error tracking is on, so a caller can log the fact rather
 * than guess at it.
 */
export async function initServerObservability(): Promise<boolean> {
  return (await client()) !== undefined;
}

/**
 * Report a server-side failure. Never throws and never awaits the network:
 * an error tracker that can fail a request is worse than no error tracker.
 */
export function reportError(error: unknown, context: ErrorContext = {}): void {
  if (!serverDsn()) return;
  void client()
    .then((module) => {
      module?.captureException(error, { tags: { ...context } });
    })
    .catch(() => {
      // An error tracker that cannot report is not a customer-visible fault.
    });
}

/**
 * Give in-flight reports a bounded moment to leave before the process ends.
 * The bound is validated configuration, not a literal, and a failure to flush
 * is not an error anyone should see.
 */
export async function flushReports(): Promise<void> {
  if (!serverDsn()) return;
  const module = await client().catch(() => undefined);
  await module?.flush(observabilityLimits.flushTimeoutMs).catch(() => false);
}

/**
 * The Next.js `onRequestError` hook, re-exported through this port so
 * `instrumentation.ts` never imports the vendor SDK. Same fire-and-forget
 * rule: a request that already failed must not also wait on Sentry.
 */
export function reportRequestError(
  error: unknown,
  request: { path?: string },
  context: { routerKind?: string; routePath?: string; routeType?: string },
): void {
  reportError(error, {
    route: context.routePath ?? request.path,
    code: context.routeType,
  });
}
