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
 *
 * Reasons are fixed snake_case codes and never carry a character of the
 * customer's name or an unvalidated specification string: the same invariant
 * `errorClass` holds in `apps/jobs/src/error-class.ts`, because a reason is
 * logged, counted and read by an operator, and a name in a code is a name in a
 * log. The only variable part allowed is a value this module has already
 * checked against a closed enum (`layout:<known id>`,
 * `latin_print_construction:<known id>`, `arabic_print_construction:<known id>`,
 * `arabic_one_piece_unproven:<known id>`);
 * anything else collapses to the bare code.
 *
 * Measured on the SP-2d free-route lab, 24 Sep 2026
 * (`docs/goals/road-to-gold/lab-2026-09-24-free-route/ledger.md`):
 * Classical ليلى came out two pieces in 2 of 2 stills: the dots under ي touched the stroke only at a corner or hung with a gap.
 * Origami-ribbon محمد lost the loop of م in 2 of 2 stills and read لحمد or الحد, and the production name reader passed both.
 * Latin capital-plus-lowercase in classical (Muhammad, Omar, Love, Asma) passed 8 of 8.
 * Undotted, gap-free Arabic in classical, framed-minimal and diamond-rails (محمد, سلمى) passed 8 of 8 on spelling.
 * So the route is an allowlist, not a deny-list: a letter routes free only if it is in `ARABIC_FREE_LETTERS` or `LATIN_FREE_LETTER`.
 * Every other letter, every combining mark, every presentation or compatibility form and every construction this module cannot name routes to the stencil.
 * Origami-ribbon Arabic routes to the stencil (`arabic_print_construction:origami-ribbon`).
 *
 * Framed-minimal Arabic also routes to the stencil, for a different reason and
 * under a different code (`arabic_one_piece_unproven:framed-minimal`). Its
 * spelling is fine - that 8 of 8 above includes it - but the one-piece reader
 * is the only gate a framed free still has, and it failed its held-out check on
 * framed joints (`docs/goals/road-to-gold/lab-2026-09-24-free-route/reader-calibration.md`):
 * a framed سلمى whose alif tip touches the top bar at a point was accepted on 6
 * of 10 reads, and a framed محمد hanging from the top bar on a hair-thin wire
 * on 10 of 10. Diamond-rails and classical Arabic held.
 *
 * The labs also measured one piece and one piece only: stoneless, in the face
 * the construction draws by default. A free prompt is given no stencil, so the
 * stones sentence and the lettering brief are the only thing standing between
 * the shopper's choice and the metal, and neither was ever photographed away
 * from its default. A piece set with stones, or one whose shopper picked a
 * named face (Kufi, Diwani, Signature, Thuluth, Minimal), routes to the stencil
 * (`stones_not_proven`, `lettering_not_default`).
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
  /** `StoneCoverage`: "none", "accent", "partial-pave", "full-pave". */
  readonly stoneCoverage?: string | null;
  /** `Gemstone`: "none" or a stone. `gemstones` is the full chosen list. */
  readonly gemstone?: string | null;
  readonly gemstones?: readonly (string | null | undefined)[];
  /** `ArabicStyle`: the Arabic identity engine's face selector. */
  readonly arabicStyle?: string | null;
  /** `LetteringStyle`: the shopper's own face choice, either script. */
  readonly lettering?: string | null;
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
 * `PendantLayout` and `PendantConstruction` copied from
 * `packages/contracts/src/domain.ts`: `@jewelo/identity` does not depend on
 * `@jewelo/contracts`, and a reason code may only name a value that is in a
 * closed enum. A layout or construction not in these sets is an unvalidated
 * string and never reaches a code.
 */
const KNOWN_LAYOUTS = new Set([
  "single-name",
  "side-by-side",
  "connected-heart",
  "stacked",
  "stacked-heart",
  "infinity",
  "interlocked",
]);
const KNOWN_CONSTRUCTIONS = new Set([
  "classical",
  "origami-ribbon",
  "framed-minimal",
  "diamond-rails",
]);

/**
 * The only English construction drawn as connected script. Every other
 * construction prints detached letters, which a free prompt cannot be trusted
 * to weld into one piece.
 */
const CONNECTED_LATIN_CONSTRUCTION = "classical";

