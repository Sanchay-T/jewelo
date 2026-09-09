#!/usr/bin/env node
// Deterministic slot compiler for the CALEUMS universal still prompt family v4.
// Ordinary code fills the slots. No model writes or rewrites this prompt.
//
//   node docs/goals/overnight-launch/lab/compile.mjs \
//     --name Asma --script en --lettering Classic --look classical \
//     --view studio --metal "Yellow gold" --coverage "No stones" \
//     --gem none --size 32 --chain Cable
//
// Prints the compiled prompt and its sha256.
//
// Holdout policy (docs/TASKS.md P3-2). A name that has ever been used as a holdout is
// controlled: it compiles only against a prompt hash that lab/holdout.json has already
// frozen it under. A new release compiles to a new hash, so it needs fresh names frozen
// before its first image exists:
//
//   node docs/goals/overnight-launch/lab/compile.mjs --freeze-holdout "Sara,سارة" \
//     --name Sara --script en --lettering Classic --look framed-minimal --view studio
//
// Refusals print the hash and the name and exit non-zero. Names that were never holdouts
// (Asma, and any customer name) compile exactly as before.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const FAMILY = "caleums-universal-v4.3";

// ---------------------------------------------------------------- slot values

export const LOOKS = {
  classical: {
    label: "Classical",
    brief:
      "The letters themselves are the entire pendant. There is no frame, no plate, no rail and no border. " +
      "The outline of the piece is exactly the outline in Image 1. Stroke weight is even, edges are softly " +
      "rounded where a polishing wheel would reach, and the metal has a single consistent thickness.",
    rings:
      "Both jump rings sit exactly where Image 1 places them, grown out of the top edge of the lettering.",
  },
  "origami-ribbon": {
    label: "Origami ribbon",
    brief:
      "The outline is exactly Image 1, but the gold is a flat strip about 1.6 mm thick that has been " +
      "FOLDED into the shape of the name, the way a paper ribbon is folded. Every curve is replaced by a " +
      "run of straight flat facets that meet at sharp visible crease lines, so each stroke shows two or " +
      "three separate planes tilted at slightly different angles. Because the planes are tilted, each one " +
      "returns a different amount of light: one facet is bright, the facet next to it is clearly darker, " +
      "and the crease between them reads as a hard bright line. Where a stroke changes direction there is " +
      "a crisp mitred crease, never a smooth rounded bend. This is the difference from a plain nameplate: " +
      "a plain nameplate has one continuous polished surface, this piece is visibly built from angled " +
      "planes. The ribbon keeps a constant width and never doubles back over itself.",
    rings:
      "Both jump rings sit exactly where Image 1 places them, folded out of the top edge of the ribbon.",
  },
  "framed-minimal": {
    label: "Framed minimal",
    brief:
      "The lettering from Image 1 sits inside one thin plain rectangular gold frame with softly rounded " +
      "corners, cast as a single piece with the letters and joined to them where the strokes reach the " +
      "frame. The frame is a simple even bar with no ornament, no engraving and no second border. " +
      "The word is physically welded into the frame at no fewer than two separate places, and the " +
      "baseline of the word merges into the bottom bar of the frame so the metal is visibly continuous " +
      "from letter to frame. No letter, foot, tail or terminal ends in mid-air inside the frame, and the " +
      "word is never held by a single contact point - a name cantilevered from one corner is wrong. " +
      "The letters inside it keep exactly the shapes and spacing of Image 1.",
    rings:
      "Image 1 is the lettering only and deliberately carries no rings at all. The pendant's two jump " +
      "rings are cast into the two top corners of the frame and nowhere else. No eyelet, loop or ring " +
      "sits on top of any letter.",
  },
  "diamond-rails": {
    label: "Diamond rails",
    brief:
      "The lettering from Image 1 is held between two straight parallel gold rails, one running along the " +
      "top and one along the bottom, cast as a single piece with the letters that touch them. The rails are " +
      "narrow, flat and perfectly straight, the same metal as the letters. The letters between them keep " +
      "exactly the shapes and spacing of Image 1.",
    rings:
      "Image 1 is the lettering only and deliberately carries no rings at all. The pendant's two jump " +
      "rings are cast into the two outer ends of the rails and nowhere else. No eyelet, loop or ring " +
      "sits on top of any letter.",
  },
};

