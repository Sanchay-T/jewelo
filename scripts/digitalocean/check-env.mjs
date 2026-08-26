#!/usr/bin/env node

import { featureStatus, readEnvFiles, validateWebEnv } from "./env-contract.mjs";

const cliArguments = process.argv.slice(2);
if (cliArguments[0] === "--") cliArguments.shift();
const [environment, ...envFiles] = cliArguments;

if (!["staging", "production"].includes(environment) || !envFiles.length) {
  console.error(
    "usage: pnpm do:check-env -- staging|production /absolute/path/to/.env [...env files]",
  );
  process.exit(2);
}

const values = readEnvFiles(envFiles);
const errors = validateWebEnv(values);
if (errors.length) {
  for (const error of errors) console.error(error);
  process.exit(1);
}

const features = featureStatus(values);
console.log(`${environment} web environment is valid`);
for (const [feature, enabled] of Object.entries(features)) {
  console.log(`${feature}=${enabled ? "configured" : "disabled"}`);
}
console.log("job-only credentials are excluded from the App Platform upload allowlist");
