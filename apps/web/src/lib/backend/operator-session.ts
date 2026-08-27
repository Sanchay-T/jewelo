import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "caleums_operator";
const SESSION_SECONDS = 8 * 60 * 60;
const MOCK_SESSION = "mock-development-session";

function mockMode() {
  return (
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
  if (mockMode()) return email.includes("@") && passphrase.length >= 4;
  return (
    equal(
      email.trim().toLowerCase(),
      required("OPERATOR_EMAIL").toLowerCase(),
    ) && equal(passphrase, required("OPERATOR_PASSPHRASE"))
  );
}

export function operatorSessionCookie() {
  if (mockMode())
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
  if (mockMode() && raw.startsWith(`${MOCK_SESSION}.`)) return true;
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
