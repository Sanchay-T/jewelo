// The prompt proof: what production compiles is what the lab measured.
//
// Every studio prompt in this repository's Runway labs was approved by eye on
// gpt-image-2.5-sunburst, the model production calls. A prompt that drifts by
// one word after that approval is a prompt nobody approved, and nothing else
// in the pipeline would notice. So this script compiles the production studio
// sheet - the real `image.packshot` template, the real
// `buildPromptVariableSnapshot`, the real `compileStillPrompt` - for each lab
// case and compares it byte for byte with the lab file that was approved.
//
// Cases:
//   `docs/goals/road-to-gold/lab-2026-09-22/final/*.txt`   the minimal
//     style-first family, all four constructions, 22 September 2026.
//   `docs/goals/road-to-gold/lab-2026-09-23-origami/prompts/v3-{asma,love}.txt`
//     the V3 refined folded origami sheet, 23 September 2026, which supersedes
//     the 22 September origami-ribbon prompts. Those five superseded files are
//     listed as `superseded` rather than compared: the compiler is expected to
//     disagree with them.
//   `docs/goals/road-to-gold/lab-2026-09-24-free-route/prompts/*.txt`  the
//     free-route studio family, 24 September 2026: no stencil image, so the
//     words are the only authority for the spelling and the single piece. Each
//     cell is also asserted to really route free through `stillRoute`.
//
// Run it (Node is pinned to 24.18.1):
//   corepack pnpm --filter @jewelo/jobs lab-diff
//
// Exit 0 only when every compared case is byte-identical to its lab file apart
// from a delta the case declares and explains. Anything else is printed line by
// line and exits 1. Nothing here is paid, nothing here touches the network or
// the database.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BASELINE_PROMPT_TEMPLATES,
  buildPromptVariableSnapshot,
  compileStillPrompt,
  STILL_COMPILER_VERSION,
} from "@jewelo/ai";
import { stillRoute } from "@jewelo/identity";

const REPO_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const LAB_0922 = "docs/goals/road-to-gold/lab-2026-09-22/final";
const LAB_0923 = "docs/goals/road-to-gold/lab-2026-09-23-origami/prompts";

/** The specification fields the lab's own sheets state, and nothing else. */
const LAB_DIMENSIONS = { widthMm: 32, heightMm: 12, thicknessMm: 1.2 };

type Case = {
  file: string;
  construction: string;
  name: string;
  language: "en" | "ar";
  metalColor: string;
  stones?: string;
  /**
   * A lab line production is expected to disagree with, and why. Anything else
   * that differs is drift and fails the run.
   */
  allowedDelta?: { line: RegExp; why: string };
};

/** The four names the labs drew, by the token their filenames use. */
const NAMES: Readonly<Record<string, { name: string; language: "en" | "ar" }>> =
  {
    asma: { name: "Asma", language: "en" },
    "asma-ar": { name: "أسماء", language: "ar" },
    muhammad: { name: "Muhammad", language: "en" },
    noor: { name: "Noor", language: "en" },
    love: { name: "Love", language: "en" },
  };

const CONSTRUCTIONS = [
  "classical",
  "origami-ribbon",
  "framed-minimal",
  "diamond-rails",
] as const;

/** The 22 September family: four constructions x five pieces. */
const LAB_0922_PIECES: readonly {
  slug: string;
  name: string;
  stones?: string;
}[] = [
  { slug: "plain-asma", name: "asma" },
  { slug: "plain-asma-ar", name: "asma-ar" },
  { slug: "plain-muhammad", name: "muhammad" },
  { slug: "plain-noor", name: "noor" },
  { slug: "stones-muhammad", name: "muhammad", stones: "lab-diamond" },
];

/**
 * The 22 September origami prompts the V3 sheet replaces. They stay on disk as
 * the lineage of what was tried; comparing against them would assert the
 * opposite of what shipped.
 */
const SUPERSEDED = new Set(
  LAB_0922_PIECES.map(
    (piece) => `${LAB_0922}/origami-ribbon-${piece.slug}.txt`,
  ),
);

/**
 * `classical` draws Playfair italic in the approved casing, not capitals
 * (`CONSTRUCTION_LETTERING` in `@jewelo/identity`, commit bbf7e7a, 23 Sep
 * 2026, after this lab was shot). The sheet names the piece by the text the
 * stencil cuts, so its Name line says "Asma" where the lab file says "ASMA".
 * Arabic is unaffected, and so is every other line.
 */
const CLASSICAL_CASING_DELTA = {
  line: /^Name: /,
  why: "classical draws the approved casing, not capitals (bbf7e7a)",
} as const;