export const VIEWS = {
  studio: {
    label: "Studio",
    ratio: "1:1",
    brief:
      "A catalogue packshot. The pendant lies almost flat, seen from just off straight-on, filling most of " +
      "the frame with a small even margin. The whole pendant and both jump rings are inside the frame and " +
      "in focus. The chain runs away from both rings and settles in a relaxed curve on the surface. " +
      "Background is a plain warm off-white matte paper sweep.",
  },
  "on-skin": {
    label: "On skin",
    ratio: "4:5",
    brief:
      "The necklace worn by one adult woman, framed from the base of the neck to the top of the chest, face " +
      "out of frame. The pendant rests flat on the skin just below the collarbones and is fully readable, " +
      "sharp and unobstructed. Natural skin texture and a soft neutral top she is wearing. Daylight from a " +
      "large window on the left.",
  },
  "close-up": {
    label: "Close up",
    ratio: "1:1",
    brief:
      "A tight three-quarter macro of the pendant, angled so the thickness of the cast metal edge is visible " +
      "along the strokes, with one jump ring and the first links of the chain threaded through it clearly in " +
      "frame. Every letter of the name, including the last letter's final stroke and its terminal, sits fully " +
      "inside the frame with a clear band of background on all four sides. No part of the pendant touches " +
      "or crosses the frame edge - a name cropped at the edge is wrong. Shallow but sufficient depth of field so " +
      "the near edge is sharp and the far end falls off gently.",
  },
  dark: {
    label: "Dark",
    ratio: "9:16",
    brief:
      "A low-key editorial still. The pendant lies on a dark textured stone slab, lit by one narrow soft " +
      "source from the upper left so the gold reads as a bright edge against deep shadow, with a small amount " +
      "of fill so the letters never disappear into black. The whole pendant and both rings stay readable.",
  },
};

export const METALS = {
  "Yellow gold":
    "Solid 18K yellow gold, warm and slightly saturated, high polish. The reflections carry the warm gold " +
    "hue into the highlights and a darker warm brown into the shaded facets.",
  "White gold":
    "Solid 18K white gold, rhodium polished, cool neutral grey-white. Its reflections are neutral, never " +
    "yellow and never blue-chrome.",
  "Rose gold":
    "Solid 18K rose gold, a soft warm copper-pink, high polish. The pink reads in the mid tones, not only in " +
    "the highlights.",
};

export const COVERAGES = {
  "No stones": () =>
    "No stones anywhere on this piece. Every surface is plain polished gold. There is no pave, no accent " +
    "stone, no sparkle point and no setting of any kind.",
  Accent: (gem) =>
    `Exactly one small round ${gem}, bezel or prong set into the metal so the setting visibly grips the ` +
    `stone and the stone sits down in a seat, never floating on the surface. Every other surface is plain ` +
    `polished gold.`,
  "Partial pavé": (gem) =>
    `A single continuous row of small round ${gem} pave set into the upper half of the piece only, each ` +
    `stone seated in a drilled hole with visible beads of metal holding it. The lower half is plain polished ` +
    `gold. Stones follow the metal; none floats above it.`,
  "Full pavé": (gem) =>
    `Small round ${gem} pave set across the whole face of the piece, in even rows that follow the direction ` +
    `of each stroke, every stone seated in metal with visible retaining beads. The sides and back stay plain ` +
    `polished gold. No stone floats above the surface.`,
};

export const CHAINS = {
  Cable: "a fine round-link cable chain",
  Rolo: "a fine round rolo chain",
  Box: "a fine square box chain",
  Curb: "a fine flattened curb chain",
};

const SCRIPTS = { en: "English Latin letters", ar: "Arabic script, read right to left" };

// ------------------------------------------------------------------ template

