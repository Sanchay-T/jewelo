import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * P7-5 / DS-9. The alerts the app spec must carry.
 *
 * They live in `infra/digitalocean/spec-contract.json` next to the rest of the
 * app shape, and both `bootstrap-app.mjs` (creation) and `deploy.sh` (every
 * revision) read them from here, so an alert cannot exist in one path and not
 * the other. `DEPLOYMENT_FAILED` and `DOMAIN_FAILED` are app-level rules;
 * `CPU_UTILIZATION`, `MEM_UTILIZATION` and `RESTART_COUNT` are properties of a
 * component and belong on the `web` service. The restart alert is the one that
 * matters most on a 1 GB instance: a Next.js server that is being OOM-killed
 * restarts silently and a shopper only sees a request that never answers.
 */
const specContract = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "../../infra/digitalocean/spec-contract.json"), "utf8"),
);

export const appAlerts = specContract.alerts?.app ?? [];
export const serviceAlerts = specContract.alerts?.service ?? [];

/**
 * Merge the contract's alerts into whatever the platform already has, keyed by
 * rule. An alert the contract does not name is left exactly as it is - a
 * notification channel someone attached in the console is not this script's to
 * delete - and an alert it does name keeps its existing fields (its `id`, its
 * `disabled` flag) with the contract's threshold and window written over them.
 */
export function mergeAlerts(existing, desired) {
  const merged = new Map((existing ?? []).map((alert) => [alert.rule, alert]));
  for (const alert of desired) merged.set(alert.rule, { ...merged.get(alert.rule), ...alert });
  return [...merged.values()];
}

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
  // Preserve explicit model snapshots and the worker's policy ceilings across
  // deploys. Omission retains the validated defaults in @jewelo/config.
  "OPENAI_IMAGE_MODEL",
  "OPENAI_VERIFIER_MODEL",
  "REAL_MODE_MAX_RESERVED_SPEND_CENTS",
  "REAL_MODE_MAX_ATTEMPT_BUDGET",
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
  // P7-3 / DS-8. New-request notification. Optional because the shop has no
  // sending account yet: with `NOTIFICATION_TRANSPORT` unset the app defaults
  // to `log`, which records the message in the runtime log and sends nothing,
  // and with `NOTIFICATION_TO` unset the job reports `not_configured` instead
  // of failing. The captured request stays durable in the operator queue either
  // way, so a missing notification never loses a customer.
  "NOTIFICATION_TRANSPORT",
  "NOTIFICATION_TO",
  "NOTIFICATION_FROM",
  "NOTIFICATION_SMTP_HOST",
  "NOTIFICATION_SMTP_PORT",
  "NOTIFICATION_SMTP_SECURITY",
  "NOTIFICATION_SMTP_USER",
  "NOTIFICATION_SMTP_PASSWORD",
  "NOTIFICATION_SMTP_TIMEOUT_MS",
  // Fix review 3, MN-7. The oldest capture the two-minute sweep may announce.
  // Optional: the config default is the morning the sweep was written, so a
  // deployment that gains a shop address announces new requests and leaves the
  // pre-notification backlog to the runbook's manual update.
  "NOTIFICATION_SWEEP_FLOOR",
  // P7-5 / DS-9. Error tracking and journey analytics. All four are optional
  // and all four are empty until Sanchay creates the Sentry and PostHog
  // projects: `packages/observability` imports a vendor SDK only inside a
  // credential check, so an app without them loads nothing, sends nothing and
  // behaves exactly as it does today. `SENTRY_DSN` is the server key and is
  // never exposed; the `NEXT_PUBLIC_` three are shipped at build time as well
  // as run time because Next inlines them into the browser bundle, which is
  // what `appSecretEnvs` scopes by prefix rather than by a required-key list.
  // `SENTRY_AUTH_TOKEN` is deliberately absent: it is a build-machine
  // credential for uploading source maps and the running app has no use for it.
  "SENTRY_DSN",
  "NEXT_PUBLIC_SENTRY_DSN",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "NEXT_PUBLIC_POSTHOG_HOST",
  // M1 / D-022. Which pendant constructions and which lettering the shop sells,
  // as customer-facing option labels in a comma list. All three are optional and
  // unset everywhere today: the defaults in `@jewelo/config`'s `sellable` module
  // are exactly the behaviour the page already had (Classical, Classic, every
  // Arabic lettering), so an app spec without them is the app spec it was. They
  // are filled from P3-5's measured result, which is why they are configuration
  // and not code. `NEXT_PUBLIC_`, because the atelier refuses an unsellable look
  // in the browser before anything is reserved.
  "NEXT_PUBLIC_SELLABLE_CONSTRUCTIONS",
  "NEXT_PUBLIC_SELLABLE_ENGLISH_LETTERING",
  "NEXT_PUBLIC_SELLABLE_ARABIC_LETTERING",
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

  // Match jobsEnvSchema before shipping configuration, without logging values.
  const imageModel = values.get("OPENAI_IMAGE_MODEL");
  if (imageModel && !["gpt-image-2-2026-04-21", "gpt-image-2.5-sunburst-2026-09-08"].includes(imageModel)) {
    errors.push("OPENAI_IMAGE_MODEL must select an approved exact model snapshot");
  }
  const verifierModel = values.get("OPENAI_VERIFIER_MODEL");
  if (verifierModel && !verifierModel.trim()) {
    errors.push("OPENAI_VERIFIER_MODEL must be non-empty");
  }
  for (const [name, maximum] of [
    ["REAL_MODE_MAX_RESERVED_SPEND_CENTS", 100_000],
    ["REAL_MODE_MAX_ATTEMPT_BUDGET", 10],
  ]) {
    const raw = values.get(name);
    if (raw === undefined || raw.trim() === "") continue;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 1 || value > maximum) {
      errors.push(`${name} must be an integer between 1 and ${maximum}`);
    }
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

  // P7-3 / DS-8. `smtp` without a host, a sender, a credential and a shop
  // address is a deploy that boots and then throws on the first request; the
  // same rule is `assertNotificationConfigured` in packages/config. No value is
  // printed, only the missing key names.
  if (values.get("NOTIFICATION_TRANSPORT") === "smtp") {
    const missingNotification = [
      "NOTIFICATION_TO",
      "NOTIFICATION_FROM",
      "NOTIFICATION_SMTP_HOST",
      "NOTIFICATION_SMTP_USER",
      "NOTIFICATION_SMTP_PASSWORD",
    ].filter((name) => !values.get(name));
    if (missingNotification.length)
      errors.push(
        `NOTIFICATION_TRANSPORT=smtp needs: ${missingNotification.join(", ")}`,
      );
  }

  // P7-5 / DS-9. A PostHog key with nowhere to send is analytics that looks
  // configured and silently is not, so a key requires its host. The reverse is
  // not an error: a host with no key is the shipped state of this repository's
  // own `.env` and nothing initialises from it. No value is printed.
  if (values.get("NEXT_PUBLIC_POSTHOG_KEY") && !values.get("NEXT_PUBLIC_POSTHOG_HOST")) {
    errors.push("NEXT_PUBLIC_POSTHOG_KEY requires NEXT_PUBLIC_POSTHOG_HOST");
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
      // A `NEXT_PUBLIC_` value that is only present at run time is a value the
      // browser bundle was compiled without: Next inlines these at build time,
      // so an optional public key scoped `RUN_TIME` would be shipped, look set
      // in the console, and be `undefined` in the shopper's browser.
      scope:
        buildConfig.includes(name) || name.startsWith("NEXT_PUBLIC_")
          ? "RUN_AND_BUILD_TIME"
          : "RUN_TIME",
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
