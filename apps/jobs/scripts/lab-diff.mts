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
//     cell is also asserted to really route free through `stillRoute`; the two
//     cells the lab broke (classical ليلى, origami-ribbon محمد) now route to the
//     stencil and are listed as evidence rather than compared.
//
// Run it (Node is pinned to 24.18.1):
//   corepack pnpm --filter @jewelo/jobs lab-diff
//
// Exit 0 only when every compared case is byte-identical to its lab file apart
// from a delta the case declares and explains. Anything else is printed line by
// line and exits 1. Nothing here is paid, nothing here touches the network or
// the database.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BASELINE_PROMPT_TEMPLATES,
  buildPromptVariableSnapshot,
  buildStillReferences,
  compileStillPrompt,
  PRESENTATION_ASPECT_RATIO,
  STILL_COMPILER_VERSION,
  stillLookReferenceRequired,
} from "@jewelo/ai";
import { stillRoute } from "@jewelo/identity";

import { SupabasePresentationRepository } from "../src/presentation";

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
 * The three dependent views must still compile on the stencil route, to the
 * same bytes. The unresolved-tag check once read the IMAGE ROLES header too,
 * whose `master` rule says "@stencil", and refused every on-skin, close-up and
 * dark view on staging (run 4cfd9a5b, 24 September 2026) while the studio went
 * through. SP-2f1 turned the four @stencil sentences of these templates into
 * route variables; the hashes below were captured from HEAD acd33fa (before
 * that change, templates with the sentences written inline, which is the `@v2`
 * text) for Asma, master + look + style, without and with inspiration. A
 * stencil-route `@v3` release must compile to exactly these bytes.
 */