export const TEMPLATE = `Photograph one real, physical, finished 18K gold name pendant necklace. {{view_label}} shot.

IMAGE ROLES
Image 1, tagged @stencil, is the exact shape and the exact spelling of this pendant, drawn as a black silhouette. It is not a drawing to be re-designed. Reproduce its outline, its letter shapes, its joins and its proportions exactly, rendered as solid cast gold in a real photograph. {{dependent_role}}

IDENTITY
The name is {{approved_name}}, written in {{script_text}}, in {{lettering}} lettering.
Every glyph, dot, mark and stroke in Image 1 appears in the photograph, in the same order, at the same place, at the same angle. Nothing is added, nothing is removed, nothing is rotated, nothing is duplicated, nothing is mirrored. Do not write the name a second time anywhere in the picture.

CASTING
This is one piece of gold, as if it came out of a single mould.
Every letter is physically fused to the next letter or to the part of the piece that holds it. There are no separate islands and no air gap that would make this two objects. Where Image 1 shows a bridge of metal between two shapes, that bridge is metal in the photograph. A jeweller could pick this whole pendant up as one object and nothing would fall off. If any letter, dot or mark is a separate floating piece, the picture is wrong.

ATTACHMENT
Exactly two jump rings, no more and no fewer. Both are closed rings of the same gold, grown out of the body of the piece, not soldered-on afterthoughts and not floating beside it. {{ring_rule}}
Each of the two jump rings is threaded: something passes through its open hole and you can see daylight through the hole on both sides of what passes through it. That is either the chain's own end link or one small connector link, and it goes THROUGH the hole - never behind the pendant, never hooked on the outside of the ring, never resting against a closed eyelet. An empty ring hole with the chain passing behind the piece is wrong.
The chain is {{chain_text}} in the same 18K gold and hangs from both rings, one side to each. The chain never passes over, around or behind a letter, and there is no second chain, no cord, no clasp in shot and no other hardware.

LOOK - {{look_label}}
{{look_brief}}

SHOT - {{view_label}}
{{view_brief}}

MATERIAL
{{metal_text}}
{{stone_text}}
The pendant is about {{width_mm}} mm across and about 1.6 mm thick, so the cast edge has real visible depth.

PHOTOGRAPHY
This must read as an actual photograph taken on a jewellery set with a full-frame camera and a macro lens at a working aperture, not as a render.
Broad diffused key light through a large softbox, a white bounce card filling the shadow side, and one small harder source that puts a defined specular streak along the polished strokes. Neutral 5000K white balance. The gold shows a real specular response: bright reflected highlights, warm mid tones, and darker reflections of the surroundings in the curves, never a uniform flat brightness. There is a true contact shadow where the metal meets the surface and a soft ambient occlusion in the tight corners. Depth of field is finite: the plane of the pendant is sharp and the surface behind it falls off gently. The background surface has believable material texture.
No 3D-render look, no plastic or candy gold, no glow, no bloom, no neon rim light, no beauty-filter smoothing, no lens flare, no watermark, no logo, no caption, no added words or numbers anywhere in the frame.

PRESERVE
Exact spelling and glyph order from Image 1. One connected piece. Exactly two jump rings with the chain through both. {{stone_preserve}}`;

// ------------------------------------------------------------------ compiler

