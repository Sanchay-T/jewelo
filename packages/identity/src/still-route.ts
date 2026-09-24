/**
 * Which way a still is photographed: free prompt, or the stencil.
 *
 * The split-design lab (`docs/goals/road-to-gold/lab-2026-09-24-split/ledger.md`,
 * "Found in human review") caught a free prompt drawing classical فاطمة as two
 * separate pieces of metal. Arabic letters that do not join the letter after
 * them (ا د ر و ...) leave a gap a real pendant has to bridge with a weld, and a
 * "weld the letters" instruction fixed فاطمة while breaking عمران. The stencil
 * engine bridges those gaps deterministically, so a name that needs a bridge
 * goes to the stencil and never to a free prompt.
 *
 * The route is deliberately WIDE. A false "stencil" costs a slightly stiffer
 * photograph; a false "free" costs a customer a pendant that spells their name
 * in two pieces. So anything this module cannot positively prove is a single
 * connected run of letters routes to "stencil".
 *
 * Pure and deterministic: no provider call, no font, no I/O. It is decided
 * before any spend.
 */

/** Free prompt, or the deterministic stencil. */
export type StillRouteChoice = "free" | "stencil";

/**
 * The part of `JewelrySpecification` this decision reads. Structural on
 * purpose: `@jewelo/identity` does not depend on `@jewelo/contracts`, and an
 * approved specification satisfies this shape as it stands.
 */
export interface StillRouteSpecification {
  readonly layout?: string | null;
  readonly nameCount?: number;
  readonly names?: readonly {
    readonly approvedEnglishText?: string | null;
    readonly approvedArabicText?: string | null;
  }[];
  readonly construction?: string | null;
}

export interface StillRouteInput {
  /** The exact text the customer approved, as it will be spelled in metal. */
  readonly approvedText: string;
  /** `"en"` or `"ar"`; anything else is an unknown language and routes wide. */
  readonly language: string;
  readonly specification: StillRouteSpecification;
}

export interface StillRouteDecision {
  readonly route: StillRouteChoice;
  /** Every rule that fired, in the order checked, as short snake_case codes. */
  readonly reasons: readonly string[];
}

/** The only layout a single connected run of letters can be. */
const SINGLE_NAME_LAYOUT = "single-name";

/**
 * The only English construction drawn as connected script. Every other
 * construction prints detached letters, which a free prompt cannot be trusted
 * to weld into one piece.
 */
const CONNECTED_LATIN_CONSTRUCTION = "classical";

/**
 * Unicode Joining_Type, from ArabicShaping.txt (Unicode 16.0).
 *
 * D  joins on both sides, C  join-causing (tatweel), R  joins only backward,
 * U  joins on neither side, T  transparent (marks, skipped when deciding
 * whether two letters touch).
 *
 * Only D, C and T are listed. Everything else in the Arabic script is treated
 * as R or U, which is the safe direction: a letter wrongly assumed not to join
 * forward costs a stencil, a letter wrongly assumed to join forward costs a
 * two-piece pendant.
 */
type ArabicJoiningType = "D" | "C" | "R" | "U" | "T";

/**
 * Joining_Type=D letters this shop's pinned faces actually draw (Arabic,
 * Persian and Urdu). ArabicShaping.txt lists more; they are left out on
 * purpose, see the note above.
 *
 * U+0649 ALEF MAKSURA is Joining_Type=D in ArabicShaping.txt (the Uighur
 * initial and medial forms exist at U+FBE8/U+FBE9), but the Naskh and Kufi
 * faces pinned in `engines/caleums-arabic-v3` draw it final-only, so it is
 * deliberately NOT listed here and is treated as R.
 */
const JOINING_TYPE_D = new Set(
  [
    0x0620, 0x0626, 0x0628, 0x062a, 0x062b, 0x062c, 0x062d, 0x062e, 0x0633,
    0x0634, 0x0635, 0x0636, 0x0637, 0x0638, 0x0639, 0x063a, 0x0641, 0x0642,
    0x0643, 0x0644, 0x0645, 0x0646, 0x0647, 0x064a, 0x066e, 0x066f, 0x0679,
    0x067e, 0x0686, 0x0698, 0x06a4, 0x06a9, 0x06af, 0x06be, 0x06c1, 0x06cc,
    0x06d0,
  ],
);

/** Joining_Type=C: the tatweel, which joins on both sides but is not a letter. */
const JOINING_TYPE_C = new Set([0x0640]);

/** Joining_Type=T ranges: marks that sit above or below and never break a join. */
const JOINING_TYPE_T_RANGES: readonly (readonly [number, number])[] = [
  [0x0610, 0x061a],
  [0x064b, 0x065f],
  [0x0670, 0x0670],
  [0x06d6, 0x06dc],
  [0x06df, 0x06e4],
  [0x06e7, 0x06e8],
  [0x06ea, 0x06ed],
];

