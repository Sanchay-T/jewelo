#!/usr/bin/env node
// Fold a generator agent's results file into the ledger, skipping rows already there.
//   node ingest_results.mjs <results.json|jsonl> <stage4|stage5|stage3>
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { append } from "./ledger.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..", "..", "..");
const LEDGER = resolve(HERE, "..", "ledger.jsonl");

const [src, defaultStage, indexOverride] = process.argv.slice(2);
const raw = readFileSync(src, "utf8").trim();
const results = raw.startsWith("[")
  ? JSON.parse(raw)
  : raw.split("\n").filter(Boolean).map((l) => JSON.parse(l));

const existing = new Set(
  (existsSync(LEDGER) ? readFileSync(LEDGER, "utf8").trim().split("\n") : [])
    .filter(Boolean)
    .map((l) => { const r = JSON.parse(l); return `${r.stage}|${r.cell}|${r.attempt}`; })
);

const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

let n = 0;
for (const r of results) {
  const stage = r.stage ?? defaultStage;
  const key = `${stage}|${r.cell}|${r.attempt ?? 1}`;
  if (existing.has(key)) { console.log("skip (already ledgered)", key); continue; }
  if (r.status !== "SUCCEEDED") { console.log("skip (not succeeded)", key, r.status); continue; }

  const idxPath = indexOverride
    ? resolve(HERE, indexOverride.replace("<stage>", stage))
    : resolve(HERE, stage === "stage3" ? "stage3/prompts/v42/index.json" : `${stage}/prompts/index.json`);
  const idx = JSON.parse(readFileSync(idxPath, "utf8"));
  const meta = idx.find((x) => x.cell === r.cell);
  if (!meta) throw new Error(`no prompt index entry for ${r.cell} in ${idxPath}`);

  const refs = [];
  const stencil = resolve(HERE, "stencils", `${meta.stencilKey}.png`);
  refs.push({ tag: "stencil", file: relative(REPO, stencil), sha256: sha(stencil), source: "lab" });
  if (meta.masterFile) {
    const master = resolve(HERE, "stage1", meta.masterFile);
    refs.push({ tag: "master", file: relative(REPO, master), sha256: sha(master), source: "stage1-passed" });
  }

  append({
    stage, cell: r.cell, attempt: r.attempt ?? 1,
    promptHash: meta.promptSha256,
    promptPath: meta.promptPath ?? `docs/goals/overnight-launch/lab/${stage}/prompts/${r.cell}.txt`,
    references: refs, taskId: r.taskId,
    creditsBefore: r.creditsBefore ?? null, creditsAfter: r.creditsAfter ?? null,
    file: relative(REPO, r.file),
  });
  existing.add(key);
  n++;
}
console.log(`appended ${n} rows to ledger.jsonl`);
