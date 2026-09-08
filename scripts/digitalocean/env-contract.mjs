import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const buildConfig = [
  "NEXT_PUBLIC_JEWELO_DATA_MODE",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
];

export const runtimeConfig = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  // Inngest replaced Trigger.dev on 7 September 2026. Without both keys the
  // app cannot dispatch a run, so readiness reports not_ready and the deploy
  // contract must fail rather than ship a silently broken pipeline.
  "INNGEST_EVENT_KEY",
  "INNGEST_SIGNING_KEY",
  "OPENAI_API_KEY",
  "OPERATOR_EMAIL",
  "OPERATOR_PASSPHRASE",
  "OPERATOR_SESSION_SECRET",
];

// Shipped when present, never required: `INNGEST_BASE_URL` is unset on Inngest
// Cloud and set on the self-hosted server, and only one environment registers
// the outbox cron functions.
export const optionalRuntimeConfig = [
  "INNGEST_BASE_URL",
  "INNGEST_CRON_ENABLED",
  // Defaults to 2 in the config schema. Shipped when present so an environment
  // can lower the number of paid generations in flight without a code change.
  "OPENAI_STILL_CONCURRENCY_LIMIT",
  // Defaults to "mock" in the config schema, so it is not required; shipped
  // explicitly so the deployed provider mode is visible in the app spec
  // instead of implied.
  "PROVIDER_MODE",
  // Optional because `/api/readiness` still answers the bare public `status`
  // without it; shipped when present so `smoke.sh` can read the dependency
  // block and assert the deploy is bound to a prod Inngest signing key.
  "READINESS_PROBE_TOKEN",
  // Defaults to "do-connecting-ip" in the config schema, which is what App
  // Platform sets and overwrites. Shipped when present so a move to another
  // host can name its own header, or empty it, without a code change.
  "TRUSTED_CLIENT_IP_HEADER",
  // Defaults to "1": a D-020 bar-fallback construction is a different piece
  // from the one the shopper approved, so it stops pre-spend and waits for the
  // shop. Ship "0" only once bar pieces are agreed to be sellable.
  "IDENTITY_BAR_FALLBACK_REVIEW",
];

// Read from the environment file, never shipped to the app.
//
// Fix-2 review M3: one `.env` served both environments, so `deploy.sh
// production main` from a laptop would have overwritten production's provider
// mode, database and operator passphrase with staging values. The file now has
// to say which environment it belongs to, and `deploy.sh` refuses to sync a
// file that names a different one. It is deliberately outside `knownWebConfig`:
// the app has no use for it and it must never appear in an app spec.
export const localOnlyConfig = ["JEWELO_DEPLOY_TARGET"];

// Keys whose empty value is a decision rather than an absence.
//
// Fix-2 review M4: `TRUSTED_CLIENT_IP_HEADER=` means "trust no header", which
// is the only safe setting on a host that does not overwrite the header it
// forwards. Skipping it, as an empty value used to be skipped, left the app on
// its `do-connecting-ip` default, so every per-source guard could be reset by
// rotating one request header - the exact failure the setting was added to
// close. These keys ship as an explicit empty string instead.
export const emptyAllowed = new Set(["TRUSTED_CLIENT_IP_HEADER"]);

export const requiredWebConfig = [...new Set([...buildConfig, ...runtimeConfig])];

export const knownWebConfig = [...new Set([...requiredWebConfig, ...optionalRuntimeConfig])];

export function parseEnv(contents) {
  const values = new Map();
  for (const originalLine of contents.split(/\r?\n/u)) {
    const line = originalLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/u.exec(line);
    if (!match) continue;
    let value = match[2].trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    values.set(match[1], value);
  }
  return values;
}

export function readEnvFiles(paths) {
  const values = new Map();
  for (const path of paths) {
    for (const [name, value] of parseEnv(readFileSync(resolve(path), "utf8"))) {
      values.set(name, value);
    }
  }
  return values;
}

export function validateWebEnv(values) {
  const errors = [];
  const missing = requiredWebConfig.filter((name) => !values.get(name));
  if (missing.length) errors.push(`missing required web values: ${missing.join(", ")}`);

  const dataMode = values.get("NEXT_PUBLIC_JEWELO_DATA_MODE");
  if (dataMode && dataMode !== "remote") {
    errors.push("NEXT_PUBLIC_JEWELO_DATA_MODE must select the remote data client");
  }

  // Fix-3 review minor 9: the header name is parsed at module scope by
  // `request-guard.ts`, so a typo shipped through here becomes a 500 on the
  // shopper's first guarded call rather than a deploy failure. This is the same
  // rule as `trustedClientIpHeaderSchema` in packages/config - at most 64
  // characters of a-z, 0-9, underscore or hyphen, or empty to trust no header -
  // checked before the value is shipped. The value is never printed.
  const trustedHeader = values.get("TRUSTED_CLIENT_IP_HEADER");
  if (trustedHeader !== undefined && !/^[a-z0-9_-]{0,64}$/u.test(trustedHeader.trim().toLowerCase())) {
    errors.push(
      "TRUSTED_CLIENT_IP_HEADER must be at most 64 characters of a-z, 0-9, underscore or hyphen, or empty to trust no header",
    );
  }

  return errors;
}

export function appSecretEnvs(values) {
  const envs = [];
  for (const name of knownWebConfig) {
    const value = values.get(name);
    if (value === undefined) continue;
    if (value === "" && !emptyAllowed.has(name)) continue;
    envs.push({
      key: name,
      scope: buildConfig.includes(name) ? "RUN_AND_BUILD_TIME" : "RUN_TIME",
      // An empty string holds no secret, and App Platform will not accept an
      // encrypted variable with nothing to encrypt, so the deliberate empty
      // value ships as a plain one.
      type: value === "" ? "GENERAL" : "SECRET",
      value,
    });
  }
  return envs;
}

/**
 * Which environment this file may be synced into, or "" when it does not say.
 *
 * `deploy.sh` compares this with its own argument and refuses on a mismatch, so
 * a laptop file that says `staging` cannot be pushed into the production app.
 */
export function deployTarget(values) {
  return values.get("JEWELO_DEPLOY_TARGET") ?? "";
}

// A local-only key that reached `knownWebConfig` would be shipped as an app
// secret by `appSecretEnvs`. Fail at import instead of at deploy time.
for (const key of localOnlyConfig) {
  if (knownWebConfig.includes(key)) {
    throw new Error(`local-only key ${key} must not appear in the web config contract`);
  }
}