/** Joining_Type of one code point, per the table above. */
function arabicJoiningType(codePoint: number): ArabicJoiningType {
  if (JOINING_TYPE_D.has(codePoint)) return "D";
  if (JOINING_TYPE_C.has(codePoint)) return "C";
  for (const [from, to] of JOINING_TYPE_T_RANGES) {
    if (codePoint >= from && codePoint <= to) return "T";
  }
  // Letters fall back to R (joins backward only); anything else to U.
  return /\p{L}/u.test(String.fromCodePoint(codePoint)) ? "R" : "U";
}

/** U+0621 ARABIC LETTER HAMZA: stands alone on both sides. */
const ARABIC_HAMZA = 0x0621;

const isLetter = (character: string): boolean => /\p{L}/u.test(character);
const isArabicScript = (character: string): boolean =>
  /\p{Script=Arabic}/u.test(character);
const isLatinScript = (character: string): boolean =>
  /\p{Script=Latin}/u.test(character);

/**
 * Latin letters drawn with a detached dot. Cursive script joins the stroke but
 * leaves the tittle floating, which is a second piece of metal.
 */
const LATIN_TITTLE = /^[ij]$/iu;

/** Does this Latin letter carry a diacritic of its own (é, ë, ü, ç, ñ)? */
function hasDetachedMark(character: string): boolean {
  const decomposed = character.normalize("NFD");
  return decomposed.length > 1 && /\p{M}/u.test(decomposed);
}

/**
 * Decide, before any spend, whether this name can be photographed from a free
 * prompt or must be drawn on the stencil first. Name-driven; it reads the text
 * and the specification, never a rendered piece.
 */
export function stillRoute(input: StillRouteInput): StillRouteDecision {
  const { approvedText, language, specification } = input;
  const reasons: string[] = [];
  const add = (reason: string): void => {
    if (!reasons.includes(reason)) reasons.push(reason);
  };

  // 1. Layout and second name: only one name, laid out as one name.
  const layout = specification.layout ?? "unknown";
  if (layout !== SINGLE_NAME_LAYOUT) add(`layout:${layout}`);
  const secondName = specification.names?.[1];
  if (
    (specification.nameCount ?? 1) > 1 ||
    (specification.names?.length ?? 1) > 1 ||
    Boolean(secondName?.approvedEnglishText) ||
    Boolean(secondName?.approvedArabicText)
  ) {
    add("second_name");
  }

  // 2. The text itself: letters only, nothing else.
  // NFC first, so a decomposed "e" + combining diaeresis is seen as the single
  // letter "ë" the Latin check below knows how to refuse.
  const characters = [...approvedText.normalize("NFC")];
  if (characters.length === 0 || approvedText.trim().length === 0) {
    add("empty_text");
  }
  for (const character of characters) {
    if (/\s/u.test(character)) add("whitespace");
    else if (!isLetter(character) && !/\p{M}/u.test(character)) {
      add(`non_letter:${character}`);
    }
  }

  // 3. One script, and a language that names it.
  const letters = characters.filter(isLetter);
  const arabicLetters = letters.filter(isArabicScript);
  const latinLetters = letters.filter(isLatinScript);
  if (arabicLetters.length > 0 && latinLetters.length > 0) add("mixed_scripts");
  if (letters.length > arabicLetters.length + latinLetters.length) {
    add("mixed_scripts");
  }
  if (language !== "ar" && language !== "en") {
    add(`unknown_language:${language || "unset"}`);
  } else if (
    (language === "ar" && latinLetters.length > 0) ||
    (language === "en" && arabicLetters.length > 0)
  ) {
    add(`language_script_mismatch:${language}`);
  }

  // 4. Arabic: every letter but the last must join the letter that follows it.
  if (arabicLetters.length > 0) {
    const points = characters.map((character) => ({
      character,
      type: arabicJoiningType(character.codePointAt(0) ?? 0),
    }));
    points.forEach((point, index) => {
      // A character from another script already fired `mixed_scripts`; do not
      // also report it as an Arabic letter that fails to join.
      if (point.type === "T" || !isArabicScript(point.character)) return;
      if (point.character.codePointAt(0) === ARABIC_HAMZA) add("arabic_hamza");
      if (point.type === "D" || point.type === "C") return;
      const followed = points
        .slice(index + 1)
        .some((next) => next.type !== "T");
      if (followed) add(`arabic_non_joining_gap:${point.character}`);
    });
  }

  // 5. Latin: connected script only, and no floating dots or accents.
  if (latinLetters.length > 0) {
    const construction = specification.construction ?? "unspecified";
    if (construction !== CONNECTED_LATIN_CONSTRUCTION) {
      add(`latin_print_construction:${construction}`);
    }
    // Script capitals do not join one another, so NOOR is four pieces.
    if (latinLetters.length > 1 && latinLetters.every((l) => l !== l.toLowerCase()))
      add("latin_all_capitals");
    for (const letter of latinLetters) {
      if (LATIN_TITTLE.test(letter)) add(`latin_tittle:${letter}`);
      else if (hasDetachedMark(letter)) add(`latin_detached_mark:${letter}`);
    }
  }

  return {
    route: reasons.length === 0 ? "free" : "stencil",
    reasons,
  };
}
