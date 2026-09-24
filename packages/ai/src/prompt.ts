/**
 * SIMPLE-1. The only prompt source in the product.
 *
 * One approved name, one approved specification, one string. No registry, no
 * template rows, no compiler, no snapshot: the shopper approves a name and a
 * piece, and this briefs the image model the way you would brief a jeweller.
 */

/** Studio product shot, appended to every prompt. */
const PHOTO =
  "Studio product photograph on a white background, soft even light, high polish.";

/**
 * How an Arabic nameplate is actually made, so the model draws one piece of
 * metal rather than loose letters: dots bridged to their letters, non-joining
 * letters bridged along the baseline.
 */
const JEWELLER =
  "Made like a jeweller's Arabic nameplate: cast as one single piece of gold, every dot soldered to its own letter by a short gold bridge, and any letters that do not join in Arabic linked along the baseline by a thin gold bar, so the whole name lifts off the table as one piece.";

/** The Latin equivalent: the same one-piece instruction without the Arabic rules. */
const LATIN_ONE_PIECE =
  "Cast as one single piece of gold, every letter joined to the next, so the whole name lifts off the table as one piece.";

/**
 * The construction the shopper chose: what the piece is called and how the
 * bench makes it. Keyed by `PendantConstruction` in `@jewelo/contracts`.
 */
const CONSTRUCTION: Readonly<
  Record<string, { readonly look: string; readonly body: string }>
> = {
  classical: {
    look: "",
    body: "saw-pierced from one polished gold sheet, hung from a small jump ring",
  },
  "origami-ribbon": {
    look: "origami ribbon ",
    body: "the letters folded from one continuous flat gold ribbon with sharp creases",
  },
  "framed-minimal": {
    look: "framed minimal ",
    body: "the name set inside a slim polished rectangular gold frame",
  },
  "diamond-rails": {
    look: "floating rails ",
    body: "the name floating between two slim straight gold rails",
  },
};

/** The lettering face, said the way a jeweller would name it. */
const LETTERING: Readonly<Record<string, string>> = {
  contemporary: "classic Naskh",
  classic: "classic Naskh",
  minimal: "clean minimal",
  diwani: "flowing Diwani",
  kufi: "angular Kufi",
  signature: "signature handwritten",
  "thuluth-inspired": "Thuluth-inspired",
};

/** Plural of each `Gemstone`, as it is said in a sentence. */
const GEM: Readonly<Record<string, string>> = {
  "lab-diamond": "lab-grown diamonds",
  "natural-diamond": "natural diamonds",
  ruby: "rubies",
  emerald: "emeralds",
  "blue-sapphire": "blue sapphires",
  "pink-sapphire": "pink sapphires",
};

/** How much of the piece the chosen stones cover. `none` says nothing at all. */
const COVERAGE: Readonly<Record<string, string>> = {
  accent: "accented with small bezel-set GEMS",
  "partial-pave": "partly pavé-set with GEMS",
  "full-pave": "fully pavé-set with GEMS",
};

/** How two names are held together. */
const CONNECTOR: Readonly<Record<string, string>> = {
  heart: "joined by a small gold heart",
  infinity: "joined by a gold infinity symbol",
  plain: "joined by a slim gold bar",
  interlocked: "interlocked with each other",
};

const CHAIN: Readonly<Record<string, string>> = {
  cable: "fine cable chain",
  rolo: "round rolo-link chain",
  box: "square box-link chain",
  curb: "fine curb-link chain",
};

/**
 * A construction this file has no wording for. Thrown rather than quietly
 * photographed as a classical piece: the shopper would be sent a photograph of
 * a piece they did not choose. The message is codes-only so `errorClass` can
 * write it straight into the task's terminal code.
 */
export class UnknownConstructionError extends Error {
  constructor(readonly construction: string) {
    super("unknown_construction");
    this.name = "UnknownConstructionError";
  }
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

/** Every stone the piece is set with; `gemstone` is the first of them. */
function gems(specification: Readonly<Record<string, unknown>>): string {
  const chosen = (
    Array.isArray(specification.gemstones)
      ? specification.gemstones.map(text)
      : [text(specification.gemstone)]
  ).filter((gem) => gem && gem !== "none");
  const names = [...new Set(chosen.map((gem) => GEM[gem] ?? gem))];
  if (names.length < 2) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * The piece the shopper approved, as one sentence a jeweller could work from.
 *
 * `name` is the approved text; two names arrive as "A & B", the way
 * `approve_and_start_studio` joins them.
 */
export function stillPrompt(input: {
  name: string;
  script: "ar" | "en";
  specification: Readonly<Record<string, unknown>>;
}): string {
  const spec = input.specification;
  // Absent is the documented legacy default (revisions approved before
  // 7 September 2026 carry no construction); a value this file cannot word is
  // a refusal, never a substitution.
  const chosen = text(spec.construction) || "classical";
  const construction = CONSTRUCTION[chosen];
  if (!construction) throw new UnknownConstructionError(chosen);

  const colour = text(spec.metalColor) || "yellow";
  const metal = `${(text(spec.metalKarat) || "18K").toLowerCase()} ${colour} gold`;
  const lettering =
    LETTERING[text(spec.arabicStyle)] ??
    LETTERING[text(spec.lettering)] ??
    "classic Naskh";
  const script =
    input.script === "ar"
      ? `in ${lettering} script`
      : lettering === "classic Naskh"
        ? "in a classic flowing script"
        : `in ${lettering} lettering`;

  const [first, second] = input.name.split(" & ");
  const spelling = second
    ? `spelling "${first}" and "${second}"${
        text(spec.layout) === "stacked"
          ? ", one name set above the other"
          : CONNECTOR[text(spec.connector)]
            ? ` ${CONNECTOR[text(spec.connector)]}`
            : ""
      }`
    : `spelling "${input.name}"`;

  const gem = gems(spec);
  const coverage = COVERAGE[text(spec.stoneCoverage)];
  const stones = gem && coverage ? coverage.replace("GEMS", gem) : "";

  const dimensions =
    spec.dimensions && typeof spec.dimensions === "object"
      ? (spec.dimensions as Record<string, unknown>)
      : {};
  const width = text(dimensions.widthMm);
  const chain = CHAIN[text((spec.chain as Record<string, unknown>)?.style)];

  const line = [
    // "An 18k...", "An 8k..."; anything else takes "A".
    `${/^(1[18]|8|[aeiou])/.test(metal) ? "An" : "A"} ${metal} ${input.script === "ar" ? "Arabic " : ""}${construction.look}name pendant ${spelling} ${script}`,
    ...(width ? [`about ${width} mm wide`] : []),
    construction.body,
    ...(stones ? [stones] : []),
    ...(chain ? [`on a ${colour} gold ${chain}`] : []),
  ].join(", ");

  // Every bare "gold" in the wording names the chosen colour, so a rose or
  // white piece is not outvoted by yellow-sounding clauses.
  return `${line}. ${input.script === "ar" ? JEWELLER : LATIN_ONE_PIECE} ${PHOTO}`.replace(
    /(?<!(?:yellow|white|rose) )\bgold\b/g,
    `${colour} gold`,
  );
}
