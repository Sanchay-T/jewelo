/**
 * P7-5 / DS-9. The browser half, started before the app hydrates.
 *
 * Next runs this module first on the client. It asks
 * `@jewelo/observability/client` to start error tracking and journey
 * analytics; with `NEXT_PUBLIC_SENTRY_DSN` and `NEXT_PUBLIC_POSTHOG_KEY` empty
 * - which is every deployment until the accounts exist - neither SDK is
 * imported, so the shopper downloads no vendor bytes and the page opens no
 * third-party connection.
 */

import { initBrowserObservability } from "@jewelo/observability/client";

void initBrowserObservability();
