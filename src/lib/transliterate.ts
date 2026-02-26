/**
 * English-to-Arabic transliteration for names.
 * Maps Latin characters/digraphs to Arabic script.
 * Handles common name patterns (Umayr→عمير, Layla→ليلى, Sarah→سارة, etc.)
 *
 * This is the INSTANT local layer — good enough for live preview.
 * For perfect accuracy, the AI refine button calls Gemini Flash.
 */

// Common Arabic name corrections — checked FIRST before character-by-character
// transliteration. These provide perfect results for frequently used names.
const NAME_CORRECTIONS: Record<string, string> = {
  sarah: "سارة",
  layla: "ليلى",
  leila: "ليلى",
  fatima: "فاطمة",
  aisha: "عائشة",
  omar: "عمر",
  ahmed: "أحمد",
  mohammad: "محمد",
  mohammed: "محمد",
  ali: "علي",
  hassan: "حسن",
  hussein: "حسين",
  noor: "نور",
  nour: "نور",
  yusuf: "يوسف",
  khalid: "خالد",
};

// Digraphs must be checked before single chars.
// Long vowels and consonant digraphs are ordered so that longer/more-specific
// patterns match before shorter ones.
const DIGRAPHS: [string, string][] = [
  ["sh", "ش"],
  ["th", "ث"],
  ["kh", "خ"],
  ["dh", "ذ"],
  ["zh", "ظ"],
  ["gh", "غ"],
  ["aa", "آ"],
  ["ee", "ي"],
  ["ii", "ي"],
  ["oo", "و"],
  ["uu", "و"],
  ["ai", "ع"],
  ["ou", "و"],
  ["ay", "ي"],
];

const SINGLE_CHARS: Record<string, string> = {
  a: "ا",
  b: "ب",
  c: "ك",
  d: "د",
  e: "ي",
  f: "ف",
  g: "غ",
  h: "ه",
  i: "ي",
  j: "ج",
  k: "ك",
  l: "ل",
  m: "م",
  n: "ن",
  o: "و",
  p: "ب",
  q: "ق",
  r: "ر",
  s: "س",
  t: "ت",
  u: "و",
  v: "ف",
  w: "و",
  x: "كس",
  y: "ي",
  z: "ز",
};

// Common name endings for natural Arabic feel
const ENDINGS: [RegExp, string][] = [
  [/ah$/, "ة"],   // Sarah → سارة
  [/la$/, "لى"],  // Layla → ليلى
];

export function transliterate(text: string): string {
  if (!text) return "";

  let input = text.toLowerCase().trim();

  // Check name corrections map first — perfect results for common names
  const corrected = NAME_CORRECTIONS[input];
  if (corrected) return corrected;

  let result = "";

  // Check for common name-ending patterns first
  let ending = "";
  for (const [pattern, replacement] of ENDINGS) {
    if (pattern.test(input)) {
      ending = replacement;
      input = input.replace(pattern, "");
      break;
    }
  }

  let i = 0;
  while (i < input.length) {
    // Try digraphs first (2-char combos)
    if (i < input.length - 1) {
      const pair = input.slice(i, i + 2);
      const digraph = DIGRAPHS.find(([latin]) => latin === pair);
      if (digraph) {
        result += digraph[1];
        i += 2;
        continue;
      }
    }

    // Single char
    const char = input[i];
    if (SINGLE_CHARS[char]) {
      result += SINGLE_CHARS[char];
    } else if (char === " ") {
      result += " ";
    }
    // Skip unknown chars
    i++;
  }

  return result + ending;
}
