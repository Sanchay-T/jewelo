// P2-1 proof, kept in the repository so P2-4 and P2-7 can rerun it.
//
// Replays the whole image lab through a verifier from the `StudioVerifier`
// port. It reads `docs/goals/overnight-launch/ledger.jsonl`, resolves every
// still (`file`) and every reference (`references[].file`) from disk, decodes
// each still to bytes, and hands those bytes to the registered verifier. The
// bytes are the input: nothing here fetches a URL, because a signed link that
// has expired would turn a free replay into a paid regeneration (phase 2 plan
// review, B6).
//
// The verifier is chosen from a registry so P2-3 can drop
// `DeterministicStudioVerifier` in on one line without touching anything else.
// Today the only entry that costs nothing is `MockStudioVerifier`, and its
// whole job here is to establish the baseline the deterministic verifier has to
// beat: it says `passed: true` to every image it is shown, so it accepts every
// human pass and it also accepts every defect row. That number is the point of
// this run.
//
// One adaptation is deliberate and temporary. `StudioVerifier.verify` still
// takes `identityImageUrl`, a URL, for the stencil; only the still arrives as
// bytes, inside `GeneratedMedia`. P2-5 changes the port to take stencil bytes.
// Until then this script passes a `file://` URL built from the resolved path on
// disk, so no network fetch can happen, and records `identityImageUrl` in the
// report as the `file://` it used. The port is not modified here.
//
// `VerificationDecision` also does not carry `gates` yet (P2-5 adds it). If a
// decision carries a well-formed `gates` array the report uses it verbatim and
// records `gateSource: "carried"`; otherwise the report projects today's
// booleans into the same `{id, passed, measured, threshold}` shape and records
// `gateSource: "projected"`, so a reader can never mistake a projection for a
// measurement.
//
// Run it (Node is pinned to 24.18.1):
//   corepack pnpm --filter @jewelo/jobs replay-lab
//   corepack pnpm --filter @jewelo/jobs replay-lab --verifier=mock \
//     --out=/absolute/path/replay-report.json
//   corepack pnpm --filter @jewelo/jobs replay-lab /absolute/path/ledger.jsonl
//
// Every argument is optional. Paths may be absolute; a relative path is
// resolved against the current working directory first and against the
// repository root second, so the same argument works from the repository root
// and from `apps/jobs`. The defaults are the committed ledger and
// `docs/goals/overnight-launch/lab/replay-report.json`.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  MockStudioVerifier,
  type GeneratedMedia,
  type StudioVerifier,
  type VerificationDecision,
} from "@jewelo/ai";
import type { PresentationView } from "@jewelo/contracts";

const REPO_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
/** Every path in the ledger is written relative to one of these two bases. */
const LAB_ROOT = join(REPO_ROOT, "docs/goals/overnight-launch");
const DEFAULT_LEDGER = "docs/goals/overnight-launch/ledger.jsonl";
const DEFAULT_OUT = "docs/goals/overnight-launch/lab/replay-report.json";

/**
 * The verifiers this harness can run, by name.
 *
 * P2-3 adds its verifier here as one more line; nothing else in this file
 * knows which implementation it is holding.
 */
const VERIFIERS: Readonly<Record<string, () => StudioVerifier>> = {
  mock: () => new MockStudioVerifier(),
};
const DEFAULT_VERIFIER = "mock";

/**
 * The four looks the lab generated, longest first so `framed-minimal` is
 * matched before any shorter prefix could be.
 */
const LOOKS: readonly string[] = [
  "framed-minimal",
  "origami-ribbon",
  "diamond-rails",
  "classical",
];

/**
 * The lab's names. The ledger does not record the approved text - it records
 * the cell - so the harness reconstructs the text from the cell id and this
 * table. `MockStudioVerifier` ignores it; P2-3's G1 does not, which is why it
 * is reconstructed here rather than left empty.
 */
const NAME_TEXT: Readonly<Record<string, Readonly<Record<Script, string>>>> = {
  asma: { en: "Asma", ar: "أسماء" },
  noor: { en: "Noor", ar: "نور" },
  layla: { en: "Layla", ar: "ليلى" },
  muhammad: { en: "Muhammad", ar: "محمد" },
};

