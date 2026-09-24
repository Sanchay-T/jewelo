import { createHash } from "node:crypto";
// The one place that says which constructions draw Latin in capitals and in
// which face; `solveIdentity` reads the same table to decide what it cuts.
import {
  CONSTRUCTION_LETTERING,
  identityDrawnText,
  type StillRouteChoice,
} from "@jewelo/identity";
import {
  STILL_SIZE_BY_RATIO,
  stillImageOptions,
  type StillAspectRatio,
  type StillImageOptions,
} from "@jewelo/config";

export const PROMPT_PROFILES = [
  "image.studio",
  "image.packshot",
  "image.worn",
  "image.macro_gift",
  "image.dark_editorial",
  "image.studio_hero",
  "image.billboard",
  "video.preview",
  "video.final",
  "verification.image",
] as const;
export type PromptProfile = (typeof PROMPT_PROFILES)[number];

export const PROMPT_COMPILER_VERSION = "caleums-prompt-compiler-v2";
// v2 (22 Sep 2026): the optional `look` reference role, and `@tag` rendered as
// "Image N (role)" in the compiled text, because OpenAI receives ordered files
// and never sees a tag. Stored snapshots are never recompiled, so every
// historical prompt stays exactly the bytes that were paid for.
// v3 (23 Sep 2026): the sheet names the piece by the text the stencil cuts, the
// stones sentence names every chosen stone, and a stale prompt is refused
// before spend - all three change the compiled bytes, so stored snapshots stay
// distinguishable from the v2 text that was paid for.
// v4 (24 Sep 2026): the origami-ribbon construction carries the V3 refined
// folded origami sheet measured on gpt-image-2.5-sunburst
// (docs/goals/road-to-gold/lab-2026-09-23-origami/prompts/v3-*.txt): a stencil
// line that gives the fold permission inside a fixed footprint, a look line
// that names the folded construction and not only the finish, the refined
// folded Style paragraph, and 2.5 mm of rendered thickness. Every other
// construction compiles the same bytes as v3.
export const STILL_COMPILER_VERSION = "caleums-still-compiler-v4";
export const MAX_PROMPT_TEMPLATE_LENGTH = 12_000;
export const MAX_COMPILED_PROMPT_LENGTH = 16_000;
/**
 * Ceiling for an ordinary variable value. Every one of them is a short field
 * off the approved specification, so anything longer is a snapshot bug rather
 * than a customer choice.
 */
export const MAX_PROMPT_VALUE_LENGTH = 512;
/**
 * `construction` is the one variable whose value is a paragraph rather than a
 * field: it carries the lab's measured construction brief for the pendant the
 * customer chose (`PENDANT_CONSTRUCTION_PROSE`). The longest of those,
 * `origami-ribbon`, is a little under a thousand characters, so the ceiling is
 * generous enough for a reworded brief and still far below the compiled-prompt
 * cap.
 */
export const MAX_CONSTRUCTION_VALUE_LENGTH = 2_400;

export const PROMPT_VARIABLES = {
  approved_name: "Approved pendant name, in the casing the stencil draws it",
  language: "Approved language/script",
  arabic_style: "Approved Arabic lettering style",
  layout: "Pendant name layout",
  metal_karat: "Metal karat",
  metal_color: "Metal color",
  finish: "Metal finish",
  stone_coverage: "Stone coverage",
  gemstone: "Approved gemstone",
  size_profile: "Pendant size profile",
  dimensions: "Approved width, height and thickness",
  chain_style: "Approved chain style",
  chain_length: "Approved chain length",
  presentation_view: "Requested presentation view",
  inspiration_rule: "Pinned optional inspiration handling",
  piece_spec: "Complete immutable pendant specification",
  drape: "Approved worn-view chain drape",
  construction: "Approved pendant construction, as the brief the stencil draws",
  // The minimal style-first family (lab, 22 September 2026). Each is composed
  // in `buildPromptVariableSnapshot` from the approved revision, because the
  // sentence differs by script or by construction and a template cannot branch.
  name_spelling: "How the approved name is spelled and read, by script",
  stones_rule: "Where this construction seats its stones, or that it has none",
  look_rule:
    "What the look reference shows and how much of it to copy; the compiler's Image 2 sentence",
  stencil_rule:
    "How binding the stencil is for this construction; the compiler's Image 1 sentence",
  // The dependent views' four sentences that name the identity authority
  // (SP-2f1, 24 September 2026): @stencil on the stencil route, @master on the
  // free route, where no stencil is sent. See `DEPENDENT_AUTHORITY_SENTENCES`.
  glyph_rule: "Dependent view: every glyph appears as the identity authority shows it",
  bridge_rule: "Dependent view: every metal bridge the identity authority shows is metal",
  rings_rule: "Dependent view: the jump rings sit where the identity authority places them",
  spelling_rule: "Dependent view: spelling and glyph order come from the identity authority",
} as const;
export type PromptVariable = keyof typeof PROMPT_VARIABLES;
export type PromptVariableSnapshot = Record<PromptVariable, string>;

// `construction` joins `piece_spec` and `drape` as allowed-but-not-required:
// a release published before constructions existed still validates, and the
// database's own `create_prompt_release` guard treats it the same way.
const OPTIONAL_VARIABLES: readonly PromptVariable[] = Object.freeze([
  "piece_spec",
  "drape",
  "construction",
  "name_spelling",
  "stones_rule",
  "look_rule",
  "stencil_rule",
  "glyph_rule",
  "bridge_rule",
  "rings_rule",
  "spelling_rule",
]);

/**
 * The minimal style-first sheet, measured on gpt-image-2.5-sunburst on
 * 22 September 2026 (`docs/goals/road-to-gold/lab-2026-09-22/`). It names the
 * name, the construction and the stones as three composed sentences instead of
 * the fifteen immutable fields, and it passed for all four constructions at
 * about 40% of the old prompt's length. A release that carries
 * `name_spelling` is one of these and is validated against this set.
 */
const MINIMAL_STILL_REQUIRED_VARIABLES: readonly PromptVariable[] =
  Object.freeze(["name_spelling", "construction", "stones_rule"]);
const PRODUCT_VARIABLES = Object.freeze(
  (Object.keys(PROMPT_VARIABLES) as PromptVariable[]).filter(
    (variable) => !OPTIONAL_VARIABLES.includes(variable),
  ),
);
const LEGACY_VARIABLES = PRODUCT_VARIABLES.filter(
  (variable) => variable !== "inspiration_rule",
);
const ALL_VARIABLES = Object.freeze(
  Object.keys(PROMPT_VARIABLES) as PromptVariable[],
);

export const PROMPT_PROFILE_REGISTRY: Readonly<
  Record<
    PromptProfile,
    {
      allowedVariables: readonly PromptVariable[];
      requiredVariables: readonly PromptVariable[];
    }
  >
> = Object.fromEntries(
  PROMPT_PROFILES.map((profile) => [
    profile,
    {
      allowedVariables: ALL_VARIABLES,
      requiredVariables:
        profile === "image.studio" ? LEGACY_VARIABLES : PRODUCT_VARIABLES,
    },
  ]),
) as Record<
  PromptProfile,
  {
    allowedVariables: readonly PromptVariable[];
    requiredVariables: readonly PromptVariable[];
  }
>;

/**
 * Canonical still prose. Image positions are assigned by compileStillPrompt
 * from the same ordered references the transports consume. Historical published
 * templates and stored snapshots are immutable; publish a new release only after
 * jobs uses the canonical compiler. The historical lab v4.3 remains reproducible.
 */
const STILL_VIEW_LABELS: Readonly<Record<string, string>> = {
  studio: "Studio",
  on_skin: "On skin",
  close_up: "Close up",
  dark: "Dark",
};

/** `VIEWS[*].brief` from the lab compiler, verbatim. */
const STILL_VIEW_BRIEFS: Readonly<Record<string, string>> = {
  studio:
    "A catalogue packshot. The pendant lies almost flat, seen from just off straight-on, filling most of " +
    "the frame with a small even margin. The whole pendant and both jump rings are inside the frame and " +
    "in focus. The chain runs away from both rings and settles in a relaxed curve on the surface. " +
    "Background is a plain warm off-white matte paper sweep.",
  on_skin:
    "The necklace worn by one adult woman, framed from the base of the neck to the top of the chest, face " +
    "out of frame. The pendant rests flat on the skin just below the collarbones and is fully readable, " +
    "sharp and unobstructed. Natural skin texture and a soft neutral top she is wearing. Daylight from a " +
    "large window on the left.",
  close_up:
    "A tight three-quarter macro of the pendant, angled so the thickness of the cast metal edge is visible " +
    "along the strokes, with one jump ring and the first links of the chain threaded through it clearly in " +
    "frame. Every letter of the name, including the last letter's final stroke and its terminal, sits fully " +
    "inside the frame with a clear band of background on all four sides. No part of the pendant touches " +
    "or crosses the frame edge - a name cropped at the edge is wrong. Shallow but sufficient depth of field so " +
    "the near edge is sharp and the far end falls off gently.",
  dark:
    "A low-key editorial still. The pendant lies on a dark textured stone slab, lit by one narrow soft " +
    "source from the upper left so the gold reads as a bright edge against deep shadow, with a small amount " +
    "of fill so the letters never disappear into black. The whole pendant and both rings stay readable.",
};