/**
 * The only Arabic letters a free prompt may draw: exactly the six a free prompt
 * was ever measured drawing, and nothing admitted on shape alone. The SP-2d and
 * SP-2f2 labs drew محمد and سلمى, which between them is م ح د س ل ى; every
 * other letter of the Arabic script, proven or not, routes to the stencil.
 *
 * The value says whether the letter joins the letter after it (Joining_Type D
 * in ArabicShaping.txt); a letter that does not may only be last, because the
 * gap after it is a second piece of metal.
 *
 * An earlier version of this table also admitted ا ر ص ط ع ه و on the argument
 * that they carry no dot, hamza, madda or separate stroke in any form. That is
 * a claim about their shape, not a photograph anyone looked at: it made عمر,
 * على, طه, هلا and علا free on evidence that does not exist. They route to the
 * stencil until a lab draws them.
 *
 * U+0649 ALEF MAKSURA is Joining_Type=D in ArabicShaping.txt, but the Naskh and
 * Kufi faces pinned in `engines/caleums-arabic-v3` draw it final-only, so it is
 * treated as non-joining - which is also the only position سلمى measured it in.
 */
const ARABIC_FREE_LETTERS: ReadonlyMap<number, boolean> = new Map([
  [0x062d, true], // ARABIC LETTER HAH (ح), محمد
  [0x062f, false], // ARABIC LETTER DAL (د), محمد, final
  [0x0633, true], // ARABIC LETTER SEEN (س), سلمى
  [0x0644, true], // ARABIC LETTER LAM (ل), سلمى
  [0x0645, true], // ARABIC LETTER MEEM (م), محمد, سلمى
  [0x0649, false], // ARABIC LETTER ALEF MAKSURA (ى), سلمى, final-only
]);

/**
 * Arabic constructions a free prompt cannot be trusted to spell: origami-ribbon
 * محمد lost the loop of م in 2 of 2 SP-2d stills and the name reader passed
 * both. Every id here is in `KNOWN_CONSTRUCTIONS`.
 */
const ARABIC_PRINT_CONSTRUCTIONS = new Set(["origami-ribbon"]);

/**
 * Arabic constructions whose spelling a free prompt gets right but whose
 * one-piece joint the reader cannot be trusted to judge: on a framed piece the
 * word meets a bar, and the SP-2a held-out set showed point contact and a
 * hair-thin wire accepted (6 of 10 and 10 of 10). The stencil decides the joint
 * geometrically, so framed Arabic goes there until a reader wording passes a
 * fresh held-out bar. Every id here is in `KNOWN_CONSTRUCTIONS`.
 */
const ARABIC_ONE_PIECE_UNPROVEN_CONSTRUCTIONS = new Set(["framed-minimal"]);

/**
 * Arabic Presentation Forms-A and -B. NFKC turns them into base letters so the
 * rules below see them, and their presence alone also routes wide: the text
 * the customer approved is not the text the rules read.
 */
const isArabicPresentationForm = (codePoint: number): boolean =>
  (codePoint >= 0xfb50 && codePoint <= 0xfdff) ||
  (codePoint >= 0xfe70 && codePoint <= 0xfeff);

const isLetter = (character: string): boolean => /\p{L}/u.test(character);
const isArabicScript = (character: string): boolean =>
  /\p{Script=Arabic}/u.test(character);
const isLatinScript = (character: string): boolean =>
  /\p{Script=Latin}/u.test(character);

/**
 * The only Latin letters a free prompt may draw: plain ASCII letters, the ones
 * the SP-2d lab measured. Anything else (é, ß, æ, ø, ł, ı, ǀ, ʀ ...) routes to
 * the stencil.
 */
const LATIN_FREE_LETTER = /^[A-Za-z]$/u;

/**
 * Latin letters drawn with a detached dot. Cursive script joins the stroke but
 * leaves the tittle floating, which is a second piece of metal.
 */
const LATIN_TITTLE = /^[ij]$/iu;

/**
 * The lettering the shop draws when the shopper picks nothing: "Classic", which
 * `backendSpecification` stores as `lettering: "classic"` and, on an Arabic
 * piece, as `arabicStyle: "contemporary"`. Read exactly the way the prompt
 * compiler's `letteringStyle` reads it - `arabicStyle` unless it says "none",
 * then `lettering` - so the route and the words agree on which face was asked
 * for.
 */
const DEFAULT_LETTERING = new Set(["classic", "contemporary"]);

/**
 * The value `stoneCoverage`, `gemstone` and `arabicStyle` all use for "nothing
 * chosen here".
 */
