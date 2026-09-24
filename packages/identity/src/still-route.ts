/**
 * Which way a still is photographed: free prompt, or the stencil.
 *
 * The split-design lab (`docs/goals/road-to-gold/lab-2026-09-24-split/ledger.md`,
 * "Found in human review") caught a free prompt drawing classical فاطمة as two
 * separate pieces of metal, and for a while every Arabic letter that does not
 * join the letter after it (ا د ر و ...) routed to the stencil for that reason.
 * The universal labs of 24 Sep 2026 replaced that rule with a wording that
 * fuses the dots and the ring tabs by name (D-024): the model draws the piece
 * and the piece reader plus the three paid attempts refuse the ones that drift.
 *
 * The route is still deliberately WIDE everywhere else. A false "stencil" costs
 * a slightly stiffer photograph; a false "free" costs a customer a pendant that
 * spells their name in two pieces. So anything outside what a lab photographed -
 * a mark, a second name, a construction, a stone, a metal colour - routes to
 * "stencil".
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
 * `arabic_one_piece_unproven:<known id>`, `piece_field_missing:<known field>`);
 * anything else collapses to the bare code.
 *
 * Measured on the SP-2d free-route lab, 24 Sep 2026
 * (`docs/goals/road-to-gold/lab-2026-09-24-free-route/ledger.md`):
 * Origami-ribbon محمد lost the loop of م in 2 of 2 stills and read لحمد or الحد, and the production name reader passed both.
 * Latin capital-plus-lowercase in classical (Muhammad, Omar, Love, Asma) passed 8 of 8.
 * Widened for Arabic by the three universal labs of 24 Sep 2026 (`lab-2026-09-24-universal`, `-2`, `-3`, D-024):
 * 16 common UAE Arabic names on the production free studio prompt spelled right 48 of 48 to a blind viewer,
 * diamond-rails was one piece 12 of 12, and UNIV-2's wording A took the eight dotted names classical floated from 8 of 16 to 14 of 16 spelled and one piece.
 * So the route is still an allowlist, not a deny-list: a letter routes free only if it is in `ARABIC_FREE_LETTER_RANGES` or `LATIN_FREE_LETTER`.
 * Every combining mark, every presentation or compatibility form, every non-letter and every construction this module cannot name routes to the stencil.
 * Origami-ribbon Arabic routes to the stencil (`arabic_print_construction:origami-ribbon`).
 * What catches a dot that still floats is the piece reader plus the three paid attempts, not a letter table:
 * on 45 free stills it made 0 false accepts and refused all three real rail splits (`lab-2026-09-24-universal/reader-replay.md`).
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
 * (`stones_not_proven`, `lettering_not_default`). The metal colour is measured
 * the same way, and per script, because that is how it was photographed:
 * yellow passed in both scripts, rose was only ever drawn in Latin ("Love"),
 * and white was never drawn at all. So an Arabic piece in rose gold routes to
 * the stencil exactly as a white one does (`metal_not_proven`).
 *
 * A specification that carries the customer's own inspiration photograph routes
 * to the stencil (`inspiration_not_proven`). No lab ever drew a free piece with
 * one, and on the live minimal packshot family the prompt writes an
 * `Image N (role)` line for the stencil and the look only: a free compile with
 * an inspiration attached hands the model an unlabelled customer photograph and
 * no stencil to hold the letters.
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
  /** `MetalColor`: "yellow", "white" or "rose". */
  readonly metalColor?: string | null;
  /**
   * `ReferenceAssetInput`: the customer's own inspiration photograph. Read as
   * presence only - never its contents, which are a customer's file.
   */
  readonly referenceAsset?: unknown;
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
 * The Arabic letters a free prompt may draw: the standard Arabic base letters,
 * U+0621-U+063A (ء أ آ ؤ إ ئ ا ب ة ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ) and
 * U+0641-U+064A (ف ق ك ل م ن ه و ى ي). Two ranges, one constant, so the set can
 * be narrowed again in one line.
 *
 * Nothing else is in: U+0640 TATWEEL is a modifier letter, not a letter of a
 * name, and everything above U+064A is a harakat, a Quranic mark or an extended
 * letter for another language. Combining marks are refused separately.
 *
 * Widened from the six letters of محمد and سلمى by the universal free-route
 * labs of 24 September 2026 (UNIV-1 `lab-2026-09-24-universal`, UNIV-2
 * `lab-2026-09-24-universal-2`, UNIV-3 `lab-2026-09-24-universal-3`). UNIV-1
 * drew 16 common UAE Arabic names on the production free studio prompt and a
 * blind viewer read every one of the 48 stills correctly, so spelling does not
 * depend on which letters the name happens to carry; UNIV-3 put the letters
 * UNIV-1 never drew - the hamza carriers أ إ آ ؤ, the emphatics ق ض ظ, and
 * ك ج غ ذ ت and a final ى - on diamond-rails for the same check.
 *
 * The position rules are gone with the letter table. They said a non-joining
 * letter may only be last, which made the gap after ا ر د و a stencil case.
 * UNIV-1's diamond-rails cells were one piece 12 of 12 with those letters
 * inside the name, and on classical UNIV-2's wording A fused the dots and tabs
 * explicitly; a gap the model has to bridge is now the readers' job and the
 * three paid attempts', not a rule written from six letters.
 */