/**
 * The `construction` slot: the lab's measured STYLE paragraph per construction,
 * verbatim from `docs/goals/road-to-gold/lab-2026-09-22/` (the minimal
 * style-first family, 22 September 2026), with the one reference to the
 * silhouette written as `@stencil` so the compiler numbers it.
 *
 * These are the whole description of the piece in the minimal family: the
 * sheet names the style, the name, the chain, the material and the shot and
 * nothing else, so anything not in the lab text does not belong here.
 *
 * The empty-string key is the fallback for a revision approved before
 * constructions existed (`JewelrySpecification.construction` is optional): the
 * classical paragraph, which is the lettering alone and so asserts nothing the
 * stencil does not already show.
 */
export const PENDANT_CONSTRUCTION_PROSE: Readonly<Record<string, string>> = {
  classical:
    "Classical nameplate. The letters alone are the pendant: no frame, plate or rail. Each letter has one " +
    "flat mirror-polished face and straight square side walls of even depth, with crisp edges. No bevels, " +
    "facets, texture or engraving.",
  // V3 refined folded origami, measured 23 September 2026
  // (`docs/goals/road-to-gold/lab-2026-09-23-origami/prompts/v3-*.txt`): the
  // 22 September paragraph gave two or three large planes per stroke, which the
  // model read as a flat plate with a crease. Triangular panels that alternate
  // bright and shadowed, plus an explicit slim stroke width, are what produced
  // Omran's folded piece.
  "origami-ribbon":
    "Refined folded origami. Each letter stroke is folded from several flat triangular gold panels, the " +
    "fold direction changing along the stroke so the panels alternate between a bright face and a darker " +
    "shadowed face of the same gold. Creases are straight and crisp, panel edges clean and sharp, faces " +
    "flat and mirror polished. Fine-jewelry proportions: the letter bars are noticeably slim, about one " +
    "fifth thinner than a standard nameplate, an even 2.0 mm apparent stroke width across the whole name, " +
    "restrained and elegant, never chunky, heavy or toy-like. Clearly three-dimensional folded metal with " +
    "visible thickness, not folded paper.",
  "framed-minimal":
    "Framed minimal. The letters sit inside one slim rectangular gold frame, joined to it only where @stencil " +
    "joins them. The frame is a slim square bar with a flat polished top and crisp right-angle corners. The " +
    "letters have flat mirror-polished faces and straight square side walls and stand slightly above the " +
    "frame. No bevels, facets, texture or engraving.",
  "diamond-rails":
    "Rails. The letters sit between two straight parallel gold rails, one above and one below, joined only " +
    "where @stencil joins them; the rings are at the ends of the top rail. The rails are slim straight " +
    "polished bars with a flat top and square ends. The letters have flat mirror-polished faces and straight " +
    "square side walls. No bevels, facets, texture or engraving.",
};

export const PENDANT_CONSTRUCTION_FALLBACK = PENDANT_CONSTRUCTION_PROSE.classical!;

/**
 * The `construction` slot on the free route, where no stencil is sent.
 *
 * Two things force a separate paragraph rather than a reuse of the stencil-era
 * one above. First, the stencil-era text for `framed-minimal` and
 * `diamond-rails` says "joined only where @stencil joins them", and on the free
 * route that tag can never become an image number, so the compile is refused
 * (`still_unresolved_reference_tag`). Second, and the reason Omran rejected the
 * first free photographs, the stencil-era classical paragraph describes a stiff
 * nameplate - "flat mirror-polished face and straight square side walls" - while
 * the free lab (`docs/goals/road-to-gold/lab-2026-09-24-free/`) shows that the
 * short prompts which produced "the best-looking object" ask for flowing joined
 * script instead. Every paragraph here names the join in words, because the
 * words are the only thing holding the piece together when there is no
 * silhouette to copy.
 *
 * `classical` is keyed by script: Latin wants joined script letters, Arabic
 * wants calligraphy that is explicitly not Kufi (the free lab's classical
 * محمد came out as "one flowing body"). The other three constructions are
 * reachable on the free route only in Arabic, because a Latin name outside
 * `classical` routes to the stencil (`stillRoute`).
 *
 * `STILL_COMPILER_VERSION` is deliberately not bumped: no free-route prompt has
 * ever been sent to a paid provider, so there is no stored snapshot these bytes
 * could be confused with. The first free generation that is paid for is what
 * pins them.
 */
export const PENDANT_CONSTRUCTION_PROSE_FREE: Readonly<Record<string, string>> = {
  "classical:en":
    "Flowing high-polish gold script. Fine tapered strokes, every letter joined to the next in one " +
    "continuous line, softly rounded like hand-finished cast gold. One piece.",
  "classical:ar":
    "Flowing Arabic calligraphy in gold, not Kufi. Every letter joined to the next along the baseline, " +
    "fine tapered strokes, softly rounded cast gold. One piece.",
  "origami-ribbon": `${PENDANT_CONSTRUCTION_PROSE["origami-ribbon"]!} Every letter joined to the next. One piece.`,
  "framed-minimal":
    "Framed minimal. The letters sit inside one slim rectangular gold frame and are welded to its top and " +
    "bottom bars, so frame and name are one piece. Flat mirror-polished faces, crisp square edges.",
  "diamond-rails":
    "Rails. The letters sit between two straight parallel gold rails, one above and one below, and every " +
    "letter is welded to both rails; the rings are at the ends of the top rail. Flat mirror-polished faces, " +
    "crisp square edges. One piece.",
};

/**
 * The construction paragraph for this route. The stencil route reads the
 * measured table above and is byte-identical to what it always compiled; the
 * free route reads its own table, keyed by script where the script changes the
 * lettering.
 */
function constructionProse(
  construction: string,
  language: string,
  route: StillRouteChoice,
): string {
  if (route !== "free")
    return PENDANT_CONSTRUCTION_PROSE[construction] ?? PENDANT_CONSTRUCTION_FALLBACK;
  const script = language === "ar" ? "ar" : "en";
  return (
    PENDANT_CONSTRUCTION_PROSE_FREE[`${construction}:${script}`] ??
    PENDANT_CONSTRUCTION_PROSE_FREE[construction] ??
    PENDANT_CONSTRUCTION_PROSE_FREE[`classical:${script}`]!
  );
}

/**
 * The compiler's Image 2 sentence, everything after the image number: what this
 * construction's look crop shows and how much of it to copy. Lab text, verbatim.
 *
 * It is the whole sentence rather than the finish alone because the V3 origami
 * sheet (23 September 2026) asks the model to copy a construction and not only
 * a polish, and says so in the frame of the sentence as well as its middle.
 * The other three constructions keep the 22 September wording byte for byte.
 */
export const PENDANT_LOOK_PROSE: Readonly<Record<string, string>> = {
  classical:
    "shows the gold finish to copy: flat mirror-polished letter faces and crisp square side walls. Copy " +
    "only the finish, not its letters, outline, stones, rings or chain.",
  "origami-ribbon":
    "shows only the folded construction and the polish to copy: strokes built from triangular folded gold " +
    "panels with crisp creases and alternating bright and shadowed faces. Copy only that construction and " +
    "finish, not its letters, outline, stones, rings, bail or chain.",
  "framed-minimal":
    "shows the gold finish to copy: flat mirror-polished letter faces, crisp square side walls and a slim " +
    "square frame bar. Copy only the finish, not its letters, outline, stones, rings or chain.",
  "diamond-rails":
    "shows the gold finish to copy: slim crisp polished bars and flat mirror-polished letter faces. Copy " +
    "only the finish, not its letters, outline, stones, rings or chain.",
};

/**
 * The free route's Image 1 sentence for `classical`, and only for `classical`.
 *
 * The classical look crop is the framed-minimal crop - the same sha stands
 * behind both ids in `LOOK_REFERENCES` - so the measured sentence above tells
 * the model to copy "flat mirror-polished letter faces and crisp square side
 * walls", which is the stiff square nameplate the free classical paragraph
 * explicitly refuses ("softly rounded like hand-finished cast gold"). On the
 * stencil route the silhouette settles the argument; on the free route nothing
 * does, so the crop wins and Omran gets the nameplate back. Here the crop is
 * asked for its polish alone, and the frame is named in the do-not-copy list
 * because the crop is a framed piece.
 *
 * The other three constructions keep one sentence on both routes: their free
 * paragraphs ask for the same flat mirror-polished faces and crisp square
 * edges (or, for `origami-ribbon`, the same folded panels) that their own crops
 * show, so there is nothing to contradict.
 */
