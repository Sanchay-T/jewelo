#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const contract = JSON.parse(
  readFileSync(resolve(repositoryRoot, "infra/digitalocean/spec-contract.json"), "utf8"),
);
const cliArguments = process.argv.slice(2);
if (cliArguments[0] === "--") cliArguments.shift();
const [environment, envFile] = cliArguments;

if (!contract.environments[environment] || !envFile) {
  console.error("usage: pnpm do:bootstrap -- staging|production /absolute/path/to/.env");
  process.exit(2);
}

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
      value = value.slice(1, -1);
    }
    values.set(match[1], value);
  }
  return values;
}

const buildConfig = [
  "NEXT_PUBLIC_JEWELO_DATA_MODE",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "NEXT_PUBLIC_POSTHOG_HOST",
  "NEXT_PUBLIC_SENTRY_DSN",
];
const runtimeConfig = [
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
  "NEXT_PUBLIC_JEWELO_DATA_MODE",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
]);
const values = parseEnv(readFileSync(envFile, "utf8"));
const token = process.env.DIGITALOCEAN_ACCESS_TOKEN ?? values.get("DIGITALOCEAN_ACCESS_TOKEN");
if (!token) throw new Error("DIGITALOCEAN_ACCESS_TOKEN is required");

const missing = [...required].filter((name) => !values.get(name));
if (missing.length) {
  console.error(`missing required ${environment} values: ${missing.join(", ")}`);
  process.exit(1);
}

const secretEnvs = [];
for (const name of [...buildConfig, ...runtimeConfig]) {
  const value = values.get(name);
  if (!value) continue;
  secretEnvs.push({
    key: name,
    scope: buildConfig.includes(name) ? "RUN_AND_BUILD_TIME" : "RUN_TIME",
    type: "SECRET",
    value,
  });
}
secretEnvs.push({
  key: "NEXT_PUBLIC_APP_URL",
  scope: "RUN_AND_BUILD_TIME",
  type: "GENERAL",
  value: "${APP_URL}",
});

const target = contract.environments[environment];
const service = {
  name: contract.service.name,
  environment_slug: contract.service.environmentSlug,
  git: {
    repo_clone_url: contract.repositoryCloneUrl,
    branch: contract.integrationBranch,
  },
  source_dir: "/",
  build_command: contract.service.buildCommand,
  run_command: contract.service.runCommand,
  http_port: contract.service.httpPort,
  instance_size_slug: target.instanceSizeSlug,
  routes: [{ path: "/" }],
  health_check: {
    http_path: contract.service.healthPath,
    initial_delay_seconds: 30,
    period_seconds: 10,
    timeout_seconds: 5,
    success_threshold: 1,
    failure_threshold: 5,
  },
  envs: secretEnvs,
};

if (target.autoscaling) {
  service.autoscaling = {
    min_instance_count: target.autoscaling.minimum,
    max_instance_count: target.autoscaling.maximum,
    metrics: {
      requests_per_second: {
        per_instance: target.autoscaling.requestsPerSecondPerInstance,
      },
    },
  };
} else {
  service.instance_count = target.instanceCount;
  if (target.inactivitySleepSeconds) {
    service.inactivity_sleep = { after_seconds: target.inactivitySleepSeconds };
  }
}

const spec = {
  name: target.appName,
  region: contract.region,
  features: ["buildpack-stack=ubuntu-22"],
  alerts: [{ rule: "DEPLOYMENT_FAILED" }, { rule: "DOMAIN_FAILED" }],
  services: [service],
};
const childEnvironment = { ...process.env, DIGITALOCEAN_ACCESS_TOKEN: token };
if (process.env.JEWELO_DO_VALIDATE_ONLY === "1") {
  execFileSync("doctl", ["apps", "spec", "validate", "-", "--schema-only"], {
    encoding: "utf8",
    env: childEnvironment,
    input: JSON.stringify(spec),
  });
  console.log(`${environment} App Platform spec is schema-valid`);
  process.exit(0);
}
if (environment === "production" && process.env.JEWELO_ALLOW_PRODUCTION_BOOTSTRAP !== "yes") {
  throw new Error("set JEWELO_ALLOW_PRODUCTION_BOOTSTRAP=yes for the explicit first production app creation");
}
const apps = JSON.parse(
  execFileSync("doctl", ["apps", "list", "--output", "json"], {
    encoding: "utf8",
    env: childEnvironment,
  }),
);
const existing = apps.find((app) => app.spec?.name === target.appName);
const args = existing
  ? ["apps", "update", existing.id, "--spec", "-", "--update-sources", "--wait", "--output", "json"]
  : [
      "apps",
      "create",
      "--spec",
      "-",
      "--project-id",
      contract.projectId,
      "--wait",
      "--output",
      "json",
    ];

const result = JSON.parse(
  execFileSync("doctl", args, {
    encoding: "utf8",
    env: childEnvironment,
    input: JSON.stringify(spec),
    maxBuffer: 16 * 1024 * 1024,
  }),
);
const app = Array.isArray(result) ? result[0] : result;
console.log(`${existing ? "updated" : "created"} ${target.appName}`);
console.log(`app_id=${app.id}`);
console.log(`url=${app.default_ingress ?? app.live_url ?? "pending"}`);
