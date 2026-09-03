import type {
  ArabicStyle,
  ChainStyle,
  Gemstone,
  MetalColor,
  PendantLayout,
  SizeProfile,
  StoneCoverage,
} from "@/lib/types";
import { arabicStyleLabel, formatIdentity } from "../../lib/ui-presentation";

// v1 was a six-stage wizard and stored the active `stage` in sessionStorage.
// v2 is a single page, so `stage` is gone and the draft moved to localStorage
// so a customer can close the tab and come back.
export const CONFIGURATOR_DRAFT_KEY = "caleums:configurator-draft:v2";
export const LEGACY_CONFIGURATOR_DRAFT_KEY = "caleums:configurator-draft:v1";

export interface ConfiguratorDraftV2 {
  version: 2;
  nameCount: 1 | 2;
  nameOne: string;
  nameTwo: string;
  language: "en" | "ar";
  arabicOne: string;
  arabicTwo: string;
  arabicOneStatus?: "refined" | "edited";
  arabicTwoStatus?: "refined" | "edited";
  arabicStyle: ArabicStyle;
  layout: PendantLayout;
  metal: MetalColor;
  coverage: StoneCoverage;
  gemstone: Gemstone;
  size: SizeProfile;
  chain: ChainStyle;
  chainLength: 40 | 45 | 50 | 55;
}

/**
 * The six styles the identity solver can actually render, in the order the
 * customer sees them. These are the existing `ArabicStyle` members relabelled,
 * not new vocabulary: `LIVE_STYLES` in `@jewelo/identity` holds exactly these
 * six and `identity-anchor.ts` maps `contemporary` to the solver's `classic`.
 */
export const STYLE_TILE_ORDER: ReadonlyArray<Exclude<ArabicStyle, "none">> = [
  "contemporary",
  "minimal",
  "diwani",
  "thuluth-inspired",
  "kufi",
  "signature",
];

export const LAYOUT_LABELS: Readonly<Record<PendantLayout, string>> = {
  "single-name": "Single name",
  "side-by-side": "Normal · side by side",
  stacked: "Downwards · stacked",
  "connected-heart": "Joined with a heart",
  "stacked-heart": "Stacked with a heart",
  infinity: "Joined with an infinity",
  interlocked: "Interlocked",
};

/**
 * Omran asked for three layouts. `frame` and `square` from his later voice note
 * have no `PendantLayout` member and no geometry in the identity compiler, so
 * the contract keeps all seven values and only three are shown by default. The
 * rest stay reachable so a restored draft never names an invisible layout.
 */
export const PRIMARY_LAYOUTS: ReadonlyArray<PendantLayout> = [
  "side-by-side",
  "stacked",
  "connected-heart",
];

export const SECONDARY_LAYOUTS: ReadonlyArray<PendantLayout> = [
  "stacked-heart",
  "infinity",
  "interlocked",
];

export const SIZE_WIDTHS_MM: Readonly<Record<SizeProfile, number>> = {
  delicate: 22,
  classic: 30,
  statement: 36,
  custom: 30,
};

export const DEFAULT_CONFIGURATOR_DRAFT: ConfiguratorDraftV2 = {
  version: 2,
  nameCount: 1,
  // Empty on purpose. A prefilled name is what made the configurator send a
  // stranger's name to the transliteration model on every page load.
  nameOne: "",
  nameTwo: "",
  language: "en",
  arabicOne: "",
  arabicTwo: "",
  arabicStyle: "contemporary",
  layout: "side-by-side",
  metal: "yellow",
  coverage: "none",
  gemstone: "none",
  size: "classic",
  chain: "cable",
  chainLength: 45,
};

const LANGUAGES = ["en", "ar"] as const;
const ARABIC_STYLES = ["none", ...STYLE_TILE_ORDER] as const;
const LAYOUTS = ["single-name", ...PRIMARY_LAYOUTS, ...SECONDARY_LAYOUTS];
const METALS = ["yellow", "white", "rose"] as const;
const COVERAGES = ["none", "accent", "partial-pave", "full-pave"] as const;
const GEMSTONES = [
  "none",
  "lab-diamond",
  "natural-diamond",
  "ruby",
  "emerald",
  "blue-sapphire",
  "pink-sapphire",
] as const;
const SIZES = ["delicate", "classic", "statement", "custom"] as const;
const CHAINS = ["cable", "curb", "rolo", "box"] as const;
const CHAIN_LENGTHS = [40, 45, 50, 55] as const;

