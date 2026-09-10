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
// The web contract is identical for staging and production, so the success
// line does not claim an environment-specific check that was never run. The
// argument stays for symmetry with `do:bootstrap` and to keep the operator
// honest about which file they are pointing at; it is echoed, not applied.
console.log(
  `web environment is valid against the shared contract (invoked for ${environment}; the contract does not differ by environment)`,
);