const cases: Case[] = [
  ...CONSTRUCTIONS.flatMap((construction) =>
    LAB_0922_PIECES.map((piece) => ({
      file: `${LAB_0922}/${construction}-${piece.slug}.txt`,
      construction,
      ...NAMES[piece.name]!,
      metalColor: "yellow",
      stones: piece.stones,
      ...(construction === "classical" && NAMES[piece.name]!.language === "en"
        ? { allowedDelta: CLASSICAL_CASING_DELTA }
        : {}),
    })),
  ).filter((testCase) => !SUPERSEDED.has(testCase.file)),
  {
    file: `${LAB_0923}/v3-asma.txt`,
    construction: "origami-ribbon",
    ...NAMES.asma!,
    metalColor: "yellow",
  },
  {
    file: `${LAB_0923}/v3-love.txt`,
    construction: "origami-ribbon",
    ...NAMES.love!,
    metalColor: "rose",
  },
];

function compile(
  testCase: Case,
  route: "free" | "stencil" = "stencil",
): string {
  const variables = buildPromptVariableSnapshot({
    approvedName: testCase.name,
    language: testCase.language,
    route,
    specification: {
      construction: testCase.construction,
      arabicStyle: testCase.language === "ar" ? "kufi" : "none",
      layout: "single-name",
      connector: "none",
      metalKarat: "18K",
      metalColor: testCase.metalColor,
      finish: "polished",
      stoneCoverage: testCase.stones ? "accent" : "none",
      gemstone: testCase.stones ?? "none",
      sizeProfile: "classic",
      dimensions: LAB_DIMENSIONS,
      chain: { style: "cable", lengthCm: 45 },
    },
    presentationView: "studio",
  });
  return compileStillPrompt({
    profile: "image.packshot",
    template: BASELINE_PROMPT_TEMPLATES["image.packshot"],
    variables,
    references: {
      stencil: route === "stencil",
      master: false,
      look: true,
      style: false,
      inspiration: false,
    },
  }).compiledPrompt;
}

/** Every line that differs, so a drift can never hide behind an earlier one. */
function divergences(
  expected: string,
  actual: string,
): { index: number; lab: string; production: string }[] {
  const want = expected.split("\n");
  const got = actual.split("\n");
  const rows = [];
  for (let index = 0; index < Math.max(want.length, got.length); index += 1)
    if (want[index] !== got[index])
      rows.push({
        index,
        lab: want[index] ?? "<end of file>",
        production: got[index] ?? "<end of file>",
      });
  return rows;
}

let failed = 0;
console.log(`compiler ${STILL_COMPILER_VERSION}`);
for (const testCase of cases) {
  const expected = readFileSync(join(REPO_ROOT, testCase.file), "utf8");
  const rows = divergences(expected, compile(testCase));
  const unexpected = rows.filter(
    (row) => !testCase.allowedDelta?.line.test(row.lab),
  );
  if (!rows.length) {
    console.log(`MATCH  ${testCase.file}`);
    continue;
  }
  if (!unexpected.length) {
    console.log(
      `MATCH  ${testCase.file}  (expected delta: ${testCase.allowedDelta!.why})`,
    );
    continue;
  }
  failed += 1;
  console.log(`DIFFER ${testCase.file}`);
  for (const row of unexpected)
    console.log(
      [
        `  line ${row.index + 1}`,
        `  - lab        ${JSON.stringify(row.lab)}`,
        `  + production ${JSON.stringify(row.production)}`,
      ].join("\n"),
    );
}
for (const file of SUPERSEDED)
  console.log(`superseded (not compared)  ${file}`);
console.log(
  `${cases.length - failed}/${cases.length} compiled studio prompts match their lab file, apart from the declared deltas above`,
);

/**
 * A reference tag that never became an image number used to be left in the
 * text, so the model was sent the literal word "@style" pointing at nothing.
 * `@style` is the tag that can really be orphaned on a studio packshot: that
 * profile is refused a style anchor, so no file is ever numbered for it.
 */
const ORPHAN_TAG_TEMPLATE = `${BASELINE_PROMPT_TEMPLATES["image.packshot"]}\nMatch the light of @style.`;
let orphanTagCaught = "";
try {
  compileStillPrompt({
    profile: "image.packshot",
    template: ORPHAN_TAG_TEMPLATE,
    variables: buildPromptVariableSnapshot({
      approvedName: "Asma",
      language: "en",
      specification: {
        construction: "classical",
        arabicStyle: "none",
        layout: "single-name",
        metalKarat: "18K",
        metalColor: "yellow",
        finish: "polished",
        stoneCoverage: "none",
        gemstone: "none",
        sizeProfile: "classic",
        dimensions: LAB_DIMENSIONS,
        chain: { style: "cable", lengthCm: 45 },
      },
      presentationView: "studio",
    }),
    references: { master: false, look: true, style: false, inspiration: false },
  });
} catch (error) {
  orphanTagCaught = error instanceof Error ? error.message : String(error);
}
if (orphanTagCaught.startsWith("still_unresolved_reference_tag")) {
  console.log(`MATCH  unresolved @tag refused (${orphanTagCaught})`);
} else {
  failed += 1;
  console.log(
    `DIFFER an unresolved @tag survived compilation: ${orphanTagCaught || "no error thrown"}`,
  );
}

