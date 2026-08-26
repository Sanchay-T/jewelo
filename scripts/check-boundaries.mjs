import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const proveNegative = process.argv.includes("--prove-negative");

const allowedInternal = {
  ai: new Set(["config", "contracts", "domain", "media", "observability"]),
  config: new Set(),
  contracts: new Set(),
  data: new Set(["config", "contracts", "domain", "observability"]),
  domain: new Set(),
  identity: new Set(["contracts", "domain"]),
  media: new Set(["config", "contracts", "domain", "observability"]),
  observability: new Set(["contracts", "domain"]),
  pricing: new Set(["contracts", "domain"]),
  testing: new Set([
    "ai",
    "config",
    "contracts",
    "data",
    "domain",
    "identity",
    "media",
    "observability",
    "pricing",
    "ui",
  ]),
  ui: new Set(["domain"]),
};

const corePackages = new Set([
  "domain",
  "contracts",
  "identity",
  "pricing",
  "ui",
]);
const providerPackages = /^(openai|@openai\/|@fal-ai\/|fal-client)/;

function filesUnder(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if ([".next", "coverage", "dist", "node_modules"].includes(entry.name))
        return [];
      return filesUnder(target);
    }
    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [target] : [];
  });
}

function ownerOf(file) {
  const normalized = file.split(path.sep).join("/");
  const packageMatch = normalized.match(/\/packages\/([^/]+)\/src(?:\/|$)/);
  if (packageMatch) return { kind: "package", name: packageMatch[1] };
  const appMatch = normalized.match(/\/apps\/([^/]+)(?:\/|$)/);
  if (appMatch) return { kind: "app", name: appMatch[1] };
  return { kind: "unknown", name: "unknown" };
}

function importSpecifiers(file) {
  const source = fs.readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const specifiers = [];

  function addString(node) {
    if (node && ts.isStringLiteralLike(node)) specifiers.push(node.text);
  }

  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      addString(node.moduleSpecifier);
    } else if (ts.isCallExpression(node)) {
      const isDynamicImport =
        node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire =
        ts.isIdentifier(node.expression) && node.expression.text === "require";
      if (isDynamicImport || isRequire) addString(node.arguments[0]);
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument)
    ) {
      addString(node.argument.literal);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specifiers;
}

function sameOwner(left, right) {
  return left.kind === right.kind && left.name === right.name;
}

function violationsFor(files) {
  const violations = [];
  for (const file of files) {
    const owner = ownerOf(file);
    for (const imported of importSpecifiers(file)) {
      if (owner.kind === "package" && imported.startsWith("apps/")) {
        violations.push(
          `${path.relative(root, file)}: shared packages cannot import apps/*`,
        );
      }
      if (owner.kind === "package" && imported.startsWith("@jewelo/")) {
        const target = imported.slice("@jewelo/".length).split("/")[0];
        if (!allowedInternal[owner.name]?.has(target)) {
          violations.push(
            `${path.relative(root, file)}: @jewelo/${owner.name} cannot import @jewelo/${target}`,
          );
        }
      }
      if (imported.startsWith(".")) {
        const targetOwner = ownerOf(path.resolve(path.dirname(file), imported));
        if (targetOwner.kind !== "unknown" && !sameOwner(owner, targetOwner)) {
          violations.push(
            `${path.relative(root, file)}: relative import crosses from ${owner.kind}/${owner.name} to ${targetOwner.kind}/${targetOwner.name}`,
          );
        }
      }
      if (providerPackages.test(imported) && owner.name !== "ai") {
        violations.push(
          `${path.relative(root, file)}: provider SDK ${imported} belongs only in @jewelo/ai`,
        );
      }
      if (imported.startsWith("@supabase/") && owner.name !== "data") {
        violations.push(
          `${path.relative(root, file)}: Supabase SDK belongs only in @jewelo/data`,
        );
      }
      if (
        imported.startsWith("@trigger.dev/") &&
        !(owner.kind === "app" && owner.name === "jobs")
      ) {
        violations.push(
          `${path.relative(root, file)}: Trigger.dev belongs only in apps/jobs`,
        );
      }
      if (
        corePackages.has(owner.name) &&
        (providerPackages.test(imported) ||
          imported.startsWith("@supabase/") ||
          imported.startsWith("@trigger.dev/"))
      ) {
        violations.push(
          `${path.relative(root, file)}: core package ${owner.name} cannot own vendor SDKs`,
        );
      }
    }
  }
  return [...new Set(violations)];
}

function dependencyViolations() {
  const violations = [];
  for (const packageName of Object.keys(allowedInternal)) {
    const manifestPath = path.join(
      root,
      "packages",
      packageName,
      "package.json",
    );
    if (!fs.existsSync(manifestPath)) continue;
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const dependencies = {
      ...manifest.dependencies,
      ...manifest.devDependencies,
    };
    for (const dependency of Object.keys(dependencies)) {
      if (dependency.startsWith("@jewelo/")) {
        const target = dependency.slice("@jewelo/".length);
        if (!allowedInternal[packageName].has(target)) {
          violations.push(
            `packages/${packageName}/package.json: disallowed dependency ${dependency}`,
          );
        }
      }
      if (providerPackages.test(dependency) && packageName !== "ai") {
        violations.push(
          `packages/${packageName}/package.json: provider SDK ${dependency} belongs only in @jewelo/ai`,
        );
      }
      if (dependency.startsWith("@supabase/") && packageName !== "data") {
        violations.push(
          `packages/${packageName}/package.json: Supabase SDK belongs only in @jewelo/data`,
        );
      }
      if (dependency.startsWith("@trigger.dev/")) {
        violations.push(
          `packages/${packageName}/package.json: Trigger.dev belongs only in apps/jobs`,
        );
      }
    }
  }
  return violations;
}

if (proveNegative) {
  const fixtureRoot = path.join(root, "scripts/fixtures/boundary-invalid");
  const violations = violationsFor(filesUnder(fixtureRoot));
  const requiredProofs = [
    "provider SDK",
    "Supabase SDK",
    "relative import crosses",
  ];
  if (
    requiredProofs.some(
      (proof) => !violations.some((violation) => violation.includes(proof)),
    )
  ) {
    console.error(
      "Boundary negative proof failed: one or more invalid fixture classes were accepted.",
    );
    process.exit(1);
  }
  console.log("Boundary negative proof passed; rejected fixtures:");
  for (const violation of violations) console.log(`- ${violation}`);
  process.exit(0);
}

const files = [
  ...filesUnder(path.join(root, "packages")),
  ...filesUnder(path.join(root, "apps")),
];
const violations = [...violationsFor(files), ...dependencyViolations()];
if (violations.length > 0) {
  console.error("Architecture boundary violations:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log(
  `Architecture boundaries passed across ${files.length} source files.`,
);
