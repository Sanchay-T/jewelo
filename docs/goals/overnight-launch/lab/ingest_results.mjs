#!/usr/bin/env node
// Fold a generator agent's results file into the ledger, skipping rows already there.
//   node ingest_results.mjs <results.json|jsonl> <stage1|stage2|stage3|stage4|stage5> [index.json]
// The third argument overrides the current per-stage index below; "<stage>" in it is substituted.
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
    .flatMap((l) => {
      const r = JSON.parse(l);
      // A row reserved by plan_grid.mjs --reserve must not block its own result.
      return r.status === "planned" ? [] : [`${r.stage}|${r.cell}|${r.attempt}`];
    })
);

const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

// The current prompt index per stage. A superseded index carries superseded prompt
// hashes and stencil keys, so a stage with no entry here refuses to ingest rather
// than falling back to a stale index and writing wrong provenance into the ledger.
const DEFAULT_INDEX = {
  stage1: "stage1/prompts/v43/index.json",
  stage2: "stage2/prompts/v43/index.json",
  stage3: "stage3/prompts/v42/index.json",
  stage4: "stage4/prompts/index.json",
  stage5: "stage5/prompts/index.json",
};

function defaultIndexFor(stage) {
  const idx = DEFAULT_INDEX[stage];
  if (!idx) {
    throw new Error(
      `no default prompt index for stage "${stage}"; pass the index path as the third argument`
    );
  }
  return idx;
}

let n = 0;
for (const r of results) {
  const stage = r.stage ?? defaultStage;
  const key = `${stage}|${r.cell}|${r.attempt ?? 1}`;
  if (existing.has(key)) { console.log("skip (already ledgered)", key); continue; }
  if (r.status !== "SUCCEEDED") { console.log("skip (not succeeded)", key, r.status); continue; }

  const idxPath = indexOverride
    ? resolve(HERE, indexOverride.replace("<stage>", stage))
    : resolve(HERE, defaultIndexFor(stage));
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
