/**
 * SIMPLE-1. The only prompt source in the product.
 *
 * One approved name, one chosen construction, one string. No registry, no
 * template rows, no compiler, no snapshot: the shopper approves a name and a
 * look, and this builds the sentence the image model is given.
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

/** Keyed by `PendantConstruction` in `@jewelo/contracts`. `NAME` is substituted verbatim. */
const STYLE_LINE: Readonly<Record<string, string>> = {
  classical: `An 18k yellow gold Arabic name pendant spelling "NAME" in classic Naskh script, saw-pierced from one polished gold sheet, hung from a small jump ring on a fine cable chain.`,
  "origami-ribbon": `An 18k yellow gold Arabic origami ribbon name pendant spelling "NAME", the letters folded from one continuous flat gold ribbon with sharp creases, on a fine cable chain.`,
  "framed-minimal": `An 18k yellow gold framed minimal Arabic name pendant spelling "NAME", the name set inside a slim polished rectangular gold frame with one bezel-set round diamond at each corner, on a fine cable chain.`,
  "diamond-rails": `An 18k yellow gold floating diamond rails Arabic name pendant spelling "NAME", the name floating between two slim straight gold rails, each rail set with small bezel-set round diamonds, on a fine cable chain.`,
};

/** A construction the shopper cannot choose falls back to the classical line. */
export function stillPrompt(input: {
  name: string;
  script: "ar" | "en";
  construction: string;
}): string {
  const line = (STYLE_LINE[input.construction] ?? STYLE_LINE.classical!).replace(
    "NAME",
    input.name,
  );
  if (input.script === "ar") return `${line} ${JEWELLER} ${PHOTO}`;
  return `${line
    .replaceAll("Arabic ", "")
    .replace("classic Naskh script", "a classic flowing script")} ${LATIN_ONE_PIECE} ${PHOTO}`;
}
