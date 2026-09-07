#!/usr/bin/env node
// Append one line to docs/goals/overnight-launch/ledger.jsonl.
//   node ledger.mjs '{"stage":"stage1","cell":"classical-en",...}'
import { appendFileSync, readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const LEDGER = resolve(HERE, "..", "ledger.jsonl");

export function append(entry) {
  const promptPath = entry.promptPath ? resolve(HERE, "..", "..", "..", "..", entry.promptPath) : null;
  const promptHash =
    entry.promptHash ??
    (promptPath && existsSync(promptPath)
      ? createHash("sha256").update(readFileSync(promptPath, "utf8").replace(/\n$/, "")).digest("hex")
      : null);
  const line = {
    ts: entry.ts ?? new Date().toISOString(),
    stage: entry.stage,
    cell: entry.cell,
    attempt: entry.attempt,
    promptHash,
    promptPath: entry.promptPath ?? null,
    references: entry.references ?? [],
    taskId: entry.taskId ?? null,
    creditsBefore: entry.creditsBefore ?? null,
    creditsAfter: entry.creditsAfter ?? null,
    verdict: entry.verdict ?? null,
    defects: entry.defects ?? [],
    ...(entry.file ? { file: entry.file } : {}),
    ...(entry.note ? { note: entry.note } : {}),
  };
  appendFileSync(LEDGER, JSON.stringify(line) + "\n");
  return line;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const raw of process.argv.slice(2)) {
    const parsed = JSON.parse(raw);
    for (const entry of Array.isArray(parsed) ? parsed : [parsed]) {
      process.stdout.write(JSON.stringify(append(entry)) + "\n");
    }
  }
}
