import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const buildConfig = [
  "NEXT_PUBLIC_JEWELO_DATA_MODE",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "NEXT_PUBLIC_POSTHOG_HOST",
  "NEXT_PUBLIC_SENTRY_DSN",
];

export const runtimeConfig = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "TRIGGER_SECRET_KEY",
  "OPENAI_API_KEY",
  "SHOPIFY_STORE_DOMAIN",
  "SHOPIFY_CLIENT_ID",
  "SHOPIFY_CLIENT_SECRET",
  "SHOPIFY_WEBHOOK_SECRET",
  "OPERATOR_EMAIL",
  "OPERATOR_PASSPHRASE",
  "OPERATOR_SESSION_SECRET",
];

export const requiredWebConfig = [...new Set([...buildConfig, ...runtimeConfig])];

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
  for (const name of requiredWebConfig) {
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
