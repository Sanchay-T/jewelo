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
];

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

  return errors;
}

export function appSecretEnvs(values) {
  const envs = [];
  for (const name of knownWebConfig) {
    const value = values.get(name);
    if (!value) continue;
    envs.push({
      key: name,
      scope: buildConfig.includes(name) ? "RUN_AND_BUILD_TIME" : "RUN_TIME",
      type: "SECRET",
      value,
    });
  }
  return envs;
}
