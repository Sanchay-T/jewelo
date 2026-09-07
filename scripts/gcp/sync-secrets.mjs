#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const projectId = process.env.JEWELO_GCP_PROJECT_ID ?? "jewelo-cloud-lhq-20260827";
const environment = process.argv[2];
const envFile = process.argv[3];

if (!new Set(["staging", "production"]).has(environment) || !envFile) {
  console.error("usage: pnpm gcp:secrets -- staging|production /absolute/path/to/.env");
  process.exit(2);
}

const allowed = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_JEWELO_DATA_MODE",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "NEXT_PUBLIC_POSTHOG_HOST",
  "NEXT_PUBLIC_SENTRY_DSN",
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

const required = new Set([
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_JEWELO_DATA_MODE",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
]);

function parseEnv(contents) {
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
      const quote = value[0];
      value = value.slice(1, -1);
      if (quote === '"') value = value.replaceAll("\\n", "\n").replaceAll('\\"', '"');
    }
    values.set(match[1], value);
  }
  return values;
}

function secretId(name) {
  return `${environment}-${name.toLowerCase().replaceAll("_", "-")}`;
}

const values = parseEnv(readFileSync(envFile, "utf8"));
const missing = [...required].filter((name) => !values.get(name));
if (missing.length) {
  console.error(`missing required ${environment} values: ${missing.join(", ")}`);
  process.exit(1);
}

for (const name of allowed) {
  const value = values.get(name);
  if (!value) continue;
  const id = secretId(name);
  execFileSync(
    "gcloud",
    ["secrets", "versions", "add", id, `--project=${projectId}`, "--data-file=-", "--quiet"],
    { input: value, stdio: ["pipe", "ignore", "inherit"] },
  );
  console.log(`updated ${id}`);
}
