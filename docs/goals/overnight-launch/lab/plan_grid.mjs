#!/usr/bin/env node
// Grid planner for the CALEUMS prompt lab (docs/TASKS.md P3-4).
//
// It expands one batch - looks x scripts x letterings x names x views - into prompt files
// and an index the image-lab agent can execute without a single hand edit, and it never
// calls Runway. Planning is free; only generation costs credits.
//
//   node docs/goals/overnight-launch/lab/plan_grid.mjs --stage stage6 \
//     --looks framed-minimal,classical --scripts en,ar --letterings Classic \
//     --names Asma --attempts 3
//
//   node docs/goals/overnight-launch/lab/plan_grid.mjs --stage stage6 --reserve
//   node docs/goals/overnight-launch/lab/plan_grid.mjs --stage stage6 --status
//   node docs/goals/overnight-launch/lab/plan_grid.mjs --stage stage6 --unreserve
//
// Every cell is compiled through compile.mjs's guarded compile(), so a holdout name on a
// prompt hash that holdout.json has not frozen refuses the WHOLE plan (exit 2) before a
// single file is written. A partial grid is worse than no grid: it looks executable.
//
// On disk, per stage (--release puts prompts and index under prompts/<release>/):
//   <stage>/prompts/<cell>.txt   the compiled prompt, no trailing newline (ledger.mjs
//                                hashes the file with the trailing newline stripped, and
//                                every prompt already on disk is written this way)
//   <stage>/prompts/index.json   a bare ARRAY of cell entries. It stays an array because
//                                ingest_results.mjs does idx.find((x) => x.cell === ...)
//                                on it; wrapping it in an object would break ingest.
//   <stage>/prompts/plan.json    the plan-level summary: totals, missingStencils,
//                                inFlightLimit, estimatedCredits, the axes that made it.
//
// Idempotent by construction: a file is written only when its bytes differ, so replanning
// the same grid leaves git clean.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { compile, HoldoutRefusal, LOOKS, VIEWS } from "./compile.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..", "..", "..");
const LEDGER = resolve(HERE, "..", "ledger.jsonl");
const STENCILS = resolve(HERE, "stencils");
const MANIFEST = resolve(STENCILS, "manifest.json");

// Measured rates and caps, all from docs/goals/overnight-launch/IMAGE-LAB.md. They live here
// as named constants rather than inline numbers so a change is one edit with a citation.
const CREDITS_PER_IMAGE = 20; // IMAGE-LAB.md credits section: 1,820 credits over 91 images
const IN_FLIGHT_LIMIT = 12; // largest batch ever submitted at once (docs/TASKS.md P3-5)
const MAX_ATTEMPTS_PER_CELL = 3; // the three-paid-attempts-per-cell cap

// Defaults are the P3-5 grid: 4 looks x 2 scripts x 2 letterings x names x 3 attempts, studio.
const DEFAULT_LOOKS = Object.keys(LOOKS);
const DEFAULT_SCRIPTS = ["en", "ar"];
const DEFAULT_LETTERINGS = ["Classic", "Kufi"];
const DEFAULT_VIEWS = ["studio"];
const DEFAULT_NAMES = ["asma"];

// ------------------------------------------------------------------ arguments

const BOOLEAN_FLAGS = new Set(["reserve", "unreserve", "status", "json"]);

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) throw new PlanError(`bad_argument:${token}`);
    const key = token.slice(2);
    if (BOOLEAN_FLAGS.has(key)) {
      args[key] = true;
      continue;
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) throw new PlanError(`missing_value:--${key}`);
    args[key] = value;
    i += 1;
  }
  return args;
}

class PlanError extends Error {
  constructor(message) {
    super(message);
    this.name = "PlanError";
  }
}

const list = (value, fallback) =>
  value === undefined
    ? fallback
    : String(value)
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);

// ---------------------------------------------------------------------- names

