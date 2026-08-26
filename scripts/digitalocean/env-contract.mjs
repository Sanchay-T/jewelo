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
  "SHOPIFY_STORE_DOMAIN",
  "SHOPIFY_CLIENT_ID",
  "SHOPIFY_CLIENT_SECRET",
  "SHOPIFY_WEBHOOK_SECRET",
  "OPERATOR_EMAIL",
  "OPERATOR_PASSPHRASE",
  "OPERATOR_SESSION_SECRET",
];

export const requiredWebConfig = [
  "NEXT_PUBLIC_JEWELO_DATA_MODE",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

export const jobOnlyConfig = [
  "TRIGGER_SECRET_KEY",
  "OPENAI_API_KEY",
  "FAL_KEY",
  "SUPABASE_DB_PASSWORD",
  "SUPABASE_ACCESS_TOKEN",
];

const completeGroups = {
  shopify: [
    "SHOPIFY_STORE_DOMAIN",
    "SHOPIFY_CLIENT_ID",
    "SHOPIFY_CLIENT_SECRET",
    "SHOPIFY_WEBHOOK_SECRET",
  ],
  operator: ["OPERATOR_EMAIL", "OPERATOR_PASSPHRASE", "OPERATOR_SESSION_SECRET"],
};

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

  if (
    values.get("NEXT_PUBLIC_JEWELO_DATA_MODE") &&
    values.get("NEXT_PUBLIC_JEWELO_DATA_MODE") !== "remote"
  ) {
    errors.push("NEXT_PUBLIC_JEWELO_DATA_MODE must select the remote data client");
  }

  for (const [label, names] of Object.entries(completeGroups)) {
    const configured = names.filter((name) => values.get(name));
    if (configured.length > 0 && configured.length !== names.length) {
      const groupMissing = names.filter((name) => !values.get(name));
      errors.push(`incomplete ${label} configuration; missing: ${groupMissing.join(", ")}`);
    }
  }

  if (values.get("NEXT_PUBLIC_POSTHOG_KEY") && !values.get("NEXT_PUBLIC_POSTHOG_HOST")) {
    errors.push("NEXT_PUBLIC_POSTHOG_HOST is required when PostHog is enabled");
  }

  const uploaded = new Set([...buildConfig, ...runtimeConfig]);
  const leaked = jobOnlyConfig.filter((name) => uploaded.has(name));
  if (leaked.length) errors.push(`job-only values entered the web allowlist: ${leaked.join(", ")}`);

  return errors;
}

export function appSecretEnvs(values) {
  const envs = [];
  for (const name of [...buildConfig, ...runtimeConfig]) {
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

export function featureStatus(values) {
  return {
    supabase: requiredWebConfig.every((name) => values.get(name)),
    observability: Boolean(
      values.get("NEXT_PUBLIC_POSTHOG_KEY") || values.get("NEXT_PUBLIC_SENTRY_DSN"),
    ),
    shopify: completeGroups.shopify.every((name) => values.get(name)),
    operator: completeGroups.operator.every((name) => values.get(name)),
  };
}
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