const PENDANT_LOOK_PROSE_FREE: Readonly<Record<string, string>> = {
  classical:
    "shows the gold finish to copy: mirror polish and bright reflections in the gold. Copy only that " +
    "polish, never its letters, letter shapes, outline, frame, stones, rings or chain.",
};

/** The Image 1 (look) sentence for this construction on this route. */
function lookProse(construction: string, route: StillRouteChoice): string {
  return (
    (route === "free" ? PENDANT_LOOK_PROSE_FREE[construction] : undefined) ??
    PENDANT_LOOK_PROSE[construction] ??
    PENDANT_LOOK_PROSE.classical!
  );
}

/**
 * The compiler's Image 1 sentence, everything after the image number.
 *
 * Every construction is held to the stencil's silhouette exactly as drawn.
 * `origami-ribbon` is the one that cannot be: a folded panel cuts a stroke end
 * at an angle and turns a round counter into a polygon, so the 22 September
 * silhouette sentence and the folded Style paragraph contradicted each other
 * and the model resolved it by not folding. The V3 sheet keeps the footprint,
 * the letters, their order and both rings binding, and releases only the
 * geometry inside that footprint.
 */
const PENDANT_STENCIL_PROSE_DEFAULT =
  "is the exact silhouette of the pendant: every letter, join and both rings. Make it in gold exactly as " +
  "drawn; add, remove or move nothing.";
export const PENDANT_STENCIL_PROSE: Readonly<Record<string, string>> = {
  "origami-ribbon":
    "is the exact layout of the pendant: keep every letter, its order, its position and both rings exactly " +
    "as drawn, and keep the whole piece inside that footprint. Inside that footprint the geometry may be " +
    "folded: stroke ends may be cut at an angle and round counters may become polygons. Add nothing, " +
    "remove nothing, move nothing.",
};

/**
 * The four sentences of the dependent views (on skin, close up, dark) that name
 * the identity authority. The stencil-route text is the measured `@v2` wording,
 * byte for byte (`lab-diff` pins the compiled hashes). On the free route no
 * stencil is sent and the approved studio photograph is the only authority for
 * the piece, so the same sentence points at @master instead - the one change.
 */
const DEPENDENT_AUTHORITY_SENTENCES = {
  glyph_rule:
    "Every glyph, dot, mark and stroke in @stencil appears in the photograph, in the same order, at the same place, at the same angle.",
  bridge_rule:
    "Where @stencil shows a bridge of metal between two shapes, that bridge is metal in the photograph.",
  rings_rule:
    "Both jump rings sit exactly where @stencil places them: @stencil is the whole physical piece, so it is the only authority on where they are, and no further eyelet, loop or ring is added anywhere.",
  spelling_rule: "Exact spelling and glyph order from @stencil.",
} as const;

function dependentAuthoritySentences(route: StillRouteChoice) {
  return Object.fromEntries(
    Object.entries(DEPENDENT_AUTHORITY_SENTENCES).map(([variable, sentence]) => [
      variable,
      route === "free" ? sentence.replaceAll("@stencil", "@master") : sentence,
    ]),
  ) as Record<keyof typeof DEPENDENT_AUTHORITY_SENTENCES, string>;
}

/**
 * The thickness the sheet prints for a construction whose measured lab prompt
 * names one of its own, in millimetres, as the text writes it.
 *
 * The approved specification is unchanged - the piece the shop cuts is still
 * 1.2 mm stock. A folded panel stands off that stock, and the V3 lab sheet
 * measured on 23 September asks for 2.5 mm of visible edge depth to get folded
 * metal instead of folded paper. It sits beside the prose it belongs to, and is
 * pinned by `STILL_COMPILER_VERSION` like the prose, rather than in deployment
 * configuration: a rendered pendant whose proportions can be retuned from a
 * console is a pendant nobody verified.
 */
const PENDANT_RENDERED_THICKNESS_MM: Readonly<Record<string, string>> = {
  "origami-ribbon": "2.5",
};

/**
 * Where each construction seats its stones. Lab text, verbatim, with the
 * gemstone itself as `{gem}` / `{gems}` so the customer's approved stone is the
 * one named. Used only when the approved coverage is not "none"; otherwise the
 * sheet says "No stones."
 */
export const PENDANT_STONES_PROSE: Readonly<Record<string, string>> = {
  classical:
    "Stones: one small round {gem} set flush into the flat face of the first letter and one into the face of " +
    "the last letter; the rings stay open. No other stones.",
  "origami-ribbon":
    "Stones: three small round {gems} set flush into the flat face of the letters where two strokes meet - " +
    "one in the first letter, one in a middle letter, one in the last letter. The outline does not change. " +
    "No other stones.",
  "framed-minimal":
    "Stones: one small round {gem} in a small square raised gold bezel at each of the frame's four corners. " +
    "No other stones.",
  "diamond-rails":
    "Stones: three small round {gems} in raised round gold bezels - two on the top rail near its ends, one " +
    "at the centre of the bottom rail. No other stones.",
};

/**
 * The same seating, said one seat at a time, for a piece that carries two or
 * three different stones.
 *
 * Runway, 22 September: `framed-minimal` with ruby, emerald and blue sapphire
 * compiled to "one small round ruby, emerald and blue sapphire ... at each of
 * the frame's four corners", which names three stones for one seat and leaves
 * the fourth corner unsaid; the photograph duplicated the ruby wherever it
 * liked. The head sentence is the measured one with the stone left unnamed, and
 * every seat is then named in order, the chosen stones cycling through them, so
 * a four-corner piece with three stones has one stone per corner and no seat
 * the model has to invent. A piece with one stone or none keeps the measured
 * sentence exactly as the lab shot it.
 */
const PENDANT_STONES_PROSE_MULTI: Readonly<
  Record<
    string,
    {
      readonly head: string;
      readonly seats: readonly string[];
      /** Further natural places, used only when more stones were chosen than
       *  the construction has seats, so no chosen stone is ever dropped. */
      readonly extraSeats?: readonly string[];
      readonly tail?: string;
    }
  >
> = {
  classical: {
    head: "Stones: one small round stone set flush into the flat face of a letter, at each of {places} places",
    seats: ["the first letter", "the last letter"],
    extraSeats: ["a middle letter"],
    tail: "The rings stay open.",
  },
  "origami-ribbon": {
    head: "Stones: one small round stone set flush into the flat face of a letter where two strokes meet, at each of {places} places",
    seats: ["the first letter", "a middle letter", "the last letter"],
    tail: "The outline does not change.",
  },
  "framed-minimal": {
    head: "Stones: one small round stone in a small square raised gold bezel at each of the frame's four corners",
    seats: ["top left", "top right", "bottom right", "bottom left"],
  },
  "diamond-rails": {
    head: "Stones: one small round stone in a raised round gold bezel, at each of {places} places",
    seats: [
      "the left end of the top rail",
      "the right end of the top rail",
      "the centre of the bottom rail",
    ],
  },
};

/** How many places the sentence names, in words. At most four are ever used. */
const PLACE_COUNT_WORD = ["zero", "one", "two", "three", "four"] as const;

/** Singular and plural of a stone, as a jeweller would say it in a sentence. */
const GEMSTONE_STONE_NAME: Readonly<Record<string, readonly [string, string]>> = {
  "lab-diamond": ["lab-diamond", "lab-diamonds"],
  "natural-diamond": ["diamond", "diamonds"],
  ruby: ["ruby", "rubies"],
  emerald: ["emerald", "emeralds"],
  "blue-sapphire": ["blue sapphire", "blue sapphires"],
  "pink-sapphire": ["pink sapphire", "pink sapphires"],
};

export const BASELINE_PROMPT_TEMPLATES: Readonly<
  Record<PromptProfile, string>
