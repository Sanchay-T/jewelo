/**
 * P7-5 / DS-9. Server-side error tracking, started once per runtime.
 *
 * Next calls `register` once when a server process boots and `onRequestError`
 * for every error it catches while rendering or serving a route, including the
 * ones a route handler never sees. Both go through `@jewelo/observability`, so
 * this app never imports an error tracking SDK.
 *
 * With `SENTRY_DSN` unset - which is every deployment until the shop has a
 * Sentry project - `initServerObservability` resolves false without importing
 * the vendor package, and `reportRequestError` returns immediately. Nothing is
 * loaded and nothing is sent.
 */

import { assertProductionProviderConfiguration } from "@jewelo/config";
import {
  initServerObservability,
  reportRequestError,
} from "@jewelo/observability/server";

export async function register(): Promise<void> {
  assertProductionProviderConfiguration();
  await initServerObservability();
}

export function onRequestError(
  error: unknown,
  request: { path?: string },
  context: { routerKind?: string; routePath?: string; routeType?: string },
): void {
  reportRequestError(error, request, context);
}
