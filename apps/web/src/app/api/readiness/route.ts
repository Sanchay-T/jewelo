import { createHmac, timingSafeEqual } from "node:crypto";

import { trustedClientIpHeader } from "@jewelo/config";
import { hasOperatorSession } from "../../../lib/backend/operator-session";

/**
 * Who may read the dependency detail.
 *
 * The bare `status` is public - a load balancer needs it - but the dependency
 * block names the deployment's topology, so it is shown only to an operator
 * session or to a deploy probe presenting `READINESS_PROBE_TOKEN` in
 * `x-readiness-token`. The comparison is over digests so it is constant time
 * and length-independent.
 */
function digest(value: string) {
  return createHmac("sha256", "caleums-readiness-compare")
    .update(value)
    .digest();
}

function probeAuthorized(request: Request) {
  const expected = process.env.READINESS_PROBE_TOKEN;
  const presented = request.headers.get("x-readiness-token");
  if (!expected || !presented) return false;
  return timingSafeEqual(digest(presented), digest(expected));
}

/**
 * Readiness is bound to the two things a customer run cannot start without:
 * durable Supabase truth, and an Inngest job engine that will accept and
 * execute a dispatched event.
 */
export function GET(request: Request) {
  const eventKey = process.env.INNGEST_EVENT_KEY;
  const signingKey = process.env.INNGEST_SIGNING_KEY;
  const supabaseConfigured = Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  // Signature verification is on whenever a signing key exists and dev mode is
  // not forced. The self-hosted `inngest start` server rejects a prefixed key
  // and is configured with bare hex; Inngest Cloud issues `signkey-<env>-<hex>`,
  // which the SDK strips. Both are production keys.
  const devMode =
    process.env.INNGEST_DEV === "1" || process.env.INNGEST_DEV === "true";
  const keyEnvironment =
    !signingKey || devMode
      ? "dev"
      : signingKey.startsWith("signkey-branch-") ||
          signingKey.startsWith("signkey-test-")
        ? "branch"
        : "prod";
  const configured = Boolean(eventKey && signingKey);
  // Fix-3 review minor 9: `TRUSTED_CLIENT_IP_HEADER` is parsed at module scope
  // in `request-guard.ts`, which Next only evaluates on the first request to a
  // route that imports it, so a typo used to leave this probe green and 500 the
  // shopper's first guarded call. Readiness parses the same schema itself
  // rather than importing `request-guard.ts`: that module's import builds
  // process-wide guard state and throws on a bad value, and a probe that must
  // answer even when the app is misconfigured cannot take either. The value is
  // never reported, only whether it parses - it is host configuration.
  const trustedHeaderValid = (() => {
    try {
      trustedClientIpHeader();
      return true;
    } catch {
      return false;
    }
  })();
  const ready = supabaseConfigured && configured && trustedHeaderValid;

  // A readiness probe must answer, always. Both checks read configuration that
  // can be absent - `hasOperatorSession` throws when `OPERATOR_SESSION_SECRET`
  // is missing and a stale cookie is presented - and a load balancer asking
  // whether the app is up must never be told 500 by the authorization step.
  // Failing to prove the caller is an operator degrades to the public answer.
  const detailed = (() => {
    try {
      return hasOperatorSession(request) || probeAuthorized(request);
    } catch {
      return false;
    }
  })();
  if (!detailed)
    return Response.json(
      { status: ready ? "ready" : "not_ready" },
      { status: ready ? 200 : 503, headers: { "cache-control": "no-store" } },
    );

  return Response.json(
    {
      status: ready ? "ready" : "not_ready",
      dependencies: {
        supabase: supabaseConfigured ? "configured" : "missing",
        inngest: {
          configured,
          keyEnvironment,
          // Absent means Inngest Cloud; present means the self-hosted server.
          transport: process.env.INNGEST_BASE_URL ? "self_hosted" : "cloud",
          cronsRegistered: process.env.INNGEST_CRON_ENABLED === "1",
        },
        openai: process.env.OPENAI_API_KEY ? "configured" : "missing",
        trustedClientIpHeader: trustedHeaderValid ? "valid" : "invalid",
      },
    },
    {
      status: ready ? 200 : 503,
      headers: { "cache-control": "no-store" },
    },
  );
}