> = {
  "image.studio": [
    "Create one refined {{presentation_view}} product photograph of the supplied immutable name-pendant identity for {{approved_name}} ({{language}}; Arabic style: {{arabic_style}}).",
    "Preserve the exact spelling, glyph order, {{layout}} geometry and attachments.",
    "Use {{metal_karat}} {{metal_color}} metal with a {{finish}} finish, {{stone_coverage}} {{gemstone}}, {{size_profile}} scale, and approved dimensions {{dimensions}}.",
    "Show the pendant on its {{chain_style}} chain at {{chain_length}}. Do not invent, remove, or reshape identity details.",
  ].join(" "),
  "image.packshot": stillTemplate("studio"),
  "image.worn": stillTemplate("on_skin"),
  "image.macro_gift": stillTemplate("close_up"),
  "image.dark_editorial": stillTemplate("dark"),
  "image.studio_hero": imageTemplate(
    "Studio photograph of the necklace against a warm ivory-grey seamless paper sweep, lit by one upper-left softbox and a right bounce card, with asymmetric falloff and a soft accurate shadow.",
  ),
  "image.billboard": imageTemplate(
    "Campaign photograph of the necklace toward the right of a matte-black paper sweep, lit by one narrow warm spotlight with subtle metal rim light and calm empty darkness to the left.",
  ),
  "video.preview": [
    "Create a restrained silent {{presentation_view}} motion preview from the approved still for {{approved_name}} ({{language}}; Arabic style: {{arabic_style}}).",
    "Keep {{layout}} geometry, spelling and attachments unchanged throughout every frame.",
    "Preserve {{metal_karat}} {{metal_color}} metal, {{finish}} finish, {{stone_coverage}} {{gemstone}}, {{size_profile}} scale, {{dimensions}}, and the {{chain_style}} chain at {{chain_length}}.",
    "Use only subtle product-camera movement and controlled specular light; no morphing or new objects. {{inspiration_rule}}",
  ].join(" "),
  "video.final": [
    "Create a polished silent {{presentation_view}} final product film from the approved still for {{approved_name}} ({{language}}; Arabic style: {{arabic_style}}).",
    "Keep exact spelling, {{layout}} geometry and attachments stable for the full shot.",
    "Preserve {{metal_karat}} {{metal_color}} metal, {{finish}} finish, {{stone_coverage}} {{gemstone}}, {{size_profile}} scale, {{dimensions}}, and the {{chain_style}} chain at {{chain_length}}.",
    "Use elegant, restrained camera motion and realistic light only; do not morph the pendant or introduce unapproved details. {{inspiration_rule}}",
  ].join(" "),
  "verification.image": [
    "Verify the supplied generated image against the immutable silhouette and approved configuration for {{approved_name}} ({{language}}; Arabic style: {{arabic_style}}).",
    "Require exact spelling and script, the same identity and {{layout}} geometry, exactly two connected jump rings with coherent {{chain_style}} chain attachment at {{chain_length}}, {{metal_karat}} {{metal_color}} {{finish}} metal, {{stone_coverage}} {{gemstone}}, {{size_profile}} dimensions {{dimensions}}, and the requested {{presentation_view}} shot.",
    "Reject any added letters, names, charms, duplicate pendants, missing or third rings, malformed chain attachment, incoherent pendant, or wrong shot. {{inspiration_rule}}",
  ].join(" "),
};

export const PRESENTATION_PROFILE = {
  studio: "image.packshot",
  on_skin: "image.worn",
  close_up: "image.macro_gift",
  dark: "image.dark_editorial",
  studio_hero: "image.studio_hero",
  billboard: "image.billboard",
  motion_preview: "video.preview",
  motion_final: "video.final",
} as const satisfies Readonly<Record<string, PromptProfile>>;

export const PRESENTATION_ASPECT_RATIO = {
  studio: "1:1",
  on_skin: "4:5",
  close_up: "1:1",
  dark: "9:16",
  studio_hero: "9:16",
  billboard: "16:9",
  motion_preview: "9:16",
  motion_final: "9:16",
} as const;

export const STYLE_ANCHOR_SOURCE_TASK_IDS = {
  "image.worn": "ee78f9a4-6ace-428c-9f12-4e6101188190",
  "image.packshot": "ddd3862a-05cb-4b95-9b6b-aa8d6453293b",
  "image.macro_gift": "44f3b981-18bd-4dbf-892e-dcf3f4c9c817",
  "image.dark_editorial": "ba0b8433-f0f2-4458-82c9-5d3ce88081d6",
  "image.studio_hero": "d0c0bac4-d2e4-481c-8fff-c658acd807ac",
  "image.billboard": "f7de6e1b-4278-4866-97ac-865abeb89560",
} as const;

export interface PromptTemplateValidation {
  profile: PromptProfile;
  variables: PromptVariable[];
}

export interface CompiledPrompt {
  profile: PromptProfile;
  compiledPrompt: string;
  compilerVersion: typeof PROMPT_COMPILER_VERSION | typeof STILL_COMPILER_VERSION;
  sha256: string;
  variableSnapshot: PromptVariableSnapshot;
}

export function isPromptProfile(value: string): value is PromptProfile {
  return (PROMPT_PROFILES as readonly string[]).includes(value);
}

export function validatePromptTemplate(
  profile: PromptProfile,
  template: string,
): PromptTemplateValidation {
  if (!isPromptProfile(profile)) throw new Error("Unknown prompt profile");
  if (!template.trim()) throw new Error("Prompt template is required");
  if (template.length > MAX_PROMPT_TEMPLATE_LENGTH)
    throw new Error(
      `Prompt template exceeds ${MAX_PROMPT_TEMPLATE_LENGTH} characters`,
    );
  if (/\p{Cc}/u.test(template.replace(/[\n\r\t]/g, "")))
    throw new Error("Prompt template contains unsupported control characters");

  const matches = [...template.matchAll(/\{\{([a-z][a-z0-9_]*)\}\}/g)];
  const withoutPlaceholders = template.replace(
    /\{\{([a-z][a-z0-9_]*)\}\}/g,
    "",
  );
  if (/[{}]/.test(withoutPlaceholders))
    throw new Error("Prompt template contains malformed placeholder braces");

  const variables = [...new Set(matches.map((match) => match[1]))];
  const allowed = PROMPT_PROFILE_REGISTRY[profile].allowedVariables;
  const unknown = variables.filter(
    (variable): variable is string =>
      !allowed.includes(variable as PromptVariable),
  );
  if (unknown.length)
    throw new Error(`Unknown prompt variable: ${unknown.join(", ")}`);
  // Compact prompt-sheet releases may deliberately collapse the immutable
  // form fields into piece_spec. Legacy templates retain the stricter field-
  // by-field contract so accidentally dropping one still fails publication.
  const required = variables.includes("piece_spec")
    ? (["piece_spec"] as const)
    : variables.includes("name_spelling")
      ? MINIMAL_STILL_REQUIRED_VARIABLES
      : PROMPT_PROFILE_REGISTRY[profile].requiredVariables;
  const missing = required.filter((variable) => !variables.includes(variable));
  if (missing.length)
    throw new Error(`Missing required prompt variables: ${missing.join(", ")}`);
  return { profile, variables: variables as PromptVariable[] };
}

