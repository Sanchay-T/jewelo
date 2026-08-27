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

export const CONSTRUCTION_STAGES = [
  { id: "name-language", label: "Name & language" },
  { id: "arabic-style", label: "Arabic style" },
  { id: "names-layout", label: "Names & layout" },
  { id: "metal", label: "Metal" },
  { id: "stones", label: "Stones" },
  { id: "size-chain", label: "Size & chain" },
] as const;

export type ConstructionStageId = (typeof CONSTRUCTION_STAGES)[number]["id"];
export type ConfiguratorStageId = ConstructionStageId | "review";

export const CONFIGURATOR_DRAFT_KEY = "caleums:configurator-draft:v1";

export interface ConfiguratorDraftV1 {
  version: 1;
  stage: ConfiguratorStageId;
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

export function isNameStageValid(
  draft: Pick<
    ConfiguratorDraftV1,
    "language" | "nameCount" | "nameOne" | "nameTwo" | "arabicOne" | "arabicTwo"
  >,
) {
  if (!draft.nameOne.trim()) return false;
  if (draft.nameCount === 2 && !draft.nameTwo.trim()) return false;
  if (draft.language !== "ar") return true;
  if (!draft.arabicOne.trim()) return false;
  return draft.nameCount === 1 || Boolean(draft.arabicTwo.trim());
}

export function navigationSequence(language: "en" | "ar") {
  const stages = CONSTRUCTION_STAGES.map((item) => item.id).filter(
    (id) => language === "ar" || id !== "arabic-style",
  );
  return [...stages, "review"] as ConfiguratorStageId[];
}

export function readConfiguratorDraft(storage: Storage) {
  try {
    const parsed = JSON.parse(
      storage.getItem(CONFIGURATOR_DRAFT_KEY) ?? "null",
    ) as Partial<ConfiguratorDraftV1> | null;
    return parsed?.version === 1 ? (parsed as ConfiguratorDraftV1) : null;
  } catch {
    return null;
  }
}

export function writeConfiguratorDraft(
  storage: Storage,
  draft: ConfiguratorDraftV1,
) {
  storage.setItem(CONFIGURATOR_DRAFT_KEY, JSON.stringify(draft));
}

export function clearConfiguratorDraft(storage: Storage) {
  storage.removeItem(CONFIGURATOR_DRAFT_KEY);
}

export function configuratorReviewSummary(draft: ConfiguratorDraftV1) {
  const names =
    draft.language === "ar"
      ? [draft.arabicOne, draft.arabicTwo]
      : [draft.nameOne, draft.nameTwo];
  const layout = draft.nameCount === 1 ? "single-name" : draft.layout;
  const identity = formatIdentity(
    draft.nameCount === 1 ? [names[0]!] : [names[0]!, names[1]!],
    layout,
  );
  return {
    names: identity.inline,
    script: arabicStyleLabel(
      draft.language === "ar" ? draft.arabicStyle : "none",
    ),
    layout: layout.replaceAll("-", " "),
    metal: `18K ${draft.metal} gold`,
    stones: `${draft.coverage.replaceAll("-", " ")} · ${
      draft.coverage === "none" ? "none" : draft.gemstone.replaceAll("-", " ")
    }`,
    sizeAndChain: `${draft.size} (${
      draft.size === "delicate" ? 22 : draft.size === "classic" ? 30 : 36
    } mm) · ${draft.chain} · ${draft.chainLength} cm`,
  };
}