const ARABIC_FREE_LETTER_RANGES: readonly (readonly [number, number])[] = [
  [0x0621, 0x063a],
  [0x0641, 0x064a],
];
const isArabicFreeLetter = (codePoint: number): boolean =>
  ARABIC_FREE_LETTER_RANGES.some(([from, to]) => codePoint >= from && codePoint <= to);

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
 * The metal colours a free prompt was measured drawing, per script, because
 * that is how they were measured. Yellow carried all but four of the lab cells
 * in both scripts. Rose was drawn in classical, origami-ribbon, framed-minimal
 * and diamond-rails (`docs/goals/road-to-gold/lab-2026-09-24-free/ledger.md`
 * lines 50, 56, 62, 68; `lab-2026-09-24-free-route/ledger.md` line 22; the
 * dependent takes in `lab-2026-09-24-free-dependent/ledger.md`) - but every one
 * of those cells is "Love", in Latin. No lab ever drew an Arabic name in rose,
 * and white gold was never drawn at all. The compiled words are the only thing
 * carrying the colour, so anything not on this script's list routes to the
 * stencil.
 */
const PROVEN_LATIN_METAL_COLORS = new Set(["yellow", "rose"]);
const PROVEN_ARABIC_METAL_COLORS = new Set(["yellow"]);

/**
 * The specification fields whose absence is not a default. The atelier writes
 * every one of them for a new revision (`backendSpecification` in
 * `apps/web/src/features/atelier/previewHandoff.ts`: `arabicStyle`, `lettering`,
 * `metalColor`, `stoneCoverage`, `gemstone`), so a missing one is a revision
 * this module cannot read - not a stoneless piece in the default face. Read as
 * a closed set of field names, so the code names the field without carrying an
 * unvalidated value.
 */
const REQUIRED_PIECE_FIELDS = [
  "stoneCoverage",
  "gemstone",
  "arabicStyle",
  "lettering",
] as const;

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

  // 4. Arabic: every letter is a standard Arabic base letter. Position no
  // longer matters. Characters from another script already fired
  // `mixed_scripts`; marks already fired `combining_mark`.
  if (arabicLetters.length > 0) {
    for (const character of characters) {
      if (!isArabicScript(character) || !isLetter(character)) continue;
      if (!isArabicFreeLetter(character.codePointAt(0) ?? 0)) {
        add("arabic_letter_not_proven");
      }
    }
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

  // 6. The piece itself: stoneless, in the construction's default face, in a
  // metal colour a lab photographed, with no customer inspiration photograph.
  // Both labs drew one piece and one piece only, and on the free route there is
  // no stencil behind the words to check the result against: the stones
  // sentence, the lettering brief and the metal colour all reach the model as
  // prose the readers do not judge. The face is the sharpest case - the
  // compiled free prompt is byte for byte the same whichever face the shopper
  // picked, so a Diwani order photographed free comes back in whatever the
  // construction paragraph asks for - but the stones sentence and the metal
  // colour do change the words, and nothing downstream measures either, so
  // both stay on what was photographed.
  //
  // Absence is not a default here. The atelier writes every one of these
  // fields on every new revision, so a specification missing one is a revision
  // this module cannot read.
  for (const field of REQUIRED_PIECE_FIELDS) {
    if (specification[field] == null) add(`piece_field_missing:${field}`);
  }
  // The customer's own inspiration photograph: no lab drew a free piece with
  // one, and the live minimal packshot family labels only the stencil and the
  // look, so a free compile would hand the model an unlabelled photograph of
  // somebody else's pendant and no stencil to hold the letters.
  if (specification.referenceAsset != null) add("inspiration_not_proven");
  const metalColor = specification.metalColor ?? "";
  // Read against the script this name is written in: rose was only ever
  // photographed free in Latin. A text carrying both scripts, or no Arabic and
  // no Latin letter, has already routed wide above; a mixed one is read against
  // the Arabic list, the narrower of the two.
  const provenMetalColors =
    arabicLetters.length > 0
      ? PROVEN_ARABIC_METAL_COLORS
      : PROVEN_LATIN_METAL_COLORS;
  if (!provenMetalColors.has(metalColor)) add("metal_not_proven");
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