export function buildPromptVariableSnapshot(input: {
  approvedName: unknown;
  language: unknown;
  specification: Readonly<Record<string, unknown>>;
  presentationView: unknown;
  /**
   * Which way this still is photographed (`stillRoute`). The default is the
   * stencil, so every existing caller composes the same bytes it always did;
   * `"free"` composes the variants that cannot mention a stencil, because on
   * that route no stencil image is sent to the model.
   */
  route?: StillRouteChoice;
}): PromptVariableSnapshot {
  const route: StillRouteChoice = input.route ?? "stencil";
  const specification = input.specification;
  const dimensions = asObject(specification.dimensions);
  const chain = asObject(specification.chain);
  // Width and height are the approved specification's. The thickness the sheet
  // prints is the rendered one, which a folded construction states for itself;
  // both the Material line and `piece_spec` read this single value so the
  // prompt and the verifier can never be told different depths.
  const thicknessMm =
    PENDANT_RENDERED_THICKNESS_MM[scalar(specification.construction)] ??
    scalar(dimensions.thicknessMm);
  const connector = scalar(specification.connector);
  // Every template names the piece by the text the stencil cuts, never by the
  // shopper's casing: the older scene families interpolate `{{approved_name}}`
  // into their IDENTITY block, and under a construction that draws capitals
  // that line told the model "Asma" while the stencil beside it said "ASMA".
  // `identityDrawnText` is the same function `solveIdentity` draws with, so the
  // prompt cannot name a piece the stencil does not cut. The approved text
  // itself is unchanged where it is the truth: the anchor is still shaped from
  // it and the name reader still compares against it.
  const drawnName = drawnNameFor(input.approvedName, input.language, specification);
  // The lettering face (`arabicStyle`, or `lettering` behind it) is a stencil-
  // engine choice: it names the face the stencil is cut in, such as Kufi. On
  // the free route no stencil is cut and the free Style paragraph asks for
  // flowing letters "not Kufi", so naming the face would contradict it. The
  // approved studio still is the only authority for the letters there, so the
  // slot points at it; a free packshot has no @master, so a release that
  // interpolated this slot on one would be refused as an unresolved tag.
  const freeLettering = "exactly as the approved pendant in @master";
  const pieceSpec = [
    `name=${drawnName}`,
    `language=${scalar(input.language)}`,
    `arabic_style=${route === "free" ? freeLettering : prose(ARABIC_STYLE_PROSE, specification.arabicStyle)}`,
    `layout=${prose(LAYOUT_PROSE, specification.layout)}`,
    ...(connector && connector !== "none"
      ? [`connector=${prose(CONNECTOR_PROSE, connector)}`]
      : []),
    `metal=${scalar(specification.metalKarat)} ${scalar(specification.metalColor)} gold, ${prose(FINISH_PROSE, specification.finish)}`,
    `stones=${stonePhrase(
      scalar(specification.stoneCoverage),
      joinStones(
        gemstoneList(specification).map((gem) => prose(GEMSTONE_PROSE, gem)),
      ),
    )}`,
    `size=${scalar(specification.sizeProfile)}; dimensions=${scalar(dimensions.widthMm)} × ${scalar(dimensions.heightMm)} × ${thicknessMm} mm`,
    `chain=${prose(CHAIN_PROSE, chain.style)}; length=${scalar(chain.lengthCm)} cm`,
  ].join("; ");
  return {
    approved_name: drawnName,
    language: scalar(input.language),
    arabic_style: route === "free" ? freeLettering : letteringStyle(specification),
    layout: scalar(specification.layout),
    metal_karat: scalar(specification.metalKarat),
    metal_color: scalar(specification.metalColor),
    finish: scalar(specification.finish),
    stone_coverage: scalar(specification.stoneCoverage),
    // Up to three chosen stones (22 Sep 2026); `gemstone` stays the first.
    gemstone: joinStones(gemstoneList(specification)),
    size_profile: scalar(specification.sizeProfile),
    // ASCII "x", as the lab's measured sheet writes it; the multiplication
    // sign was the only non-ASCII character in an English prompt.
    dimensions: `${scalar(dimensions.widthMm)} x ${scalar(dimensions.heightMm)} x ${thicknessMm} mm`,
    chain_style: scalar(chain.style),
    chain_length: `${scalar(chain.lengthCm)} cm`,
    presentation_view: scalar(input.presentationView),
    inspiration_rule: specification.referenceAsset
      ? "Use the optional third input only as customer inspiration; never copy text, identity, branding or unapproved objects from it."
      : "No customer inspiration input is approved for this task.",
    piece_spec: pieceSpec,
    drape: `Natural asymmetric ${scalar(chain.style)} chain drape at ${scalar(chain.lengthCm)} cm, with the pendant centered at the approved scale.`,
    // An unknown construction id would silently describe the wrong piece, so it
    // falls back to the brief that only repeats what the stencil already shows.
    construction: constructionProse(
      scalar(specification.construction),
      scalar(input.language),
      route,
    ),
    // How the name is read, which is a property of the script and of the face
    // the stencil draws it in, so it cannot be a slot in one template.
    name_spelling: nameSpelling(
      drawnName,
      scalar(input.language),
      specification,
      route,
    ),
    stones_rule: stonesRule(specification),
    look_rule: lookProse(scalar(specification.construction), route),
    // On the free route there is no Image 1 (stencil) line to write, so this
    // variable has no value rather than a sentence about an image the model
    // never receives. A release that interpolates it would be refused before
    // spend by `compilePrompt`'s missing-value check, which is the safe way for
    // that mistake to fail.
    stencil_rule:
      route === "free"
        ? ""
        : (PENDANT_STENCIL_PROSE[scalar(specification.construction)] ??
          PENDANT_STENCIL_PROSE_DEFAULT),
    ...dependentAuthoritySentences(route),
  };
}

/**
 * The text the stencil cuts for this piece, from the one helper in
 * `@jewelo/identity` that decides it. Every place a template names the piece -
 * the minimal sheet's Name line, the scene families' IDENTITY block, the
 * verification brief, `piece_spec` - reads this one value, so no two of them
 * can name the piece differently and none of them can disagree with the metal.
 */
function drawnNameFor(
  approvedName: unknown,
  language: unknown,
  specification: Readonly<Record<string, unknown>>,
): string {
  const script = scalar(language) === "ar" ? "ar" : "en";
  return identityDrawnText(
    scalar(approvedName),
    CONSTRUCTION_LETTERING[scalar(specification.construction)]?.[script],
  );
}

/**
 * The sheet's Name sentence: the name as the metal spells it, and how to read
 * it.
 *
 * Latin: `CONSTRUCTION_LETTERING` in `@jewelo/identity` is the one place that
 * says whether a construction's stencil is drawn in capitals, and
 * `solveIdentity` applies exactly this transform to get its `drawnText`. The
 * prompt quotes the drawn text, never a second casing of its own, and it claims
 * capitals only when what is drawn really is in capitals - which is also true
 * of a shopper who typed "ASMA" under a construction that does not uppercase.
 *
 * Arabic: the face is named only when it really is Kufi, either because the
 * construction overrides the face with the boxy Kufi row or because the
 * approved lettering is `kufi`. Any other face is described without a name
 * rather than mislabelled.
 *
 * On the free route there is no stencil image, so the sentence cannot point at
 * one: it quotes the same drawn text and asks for it letter for letter, which
 * is the only spelling authority the model is given on that route.
 */
function nameSpelling(
  drawn: string,
  language: string,
  specification: Readonly<Record<string, unknown>>,
  route: StillRouteChoice,
): string {
  const spelledAs =
    route === "free" ? "spelled letter for letter" : "spelled exactly as @stencil";
  const lettering = CONSTRUCTION_LETTERING[scalar(specification.construction)];
  if (language === "ar") {
    // On the free route the Style paragraph is the lettering brief and it says
    // flowing calligraphy, not Kufi; naming a face here as well would tell the
    // model two different things about the same letters. The mark sentence is
    // also stronger there: with no silhouette to copy, a dot that is "in place"
    // can still be a second piece of metal floating beside its letter.
    const kufi =
      route !== "free" &&
      (/kufi/i.test(lettering?.ar?.fontFile ?? "") ||
        letteringStyle(specification) === "kufi");
    const marks =
      route === "free"
        ? "every dot and mark joined to its letter"
        : "every dot and mark in place";
    return `"${drawn}" in connected Arabic${kufi ? " Kufi" : ""} letters, right to left, ${spelledAs}, ${marks}.`;
  }
  const capitals =
    /\p{Lu}/u.test(drawn) && drawn === drawn.toLocaleUpperCase("en");
  return capitals
    ? `"${drawn}" in capital letters, ${spelledAs}.`
    : `"${drawn}", ${spelledAs}.`;
}

/**
 * The sheet's stones sentence: where this construction seats them, with the
 * approved stone named, or that the piece has none. A coverage of "none", or no
 * stone chosen, is "No stones." - the piece the shopper approved.
 */
function stonesRule(specification: Readonly<Record<string, unknown>>): string {
  const coverage = scalar(specification.stoneCoverage);
  const gemstones = gemstoneList(specification).filter((gem) => gem !== "none");
  if (!coverage || coverage === "none" || !gemstones.length) return "No stones.";
  const names = gemstones.map(
    (gem) => GEMSTONE_STONE_NAME[gem] ?? [gem, `${gem}s`],
  );
  const construction = scalar(specification.construction);
  if (names.length > 1) {
    const { head, seats, extraSeats, tail } =
      PENDANT_STONES_PROSE_MULTI[construction] ??
      PENDANT_STONES_PROSE_MULTI.classical!;
    // Driven by the chosen stones as well as the seats: a construction with
    // fewer seats than stones opens its further natural places rather than
    // dropping a stone the shopper picked and then claiming "No other stones".
    const places =
      names.length > seats.length ? [...seats, ...(extraSeats ?? [])] : seats;
    const count = Math.max(places.length, names.length);
    const placed = Array.from(
      { length: count },
      (_, index) =>
        `${names[index % names.length]![0]} at ${places[index % places.length]}`,
    );
    const sentenceHead = head.replaceAll(
      "{places}",
      PLACE_COUNT_WORD[count] ?? String(count),
    );
    return `${sentenceHead}: ${placed.join(", ")}.${tail ? ` ${tail}` : ""} No other stones.`;
  }
  const sentence =
    PENDANT_STONES_PROSE[construction] ?? PENDANT_STONES_PROSE.classical!;
  return sentence
    .replaceAll("{gems}", joinStones(names.map(([, plural]) => plural!)))
    .replaceAll("{gem}", joinStones(names.map(([singular]) => singular!)));
}

/**
 * The approved stones, up to three since 22 Sep 2026. `gemstones` is the full
 * chosen list and its first entry is the legacy single `gemstone`, so a piece
 * that carries only the old field reads exactly as it always did.
 */
function gemstoneList(
  specification: Readonly<Record<string, unknown>>,
): string[] {
  const chosen = Array.isArray(specification.gemstones)
    ? specification.gemstones.map(scalar).filter(Boolean)
    : [];
  return chosen.length
    ? chosen
    : [scalar(specification.gemstone)].filter(Boolean);
}

