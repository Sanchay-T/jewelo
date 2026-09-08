"use client";

/**
 * P7-5 / DS-9. The browser half of the observability port.
 *
 * Two vendors, two credentials, and nothing at all without them:
 *
 *   `NEXT_PUBLIC_SENTRY_DSN`  - browser error reports
 *   `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST` - journey analytics
 *
 * Both SDKs are behind a dynamic `import()` inside a credential check, so a
 * shop with no accounts downloads no vendor bytes on the first paint and the
 * page opens no third-party connection. The variables are read as literal
 * `process.env.NEXT_PUBLIC_*` expressions because that is what Next inlines
 * into the browser bundle; a computed lookup would silently be undefined.
 *
 * What analytics may see is fixed by `JourneyEvent` and `JourneyProperties`:
 * a stage, a locale, a construction id, a design id. Autocapture is off, so
 * PostHog never reads the text of an input, and the shopper's name and contact
 * details never leave the device through this path.
 */

import { observabilityLimits } from "@jewelo/config/observability";

import {
  configured,
  type ErrorContext,
  type JourneyEvent,
  type JourneyProperties,
} from "./index";

// Type-only imports: erased at compile time, so naming the vendor types here
// does not put a vendor module in any bundle. The values still arrive through
// the dynamic `import()`s below, which is what keeps them out of a build that
// has no credentials.
import type * as SentryNext from "@sentry/nextjs";
import type * as PostHog from "posthog-js";

type SentryModule = typeof SentryNext;
type PostHogModule = typeof PostHog;

let sentry: SentryModule | undefined;
let posthog: PostHogModule["posthog"] | undefined;

function browserSentryDsn(): string | undefined {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  return configured(dsn) ? dsn.trim() : undefined;
}

/** Analytics needs both halves: a key without a host has nowhere to send. */
function posthogCredentials(): { key: string; host: string } | undefined {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  return configured(key) && configured(host)
    ? { key: key.trim(), host: host.trim() }
    : undefined;
}

function environmentName(): string {
  return process.env.NODE_ENV ?? "development";
}

/**
 * A URL with its query string and fragment removed. The studio keeps the
 * shopper's name in component state rather than in the address bar, but a
 * future link that carried one must not be able to turn an analytics event
 * into a record of a customer's name.
 */
function pathOnly(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value.split(/[?#]/u)[0];
  }
}

async function sentryClient(): Promise<SentryModule | undefined> {
  if (sentry) return sentry;
  const dsn = browserSentryDsn();
  if (!dsn) return undefined;
  const module = await import("@sentry/nextjs");
  module.init({
    dsn,
    environment: environmentName(),
    tracesSampleRate: observabilityLimits.tracesSampleRate,
    sampleRate: observabilityLimits.errorSampleRate,
    maxBreadcrumbs: observabilityLimits.maxBreadcrumbs,
    sendDefaultPii: false,
  });
  sentry = module;
  return module;
}

async function analyticsClient(): Promise<PostHogModule["posthog"] | undefined> {
  if (posthog) return posthog;
  const credentials = posthogCredentials();
  if (!credentials) return undefined;
  const module = await import("posthog-js");
  module.posthog.init(credentials.key, {
    api_host: credentials.host,
    // The shop asked for three journey events, not a recording of a customer
    // using a jewellery shop. Autocapture reads the text of what it captures,
    // so it is off; session replay is off; page views are off because the
    // journey is one client-rendered page and a view says nothing a stage
    // event does not.
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    disable_surveys: true,
    // No profile is created until someone is deliberately identified, which
    // this app never does: the shopper is anonymous to analytics.
    person_profiles: "identified_only",
    sanitize_properties: (properties) => ({
      ...properties,
      $current_url: pathOnly(properties.$current_url),
      $referrer: pathOnly(properties.$referrer),
    }),
  });
  posthog = module.posthog;
  return posthog;
}

/**
 * Called once, before hydration, from `apps/web/src/instrumentation-client.ts`.
 * With both credentials empty this resolves without importing anything.
 */
export async function initBrowserObservability(): Promise<void> {
  await Promise.all([
    sentryClient().catch(() => undefined),
    analyticsClient().catch(() => undefined),
  ]);
}

/** Report a browser-side failure. Never throws, never blocks the render. */
export function reportBrowserError(
  error: unknown,
  context: ErrorContext = {},
): void {
  if (!browserSentryDsn()) return;
  void sentryClient()
    .then((module) => {
      module?.captureException(error, { tags: { ...context } });
    })
    .catch(() => {
      // Nothing a shopper should ever be shown.
    });
}

/**
 * Record one step of the journey. The name is one of three, the properties are
 * ids and enumerated values, and with no PostHog key this returns without
 * loading anything.
 */
export function captureJourneyEvent(
  event: JourneyEvent,
  properties: JourneyProperties = {},
): void {
  if (!posthogCredentials()) return;
  void analyticsClient()
    .then((client) => {
      client?.capture(event, { ...properties });
    })
    .catch(() => {
      // Analytics is never allowed to interrupt the journey it measures.
    });
}