/** Cell suffix to the production presentation view it stands for. */
const VIEW_BY_VARIANT: Readonly<Record<string, PresentationView>> = {
  "on-skin": "on_skin",
  "close-up": "close_up",
  dark: "dark",
};

type Script = "en" | "ar";
type Verdict = "pass" | "tweak" | "fail";

interface LedgerReference {
  readonly tag: string;
  readonly file: string;
  readonly sha256: string | null;
}

interface LedgerRow {
  readonly stage: string;
  readonly cell: string;
  readonly attempt: number;
  readonly file: string;
  readonly references: readonly LedgerReference[];
  readonly verdict: Verdict | null;
  readonly defects: readonly string[];
  readonly note: string | null;
}

interface GateRecord {
  readonly id: string;
  readonly passed: boolean;
  readonly measured: number | null;
  readonly threshold: number | null;
}

interface ResolvedPath {
  readonly declared: string;
  readonly absolute: string;
  /** Which base the declared path resolved against. */
  readonly base: "repo-root" | "lab-root";
}

interface ReplayRow {
  readonly id: string;
  readonly stage: string;
  readonly cell: string;
  readonly look: string | null;
  readonly script: Script | null;
  readonly variant: string | null;
  readonly presentationView: PresentationView;
  readonly approvedText: string | null;
  readonly verdict: Verdict | null;
  readonly tags: readonly string[];
  readonly file: string;
  readonly fileResolved: boolean;
  readonly bytes: number | null;
  readonly stencil: string | null;
  readonly identityImageUrl: string | null;
  readonly references: readonly {
    readonly tag: string;
    readonly file: string;
    readonly resolved: boolean;
    readonly shaMatches: boolean | null;
  }[];
  readonly decision: "accepted" | "rejected" | "not_run";
  readonly gateSource: "carried" | "projected" | "none";
  readonly gates: readonly GateRecord[];
  readonly notes: string | null;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function resolveArgumentPath(value: string): string {
  if (isAbsolute(value)) return value;
  const fromCwd = resolve(process.cwd(), value);
  if (existsSync(fromCwd)) return fromCwd;
  return join(REPO_ROOT, value);
}

/**
 * Resolve a path the ledger declares. Ledger paths are written from the
 * repository root today (`docs/goals/overnight-launch/lab/...`), but the lab's
 * own Python tools address the same corpus from `docs/goals/overnight-launch/`,
 * so both bases are tried and the one that hit is recorded.
 */
function resolveLedgerPath(declared: string): ResolvedPath | null {
  const fromRepo = join(REPO_ROOT, declared);
  if (existsSync(fromRepo))
    return { declared, absolute: fromRepo, base: "repo-root" };
  const fromLab = join(LAB_ROOT, declared);
  if (existsSync(fromLab))
    return { declared, absolute: fromLab, base: "lab-root" };
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function parseVerdict(value: unknown): Verdict | null {
  return value === "pass" || value === "tweak" || value === "fail"
    ? value
    : null;
}

function parseRow(line: string, index: number): LedgerRow {
  const parsed: unknown = JSON.parse(line);
  const record = asRecord(parsed);
  if (!record) fail(`ledger line ${index + 1} is not an object`);
  const stage = asString(record.stage);
  const cell = asString(record.cell);
  const file = asString(record.file);
  const attempt = typeof record.attempt === "number" ? record.attempt : null;
  if (stage === null || cell === null || file === null || attempt === null)
    fail(`ledger line ${index + 1} is missing stage, cell, attempt or file`);
  const references: LedgerReference[] = [];
  if (Array.isArray(record.references)) {
    for (const entry of record.references) {
      const reference = asRecord(entry);
      const referenceFile = reference ? asString(reference.file) : null;
      if (!reference || referenceFile === null)
        fail(`ledger line ${index + 1} has a reference without a file`);
      references.push({
        tag: asString(reference.tag) ?? "reference",
        file: referenceFile,
        sha256: asString(reference.sha256),
      });
    }
  }
  const defects = Array.isArray(record.defects)
    ? record.defects.flatMap((tag: unknown) => {
        const text = asString(tag);
        return text === null ? [] : [text];
      })
    : [];
  return {
    stage,
    cell,
    attempt,
    file,
    references,
    verdict: parseVerdict(record.verdict),
    defects,
    note: asString(record.note),
  };
}

/** `framed-minimal-layla-ar-close-up` -> look, holdout name, script, variant. */
function parseCell(cell: string): {
  look: string | null;
  name: string;
  script: Script | null;
  variant: string | null;
} {
  const look = LOOKS.find((candidate) => cell.startsWith(`${candidate}-`));
  const rest = look === undefined ? cell : cell.slice(look.length + 1);
  const parts = rest.split("-");
  const scriptAt = parts.findIndex(
    (part) => part === "en" || part === "ar",
  );
  if (scriptAt < 0)
    return { look: look ?? null, name: "asma", script: null, variant: null };
  const before = parts.slice(0, scriptAt).join("-");
  const after = parts.slice(scriptAt + 1).join("-");
  return {
    look: look ?? null,
    name: before === "" ? "asma" : before,
    script: parts[scriptAt] === "ar" ? "ar" : "en",
    variant: after === "" ? null : after,
  };
}

function parseGateRecord(value: unknown): GateRecord | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = asString(record.id);
  if (id === null || typeof record.passed !== "boolean") return null;
  return {
    id,
    passed: record.passed,
    measured: typeof record.measured === "number" ? record.measured : null,
    threshold: typeof record.threshold === "number" ? record.threshold : null,
  };
}

/**
 * Gates a decision carried itself, or `null` when the decision predates the
 * P2-5 contract. Read through `unknown` rather than widening the port type.
 */
function carriedGates(decision: VerificationDecision): GateRecord[] | null {
  const candidate: unknown = (decision as unknown as Record<string, unknown>)
    .gates;
  if (!Array.isArray(candidate)) return null;
  const gates: GateRecord[] = [];
  for (const entry of candidate) {
    const gate = parseGateRecord(entry);
    if (gate === null) return null;
    gates.push(gate);
  }
  return gates;
}

/** Today's booleans in the `{id, passed, measured, threshold}` shape. */
function projectGates(decision: VerificationDecision): GateRecord[] {
  const flag = (id: string, passed: boolean): GateRecord => ({
    id,
    passed,
    measured: passed ? 1 : 0,
    threshold: 1,
  });
  return [
    flag("exactText", decision.exactText),
    flag("exactScript", decision.exactScript),
    {
      id: "identityScore",
      passed: decision.identityScore >= 1,
      measured: decision.identityScore,
      threshold: 1,
    },
    flag("correctMetalAndStones", decision.correctMetalAndStones),
    flag("coherentPendant", decision.coherentPendant),
    flag("exactlyTwoConnectedRings", decision.exactlyTwoConnectedRings),
    flag("correctShot", decision.correctShot),
    flag("noAddedIdentityElements", decision.noAddedIdentityElements),
  ];
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function main(): Promise<void> {
  let verifierName = DEFAULT_VERIFIER;
  let ledgerArgument = DEFAULT_LEDGER;
  let outArgument = DEFAULT_OUT;
  const positional: string[] = [];
  for (const argument of process.argv.slice(2)) {
    if (argument.startsWith("--verifier="))
      verifierName = argument.slice("--verifier=".length);
    else if (argument.startsWith("--out="))
      outArgument = argument.slice("--out=".length);
    else positional.push(argument);
  }
  ledgerArgument = positional[0] ?? ledgerArgument;
  outArgument = positional[1] ?? outArgument;

  const factory = VERIFIERS[verifierName];
  if (factory === undefined)
    fail(
      `unknown verifier "${verifierName}"; registered: ${Object.keys(VERIFIERS).join(", ")}`,
    );
  const verifier = factory();

  const ledgerPath = resolveArgumentPath(ledgerArgument);
  if (!existsSync(ledgerPath)) fail(`ledger not found: ${ledgerPath}`);
  const outPath = isAbsolute(outArgument)
    ? outArgument
    : join(REPO_ROOT, outArgument);

  const rows = readFileSync(ledgerPath, "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map(parseRow);

  const replayed: ReplayRow[] = [];
  let stillsResolved = 0;
  let referencesTotal = 0;
  let referencesResolved = 0;
  let referenceShaMismatches = 0;
  const resolutionBases = new Set<string>();

  for (const row of rows) {
    const { look, name, script, variant } = parseCell(row.cell);
    const presentationView: PresentationView =
      (variant === null ? undefined : VIEW_BY_VARIANT[variant]) ?? "studio";
    const nameText = NAME_TEXT[name];
    const approvedText =
      nameText !== undefined && script !== null ? nameText[script] : null;

    const still = resolveLedgerPath(row.file);
    if (still !== null) {
      stillsResolved += 1;
      resolutionBases.add(still.base);
    }

    const references = row.references.map((reference) => {
      referencesTotal += 1;
      const resolved = resolveLedgerPath(reference.file);
      if (resolved === null)
        return {
          tag: reference.tag,
          file: reference.file,
          resolved: false,
          shaMatches: null,
        };
      referencesResolved += 1;
      resolutionBases.add(resolved.base);
      let shaMatches: boolean | null = null;
      if (reference.sha256 !== null) {
        shaMatches = sha256(readFileSync(resolved.absolute)) === reference.sha256;
        if (!shaMatches) referenceShaMismatches += 1;
      }
      return {
        tag: reference.tag,
        file: reference.file,
        resolved: true,
        shaMatches,
      };
    });

    const stencil =
      row.references.find((reference) => reference.tag === "stencil") ?? null;
    const stencilResolved =
      stencil === null ? null : resolveLedgerPath(stencil.file);
    // Temporary adaptation: the port still takes a URL for the stencil (P2-5
    // makes it bytes). A `file://` URL cannot leave the machine.
    const identityImageUrl =
      stencilResolved === null
        ? null
        : pathToFileURL(stencilResolved.absolute).href;

    if (still === null) {
      replayed.push({
        id: `${row.cell}-a${row.attempt}`,
        stage: row.stage,
        cell: row.cell,
        look,
        script,
        variant,
        presentationView,
        approvedText,
        verdict: row.verdict,
        tags: row.defects,
        file: row.file,
        fileResolved: false,
        bytes: null,
        stencil: stencil?.file ?? null,
        identityImageUrl,
        references,
        decision: "not_run",
        gateSource: "none",
        gates: [],
        notes: null,
      });
      continue;
    }

    const bytes = new Uint8Array(readFileSync(still.absolute));
    const media: GeneratedMedia = {
      provider: "mock",
      model: `lab-replay:${verifierName}`,
      requestId: `replay:${row.cell}:a${row.attempt}`,
      bytes,
      mimeType: "image/png",
      estimatedCostCents: 0,
    };
    const decision = await verifier.verify({
      approvedText: approvedText ?? "",
      identityFingerprint: stencil?.sha256 ?? "",
      identityImageUrl: identityImageUrl ?? "",
      presentationView,
      specification: { look, script, variant, stage: row.stage },
      media,
    });
    const carried = carriedGates(decision);
    replayed.push({
      id: `${row.cell}-a${row.attempt}`,
      stage: row.stage,
      cell: row.cell,
      look,
      script,
      variant,
      presentationView,
      approvedText,
      verdict: row.verdict,
      tags: row.defects,
      file: row.file,
      fileResolved: true,
      bytes: bytes.byteLength,
      stencil: stencil?.file ?? null,
      identityImageUrl,
      references,
      decision: decision.passed ? "accepted" : "rejected",
      gateSource: carried === null ? "projected" : "carried",
      gates: carried ?? projectGates(decision),
      notes: decision.notes,
    });
  }

  // The matrix takes the human verdict as truth. A `tweak` is not a pass:
  // the shopper is buying gold, so anything the viewer would not ship counts
  // against the verifier that accepted it.
  const humanPassed = (row: ReplayRow): boolean => row.verdict === "pass";
  const scored = replayed.filter((row) => row.verdict !== null);
  const run = scored.filter((row) => row.decision !== "not_run");
  const accepted = run.filter((row) => row.decision === "accepted");
  const overall = {
    humanPassAccepted: accepted.filter(humanPassed).length,
    humanPassRejected: run.filter(
      (row) => humanPassed(row) && row.decision === "rejected",
    ).length,
    humanNotPassAccepted: accepted.filter((row) => !humanPassed(row)).length,
    humanNotPassRejected: run.filter(
      (row) => !humanPassed(row) && row.decision === "rejected",
    ).length,
  };

  const tagCounts: Record<string, number> = {};
  const byDefectTag: Record<
    string,
    { rows: number; accepted: number; rejected: number; notRun: number }
  > = {};
  for (const row of replayed)
    for (const tag of row.tags) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
      const bucket = (byDefectTag[tag] ??= {
        rows: 0,
        accepted: 0,
        rejected: 0,
        notRun: 0,
      });
      bucket.rows += 1;
      if (row.decision === "accepted") bucket.accepted += 1;
      else if (row.decision === "rejected") bucket.rejected += 1;
      else bucket.notRun += 1;
    }

  const verdictCounts = {
    pass: replayed.filter((row) => row.verdict === "pass").length,
    tweak: replayed.filter((row) => row.verdict === "tweak").length,
    fail: replayed.filter((row) => row.verdict === "fail").length,
    unscored: replayed.filter((row) => row.verdict === null).length,
  };
  const defectRows = replayed.filter((row) => row.tags.length > 0);

  const census = {
    generatedAt: new Date().toISOString(),
    verifier: verifierName,
    ledger: ledgerArgument,
    rows: replayed.length,
    rowsWithVerdict: scored.length,
    passes: verdictCounts.pass,
    tweaks: verdictCounts.tweak,
    fails: verdictCounts.fail,
    unscored: verdictCounts.unscored,
    stillsResolved,
    stillsMissing: replayed.length - stillsResolved,
    referencesTotal,
    referencesResolved,
    referenceShaMismatches,
    resolutionBases: [...resolutionBases].sort(),
    defectTagCounts: tagCounts,
    rowsCarryingADefectTag: defectRows.length,
    matrixTruth:
      "human verdict; a tweak counts as not-pass, so only `pass` is truth-positive",
    gateSource:
      replayed.some((row) => row.gateSource === "carried")
        ? "carried"
        : "projected from the boolean VerificationDecision (P2-5 adds real gates)",
    baseline: {
      humanPassesAccepted: `${overall.humanPassAccepted}/${verdictCounts.pass}`,
      humanPassesFalselyRejected: overall.humanPassRejected,
      defectRowsFalselyAccepted: `${defectRows.filter((row) => row.decision === "accepted").length}/${defectRows.length}`,
      failRowsFalselyAccepted: `${replayed.filter((row) => row.verdict === "fail" && row.decision === "accepted").length}/${verdictCounts.fail}`,
    },
  };

  writeFileSync(
    outPath,
    `${JSON.stringify(
      {
        census,
        matrix: { overall, byDefectTag },
        rows: replayed,
      },
      null,
      2,
    )}\n`,
  );

  console.log("census");
  for (const [key, value] of Object.entries(census))
    console.log(`  ${key}: ${JSON.stringify(value)}`);
  console.log("matrix (human verdict is truth, tweak counts as not-pass)");
  for (const [key, value] of Object.entries(overall))
    console.log(`  ${key}: ${value}`);
  for (const [tag, bucket] of Object.entries(byDefectTag).sort())
    console.log(
      `  ${tag}: rows ${bucket.rows}, accepted ${bucket.accepted}, rejected ${bucket.rejected}, not run ${bucket.notRun}`,
    );
  console.log(`report written: ${outPath}`);
}

await main();