/** "a", "a and b", "a, b and c"; one stone is returned untouched. */
function joinStones(parts: readonly string[]): string {
  const kept = parts.filter(Boolean);
  if (kept.length < 2) return kept[0] ?? "";
  return `${kept.slice(0, -1).join(", ")} and ${kept[kept.length - 1]}`;
}

export function compilePrompt(input: {
  profile: PromptProfile;
  template: string;
  variables: PromptVariableSnapshot;
}): CompiledPrompt {
  const parsed = validatePromptTemplate(input.profile, input.template);
  const snapshot = { ...input.variables };
  for (const variable of parsed.variables) {
    const value = snapshot[variable]?.trim();
    if (!value) throw new Error(`Missing required prompt value: ${variable}`);
    const limit =
      variable === "construction"
        ? MAX_CONSTRUCTION_VALUE_LENGTH
        : MAX_PROMPT_VALUE_LENGTH;
    if (value.length > limit)
      throw new Error(`Prompt value exceeds ${limit} characters: ${variable}`);
    if (/[{}]/.test(value))
      throw new Error(`Prompt value contains unresolved braces: ${variable}`);
    snapshot[variable] = value;
  }
  let compiledPrompt = input.template;
  for (const variable of parsed.variables)
    compiledPrompt = compiledPrompt.replaceAll(
      `{{${variable}}}`,
      snapshot[variable],
    );
  if (/\{\{|\}\}/.test(compiledPrompt))
    throw new Error("Compiled prompt contains unresolved placeholders");
  if (compiledPrompt.length > MAX_COMPILED_PROMPT_LENGTH)
    throw new Error(
      `Compiled prompt exceeds ${MAX_COMPILED_PROMPT_LENGTH} characters`,
    );
  return {
    profile: input.profile,
    compiledPrompt,
    compilerVersion: PROMPT_COMPILER_VERSION,
    sha256: createHash("sha256").update(compiledPrompt, "utf8").digest("hex"),
    variableSnapshot: snapshot,
  };
}

/**
 * Ordered exactly as the existing API transport, including historical snapshots.
 *
 * `route` defaults to the stencil, which is what every production call sends
 * today. On the free route no stencil file is sent at all, and a stencil URL
 * handed in anyway is refused rather than dropped: a free prompt that silently
 * carried the silhouette would be a prompt nobody measured.
 */
export function buildStillReferences(input: {
  identityImageUrl?: string;
  route?: StillRouteChoice;
  referenceImageUrl?: string;
  lookReferenceUrl?: string;
  styleAnchorUrl?: string;
  inspirationImageUrl?: string;
}) {
  const free = input.route === "free";
  if (free && input.identityImageUrl?.trim())
    throw new Error("still_free_route_carries_stencil");
  if (!free && !input.identityImageUrl?.trim())
    throw new Error("still_stencil_required");
  return [
    ...(input.referenceImageUrl
      ? [{ role: "master" as const, url: input.referenceImageUrl, fileName: "reference.png" }]
      : []),
    ...(free
      ? []
      : [{ role: "stencil" as const, url: input.identityImageUrl!, fileName: "identity.png" }]),
    // Lab, 22 September 2026: on gpt-image-2.5-sunburst the folded ribbon look
    // only appears when a text-free crop of the shop's own reference photo is
    // supplied as its own texture-only input. Wording alone gives a flat plate.
    ...(input.lookReferenceUrl
      ? [{ role: "look" as const, url: input.lookReferenceUrl, fileName: "look-reference.png" }]
      : []),
    ...(input.styleAnchorUrl
      ? [{ role: "style" as const, url: input.styleAnchorUrl, fileName: "style-anchor.png" }]
      : []),
    ...(input.inspirationImageUrl
      ? [{ role: "inspiration" as const, url: input.inspirationImageUrl, fileName: "inspiration.png" }]
      : []),
  ];
}

/**
 * Constructions whose measured look needs a texture reference of its own.
 *
 * A construction named here is refused before spend when its look asset is
 * missing (`look_reference_missing:<construction>`), because generating without
 * it produces a flat plate the shopper did not choose and nothing downstream
 * catches that.
 *
 * Adding or removing a construction here changes whether a look reference is
 * sent, which shifts the "Image N (role)" numbering in the compiled text, so
 * bump `STILL_COMPILER_VERSION` with any edit to this set.
 */
export const LOOK_REFERENCE_CONSTRUCTIONS: ReadonlySet<string> = new Set([
  "classical",
  "origami-ribbon",
  "framed-minimal",
  "diamond-rails",
]);

export function stillLookReferenceRequired(construction: unknown): boolean {
  return LOOK_REFERENCE_CONSTRUCTIONS.has(scalar(construction));
}

export type StillReferencePresence = {
  /**
   * Whether the stencil image is sent with this prompt. Absent means yes, so
   * every existing caller compiles the bytes it always did; `false` is the free
   * route, where the model is given no silhouette and the text is the only
   * authority for the spelling.
   */
  stencil?: boolean;
  master: boolean;
  look?: boolean;
  style: boolean;
  inspiration: boolean;
};

const STILL_ROLE_RULES = {
  master: "is an approved photograph of this exact pendant. Preserve the same physical object, metal, stones, thickness and chain, changing only the requested scene. It never overrides @stencil geometry or spelling.",
  stencil: "is the sole authority for geometry and spelling: the exact black silhouette of the whole physical pendant, including all letters, joins, marks and two hollow rings. Reproduce it as gold without redesigning, adding, removing, mirroring or separating anything.",
  look: "supplies only the surface treatment of the metal - the size and number of flat planes, crease crispness, edge depth and polish; never its letters, name, outline, frame, stones, rings, chain or layout; apply it inside the stencil's silhouette.",
  style: "is style only: use framing, light, palette, setting and mood; never copy its pendant, name, letterforms, text or objects.",
  inspiration: "is optional customer inspiration only; never copy text, identity, branding or unapproved objects from it.",
} as const;

/**
 * The free route's header rules, where no stencil is sent. The approved studio
 * photograph is then the only authority for the piece, so the master rule
 * locks its identity in the split lab's words ("Photograph this exact same
 * pendant, unchanged: ...", `lab-2026-09-24-split/ledger.md`), and the look
 * rule is applied to that piece rather than to a silhouette. The header is not
 * tag-substituted, so neither rule may carry an @tag.
 */
const STILL_ROLE_RULES_FREE: Readonly<Record<string, string>> = {
  master:
    "is an approved photograph of this exact pendant and the sole authority for its letters, spelling, shape, " +
    "construction, metal, stones, rings and chain. Photograph this exact same pendant, unchanged: same letters, " +
    "same spelling, every dot and mark where it is, same construction, same metal, same stones, same thickness, " +
    "same rings and chain, changing only the requested scene.",
  look: "supplies only the surface treatment of the metal - the size and number of flat planes, crease crispness, edge depth and polish; never its letters, name, outline, frame, stones, rings, chain or layout; apply it to the approved pendant without changing its shape.",
};

/**
 * The minimal style-first sheet (lab, 22 September 2026). Such a release names
 * its own two opening image lines through the compiler, carries no IMAGE ROLES
 * block, and refers to an input as a bare "Image N" because that is the text
 * that was measured. `name_spelling` is the marker: only the minimal family
 * has it.
 */
function isMinimalStillTemplate(template: string): boolean {
  return template.includes("{{name_spelling}}");
}

/** Reject legacy role numbering before a release can become active. */
export function assertStillTemplateCompatibility(
  profile: PromptProfile,
  template: string,
) {
  if (!["image.packshot", "image.worn", "image.macro_gift", "image.dark_editorial"].includes(profile))
    return;
  // The minimal family writes @stencil like every other release; the compiler
  // still owns the numbering, so the legacy check below has nothing to catch.
  if (isMinimalStillTemplate(template)) return;
  // Check template prose, not interpolated customer names or saved snapshots.
  if (/\bimage\s+\d|\b(first|second|third|fourth)\s+(supplied\s+)?(image|input)|IMAGE ROLES/iu.test(template))
    throw new Error(
      "Still prompt uses legacy image numbering or IMAGE ROLES. Create a new release using @stencil, @master, @style and @inspiration tags; image order is assigned by the compiler.",
    );
}

/** The five reference roles a template may name, as authored. */
const STILL_REFERENCE_TAG = /@(?:stencil|master|look|style|inspiration)\b/;