export function renderPrompt(input) {
  const {
    name,
    script,
    lettering,
    look,
    view,
    metal = "Yellow gold",
    coverage = "No stones",
    gem = "Lab diamond",
    size = 32,
    chain = "Cable",
    dependent = false,
  } = input;

  if (!name) throw new Error("name_required");
  if (!SCRIPTS[script]) throw new Error(`unsupported_script:${script}`);
  if (!LOOKS[look]) throw new Error(`unsupported_look:${look}`);
  if (!VIEWS[view]) throw new Error(`unsupported_view:${view}`);
  if (!METALS[metal]) throw new Error(`unsupported_metal:${metal}`);
  if (!COVERAGES[coverage]) throw new Error(`unsupported_coverage:${coverage}`);
  if (!CHAINS[chain]) throw new Error(`unsupported_chain:${chain}`);

  const slots = {
    approved_name: `"${name}"`,
    script_text: SCRIPTS[script],
    lettering,
    look_label: LOOKS[look].label,
    look_brief: LOOKS[look].brief,
    ring_rule: LOOKS[look].rings,
    view_label: VIEWS[view].label,
    view_brief: VIEWS[view].brief,
    metal_text: METALS[metal],
    stone_text: COVERAGES[coverage](gem.toLowerCase()),
    stone_preserve:
      coverage === "No stones"
        ? "No stones anywhere."
        : `Stone coverage stays exactly ${coverage.toLowerCase()}, every stone seated in metal.`,
    chain_text: CHAINS[chain],
    width_mm: String(size),
    dependent_role:
      dependent === "material"
        ? "Image 2, tagged @master, is an approved photograph of this exact pendant. Keep the identical " +
          "physical object AND the identical photograph - same letters, same geometry, same thickness, same " +
          "rings, same chain, same camera angle, same framing, same lighting and same background surface. " +
          "Change ONLY the material described under MATERIAL below. Nothing else in the picture moves."
        : dependent
          ? "Image 2, tagged @master, is an approved photograph of this exact same pendant. Keep the identical " +
            "physical object - same letters, same thickness, same rings, same metal colour, same stones - and " +
            "change only the camera, the lighting and the surroundings to the shot described below."
          : "There is no other reference image; invent nothing that is not described here.",
  };

  const prompt = TEMPLATE.replace(/{{([a-z_]+)}}/g, (_, key) => {
    if (!(key in slots)) throw new Error(`missing_slot:${key}`);
    return slots[key];
  });
  if (/{{|}}/.test(prompt)) throw new Error("unresolved_slot");

  return {
    family: FAMILY,
    templateSha256: createHash("sha256").update(TEMPLATE).digest("hex"),
    config: { name, script, lettering, look, view, metal, coverage, gem, size, chain, dependent },
    ratio: VIEWS[view].ratio,
    prompt,
    promptSha256: createHash("sha256").update(prompt).digest("hex"),
  };
}

// Every caller goes through compile(); the holdout guard is not optional.
export function compile(input) {
  const result = renderPrompt(input);
  assertHoldoutAllowed(result);
  return result;
}

// Production-parity mode. The JSON contains the immutable approvedName,
// language, specification, presentationView, and named reference URLs. A caller
// may supply a pinned template; omission selects the current unpublished baseline.
// Include model and optional transport (openai or runway) in the JSON.
// Treat the output as private when inputs contain signed URLs or customer names.
// No provider is called. The request artifact is also the API adapter's input
// preparation; a Runway caller must preserve its prompt and reference order.
async function renderRequest(input) {
  const { BASELINE_PROMPT_TEMPLATES, buildPromptVariableSnapshot,
    compileStillPrompt, prepareStillRequest, prepareOpenAIStillRequest,
    prepareRunwayStillRequest } = await import(
    "../../../../packages/ai/src/prompt-registry.ts"
  );
  const profiles = {
    studio: "image.packshot", on_skin: "image.worn",
    close_up: "image.macro_gift", dark: "image.dark_editorial",
  };
  const ratios = { studio: "1:1", on_skin: "4:5", close_up: "1:1", dark: "9:16" };
  const profile = profiles[input.presentationView];
  if (!profile) throw new Error("unsupported_canonical_view");
  const references = input.references ?? {};
  if (!references.identityImageUrl) throw new Error("still_stencil_required");
  if (input.presentationView !== "studio" && !references.referenceImageUrl)
    throw new Error("still_master_required");
  if (input.presentationView === "studio" && references.styleAnchorUrl)
    throw new Error("studio_style_reference_not_approved");
  if (Boolean(references.inspirationImageUrl) !== Boolean(input.specification?.referenceAsset))
    throw new Error("inspiration_reference_approval_mismatch");
  const template = input.template ?? BASELINE_PROMPT_TEMPLATES[profile];
  const compiled = compileStillPrompt({
    profile, template,
    variables: buildPromptVariableSnapshot(input),
    references: {
      master: Boolean(references.referenceImageUrl),
      style: Boolean(references.styleAnchorUrl),
      inspiration: Boolean(references.inspirationImageUrl),
    },
  });
  const request = prepareStillRequest({
    ...references, prompt: compiled.compiledPrompt,
    aspectRatio: ratios[input.presentationView],
  });
  const transport = input.transport ?? "openai";
  if (transport !== "openai" && transport !== "runway")
    throw new Error("unsupported_still_transport");
  if (typeof input.model !== "string" || !input.model.trim())
    throw new Error("still_model_required");
  const transportInput = transport === "runway"
    ? prepareRunwayStillRequest({ ...references, prompt: request.prompt,
        aspectRatio: request.aspectRatio }, input.model)
    : prepareOpenAIStillRequest({ ...references, prompt: request.prompt,
        aspectRatio: request.aspectRatio }, input.model);
  const result = {
    family: compiled.compilerVersion,
    templateSha256: createHash("sha256").update(template).digest("hex"),
    config: { name: input.approvedName, script: input.language,
      look: input.specification?.construction, view: input.presentationView },
    ratio: request.aspectRatio,
    prompt: request.prompt,
    promptSha256: request.promptSha256,
    variableSnapshot: compiled.variableSnapshot,
    request, transport, transportInput,
    templateSource: input.template ? "supplied-template" : "unpublished-baseline",
    modelVerification: "requested-model-only; no provider call",
  };
  return result;
}