// A name is given as a slug that the stencil manifest already knows ("asma", "noor"), which
// is also how the stencil files are keyed. A name the manifest has never seen can be passed
// inline as slug:Latin:Arabic, e.g. --names "sara:Sara:سارة". Case does not matter.
function loadNameRegistry() {
  const registry = new Map();
  if (!existsSync(MANIFEST)) return registry;
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
  for (const record of manifest.stencils ?? []) {
    if (!record.slug || !record.script || !record.intendedName) continue;
    const entry = registry.get(record.slug) ?? { slug: record.slug };
    entry[record.script] = record.intendedName;
    registry.set(record.slug, entry);
  }
  return registry;
}

function resolveNames(tokens, scripts, registry) {
  return tokens.map((token) => {
    const parts = token.split(":");
    if (parts.length === 3) {
      const [slug, latin, arabic] = parts.map((p) => p.trim());
      return { slug: slug.toLowerCase(), en: latin, ar: arabic };
    }
    if (parts.length !== 1) {
      throw new PlanError(`bad name "${token}": use a slug, or slug:Latin:Arabic for a new name`);
    }
    const slug = token.trim().toLowerCase();
    const entry = registry.get(slug);
    if (!entry) {
      throw new PlanError(
        `unknown name "${token}". The stencil manifest knows: ${[...registry.keys()].join(", ") || "nothing"}. ` +
          `Pass a new name inline as slug:Latin:Arabic.`,
      );
    }
    for (const script of scripts) {
      if (!entry[script]) throw new PlanError(`name "${slug}" has no ${script} spelling in the stencil manifest`);
    }
    return entry;
  });
}

// ----------------------------------------------------------------- cell naming

// Matches what is already on disk: stage2 used <look>-<name>-<script> for Classic studio,
// stage5 appended the lettering, stage3 appended the view. Classic and studio stay implicit
// so a replan of an existing grid keeps the existing cell ids.
function cellId({ look, slug, script, lettering, view }) {
  const parts = [look, slug, script];
  if (lettering.toLowerCase() !== "classic") parts.push(lettering.toLowerCase());
  if (view !== "studio") parts.push(view);
  return parts.join("-");
}

const stencilKeyFor = ({ slug, script, lettering }) =>
  `${slug}-${script}-${lettering.toLowerCase()}-norings`;

// --------------------------------------------------------------------- ledger

