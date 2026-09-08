import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "caleums_operator";
const SESSION_SECONDS = 8 * 60 * 60;
const MOCK_SESSION = "mock-development-session";

/**
 * The development shortcut that accepts any address with an `@` and four
 * characters. It is an explicit opt-in: `OPERATOR_MOCK_AUTH=1` has to be set as
 * well as the environment being non-production and non-remote, so a build that
 * merely forgets `NODE_ENV=production` cannot open the operator console.
 */
export function operatorMockMode() {
  return (
    process.env.OPERATOR_MOCK_AUTH === "1" &&
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_JEWELO_DATA_MODE !== "remote"
  );
}

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for operator access`);
  return value;
}

function equal(left: string, right: string) {
  const leftDigest = createHmac("sha256", "caleums-operator-compare")
    .update(left)
    .digest();
  const rightDigest = createHmac("sha256", "caleums-operator-compare")
    .update(right)
    .digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

function signature(expiresAt: string) {
  return createHmac("sha256", required("OPERATOR_SESSION_SECRET"))
    .update(expiresAt)
    .digest("base64url");
}

export function authenticateOperator(email: string, passphrase: string) {
  if (operatorMockMode()) return email.includes("@") && passphrase.length >= 4;
  return (
    equal(
      email.trim().toLowerCase(),
      required("OPERATOR_EMAIL").toLowerCase(),
    ) && equal(passphrase, required("OPERATOR_PASSPHRASE"))
  );
}

export function operatorSessionCookie() {
  if (operatorMockMode())
    return `${COOKIE_NAME}=${MOCK_SESSION}.${crypto.randomUUID()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}`;
  const expiresAt = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  return `${COOKIE_NAME}=${expiresAt}.${signature(expiresAt)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export function clearOperatorSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export function hasOperatorSession(request: Request) {
  const raw = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);
  if (!raw) return false;
  if (operatorMockMode() && raw.startsWith(`${MOCK_SESSION}.`)) return true;
  const [expiresAt, provided] = raw.split(".");
  if (!expiresAt || !provided || Number(expiresAt) <= Date.now() / 1000)
    return false;
  const expected = signature(expiresAt);
  return equal(provided, expected);
}

export function requireOperatorSession(request: Request) {
  if (!hasOperatorSession(request))
    throw new Response("Operator authentication required", { status: 401 });
}

/**
 * A browser page on another origin must not be able to drive an operator route
 * with the operator's own cookie.
 *
 * Security review 2 L-1: this used to be a private copy in the commands route
 * and another in the prompts route, so the two operator GETs that never got a
 * copy - `review-runs` and `preview-requests` - answered a cross-site read with
 * the queue and every shopper's contact detail in it. One helper, called by
 * every operator route, is the only version of this rule that cannot drift.
 *
 * `mutation` adds the `Origin` check: a request that changes something must
 * name this host, and a missing header is a refusal rather than a pass.
 */
export function assertSameOrigin(request: Request, mutation = false) {
  if (request.headers.get("sec-fetch-site") === "cross-site")
    throw new Response("Cross-site request rejected", { status: 403 });
  if (!mutation) return;
  const origin = request.headers.get("origin");
  const targetHost =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    new URL(request.url).host;
  const originHost = (() => {
    try {
      return origin ? new URL(origin).host : "";
    } catch {
      return "";
    }
  })();
  if (!originHost || originHost !== targetHost)
    throw new Response("Same-origin request required", { status: 403 });
}

export function operatorSessionScope(request: Request) {
  return (
    request.headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${COOKIE_NAME}=`))
      ?.slice(COOKIE_NAME.length + 1) ?? "missing"
  );
}
