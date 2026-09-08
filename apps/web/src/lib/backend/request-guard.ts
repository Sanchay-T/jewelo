import "server-only";

import { trustedClientIpHeader, webGuardLimits } from "@jewelo/config";

/**
 * Per-source request guards for the routes an anonymous caller can reach.
 *
 * Everything here is process-local and deliberately small: one Next instance is
 * one shop, and a bounded in-memory map is the honest tool for slowing a single
 * abusive source down. It is not a distributed quota and must never be used as
 * one; the spend ceilings in the job engine remain the money-side gate.
 *
 * Both stores are bounded twice - by age and by entry count - so a caller who
 * rotates a header cannot grow the process heap.
 */

interface Entry<V> {
  value: V;
  expiresAt: number;
}

export class BoundedTtlMap<V> {
  readonly #entries = new Map<string, Entry<V>>();

  constructor(
    private readonly maxEntries: number = webGuardLimits.guardMaxEntries,
    private readonly ttlMs: number = webGuardLimits.guardEntryTtlMs,
  ) {}

  get(key: string): V | undefined {
    const entry = this.#entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.#entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: V, ttlMs = this.ttlMs): void {
    this.#sweep();
    this.#entries.set(key, { value, expiresAt: Date.now() + ttlMs });
    // Insertion order is oldest first, so the first keys are the stalest.
    while (this.#entries.size > this.maxEntries) {
      const oldest = this.#entries.keys().next();
      if (oldest.done) break;
      this.#entries.delete(oldest.value);
    }
  }

  delete(key: string): void {
    this.#entries.delete(key);
  }

  get size(): number {
    return this.#entries.size;
  }

  #sweep(): void {
    const now = Date.now();
    for (const [key, entry] of this.#entries)
      if (entry.expiresAt <= now) this.#entries.delete(key);
  }
}

/**
 * The client key.
 *
 * DigitalOcean App Platform terminates TLS and appends the real peer as the
 * last `x-forwarded-for` hop, so the last hop is the only one a caller cannot
 * forge; the left-most entry is client-supplied text.
 *
 * Which header above that can be believed is a property of the host, so it is
 * configuration: `TRUSTED_CLIENT_IP_HEADER` defaults to `do-connecting-ip`,
 * which App Platform sets and overwrites, and is set empty on a host that does
 * not, where the same header would be nothing but caller-supplied text.
 * Read once per process, because a header name is not a per-request decision.
 */
const trustedHeader = trustedClientIpHeader();

export function clientIp(request: Request): string {
  const connecting = trustedHeader
    ? request.headers.get(trustedHeader)?.trim()
    : undefined;
  if (connecting) return connecting.slice(0, 64);
  const forwarded = request.headers.get("x-forwarded-for");
  const last = forwarded?.split(",").at(-1)?.trim();
  if (last) return last.slice(0, 64);
  return request.headers.get("x-real-ip")?.trim().slice(0, 64) ?? "local";
}

export interface RateLimitVerdict {
  allowed: boolean;
  retryAfterSeconds: number;
}

interface Window {
  count: number;
  resetAt: number;
}

export function createRateLimitStore(maxEntries?: number, ttlMs?: number) {
  return new BoundedTtlMap<Window>(maxEntries, ttlMs);
}

export function checkRateLimit(
  store: BoundedTtlMap<Window>,
  key: string,
  limit: number,
  windowMs: number,
): RateLimitVerdict {
  const now = Date.now();
  const active = store.get(key);
  if (!active || active.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs }, windowMs);
    return { allowed: true, retryAfterSeconds: 0 };
  }
  active.count += 1;
  if (active.count <= limit) return { allowed: true, retryAfterSeconds: 0 };
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((active.resetAt - now) / 1000)),
  };
}

function tooMany(message: string, retryAfterSeconds: number): Response {
  return Response.json(
    { error: message, code: "rate_limited" },
    {
      status: 429,
      headers: {
        "retry-after": String(retryAfterSeconds),
        "cache-control": "no-store",
      },
    },
  );
}

/** Throws the 429 the route's `jsonError` returns unchanged. */
export function assertRateLimit(
  store: BoundedTtlMap<Window>,
  key: string,
  limit: number,
  windowMs: number,
  message: string,
): void {
  const verdict = checkRateLimit(store, key, limit, windowMs);
  if (!verdict.allowed) throw tooMany(message, verdict.retryAfterSeconds);
}

/* -------------------------- failure backoff ---------------------------- */

interface Failures {
  count: number;
  blockedUntil: number;
}

const failureStores = new Map<string, BoundedTtlMap<Failures>>();

function failureStore(scope: string): BoundedTtlMap<Failures> {
  const existing = failureStores.get(scope);
  if (existing) return existing;
  const created = new BoundedTtlMap<Failures>(
    webGuardLimits.guardMaxEntries,
    webGuardLimits.failureBackoffMaxMs,
  );
  failureStores.set(scope, created);
  return created;
}

/**
 * Refuse before the credential is even compared once a source has failed
 * `failureThreshold` times, then double the wait on every further failure up to
 * the ceiling. A success clears the source outright.
 */
export function assertNotBackedOff(scope: string, key: string): void {
  const record = failureStore(scope).get(key);
  if (!record || record.blockedUntil <= Date.now()) return;
  throw tooMany(
    "Too many failed attempts. Wait before trying again.",
    Math.max(1, Math.ceil((record.blockedUntil - Date.now()) / 1000)),
  );
}

export function recordFailure(scope: string, key: string): void {
  const store = failureStore(scope);
  const count = (store.get(key)?.count ?? 0) + 1;
  const over = count - webGuardLimits.failureThreshold;
  const blockedUntil =
    over < 0
      ? 0
      : Date.now() +
        Math.min(
          webGuardLimits.failureBackoffBaseMs * 2 ** over,
          webGuardLimits.failureBackoffMaxMs,
        );
  store.set(key, { count, blockedUntil });
}

export function clearFailures(scope: string, key: string): void {
  failureStore(scope).delete(key);
}