const STENCIL_DEPENDENT_SHA256: Readonly<Record<string, string>> = {
  "image.worn classical false": "b043d5453011d5d6be8197674e5090b9c5cefc5be45b399639f9e939cf40dd67",
  "image.worn classical true": "053a2089252751e53fbfed3c0ce5593891eec9fb5793063f136e1382dc1e0613",
  "image.worn origami-ribbon false": "0c13be0361c1575d313a85e1a62374c96a6aef29c2d79152110d7cc42740dca6",
  "image.worn origami-ribbon true": "c52eebed95a514686eac0271423ec534d45157fdb55e3f5ce921b1e66035548f",
  "image.worn framed-minimal false": "da6ac37cd44664c543feaa4fe9ece95d30d84e7869a088d7f86c5b60d89e1e81",
  "image.worn framed-minimal true": "778014330cc7fd79610a39ffbd4587ed5faa54f45196fa647967eb63304ddbf6",
  "image.worn diamond-rails false": "1371839c04376560de281f95667630d84b93ba4fff0015c02d269d88c69eccb0",
  "image.worn diamond-rails true": "cd3c5c5d3efdc5168fa682e9147ddb040eb441a7a4dcbe698c5d23d899e5010b",
  "image.macro_gift classical false": "c447f3abe2d52ba040697f6190a7f180d3a795189a6d31a8610c2aaa1f69a390",
  "image.macro_gift classical true": "142ee090f2f9d4a10ee84979165551c6c47732d37e01e9e07954726a81ddccc8",
  "image.macro_gift origami-ribbon false": "a8089381bcbe7a21b44fb44fee3bd2612cd2e16042e23ea54ed691a8e13ce0ed",
  "image.macro_gift origami-ribbon true": "eb454ca336cfbdcdab92a7e458cab4a3d52d9e41db404a405a0cfcfcaf2ac854",
  "image.macro_gift framed-minimal false": "25463f5746dc1144919b585e7e908ee339d167a44c9822d6e87401c9847549f2",
  "image.macro_gift framed-minimal true": "6f6d3563f52bd82723bb5ddd1f211aa43b124a99626397403b06cc910813880b",
  "image.macro_gift diamond-rails false": "8e3f6d7b7d5155e09ad9a04e926e7d56bba82e85562e79f56f9f7d41f48d6760",
  "image.macro_gift diamond-rails true": "3b8da24baec2000a3cac0710b82d253faa54f25284e9ba887eb49990dfef375c",
  "image.dark_editorial classical false": "d289ea1ed9f868dc66175335424c58f434cc91845a8f481d8a0040918743dbf2",
  "image.dark_editorial classical true": "3030237f56a45c01724d81b032e4eb4c90966f6a843ca68c1f7ed2c7e8037721",
  "image.dark_editorial origami-ribbon false": "52fa8207815aa76f44041749e5072762ea678513bd1c6a4efef5bfc7a9a223c4",
  "image.dark_editorial origami-ribbon true": "f21242af2726a34b042be4885981b3bc54eb1df6e50d27791bc4eb830c6414ff",
  "image.dark_editorial framed-minimal false": "9a6b8a4beadbdb186191e16e9e2a019b745bb8839716043200707cc5256917bb",
  "image.dark_editorial framed-minimal true": "95d2db37c2f95d41bee590b21b7ba39dc26cb2918eb8f5601e680385a6999d62",
  "image.dark_editorial diamond-rails false": "ef8b0b94a8485f6dbc6c6b6d3e89e939274032915c9aa9eacf79b19f9c1049fd",
  "image.dark_editorial diamond-rails true": "afb25d4343ba9c48b33384ca24af6a59a74a9d1c352de4f1571ced41653302bb",
};
const DEPENDENT_VIEWS = [
  ["image.worn", "on_skin"],
  ["image.macro_gift", "close_up"],
  ["image.dark_editorial", "dark"],
] as const;
function compileDependent(
  testCase: Pick<Case, "construction" | "name" | "language" | "metalColor">,
  profile: (typeof DEPENDENT_VIEWS)[number][0],
  view: string,
  route: "free" | "stencil",
  // `stencil` defaults to the route, which is what production always sends; it
  // is overridable only so the route/variables guard below can be exercised.
  references: { master: boolean; inspiration: boolean; stencil?: boolean },
  template: string = BASELINE_PROMPT_TEMPLATES[profile],
) {
  return compileStillPrompt({
    profile,
    template,
    variables: buildPromptVariableSnapshot({
      approvedName: testCase.name,
      language: testCase.language,
      route,
      specification: {
        construction: testCase.construction,
        arabicStyle: testCase.language === "ar" ? "kufi" : "none",
        layout: "single-name",
        metalKarat: "18K",
        metalColor: testCase.metalColor,
        finish: "polished",
        stoneCoverage: "none",
        gemstone: "none",
        sizeProfile: "classic",
        dimensions: LAB_DIMENSIONS,
        chain: { style: "cable", lengthCm: 45 },
      },
      presentationView: view,
    }),
    references: {
      stencil: references.stencil ?? route === "stencil",
      master: references.master,
      look: stillLookReferenceRequired(testCase.construction),
      style: true,
      inspiration: references.inspiration,
    },
  });
}
for (const [profile, view] of DEPENDENT_VIEWS)
for (const construction of CONSTRUCTIONS)
for (const inspiration of [false, true]) {
  const key = `${profile} ${construction} ${inspiration}`;
  try {
    const { sha256 } = compileDependent(
      { construction, ...NAMES.asma!, metalColor: "yellow" },
      profile,
      view,
      "stencil",
      { master: true, inspiration },
    );
    if (sha256 === STENCIL_DEPENDENT_SHA256[key])
      console.log(`MATCH  stencil ${key} byte-identical to HEAD (${sha256.slice(0, 12)})`);
    else {
      failed += 1;
      console.log(`DIFFER stencil ${key} ${sha256} (HEAD ${STENCIL_DEPENDENT_SHA256[key]})`);
    }
  } catch (error) {
    failed += 1;
    console.log(`DIFFER stencil ${key} refused: ${error instanceof Error ? error.message : String(error)}`);
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
  { file: `${LAB_FREE}/framed-minimal-muhammad-ar.txt`, construction: "framed-minimal", name: "محمد", language: "ar", metalColor: "yellow" },
  { file: `${LAB_FREE}/diamond-rails-muhammad-ar.txt`, construction: "diamond-rails", name: "محمد", language: "ar", metalColor: "yellow" },
  { file: `${LAB_FREE}/framed-minimal-salma-ar.txt`, construction: "framed-minimal", name: "سلمى", language: "ar", metalColor: "yellow" },
  { file: `${LAB_FREE}/classical-muhammad-en.txt`, construction: "classical", ...NAMES.muhammad!, metalColor: "yellow" },
  { file: `${LAB_FREE}/classical-omar-en.txt`, construction: "classical", name: "Omar", language: "en", metalColor: "yellow" },
  { file: `${LAB_FREE}/classical-love-en.txt`, construction: "classical", ...NAMES.love!, metalColor: "rose" },
  { file: `${LAB_FREE}/classical-asma-en.txt`, construction: "classical", ...NAMES.asma!, metalColor: "yellow" },
];
/**
 * Lab files kept as the evidence for why the route narrowed, not compared: the
 * lab showed a free prompt breaks these two, so `stillRoute` now sends them to
 * the stencil and no shopper can get these bytes (ledger in the lab folder).
 */
const FREE_EVIDENCE_ONLY = [
  `${LAB_FREE}/classical-layla-ar.txt`, // dots under ي touched at a corner or hung, 0 of 2 one piece
  `${LAB_FREE}/origami-ribbon-muhammad-ar.txt`, // م lost its loop, read لحمد / الحد, 0 of 2 spelled
];

/**
 * The route rules the free-route lab put in place, the cells it kept free, and
 * the unproven cases closed wide after review.
 */
const ROUTE_EXPECTATIONS: readonly {
  label?: string;
  name: string;
  language?: "ar" | "en";
  construction?: string;
  names?: { approvedEnglishText?: string; approvedArabicText?: string }[];
  route: "free" | "stencil";
  reason?: string;
}[] = [
  { name: "ليلى", construction: "classical", route: "stencil", reason: "arabic_letter_not_proven" },
  { name: "محمد", construction: "origami-ribbon", route: "stencil", reason: "arabic_print_construction:origami-ribbon" },
  { name: "محمد", construction: "classical", route: "free" },
  { name: "سلمى", construction: "framed-minimal", route: "free" },
  { name: "محمد", route: "stencil", reason: "arabic_construction_unknown" },
  // محمد typed in presentation forms: meem initial, hah medial, meem medial, dal final.
  { label: "محمد (presentation forms)", name: "\ufee3\ufea4\ufee4\ufeaa", construction: "classical", route: "stencil", reason: "arabic_presentation_form" },
  { name: "ملأ", construction: "classical", route: "stencil", reason: "arabic_letter_not_proven" }, // final أ is its only problem
  { label: "محمد (shadda)", name: "مح\u0651مد", construction: "classical", route: "stencil", reason: "combining_mark" },
  { label: "bare fatha U+064E", name: "\u064e", construction: "classical", route: "stencil", reason: "no_letter" },
  { label: "Aylı + U+0307 + n", name: "Ayl\u0131\u0307n", language: "en", construction: "classical", route: "stencil", reason: "combining_mark" },
  { name: "OMar", language: "en", construction: "classical", route: "stencil", reason: "latin_inner_capital" },
  { name: "McDonald", language: "en", construction: "classical", route: "stencil", reason: "latin_inner_capital" },
  { label: "Omar approved as Tijani", name: "Omar", language: "en", construction: "classical", names: [{ approvedEnglishText: "Tijani" }], route: "stencil", reason: "approved_text_mismatch" },
];
for (const expectation of ROUTE_EXPECTATIONS) {
  const decision = stillRoute({
    approvedText: expectation.name,
    language: expectation.language ?? "ar",
    specification: {
      layout: "single-name",
      construction: expectation.construction,
      names: expectation.names,
    },
  });
  const label = `${expectation.construction ?? "no construction"} ${expectation.label ?? expectation.name} routes ${expectation.route}`;
  const reasonOk = !expectation.reason || decision.reasons.includes(expectation.reason);
  if (decision.route === expectation.route && reasonOk) {
    console.log(`MATCH  ${label}${expectation.reason ? ` (${expectation.reason})` : ""}`);
  } else {
    failed += 1;
    console.log(`DIFFER ${label}: got ${decision.route} [${decision.reasons.join(", ")}]`);
  }
}

/**
 * Pin the Arabic rule itself, not samples: every code point in the Arabic
 * blocks, drawn last (after مم) and in the middle (between م and م), classical.
 * Last, exactly the allowlist may route free; in the middle, exactly the
 * allowlist minus the letters that do not join forward.
 */
const ARABIC_FREE = "ا ح د ر س ص ط ع ل م ه و ى".split(" ");
const ARABIC_NON_JOINING = new Set("ا د ر و ى".split(" "));
const arabicBlocks: [number, number][] = [[0x0600, 0x06ff], [0x0750, 0x077f], [0x08a0, 0x08ff]];
const freeAs = (wrap: (letter: string) => string): string[] => {
  const free: string[] = [];
  for (const [from, to] of arabicBlocks)
    for (let codePoint = from; codePoint <= to; codePoint += 1) {
      const letter = String.fromCodePoint(codePoint);
      const decision = stillRoute({
        approvedText: wrap(letter),
        language: "ar",
        specification: { layout: "single-name", construction: "classical" },
      });
      if (decision.route === "free") free.push(letter);
    }
  return free;
};
for (const [where, got, want] of [
  ["last", freeAs((l) => `مم${l}`), ARABIC_FREE],
  ["middle", freeAs((l) => `م${l}م`), ARABIC_FREE.filter((l) => !ARABIC_NON_JOINING.has(l))],
] as const) {
  const line = `Arabic letters that route free as the ${where} letter: ${got.join(" ")}`;
  if (got.join(" ") === want.join(" ")) console.log(`MATCH  ${line}`);
  else {
    failed += 1;
    console.log(`DIFFER ${line} (want ${want.join(" ")})`);
  }
}

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
for (const file of FREE_EVIDENCE_ONLY)
  console.log(`evidence, routes stencil now (not compared)  ${file}`);
console.log(
  `${FREE_CASES.length} free-route studio prompts compared against their lab file`,
);

/**
 * The free dependent sheet (SP-2f1, 24 September 2026): the eight cells that
 * still route free x on skin, close up, dark, compiled on the free route with
 * the approved studio still as @master. These are the bytes SP-2f2 runs on the
 * lab, so the files are pinned like every other lab prompt: a word change
 * fails here. `--write-free-dependent` (re)writes the prompts and index.json;
 * without it every file is compared. No compiled prompt may mention a stencil.
 */
const LAB_FREE_DEPENDENT = "docs/goals/road-to-gold/lab-2026-09-24-free-dependent";
const WRITE_FREE_DEPENDENT = process.argv.includes("--write-free-dependent");
const freeDependentIndex = [];
for (const testCase of FREE_CASES)
for (const [profile, view] of DEPENDENT_VIEWS) {
  const cell = basename(testCase.file, ".txt");
  const file = `${LAB_FREE_DEPENDENT}/prompts/${cell}-${view}.txt`;
  let compiled;
  try {
    compiled = compileDependent(testCase, profile, view, "free", { master: true, inspiration: false });
  } catch (error) {
    failed += 1;
    console.log(`DIFFER free ${cell} ${view} refused: ${error instanceof Error ? error.message : String(error)}`);
    continue;
  }
  const stencilWords = compiled.compiledPrompt.match(/stencil/gi)?.length ?? 0;
  const references = buildStillReferences({
    route: "free",
    referenceImageUrl: "master",
    lookReferenceUrl: stillLookReferenceRequired(testCase.construction) ? "look" : undefined,
    styleAnchorUrl: "style",
  }).map(({ role }) => role);
  freeDependentIndex.push({
    cell,
    view,
    profile,
    file: `prompts/${cell}-${view}.txt`,
    name: testCase.name,
    language: testCase.language,
    construction: testCase.construction,
    metal: `18K ${testCase.metalColor} gold, polished`,
    route: "free",
    aspectRatio: PRESENTATION_ASPECT_RATIO[view],
    references,
    sha256: compiled.sha256,
  });
  const path = join(REPO_ROOT, file);
  if (WRITE_FREE_DEPENDENT) {
    mkdirSync(join(REPO_ROOT, LAB_FREE_DEPENDENT, "prompts"), { recursive: true });
    writeFileSync(path, compiled.compiledPrompt);
  }
  const onDisk = existsSync(path) ? readFileSync(path, "utf8") : undefined;
  if (stencilWords || onDisk !== compiled.compiledPrompt) {
    failed += 1;
    console.log(`DIFFER ${file}: ${stencilWords} "stencil", ${onDisk === undefined ? "missing" : onDisk === compiled.compiledPrompt ? "bytes match" : "bytes differ"}`);
  } else console.log(`MATCH  ${file}  0 "stencil"  [${references.join(", ")}] ${PRESENTATION_ASPECT_RATIO[view]}`);
}
const indexPath = join(REPO_ROOT, LAB_FREE_DEPENDENT, "index.json");
const indexJson = `${JSON.stringify({ lab: "lab-2026-09-24-free-dependent", task: "SP-2f1", compilerVersion: STILL_COMPILER_VERSION, cells: freeDependentIndex }, null, 2)}\n`;
if (WRITE_FREE_DEPENDENT) writeFileSync(indexPath, indexJson);
if (existsSync(indexPath) && readFileSync(indexPath, "utf8") === indexJson)
  console.log(`MATCH  ${LAB_FREE_DEPENDENT}/index.json  ${freeDependentIndex.length} free dependent prompts`);
else {
  failed += 1;
  console.log(`DIFFER ${LAB_FREE_DEPENDENT}/index.json missing or stale`);
}

/**
 * SP-2e1c: the stencil route's own roles and order, pinned beside the free
 * ones the sheet above records. The studio still on the stencil route carries
 * the letter drawing first and the look texture after it, and no sibling still
 * and no style photograph - that order is what the compiled "Image N (role)"
 * block numbers, so a change here has to fail rather than renumber silently.
 */
{
  const roles = buildStillReferences({
    route: "stencil",
    identityImageUrl: "identity",
    lookReferenceUrl: "look",
  }).map(({ role }) => role);
  const want = ["stencil", "look"];
  if (roles.join(", ") === want.join(", "))
    console.log(`MATCH  stencil route references [${roles.join(", ")}]`);
  else {
    failed += 1;
    console.log(`DIFFER stencil route references [${roles.join(", ")}] (want [${want.join(", ")}])`);
  }
}

/**
 * SP-2e1d m5: the stencil route's DEPENDENT view order - the approved studio
 * still as `master`, then the letter drawing, then the look texture, then the
 * style photograph. The studio pin above covers only the two-file studio call,
 * so a renumbering of the three views it does not touch had nothing to fail
 * against. SP-2e1h: as with the inspiration pin below, what this guards is
 * `buildStillReferences` alone; the arguments `executePresentationTask` hands
 * it at its `generator.generate` call (`apps/jobs/src/presentation.ts`) are
 * passed by property name and are NOT guarded here.
 */
{
  const roles = buildStillReferences({
    route: "stencil",
    referenceImageUrl: "master",
    identityImageUrl: "identity",
    lookReferenceUrl: "look",
    styleAnchorUrl: "style",
  }).map(({ role }) => role);
  const want = ["master", "stencil", "look", "style"];
  if (roles.join(", ") === want.join(", "))
    console.log(`MATCH  stencil route dependent references [${roles.join(", ")}]`);
  else {
    failed += 1;
    console.log(`DIFFER stencil route dependent references [${roles.join(", ")}] (want [${want.join(", ")}])`);
  }
}

/**
 * SP-2e1e: the same two orders when the shopper attached an inspiration
 * photo. What these pins guard is `buildStillReferences` alone: given an
 * inspiration URL it appends that role after the style photograph, so within
 * the builder the attachment can only ever be the final image and can never
 * displace the letter drawing the spelling rule numbers. SP-2e1f: the order of
 * the arguments `executePresentationTask` hands the builder at its
 * `generator.generate` call (`apps/jobs/src/presentation.ts`) is NOT guarded
 * here - a pin below would only restate the builder's own signature.
 */
for (const [label, input, want] of [
  [
    "studio",
    { route: "stencil", identityImageUrl: "identity", lookReferenceUrl: "look", inspirationImageUrl: "inspiration" },
    ["stencil", "look", "inspiration"],
  ],
  [
    "dependent",
    {
      route: "stencil",
      referenceImageUrl: "master",
      identityImageUrl: "identity",
      lookReferenceUrl: "look",
      styleAnchorUrl: "style",
      inspirationImageUrl: "inspiration",
    },
    ["master", "stencil", "look", "style", "inspiration"],
  ],
] as const) {
  const roles = buildStillReferences(input).map(({ role }) => role);
  if (roles.join(", ") === want.join(", "))
    console.log(`MATCH  stencil route ${label} references with inspiration [${roles.join(", ")}]`);
  else {
    failed += 1;
    console.log(`DIFFER stencil route ${label} references with inspiration [${roles.join(", ")}] (want [${want.join(", ")}])`);
  }
}

/**
 * A free dependent view without its approved studio still has no authority for
 * the piece at all, and a free prompt that still says @stencil (a `@v2`
 * release) points at an image nobody sent. Both are refused before spend.
 */
for (const [label, run, want] of [
  [
    "free image.worn without master",
    () => compileDependent({ construction: "classical", ...NAMES.asma!, metalColor: "yellow" }, "image.worn", "on_skin", "free", { master: false, inspiration: false }),
    "still_master_required",
  ],
  [
    "free image.worn on a @v2 template (@stencil inline)",
    () => compileDependent({ construction: "classical", ...NAMES.asma!, metalColor: "yellow" }, "image.worn", "on_skin", "free", { master: true, inspiration: false },
      BASELINE_PROMPT_TEMPLATES["image.worn"].replace("{{spelling_rule}}", "Exact spelling and glyph order from @stencil.")),
    "still_unresolved_reference_tag:@stencil",
  ],
  // SP-2e1c: the route/variables guard. Free-route words compiled with the
  // stencil image attached (and the reverse) would number images the request
  // does not carry, so both are refused before anything is spent.
  [
    "free image.worn variables with the stencil attached",
    () => compileDependent({ construction: "classical", ...NAMES.asma!, metalColor: "yellow" }, "image.worn", "on_skin", "free", { master: true, inspiration: false, stencil: true }),
    "still_route_variables_mismatch:variables=free,references=stencil",
  ],
  [
    "stencil image.worn variables with no stencil attached",
    () => compileDependent({ construction: "classical", ...NAMES.asma!, metalColor: "yellow" }, "image.worn", "on_skin", "stencil", { master: true, inspiration: false, stencil: false }),
    "still_route_variables_mismatch:variables=stencil,references=free",
  ],
] as const) {
  let caught = "";
  try {
    run();
  } catch (error) {
    caught = error instanceof Error ? error.message : String(error);
  }
  if (caught === want) console.log(`MATCH  ${label} refused (${caught})`);
  else {
    failed += 1;
    console.log(`DIFFER ${label}: ${caught || "no error thrown"}`);
  }
}

/**
 * SP-2e2 / D-024: the switch itself, through the exact call
 * `executePresentationTask` makes for a studio still
 * (`repository.studioStillRoute(revision)`), not through `stillRoute` again.
 *
 * With `STILL_FREE_ROUTE` off - what production runs until the switch is set -
 * every studio still is stencil, whatever the name. With it on, a proven-safe
 * name is photographed from the words and a dotted Arabic name still goes to
 * the stencil. The constructor takes no network: nothing here is paid and
 * nothing here connects.
 */
const routeRevision = (approvedText: string, language: "en" | "ar") => ({
  id: "revision",
  specification: { layout: "single-name", construction: "classical" },
  identity_anchor: {
    approvedText,
    language,
    typography: "caleums-arabic-v3",
    fingerprint: "fingerprint",
  },
});
for (const [name, language, freeRouteEnabled, want] of [
  ["Omar", "en", false, "stencil"],
  ["فاطمة", "ar", false, "stencil"],
  ["Omar", "en", true, "free"],
  ["فاطمة", "ar", true, "stencil"],
] as const) {
  const repository = new SupabasePresentationRepository(
    "https://lab.invalid",
    "no-key",
    false,
    false,
    new Set<string>(),
    "caleums-final-media-v2",
    new Map<string, string>(),
    freeRouteEnabled,
  );
  const got = repository.studioStillRoute(routeRevision(name, language));
  const label = `studio ${name} classical with STILL_FREE_ROUTE=${freeRouteEnabled ? 1 : 0} routes ${want}`;
  if (got === want) console.log(`MATCH  ${label}`);
  else {
    failed += 1;
    console.log(`DIFFER ${label}: got ${got}`);
  }
}

if (failed) process.exitCode = 1;