/** Compiles a new release; stored snapshots never pass through this function. */
export function compileStillPrompt(input: {
  profile: PromptProfile;
  template: string;
  variables: PromptVariableSnapshot;
  references: StillReferencePresence;
}): CompiledPrompt {
  if (!["image.packshot", "image.worn", "image.macro_gift", "image.dark_editorial"].includes(input.profile))
    throw new Error("unsupported_canonical_still_profile");
  const stencil = input.references.stencil ?? true;
  // The variables and the references must be for the same route. Free
  // variables compiled with a stencil reference (or the reverse) would number
  // and describe images the request does not carry, and nothing downstream
  // would notice. `stencil_rule` is the marker: `buildPromptVariableSnapshot`
  // writes it empty on the free route only.
  if ((input.variables.stencil_rule === "") === stencil)
    throw new Error(
      `still_route_variables_mismatch:variables=${stencil ? "free" : "stencil"},references=${stencil ? "stencil" : "free"}`,
    );
  // Every dependent view needs its approved studio still. On the free route
  // that still is the only authority for the piece (no stencil is sent), so a
  // free dependent view without it has nothing to copy and is refused here.
  if (input.profile !== "image.packshot" && !input.references.master)
    throw new Error("still_master_required");
  // The studio packshot still gets no sibling still and no style photo - every
  // wrong name came from one of those - but it may carry the look reference,
  // which has no letters in it at all.
  if (input.profile === "image.packshot" && (input.references.master || input.references.style))
    throw new Error("studio_extra_reference_not_approved");
  if (input.profile !== "image.packshot" && !input.references.style)
    throw new Error("still_style_reference_required");
  const variables = {
    ...input.variables,
    inspiration_rule: input.references.inspiration
      ? "Only @inspiration is approved as customer inspiration; never copy its identity or text."
      : "No customer inspiration input is approved for this task.",
  };
  // Inspect the release prose before interpolation: an approved customer name
  // such as "First Image" is data, not a legacy reference instruction.
  assertStillTemplateCompatibility(input.profile, input.template);
  const compiled = compilePrompt({ ...input, variables });
  const references = buildStillReferences({
    route: stencil ? "stencil" : "free",
    identityImageUrl: stencil ? "stencil" : undefined,
    referenceImageUrl: input.references.master ? "master" : undefined,
    lookReferenceUrl: input.references.look ? "look" : undefined,
    styleAnchorUrl: input.references.style ? "style" : undefined,
    inspirationImageUrl: input.references.inspiration ? "inspiration" : undefined,
  });
  const position = new Map(references.map(({ role }, index) => [role, index + 1]));
  const minimal = isMinimalStillTemplate(input.template);
  // Templates are authored with @tags because the order is not theirs to know.
  // OpenAI receives ordered files and no tags, so the text it reads names each
  // input by the position it is actually sent in. A tag for a role this task
  // has no file for is left as written rather than pointed at another image.
  // The minimal family says "Image 1" bare, because its opening lines have
  // already said which image is which; the older families repeat the role.
  let body = compiled.compiledPrompt;
  for (const [role, index] of position)
    body = body.replaceAll(
      `@${role}`,
      minimal ? `Image ${index}` : `Image ${index} (${role})`,
    );
  const compiledPrompt = minimal
    ? [
        ...minimalOpeningLines(position, variables),
        "",
        body,
      ].join("\n")
    : [
        "IMAGE ROLES",
        ...references.map(
          ({ role }) =>
            `Image ${position.get(role)} (${role}) ${(stencil ? undefined : STILL_ROLE_RULES_FREE[role]) ?? STILL_ROLE_RULES[role]}`,
        ),
        "",
        body,
      ].join("\n");
  if (compiledPrompt.length > MAX_COMPILED_PROMPT_LENGTH)
    throw new Error("Canonical still prompt exceeds maximum length");
  // Every reference tag in the release prose must have become an image number.
  // An unresolved tag used to be left as written, which sends the model the
  // literal word "@stencil" and points it at nothing - the exact failure a
  // free-route sheet would hit if it kept a stencil sentence. Both routes are
  // held to it. On the stencil route only the body is checked: the IMAGE ROLES
  // header is compiler text whose `master` rule has always said "@stencil", and
  // those bytes are the ones the dependent views were measured with (checking
  // them refused every on-skin, close-up and dark view on staging, run
  // 4cfd9a5b). On the free route the whole prompt is checked, header included,
  // and the word "stencil" itself is refused: the model is sent no stencil, so
  // any mention of one points it at an image that does not exist.
  const unresolved = (stencil ? body : compiledPrompt).match(STILL_REFERENCE_TAG)?.[0];
  if (unresolved)
    throw new Error(`still_unresolved_reference_tag:${unresolved}`);
  if (!stencil && /stencil/i.test(compiledPrompt))
    throw new Error("still_free_route_names_stencil");
  return {
    ...compiled,
    compiledPrompt,
    compilerVersion: STILL_COMPILER_VERSION,
    sha256: createHash("sha256").update(compiledPrompt, "utf8").digest("hex"),
  };
}

/**
 * The minimal family's opening: one line saying what the photograph is, then
 * one line per supplied image. Lab text, verbatim; only the numbers are
 * computed, from the same ordered references the transport sends.
 *
 * It replaces the IMAGE ROLES block for this family rather than joining it:
 * what the lab measured has no header, and a header is prompt text the model
 * reads.
 */
function minimalOpeningLines(
  position: ReadonlyMap<string, number>,
  variables: PromptVariableSnapshot,
): string[] {
  const stencil = position.get("stencil");
  const lines = [
    "Photorealistic photograph of one real gold name pendant on a chain.",
    // No stencil on the free route, so no Image line for it; writing one would
    // print "Image undefined (stencil)" and a rule about a file nobody sent.
    ...(stencil ? [`Image ${stencil} (stencil) ${variables.stencil_rule}`] : []),
  ];
  const look = position.get("look");
  if (look) lines.push(`Image ${look} (look) ${variables.look_rule}`);
  return lines;
}

export const STILL_API_SIZE_BY_RATIO = STILL_SIZE_BY_RATIO.standard;

/** Both transport preparers consume this artifact without rewriting its prompt. */
export function prepareStillRequest(input: {
  prompt: string;
  aspectRatio: StillAspectRatio;
  /** Required on the stencil route, refused on the free one. */
  identityImageUrl?: string;
  route?: StillRouteChoice;
  referenceImageUrl?: string;
  lookReferenceUrl?: string;
  styleAnchorUrl?: string;
  inspirationImageUrl?: string;
}) {
  const size = STILL_API_SIZE_BY_RATIO[input.aspectRatio];
  if (!size) throw new Error("unsupported_still_aspect_ratio");
  return {
    prompt: input.prompt,
    promptSha256: createHash("sha256").update(input.prompt, "utf8").digest("hex"),
    references: buildStillReferences(input),
    aspectRatio: input.aspectRatio,
    size,
  };
}

/**
 * Quality and canvas come from validated configuration, never from a literal:
 * on Sunburst the quality label maps differently (its `high` is about
 * gpt-image-2's `medium`), so the model snapshot and the quality a deployment
 * asks for have to be settable together. See `stillImageOptions`.
 */
export function prepareOpenAIStillRequest(
  input: Parameters<typeof prepareStillRequest>[0], model: string,
  options: StillImageOptions = stillImageOptions(),
) {
  if (!model.trim()) throw new Error("still_model_required");
  const size = options.sizeByRatio[input.aspectRatio];
  if (!size) throw new Error("unsupported_still_aspect_ratio");
  return {
    ...prepareStillRequest(input),
    model,
    size,
    quality: options.quality,
    output_format: "png",
  };
}

/** The two GPT image models Runway's callable list exposes. */
export function prepareRunwayStillRequest(
  input: Parameters<typeof prepareStillRequest>[0], model: string,
) {
  if (!["gpt-image-2", "gpt-image-2.5-sunburst"].includes(model))
    throw new Error("runway_model_unavailable");
  const request = prepareStillRequest(input);
  return {
    model, promptText: request.prompt, ratio: request.aspectRatio, count: 1,
    referenceImages: request.references.map(({ role, url }) => ({ url, tag: role })),
  };
}

