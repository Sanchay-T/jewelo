/**
 * Instant English-to-Arabic name transliteration, ported from the legacy
 * Caleums NameInput reflector. This is intentionally deterministic and local;
 * an optional model refinement must remain behind the Jewelo client boundary.
 */
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
  mariam: "مريم",
  maryam: "مريم",
  noor: "نور",
  nour: "نور",
  yusuf: "يوسف",
  khalid: "خالد",
};

const DIGRAPHS: Array<readonly [string, string]> = [
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

const ENDINGS: Array<readonly [RegExp, string]> = [
  [/ah$/, "ة"],
  [/la$/, "لى"],
];

export function transliterateArabicName(text: string): string {
  if (!text) return "";

  let input = text.toLowerCase().trim();
  const corrected = NAME_CORRECTIONS[input];
  if (corrected) return corrected;

  let ending = "";
  for (const [pattern, replacement] of ENDINGS) {
    if (!pattern.test(input)) continue;
    ending = replacement;
    input = input.replace(pattern, "");
    break;
  }

  let result = "";
  let index = 0;
  while (index < input.length) {
    const pair = input.slice(index, index + 2);
    const digraph = DIGRAPHS.find(([latin]) => latin === pair);
    if (digraph) {
      result += digraph[1];
      index += 2;
      continue;
    }

    const character = input[index]!;
    result += SINGLE_CHARS[character] ?? (character === " " ? " " : "");
    index += 1;
  }

  return result + ending;
}
