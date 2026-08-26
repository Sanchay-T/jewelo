#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { appSecretEnvs, readEnvFiles, validateWebEnv } from "./env-contract.mjs";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const contract = JSON.parse(
  readFileSync(resolve(repositoryRoot, "infra/digitalocean/spec-contract.json"), "utf8"),
);
const cliArguments = process.argv.slice(2);
if (cliArguments[0] === "--") cliArguments.shift();
const [environment, ...envFiles] = cliArguments;

if (!contract.environments[environment] || !envFiles.length) {
  console.error(
    "usage: pnpm do:bootstrap -- staging|production /absolute/path/to/.env [...env files]",
  );
  process.exit(2);
}

const values = readEnvFiles(envFiles);
const token = process.env.DIGITALOCEAN_ACCESS_TOKEN ?? values.get("DIGITALOCEAN_ACCESS_TOKEN");
if (!token) throw new Error("DIGITALOCEAN_ACCESS_TOKEN is required");

const environmentErrors = validateWebEnv(values);
if (environmentErrors.length) {
  for (const error of environmentErrors) console.error(error);
  process.exit(1);
}

const secretEnvs = appSecretEnvs(values);
secretEnvs.push({
  key: "NEXT_PUBLIC_APP_URL",
  scope: "RUN_AND_BUILD_TIME",
  type: "GENERAL",
  value: "${APP_URL}",
});
secretEnvs.push({
  key: "JEWELO_CLOUD_BUILD",
  scope: "BUILD_TIME",
  type: "GENERAL",
  value: "1",
});

const target = contract.environments[environment];
const sourceRef = process.env.JEWELO_SOURCE_REF ?? contract.integrationBranch;
const service = {
  name: contract.service.name,
  environment_slug: contract.service.environmentSlug,
  git: {
    repo_clone_url: contract.repositoryCloneUrl,
    branch: sourceRef,
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

let rawResult;
try {
  rawResult = execFileSync("doctl", args, {
    encoding: "utf8",
    env: childEnvironment,
    input: JSON.stringify(spec),
    maxBuffer: 16 * 1024 * 1024,
  });
} catch (error) {
  console.error(
    `${existing ? "update" : "creation"} of ${target.appName} did not become active; inspect its latest deployment logs`,
  );
  process.exit(error.status || 1);
}
const result = JSON.parse(rawResult);
const app = Array.isArray(result) ? result[0] : result;
console.log(`${existing ? "updated" : "created"} ${target.appName}`);
console.log(`app_id=${app.id}`);
console.log(`url=${app.default_ingress ?? app.live_url ?? "pending"}`);
