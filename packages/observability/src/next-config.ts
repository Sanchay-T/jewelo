/**
 * P7-5 / DS-9. Source maps for the error tracker, and the connect origins the
 * Content-Security-Policy has to allow once an account exists.
 *
 * The Sentry build plugin exists for one reason: to upload source maps so a
 * stack trace names a function instead of a minified letter. It can only do
 * that with an auth token, an org and a project, so it is applied exactly when
 * all three are present. With none of them - which is every deployment until
 * Sanchay creates the account - the app's own Next config is returned
 * untouched and the build is byte-for-byte the build it was before this task.
 *
 * `SENTRY_AUTH_TOKEN` is a build-time credential and is never shipped to the
 * running app: it is not in `scripts/digitalocean/env-contract.mjs`.
 */

import { configured } from "./index";

/** Loosely typed on purpose: this package must not depend on Next's types. */
type NextConfigLike = Record<string, unknown>;

/**
 * The origins the browser must be allowed to talk to once each vendor is
 * configured, for `connect-src`. Empty when nothing is configured, which is
 * why the shipped policy is unchanged today.
 */
export function observabilityConnectOrigins(
  env: Record<string, string | undefined> = process.env,
): string[] {
  const origins: string[] = [];
  for (const value of [env.NEXT_PUBLIC_SENTRY_DSN, env.NEXT_PUBLIC_POSTHOG_HOST]) {
    if (!configured(value)) continue;
    try {
      origins.push(new URL(value.trim()).origin);
    } catch {
      // An unparseable value is the config schema's failure to report, not
      // this function's: it must never widen the policy with garbage.
    }
  }
  return [...new Set(origins)];
}

/** True when the three values the source map upload needs are all present. */
function sourceMapUploadConfigured(
  env: Record<string, string | undefined>,
): boolean {
  return (
    configured(env.SENTRY_AUTH_TOKEN) &&
    configured(env.SENTRY_ORG) &&
    configured(env.SENTRY_PROJECT)
  );
}

/**
 * Wrap the app's Next config for source map upload, or return it unchanged.
 * `await`ed by `next.config.ts`, so the vendor plugin is imported only on the
 * builds that actually use it.
 */
export async function withObservabilityConfig<T extends NextConfigLike>(
  config: T,
  env: Record<string, string | undefined> = process.env,
): Promise<T> {
  if (!sourceMapUploadConfigured(env)) return config;
  const { withSentryConfig } = await import("@sentry/nextjs");
  return withSentryConfig(config, {
    org: env.SENTRY_ORG,
    project: env.SENTRY_PROJECT,
    authToken: env.SENTRY_AUTH_TOKEN,
    silent: true,
    // The uploaded maps are for Sentry, not for a visitor with dev tools.
    sourcemaps: { deleteSourcemapsAfterUpload: true },
  }) as T;
}