function member<T extends string | number>(
  allowed: readonly T[],
  value: unknown,
  fallback: T,
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function text(value: unknown, maxLength = 18) {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

function reflectionStatus(value: unknown) {
  return value === "refined" || value === "edited" ? value : undefined;
}

/**
 * Coerces any stored payload — v1, v2, or something a customer's extension
 * mangled — into a draft the configurator and the contract both accept.
 */
export function normalizeConfiguratorDraft(
  value: unknown,
): ConfiguratorDraftV2 {
  const raw = (value ?? {}) as Record<string, unknown>;
  const defaults = DEFAULT_CONFIGURATOR_DRAFT;
  return {
    version: 2,
    nameCount: raw.nameCount === 2 ? 2 : 1,
    nameOne: text(raw.nameOne),
    nameTwo: text(raw.nameTwo),
    language: member(LANGUAGES, raw.language, defaults.language),
    arabicOne: text(raw.arabicOne, 64),
    arabicTwo: text(raw.arabicTwo, 64),
    arabicOneStatus: reflectionStatus(raw.arabicOneStatus),
    arabicTwoStatus: reflectionStatus(raw.arabicTwoStatus),
    arabicStyle: member(ARABIC_STYLES, raw.arabicStyle, defaults.arabicStyle),
    layout: member(LAYOUTS, raw.layout, defaults.layout) as PendantLayout,
    metal: member(METALS, raw.metal, defaults.metal),
    coverage: member(COVERAGES, raw.coverage, defaults.coverage),
    gemstone: member(GEMSTONES, raw.gemstone, defaults.gemstone),
    size: member(SIZES, raw.size, defaults.size),
    chain: member(CHAINS, raw.chain, defaults.chain),
    chainLength: member(CHAIN_LENGTHS, raw.chainLength, defaults.chainLength),
  };
}

export function isIdentityValid(
  draft: Pick<
    ConfiguratorDraftV2,
    "language" | "nameCount" | "nameOne" | "nameTwo" | "arabicOne" | "arabicTwo"
  >,
) {
  if (!draft.nameOne.trim()) return false;
  if (draft.nameCount === 2 && !draft.nameTwo.trim()) return false;
  if (draft.language !== "ar") return true;
  if (!draft.arabicOne.trim()) return false;
  return draft.nameCount === 1 || Boolean(draft.arabicTwo.trim());
}

export function resolvedLayoutFor(
  draft: Pick<ConfiguratorDraftV2, "nameCount" | "layout">,
): PendantLayout {
  return draft.nameCount === 1 ? "single-name" : draft.layout;
}

function parse(storage: Storage | undefined, key: string) {
  if (!storage) return null;
  try {
    const stored = storage.getItem(key);
    return stored ? (JSON.parse(stored) as unknown) : null;
  } catch {
    return null;
  }
}

/**
 * Reads the current draft, migrating a v1 payload from either store. v1 wrote
 * to sessionStorage, but a payload may sit in localStorage on a machine that
 * ran an intermediate build, so both are checked.
 */
export function readConfiguratorDraft(
  storage: Storage,
  legacyStorage?: Storage,
): ConfiguratorDraftV2 | null {
  const current = parse(storage, CONFIGURATOR_DRAFT_KEY);
  if (current && (current as { version?: unknown }).version === 2)
    return normalizeConfiguratorDraft(current);

  const legacy =
    parse(legacyStorage, LEGACY_CONFIGURATOR_DRAFT_KEY) ??
    parse(storage, LEGACY_CONFIGURATOR_DRAFT_KEY);
  if (legacy && (legacy as { version?: unknown }).version === 1)
    return normalizeConfiguratorDraft(legacy);

  return null;
}

export function writeConfiguratorDraft(
  storage: Storage,
  draft: ConfiguratorDraftV2,
) {
  storage.setItem(CONFIGURATOR_DRAFT_KEY, JSON.stringify(draft));
}

/**
 * Clears both keys from both stores. A customer's name should not outlive the
 * design they approved, especially on a shared device.
 */
export function clearConfiguratorDraft(
  storage: Storage,
  legacyStorage?: Storage,
) {
  for (const store of [storage, legacyStorage])
    for (const key of [CONFIGURATOR_DRAFT_KEY, LEGACY_CONFIGURATOR_DRAFT_KEY])
      store?.removeItem(key);
}

function sentence(value: string) {
  const words = value.replaceAll("-", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function configuratorReviewSummary(draft: ConfiguratorDraftV2) {
  const names =
    draft.language === "ar"
      ? [draft.arabicOne, draft.arabicTwo]
      : [draft.nameOne, draft.nameTwo];
  const layout = resolvedLayoutFor(draft);
  const identity = formatIdentity(
    draft.nameCount === 1 ? [names[0]!] : [names[0]!, names[1]!],
    layout,
  );
  return {
    names: identity.inline,
    script: arabicStyleLabel(
      draft.language === "ar" ? draft.arabicStyle : "none",
    ),
    layout: LAYOUT_LABELS[layout],
    metal: `18K ${draft.metal} gold`,
    stones:
      draft.coverage === "none"
        ? "No stones"
        : `${sentence(draft.coverage)} · ${draft.gemstone.replaceAll("-", " ")}`,
    sizeAndChain: `${sentence(draft.size)} (${SIZE_WIDTHS_MM[draft.size]} mm) · ${
      draft.chain
    } · ${draft.chainLength} cm`,
  };
}