// Photographic prose for the immutable enum tokens. Unknown values pass through
// unchanged so an older revision still compiles.
const ARABIC_STYLE_PROSE: Readonly<Record<string, string>> = {
  contemporary: "classic",
};
const LAYOUT_PROSE: Readonly<Record<string, string>> = {
  "single-name": "single name",
  "side-by-side": "two names side by side",
  "connected-heart": "two names joined by a heart",
  stacked: "two names stacked",
  "stacked-heart": "two names stacked with a heart",
  infinity: "two names joined by an infinity symbol",
  interlocked: "two names interlocked",
};
const CONNECTOR_PROSE: Readonly<Record<string, string>> = {
  heart: "joined by a heart",
  infinity: "joined by an infinity symbol",
  plain: "joined by a plain bar",
  interlocked: "interlocked directly",
};
const FINISH_PROSE: Readonly<Record<string, string>> = {
  polished: "high-polished",
  matte: "matte brushed",
  satin: "satin",
};
const GEMSTONE_PROSE: Readonly<Record<string, string>> = {
  none: "",
  "lab-diamond": "lab-grown white diamonds",
  "natural-diamond": "natural white diamonds",
  ruby: "deep red rubies",
  emerald: "green emeralds",
  "blue-sapphire": "blue sapphires",
  "pink-sapphire": "pink sapphires",
};
const CHAIN_PROSE: Readonly<Record<string, string>> = {
  cable: "flat oval cable-link chain",
  rolo: "round rolo-link chain",
  box: "square box-link chain",
  curb: "fine curb-link chain",
  "fine-curb": "fine curb-link chain",
};
const STONE_COVERAGE_PROSE: Readonly<Record<string, string>> = {
  none: "no stones, solid metal",
  accent: "a few accent {gem}",
  "partial-pave": "partially pavé-set with {gem}",
  "full-pave": "fully pavé-set with {gem}",
};

/**
 * `arabicStyle` is the Arabic identity engine's selector and is the literal
 * string `none` on an English piece, which reads as "Lettering: none" in a
 * prompt that asks for a lettering style. The customer's own choice lives in
 * the newer optional `lettering` field, so that is preferred whenever
 * `arabicStyle` says nothing, and `classic` is the last resort for a revision
 * that carries neither.
 */
function letteringStyle(specification: Readonly<Record<string, unknown>>) {
  const arabicStyle = scalar(specification.arabicStyle);
  if (arabicStyle && arabicStyle !== "none") return arabicStyle;
  return scalar(specification.lettering) || "classic";
}

function prose(map: Readonly<Record<string, string>>, value: unknown): string {
  const token = scalar(value);
  return map[token] ?? token;
}

function stonePhrase(coverage: string, gem: string): string {
  const phrase = STONE_COVERAGE_PROSE[coverage];
  if (phrase === undefined) return [coverage, gem].filter(Boolean).join(" ");
  if (!phrase.includes("{gem}")) return phrase;
  return gem ? phrase.replace("{gem}", gem) : "no stones, solid metal";
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function scalar(value: unknown): string {
  if (typeof value === "string" || typeof value === "number")
    return String(value).trim();
  return "";
}

/**
 * One of the four independent stills, in the lab's block order. The view label
 * and the shot brief are baked in per profile; everything a customer chooses is
 * a slot.
 */
function stillTemplate(view: keyof typeof STILL_VIEW_BRIEFS): string {
  // Frozen studio candidate C; other scene templates retain their own prose.
  // The minimal style-first sheet measured on gpt-image-2.5-sunburst,
  // 22 September 2026: `docs/goals/road-to-gold/lab-2026-09-22/final/*.txt` are
  // the exact prompts that passed for all four constructions. The two opening
  // image lines are the compiler's (`minimalOpeningLines`), because the look
  // line exists only when a look reference is sent. The trailing newline is
  // part of the measured text.
  if (view === "studio")
    return [
      "Style: {{construction}}",
      'Name: {{name_spelling}} The whole pendant is one piece of gold. No other text anywhere.',
      "Chain: one gold {{chain_style}} chain. Its end link passes through each ring's hole, looped through it, never lying behind or beside it. No clasp in view, no chain over the letters, no extra rings or bails.",
      "Material: {{finish}} {{metal_karat}} {{metal_color}} gold, {{dimensions}}, visible edge depth. {{stones_rule}}",
      "Photo: studio catalogue packshot, nearly straight-on. Whole pendant and both rings sharp and centred with an even margin; chain in relaxed curves. Warm off-white matte paper, no props. Soft diffused light with one defined highlight streak, neutral white balance; the gold shows bright highlights and darker reflections. Real contact shadow. No text, logo or watermark.\n",
    ].join("\n\n");
  const label = STILL_VIEW_LABELS[view];
  return [
    `Photograph one real, physical, finished {{metal_karat}} gold name pendant necklace. ${label} shot.`,
    "",
    "IDENTITY",
    'The name is "{{approved_name}}". Script: {{language}} - "en" is English Latin letters read left to right, "ar" is Arabic script read right to left. Lettering: {{arabic_style}}. Layout: {{layout}}.',
    "{{glyph_rule}} Nothing is added, nothing is removed, nothing is rotated, nothing is duplicated, nothing is mirrored. Do not write the name a second time anywhere in the picture.",
    "",
    "CASTING",
    "This is one piece of gold, as if it came out of a single mould.",
    "Every letter is physically fused to the next letter or to the part of the piece that holds it. There are no separate islands and no air gap that would make this two objects. {{bridge_rule}} A jeweller could pick this whole pendant up as one object and nothing would fall off. If any letter, dot or mark is a separate floating piece, the picture is wrong.",
    "",
    "ATTACHMENT",
    "Exactly two jump rings, no more and no fewer. Both are closed rings of the same gold, grown out of the body of the piece, not soldered-on afterthoughts and not floating beside it. {{rings_rule}}",
    "Each of the two jump rings is threaded: something passes through its open hole and you can see daylight through the hole on both sides of what passes through it. That is either the chain's own end link or one small connector link, and it goes THROUGH the hole - never behind the pendant, never hooked on the outside of the ring, never resting against a closed eyelet. An empty ring hole with the chain passing behind the piece is wrong.",
    "The chain is a fine {{chain_style}}-link chain at {{chain_length}} in the same gold and hangs from both rings, one side to each. The chain never passes over, around or behind a letter, and there is no second chain, no cord, no clasp in shot and no other hardware.",
    "",
    "CONSTRUCTION",
    "{{construction}}",
    "{{inspiration_rule}}",
    "",
    `SHOT - ${label} ({{presentation_view}})`,
    STILL_VIEW_BRIEFS[view],
    "",
    "MATERIAL",
    "Solid {{metal_karat}} {{metal_color}} gold, {{finish}}, at {{size_profile}} scale. The reflections carry that metal's own hue into the highlights and a darker version of it into the shaded facets.",
    'Stones: coverage {{stone_coverage}}, gemstone {{gemstone}}. A coverage of "none" means no stones anywhere on this piece: every surface is plain polished gold, with no pave, no accent stone, no sparkle point and no setting of any kind. Any stone that is set is seated down in metal with the setting visibly gripping it, placed inside a stroke area and never crossing a letterform boundary, and no stone floats above the surface.',
    "The pendant measures {{dimensions}}, so the cast edge has real visible depth.",
    "",
    "PHOTOGRAPHY",
    "This must read as an actual photograph taken on a jewellery set with a full-frame camera and a macro lens at a working aperture, not as a render.",
    "Broad diffused key light through a large softbox, a white bounce card filling the shadow side, and one small harder source that puts a defined specular streak along the polished strokes. Neutral 5000K white balance. The gold shows a real specular response: bright reflected highlights, true mid tones in the metal's own colour, and darker reflections of the surroundings in the curves, never a uniform flat brightness. There is a true contact shadow where the metal meets the surface and a soft ambient occlusion in the tight corners. Depth of field is finite: the plane of the pendant is sharp and the surface behind it falls off gently. The background surface has believable material texture.",
    "No 3D-render look, no plastic or candy gold, no glow, no bloom, no neon rim light, no beauty-filter smoothing, no lens flare, no watermark, no logo, no caption, no added words or numbers anywhere in the frame.",
    "",
    "PRESERVE",
    "{{spelling_rule}} One connected piece. Exactly two jump rings with the chain through both. The pendant is the sharpest thing in the frame. No added letters, no second name, no charms, no duplicate pendant and no extra jewellery.",
  ].join("\n");
}

function imageTemplate(scene: string): string {
  return [
    scene,
    "The first supplied image is the ONE AND ONLY geometry law: reproduce its exact black pendant silhouette, character order, fused marks and two hollow jump rings without adding, removing, separating or redrawing anything.",
    "The second supplied image is a style reference only: match its framing, light, palette, setting and mood, but never copy its pendant, name, letterforms, text or objects.",
    "The piece is a personalised pendant for {{approved_name}} ({{language}}; Arabic style {{arabic_style}}), preserving {{layout}} geometry. Render {{metal_karat}} {{metal_color}} metal with a {{finish}} finish, {{stone_coverage}} {{gemstone}}, {{size_profile}} scale and approved dimensions {{dimensions}}. Use its {{chain_style}} chain at {{chain_length}}.",
    "Requested presentation view: {{presentation_view}}. The pendant is the sharpest visual hero. Stones are placed into approved stroke areas, never coated over letterform boundaries. The chain threads into both jump rings with no gap. Real unretouched photograph with faint grain; no artificial glow, text, logos, watermarks, extra jewellery, charms, letters, names or duplicate pendants. {{inspiration_rule}}",
  ].join(" ");
}