const NONE = "none";

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
  if (layout !== SINGLE_NAME_LAYOUT) {
    add(KNOWN_LAYOUTS.has(layout) ? `layout:${layout}` : "layout_not_single_name");
  }
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
  // NFKC first, so a decomposed "e" + combining diaeresis is seen as the single
  // letter "ë" the Latin check below knows how to refuse, and an Arabic
  // presentation form is seen as the base letter the Arabic rules know.
  // Any compatibility change routes wide: the rules then read text that is not
  // byte for byte what the customer approved (a circled letter becomes a plain
  // one, for example).
  const nfc = approvedText.normalize("NFC");
  const characters = [...approvedText.normalize("NFKC")];
  if ([...nfc].some((c) => isArabicPresentationForm(c.codePointAt(0) ?? 0))) {
    add("arabic_presentation_form");
  } else if (characters.join("") !== nfc) {
    add("compatibility_form");
  }
  if (characters.length === 0 || approvedText.trim().length === 0) {
    add("empty_text");
  }
  for (const character of characters) {
    if (/\s/u.test(character)) add("whitespace");
    // A mark (harakat, shadda, a Latin accent NFC could not compose, a
    // variation selector) is drawn apart from its letter or not proven at all.
    else if (/\p{M}/u.test(character)) add("combining_mark");
    else if (!isLetter(character)) add("non_letter");
  }
  if (characters.length > 0 && !characters.some(isLetter)) add("no_letter");

  // The text the rules read must be the name the specification approved.
  const approvedName =
    language === "ar"
      ? specification.names?.[0]?.approvedArabicText
      : language === "en"
        ? specification.names?.[0]?.approvedEnglishText
        : null;
  if (approvedName && approvedName.normalize("NFC") !== nfc) {
    add("approved_text_mismatch");
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
    add("unknown_language");
  } else if (
    (language === "ar" && latinLetters.length > 0) ||
    (language === "en" && arabicLetters.length > 0)
  ) {
    add("language_script_mismatch");
  }

  // 4. Arabic: every letter is on the allowlist, and every letter but the last
  // joins the one after it. Characters from another script already fired
  // `mixed_scripts`; marks already fired `combining_mark`.
  if (arabicLetters.length > 0) {
    characters.forEach((character, index) => {
      if (!isArabicScript(character) || !isLetter(character)) return;
      const joinsForward = ARABIC_FREE_LETTERS.get(character.codePointAt(0) ?? 0);
      if (joinsForward === undefined) add("arabic_letter_not_proven");
      else if (!joinsForward && index < characters.length - 1) {
        add("arabic_non_joining_gap");
      }
    });
    // A construction the free prompt misspells in Arabic (SP-2d lab), or one
    // this module cannot name at all.
    const construction = specification.construction ?? "unspecified";
    if (!KNOWN_CONSTRUCTIONS.has(construction)) {
      add("arabic_construction_unknown");
    } else if (ARABIC_PRINT_CONSTRUCTIONS.has(construction)) {
      add(`arabic_print_construction:${construction}`);
    } else if (ARABIC_ONE_PIECE_UNPROVEN_CONSTRUCTIONS.has(construction)) {
      add(`arabic_one_piece_unproven:${construction}`);
    }
  }

  // 5. Latin: connected script only, plain letters, no floating dots.
  if (latinLetters.length > 0) {
    const construction = specification.construction ?? "unspecified";
    if (construction !== CONNECTED_LATIN_CONSTRUCTION) {
      add(
        KNOWN_CONSTRUCTIONS.has(construction)
          ? `latin_print_construction:${construction}`
          : "latin_print_construction",
      );
    }
    // Script capitals do not join the letter after them, so NOOR is four
    // pieces and OMar or McDonald has a gap; only the first letter may be one.
    if (latinLetters.slice(1).some((l) => l !== l.toLowerCase()))
      add("latin_inner_capital");
    for (const letter of latinLetters) {
      if (!LATIN_FREE_LETTER.test(letter)) add("latin_letter_not_proven");
      else if (LATIN_TITTLE.test(letter)) add("latin_tittle");
    }
  }

  // 6. The piece itself: stoneless, in the construction's default face. Both
  // labs drew only that piece, and on the free route neither the stones
  // sentence nor the lettering brief has a stencil behind it to be checked
  // against - the compiled free prompt is byte for byte the same whichever
  // face the shopper picked, so a Diwani order photographed free would come
  // back in whatever the construction paragraph asks for.
  const coverage = specification.stoneCoverage ?? NONE;
  const chosenStones = specification.gemstones?.length
    ? specification.gemstones
    : [specification.gemstone];
  if (
    coverage !== NONE ||
    chosenStones.some((stone) => stone && stone !== NONE)
  ) {
    add("stones_not_proven");
  }
  const arabicStyle = specification.arabicStyle ?? "";
  const face =
    arabicStyle && arabicStyle !== NONE
      ? arabicStyle
      : (specification.lettering ?? "");
  if (face && !DEFAULT_LETTERING.has(face)) add("lettering_not_default");

  return {
    route: reasons.length === 0 ? "free" : "stencil",
    reasons,
  };
}