export async function compileRequest(input) {
  const result = await renderRequest(input);
  assertHoldoutAllowed(result);
  return result;
}

// ------------------------------------------------------------------ holdout

const HERE = dirname(fileURLToPath(import.meta.url));
export const HOLDOUT_PATH = resolve(HERE, "holdout.json");
const LEDGER_PATH = resolve(HERE, "..", "ledger.jsonl");

export class HoldoutRefusal extends Error {
  constructor(message) {
    super(message);
    this.name = "HoldoutRefusal";
  }
}

export function loadHoldout() {
  if (!existsSync(HOLDOUT_PATH)) {
    throw new HoldoutRefusal(
      `holdout.json is missing at ${HOLDOUT_PATH}. The compiler fails closed: without the frozen ` +
        `record it cannot tell a holdout name from a tuning name.`,
    );
  }
  const doc = JSON.parse(readFileSync(HOLDOUT_PATH, "utf8"));
  if (!doc || typeof doc.hashes !== "object") throw new HoldoutRefusal("holdout.json has no hashes map");
  return doc;
}

// A name is controlled once it has been frozen as a holdout under any hash - using it again
// after its results were read would make it a tuning name wearing a holdout's clothes.
export function controlledNames(doc = loadHoldout()) {
  const names = new Set();
  for (const entry of Object.values(doc.hashes)) for (const n of entry.holdout ?? []) names.add(n);
  return names;
}

export function holdoutStatus(name, promptSha256, doc = loadHoldout()) {
  if (!controlledNames(doc).has(name)) return { controlled: false, allowed: true, entry: null };
  const entry = doc.hashes[promptSha256] ?? null;
  return { controlled: true, allowed: Boolean(entry?.holdout?.includes(name)), entry };
}

export function assertHoldoutAllowed(result) {
  const name = result.config.name;
  const hash = result.promptSha256;
  const doc = loadHoldout();
  const { controlled, allowed, entry } = holdoutStatus(name, hash, doc);
  if (!controlled || allowed) return result;
  const frozen = entry
    ? `holdout.json has an entry for that hash (${entry.cell}) but "${name}" is not frozen in it; ` +
      `frozen there: ${(entry.holdout ?? []).join(", ") || "none"}.`
    : `holdout.json has no entry for that hash, so this is a prompt "${name}" has never been held out for.`;
  throw new HoldoutRefusal(
    `REFUSED: "${name}" is a holdout name and prompt sha256 ${hash} is not frozen for it.\n` +
      `${frozen}\n` +
      `A holdout name that is reused on a release written after its results were read measures nothing. ` +
      `Freeze fresh names for this hash first:\n` +
      `  node ${"docs/goals/overnight-launch/lab/compile.mjs"} --freeze-holdout "<fresh names, comma separated>" ` +
      `--name <a name in that fresh set> ... (same slots)`,
  );
}