function readLedger() {
  if (!existsSync(LEDGER)) return [];
  return readFileSync(LEDGER, "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

const ledgerKey = (row) => `${row.stage}|${row.cell}|${row.attempt}`;

// ------------------------------------------------------------------- planning

function buildPlan(args) {
  const stage = args.stage;
  if (!stage) throw new PlanError("--stage is required");

  const looks = list(args.looks, DEFAULT_LOOKS);
  const scripts = list(args.scripts, DEFAULT_SCRIPTS);
  const letterings = list(args.letterings, DEFAULT_LETTERINGS);
  const views = list(args.views ?? args.view, DEFAULT_VIEWS);
  const nameTokens = list(args.names ?? args.name, DEFAULT_NAMES);
  const attempts = args.attempts === undefined ? MAX_ATTEMPTS_PER_CELL : Number(args.attempts);
  const metal = args.metal ?? "Yellow gold";
  const coverage = args.coverage ?? "No stones";
  const gem = args.gem ?? "Lab diamond";
  const size = args.size === undefined ? 32 : Number(args.size);
  const chain = args.chain ?? "Cable";
  const release = args.release ?? null;

  for (const look of looks) if (!LOOKS[look]) throw new PlanError(`unsupported_look:${look}`);
  for (const view of views) if (!VIEWS[view]) throw new PlanError(`unsupported_view:${view}`);
  if (!Number.isInteger(attempts) || attempts < 1) throw new PlanError(`--attempts must be a positive integer`);
  if (attempts > MAX_ATTEMPTS_PER_CELL) {
    throw new PlanError(
      `--attempts ${attempts} exceeds the ${MAX_ATTEMPTS_PER_CELL}-paid-attempts-per-cell cap in IMAGE-LAB.md`,
    );
  }

  const names = resolveNames(nameTokens, scripts, loadNameRegistry());
  const promptDir = release ? resolve(HERE, stage, "prompts", release) : resolve(HERE, stage, "prompts");

  const cells = [];
  const seen = new Set();
  for (const look of looks) {
    for (const name of names) {
      for (const script of scripts) {
        for (const lettering of letterings) {
          for (const view of views) {
            const cell = cellId({ look, slug: name.slug, script, lettering, view });
            if (seen.has(cell)) throw new PlanError(`duplicate cell id ${cell}; the axes collide`);
            seen.add(cell);

            const intendedName = name[script];
            if (!intendedName) throw new PlanError(`name "${name.slug}" has no ${script} spelling`);

            // The guarded compile(): a controlled holdout name on an unfrozen hash throws
            // HoldoutRefusal here, before any file is written.
            const compiled = compile({
              name: intendedName,
              script,
              lettering,
              look,
              view,
              metal,
              coverage,
              gem,
              size,
              chain,
            });

            const stencilKey = stencilKeyFor({ slug: name.slug, script, lettering });
            const stencilAbs = resolve(STENCILS, `${stencilKey}.png`);
            const stencilPath = relative(REPO, stencilAbs);
            const promptPath = relative(REPO, resolve(promptDir, `${cell}.txt`));

            cells.push({
              cell,
              look,
              script,
              lettering,
              name: name.slug,
              view,
              ratio: compiled.ratio,
              intendedName,
              attempts,
              stencilKey,
              stencil: stencilPath,
              stencilExists: existsSync(stencilAbs),
              references: [{ tag: "stencil", file: stencilPath, exists: existsSync(stencilAbs) }],
              promptPath,
              promptSha256: compiled.promptSha256,
              estimatedCredits: attempts * CREDITS_PER_IMAGE,
              inFlightLimit: IN_FLIGHT_LIMIT,
              prompt: compiled.prompt,
            });
          }
        }
      }
    }
  }

  const images = cells.reduce((sum, c) => sum + c.attempts, 0);
  const missingStencils = [...new Set(cells.filter((c) => !c.stencilExists).map((c) => c.stencil))].sort();

  return {
    stage,
    release,
    promptDir,
    indexPath: resolve(promptDir, "index.json"),
    planPath: resolve(promptDir, "plan.json"),
    axes: { looks, scripts, letterings, views, names: names.map((n) => n.slug), attempts },
    variant: { metal, coverage, gem, size, chain },
    cells,
    images,
    estimatedCredits: images * CREDITS_PER_IMAGE,
    creditsPerImage: CREDITS_PER_IMAGE,
    inFlightLimit: IN_FLIGHT_LIMIT,
    missingStencils,
  };
}

// ---------------------------------------------------------------------- write

function writeIfChanged(path, contents) {
  if (existsSync(path) && readFileSync(path, "utf8") === contents) return false;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
  return true;
}

function writePlan(plan) {
  let written = 0;
  for (const cell of plan.cells) {
    // No trailing newline: ledger.mjs hashes the file with a trailing newline stripped and
    // every prompt already on disk is stored exactly as compiled.
    if (writeIfChanged(resolve(REPO, cell.promptPath), cell.prompt)) written += 1;
  }

  const index = plan.cells.map(({ prompt, stencilExists, ...rest }) => ({
    ...rest,
    missingStencils: stencilExists ? [] : [rest.stencil],
  }));
  if (writeIfChanged(plan.indexPath, JSON.stringify(index, null, 2) + "\n")) written += 1;

  const summary = {
    stage: plan.stage,
    release: plan.release,
    axes: plan.axes,
    variant: plan.variant,
    cells: plan.cells.length,
    images: plan.images,
    creditsPerImage: plan.creditsPerImage,
    estimatedCredits: plan.estimatedCredits,
    inFlightLimit: plan.inFlightLimit,
    batches: Math.ceil(plan.images / plan.inFlightLimit),
    missingStencils: plan.missingStencils,
    index: relative(REPO, plan.indexPath),
  };
  if (writeIfChanged(plan.planPath, JSON.stringify(summary, null, 2) + "\n")) written += 1;
  return written;
}

// -------------------------------------------------------------------- reserve

// One ledger row per planned attempt, in the exact shape ledger.mjs writes, plus
// status:"planned" and verdict:null. A restart mid-batch can see what was already claimed.
//
// ingest_results.mjs keys rows as `${stage}|${cell}|${attempt}` and SKIPS a key it already
// sees, so with reservations in place it would skip the real result instead of recording it.
// The planner does not edit ingest. The one-line change ingest needs is in the `existing`
// set it builds at the top of the file:
//
//   .map((l) => { const r = JSON.parse(l); return `${r.stage}|${r.cell}|${r.attempt}`; })
//   ->
//   .flatMap((l) => { const r = JSON.parse(l);
//                     return r.status === "planned" ? [] : [`${r.stage}|${r.cell}|${r.attempt}`]; })
//
// With that, a planned row never blocks its own result. Run --unreserve after ingest to drop
// the spent reservations so the ledger holds one row per real image.
function reserve(plan) {
  const existing = new Set(readLedger().map(ledgerKey));
  const lines = [];
  for (const cell of plan.cells) {
    for (let attempt = 1; attempt <= cell.attempts; attempt += 1) {
      const key = `${plan.stage}|${cell.cell}|${attempt}`;
      if (existing.has(key)) continue;
      existing.add(key);
      lines.push(
        JSON.stringify({
          ts: new Date().toISOString(),
          stage: plan.stage,
          cell: cell.cell,
          attempt,
          promptHash: cell.promptSha256,
          promptPath: cell.promptPath,
          references: [{ tag: "stencil", file: cell.stencil, sha256: null, source: "lab" }],
          taskId: null,
          creditsBefore: null,
          creditsAfter: null,
          verdict: null,
          defects: [],
          status: "planned",
        }),
      );
    }
  }
  if (lines.length) appendFileSync(LEDGER, lines.join("\n") + "\n");
  return lines.length;
}

function unreserve(stage) {
  const rows = readLedger();
  const kept = rows.filter((row) => !(row.stage === stage && row.status === "planned"));
  const removed = rows.length - kept.length;
  if (removed) writeFileSync(LEDGER, kept.map((row) => JSON.stringify(row)).join("\n") + "\n");
  return removed;
}

// --------------------------------------------------------------------- status

// Reads index.json plus the ledger so the lead can see where a batch stands without opening
// Runway. planned = reserved rows, submitted = a Runway task id was recorded, ingested = the
// image file is in the ledger, scored = a viewer verdict exists.
function status(plan) {
  if (!existsSync(plan.indexPath)) throw new PlanError(`no plan on disk at ${relative(REPO, plan.indexPath)}`);
  const index = JSON.parse(readFileSync(plan.indexPath, "utf8"));
  const rows = readLedger().filter((row) => row.stage === plan.stage);
  const byCell = new Map();
  for (const row of rows) {
    const bucket = byCell.get(row.cell) ?? [];
    bucket.push(row);
    byCell.set(row.cell, bucket);
  }

  const width = Math.max(4, ...index.map((entry) => entry.cell.length));
  const lines = [
    `stage ${plan.stage}  index ${relative(REPO, plan.indexPath)}`,
    `${"cell".padEnd(width)}  want  planned  submitted  ingested  scored  pass`,
  ];
  const totals = { want: 0, planned: 0, submitted: 0, ingested: 0, scored: 0, pass: 0 };
  for (const entry of index) {
    const bucket = byCell.get(entry.cell) ?? [];
    const counts = {
      want: entry.attempts,
      planned: bucket.filter((r) => r.status === "planned").length,
      submitted: bucket.filter((r) => r.taskId).length,
      ingested: bucket.filter((r) => r.file).length,
      scored: bucket.filter((r) => r.verdict).length,
      pass: bucket.filter((r) => r.verdict === "pass").length,
    };
    for (const key of Object.keys(totals)) totals[key] += counts[key];
    lines.push(
      `${entry.cell.padEnd(width)}  ${String(counts.want).padStart(4)}  ${String(counts.planned).padStart(7)}` +
        `  ${String(counts.submitted).padStart(9)}  ${String(counts.ingested).padStart(8)}` +
        `  ${String(counts.scored).padStart(6)}  ${String(counts.pass).padStart(4)}`,
    );
  }
  lines.push(
    `${"TOTAL".padEnd(width)}  ${String(totals.want).padStart(4)}  ${String(totals.planned).padStart(7)}` +
      `  ${String(totals.submitted).padStart(9)}  ${String(totals.ingested).padStart(8)}` +
      `  ${String(totals.scored).padStart(6)}  ${String(totals.pass).padStart(4)}`,
  );

  const spent = rows
    .filter((r) => r.creditsBefore !== null && r.creditsAfter !== null)
    .reduce((sum, r) => sum + (r.creditsBefore - r.creditsAfter), 0);
  const remaining = (totals.want - totals.ingested) * CREDITS_PER_IMAGE;
  lines.push(
    `credits: plan ${totals.want * CREDITS_PER_IMAGE} at ${CREDITS_PER_IMAGE}/image, ` +
      `spent ${spent} on ${totals.ingested} ingested, ${remaining} still to spend`,
  );
  lines.push(
    `in flight: max ${IN_FLIGHT_LIMIT} calls, ${Math.ceil((totals.want - totals.ingested) / IN_FLIGHT_LIMIT)} batches left`,
  );
  return lines.join("\n");
}

// ------------------------------------------------------------------------ cli

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const plan = buildPlan(args);

    if (args.status) {
      process.stdout.write(status(plan) + "\n");
      process.exit(0);
    }
    if (args.unreserve) {
      const removed = unreserve(plan.stage);
      process.stdout.write(`unreserved ${removed} planned rows for ${plan.stage}\n`);
      process.exit(0);
    }

    const written = writePlan(plan);
    if (args.json) {
      process.stdout.write(
        JSON.stringify(
          { ...plan, promptDir: relative(REPO, plan.promptDir), cells: plan.cells.map(({ prompt, ...c }) => c) },
          null,
          2,
        ) + "\n",
      );
    } else {
      const digest = createHash("sha256")
        .update(plan.cells.map((c) => c.promptSha256).join("\n"))
        .digest("hex")
        .slice(0, 12);
      process.stdout.write(
        `stage ${plan.stage}: ${plan.cells.length} cells x ${plan.axes.attempts} attempts = ` +
          `${plan.images} images, about ${plan.estimatedCredits} credits at ${CREDITS_PER_IMAGE}/image\n` +
          `looks ${plan.axes.looks.join(",")} | scripts ${plan.axes.scripts.join(",")} | ` +
          `letterings ${plan.axes.letterings.join(",")} | names ${plan.axes.names.join(",")} | ` +
          `views ${plan.axes.views.join(",")}\n` +
          `prompts ${relative(REPO, plan.promptDir)} | ${written} file(s) written, ` +
          `${plan.cells.length + 2 - written} unchanged | plan sha ${digest}\n` +
          `in flight ${plan.inFlightLimit}, ${Math.ceil(plan.images / plan.inFlightLimit)} batches\n` +
          (plan.missingStencils.length
            ? `missing stencils (${plan.missingStencils.length}, P3-3 builds these):\n  ` +
              plan.missingStencils.join("\n  ") +
              "\n"
            : "all stencils present\n"),
      );
    }

    if (args.reserve) {
      const appended = reserve(plan);
      process.stdout.write(`reserved ${appended} new ledger rows (status planned) for ${plan.stage}\n`);
    }
  } catch (error) {
    if (error instanceof HoldoutRefusal || error instanceof PlanError) {
      process.stderr.write(`${error.message}\nPLAN REFUSED: nothing was written.\n`);
      process.exit(2);
    }
    throw error;
  }
}
