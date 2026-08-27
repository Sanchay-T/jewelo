import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// One env file for the whole repo: `.env` at the repository root.
//
// Next only reads `apps/web/.env*` and Trigger only reads `apps/jobs/.env*`, so
// without this every entry point needed its own wrapper script that sourced the
// root file by hand — and forgetting it produced silent misconfiguration rather
// than an error. Loading it in code means `pnpm dev` works from any directory.
//
// `process.loadEnvFile` is built into Node and does not overwrite variables that
// are already set. That is exactly the precedence we want: the file supplies
// local development values, and anything injected by DigitalOcean, Trigger or CI
// wins over it. In those environments the file is absent entirely.

let loaded = false;

function repositoryRoot(): string {
  // Walk up from this file until the workspace manifest appears. Works from
  // source, from a build output, and from inside any app or package.
  let current = dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 10; depth += 1) {
    if (existsSync(join(current, "pnpm-workspace.yaml"))) return current;
    const parent = resolve(current, "..");
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}

/**
 * Load the repository-root `.env` into `process.env`.
 *
 * Idempotent, and safe to call when the file does not exist — deployed runtimes
 * inject their own configuration and must not require a file on disk.
 */
export function loadRootEnv(): void {
  if (loaded) return;
  loaded = true;
  const envPath = join(repositoryRoot(), ".env");
  if (!existsSync(envPath)) return;
  process.loadEnvFile(envPath);
}