function ledgerHashes() {
  if (!existsSync(LEDGER_PATH)) return new Set();
  const hashes = new Set();
  for (const line of readFileSync(LEDGER_PATH, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const row = JSON.parse(line);
    if (row.promptHash) hashes.add(row.promptHash);
  }
  return hashes;
}

// Writes the frozen entry for one prompt hash. Refuses to reuse a burnt name and refuses to
// freeze a hash that already has images in the ledger, because that would be freezing after
// the results were seen.
export function freezeHoldout(result, names, options = {}) {
  const hash = result.promptSha256;
  const doc = loadHoldout();
  const fresh = names.map((n) => n.trim()).filter(Boolean);
  if (fresh.length === 0) throw new HoldoutRefusal("REFUSED: --freeze-holdout needs at least one name");

  const existing = doc.hashes[hash];
  if (existing?.holdout?.length) {
    const same =
      fresh.length === existing.holdout.length && fresh.every((n) => existing.holdout.includes(n));
    if (same) return { doc, entry: existing, written: false };
    throw new HoldoutRefusal(
      `REFUSED: prompt sha256 ${hash} is already frozen with ${existing.holdout.join(", ")}. ` +
        `A hash is frozen once; a different set of names means a different release.`,
    );
  }
  if (ledgerHashes().has(hash)) {
    throw new HoldoutRefusal(
      `REFUSED: prompt sha256 ${hash} already has images in the ledger. Holdout names are frozen ` +
        `before the first generation of a release, never after its results exist.`,
    );
  }
  const burnt = controlledNames(doc);
  for (const n of fresh) {
    if (burnt.has(n)) {
      throw new HoldoutRefusal(
        `REFUSED: "${n}" has already been used as a holdout under another prompt hash. ` +
          `Its results have been read, so it can no longer measure a new release. Pick a fresh name.`,
      );
    }
    if ((doc.seenNames ?? []).includes(n)) {
      throw new HoldoutRefusal(`REFUSED: "${n}" is a seen (tuning) name and can never be a holdout.`);
    }
  }

  const entry = {
    release: options.release ?? FAMILY,
    stage: options.stage ?? "unassigned",
    cell: options.cell ?? `${result.config.look}-${result.config.script}`,
    promptPath: options.promptPath ?? null,
    attempts: 0,
    frozen: options.frozen ?? new Date().toISOString().slice(0, 10),
    holdout: fresh,
    seen: doc.seenNames ?? [],
    reason:
      options.reason ??
      `Frozen before the first generation of ${options.release ?? FAMILY} at this hash. These names ` +
        `were not looked at while this prompt was written, so their results measure generalisation.`,
  };
  doc.hashes[hash] = entry;
  writeFileSync(HOLDOUT_PATH, JSON.stringify(doc, null, 2) + "\n");
  return { doc, entry, written: true };
}

// ---------------------------------------------------------------------- cli

function cli(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i].startsWith("--")) throw new Error(`bad_argument:${argv[i]}`);
    args[argv[i].slice(2)] = argv[i + 1];
  }
  if (args.size) args.size = Number(args.size);
  if (args.dependent !== undefined) args.dependent = args.dependent === "true";
  return args;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = cli(process.argv.slice(2));
  const freeze = args["freeze-holdout"];
  const reason = args.reason;
  const cell = args.cell;
  delete args["freeze-holdout"];
  delete args.reason;
  delete args.cell;

  let result;
  try {
    result = args["canonical-request"]
      ? await renderRequest(JSON.parse(readFileSync(args["canonical-request"], "utf8")))
      : renderPrompt(args);
    if (freeze) {
      const { entry, written } = freezeHoldout(result, String(freeze).split(","), { reason, cell });
      process.stderr.write(
        `${written ? "frozen" : "already frozen"}: ${entry.holdout.join(", ")} under ${result.promptSha256}\n`,
      );
    }
    assertHoldoutAllowed(result);
  } catch (error) {
    if (error instanceof HoldoutRefusal) {
      process.stderr.write(error.message + "\n");
      process.exit(2);
    }
    throw error;
  }
  if (process.env.JSON === "1") {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    process.stdout.write(result.prompt + "\n");
    process.stdout.write(`\n--- family ${result.family}  ratio ${result.ratio}\n`);
    process.stdout.write(`--- template sha256 ${result.templateSha256}\n`);
    process.stdout.write(`--- prompt   sha256 ${result.promptSha256}\n`);
  }
}
