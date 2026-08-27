#!/usr/bin/env node

import { readEnvFiles, validateWebEnv } from "./env-contract.mjs";

const cliArguments = process.argv.slice(2);
if (cliArguments[0] === "--") cliArguments.shift();
const [environment, ...envFiles] = cliArguments;

if (!["staging", "production"].includes(environment) || !envFiles.length) {
  console.error(
    "usage: pnpm do:check-env -- staging|production /absolute/path/to/.env [...env files]",
  );
  process.exit(2);
}

const errors = validateWebEnv(readEnvFiles(envFiles));
if (errors.length) {
  for (const error of errors) console.error(error);
  process.exit(1);
}
console.log(`${environment} web environment is valid`);