/**
 * The three dependent views must still compile on the stencil route. The
 * unresolved-tag check once read the IMAGE ROLES header too, whose `master`
 * rule says "@stencil", and refused every on-skin, close-up and dark view on
 * staging (run 4cfd9a5b, 24 September 2026) while the studio went through.
 */
for (const [profile, view] of [
  ["image.worn", "on_skin"],
  ["image.macro_gift", "close_up"],
  ["image.dark_editorial", "dark"],
] as const)
for (const construction of ["classical", "origami-ribbon", "framed-minimal", "diamond-rails"]) {
  try {
    compileStillPrompt({
      profile,
      template: BASELINE_PROMPT_TEMPLATES[profile],
      variables: buildPromptVariableSnapshot({
        approvedName: "Asma",
        language: "en",
        specification: {
          construction,
          arabicStyle: "none",
          layout: "single-name",
          metalKarat: "18K",
          metalColor: "yellow",
          finish: "polished",
          stoneCoverage: "none",
          gemstone: "none",
          sizeProfile: "classic",
          dimensions: LAB_DIMENSIONS,
          chain: { style: "cable", lengthCm: 45 },
        },
        presentationView: view,
      }),
      references: { master: true, look: true, style: true, inspiration: true },
    });
    console.log(`MATCH  ${profile} ${construction} compiles with every reference`);
  } catch (error) {
    failed += 1;
    console.log(`DIFFER ${profile} ${construction} refused: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * The free-route family (SP-2d, 24 September 2026). Same proof as above and for
 * the same reason: `docs/goals/road-to-gold/lab-2026-09-24-free-route/prompts/`
 * holds the exact bytes that were generated and judged on Runway, so a later
 * word change in the free construction paragraphs or in `name_spelling` has to
 * fail here rather than quietly reach a customer.
 *
 * Every cell must also really route free - `stillRoute` is the gate production
 * uses - otherwise the file would be a prompt no shopper can ever get.
 */
const LAB_FREE = "docs/goals/road-to-gold/lab-2026-09-24-free-route/prompts";
const FREE_CASES: readonly Case[] = [
  { file: `${LAB_FREE}/classical-muhammad-ar.txt`, construction: "classical", name: "محمد", language: "ar", metalColor: "yellow" },
  { file: `${LAB_FREE}/origami-ribbon-muhammad-ar.txt`, construction: "origami-ribbon", name: "محمد", language: "ar", metalColor: "yellow" },
  { file: `${LAB_FREE}/framed-minimal-muhammad-ar.txt`, construction: "framed-minimal", name: "محمد", language: "ar", metalColor: "yellow" },
  { file: `${LAB_FREE}/diamond-rails-muhammad-ar.txt`, construction: "diamond-rails", name: "محمد", language: "ar", metalColor: "yellow" },
  { file: `${LAB_FREE}/classical-layla-ar.txt`, construction: "classical", name: "ليلى", language: "ar", metalColor: "yellow" },
  { file: `${LAB_FREE}/framed-minimal-salma-ar.txt`, construction: "framed-minimal", name: "سلمى", language: "ar", metalColor: "yellow" },
  { file: `${LAB_FREE}/classical-muhammad-en.txt`, construction: "classical", ...NAMES.muhammad!, metalColor: "yellow" },
  { file: `${LAB_FREE}/classical-omar-en.txt`, construction: "classical", name: "Omar", language: "en", metalColor: "yellow" },
  { file: `${LAB_FREE}/classical-love-en.txt`, construction: "classical", ...NAMES.love!, metalColor: "rose" },
  { file: `${LAB_FREE}/classical-asma-en.txt`, construction: "classical", ...NAMES.asma!, metalColor: "yellow" },
];
for (const testCase of FREE_CASES) {
  const decision = stillRoute({
    approvedText: testCase.name,
    language: testCase.language,
    specification: { layout: "single-name", construction: testCase.construction },
  });
  if (decision.route !== "free") {
    failed += 1;
    console.log(
      `DIFFER ${testCase.file} does not route free: ${decision.reasons.join(", ")}`,
    );
    continue;
  }
  const expected = readFileSync(join(REPO_ROOT, testCase.file), "utf8");
  const rows = divergences(expected, compile(testCase, "free"));
  if (!rows.length) {
    console.log(`MATCH  ${testCase.file}`);
    continue;
  }
  failed += 1;
  console.log(`DIFFER ${testCase.file}`);
  for (const row of rows)
    console.log(
      [
        `  line ${row.index + 1}`,
        `  - lab        ${JSON.stringify(row.lab)}`,
        `  + production ${JSON.stringify(row.production)}`,
      ].join("\n"),
    );
}
console.log(
  `${FREE_CASES.length} free-route studio prompts compared against their lab file`,
);

if (failed) process.exitCode = 1;
