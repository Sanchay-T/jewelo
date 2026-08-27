import type {
  ArabicStyle,
  JewelrySpecification,
  PendantLayout,
  PresentationView,
  TaskState,
} from "./types";

export const CALEUMS_STARTING_PRICE = {
  currency: "AED" as const,
  amount: 7_950,
};

export const ARABIC_STYLE_OPTIONS: ReadonlyArray<{
  id: Exclude<ArabicStyle, "none">;
  label: string;
  sample: string;
  providerSupported: boolean;
}> = [
  {
    id: "contemporary",
    label: "Classic",
    sample: "أسماء",
    providerSupported: true,
  },
  { id: "minimal", label: "Minimal", sample: "أسماء", providerSupported: true },
  { id: "diwani", label: "Diwani", sample: "أسماء", providerSupported: false },
  {
    id: "thuluth-inspired",
    label: "Thuluth inspired",
    sample: "أسماء",
    providerSupported: false,
  },
  { id: "kufi", label: "Kufi", sample: "أسماء", providerSupported: false },
  {
    id: "signature",
    label: "Signature",
    sample: "أسماء",
    providerSupported: false,
  },
];

export const PRESENTATION_VIEW_DETAILS: ReadonlyArray<{
  id: Exclude<PresentationView, "motion">;
  label: string;
  treatment: string;
  ratio: "1:1" | "4:5" | "9:16";
}> = [
  { id: "studio", label: "Studio", treatment: "Packshot", ratio: "1:1" },
  { id: "on_skin", label: "On Skin", treatment: "Worn", ratio: "4:5" },
  { id: "close_up", label: "Close Up", treatment: "Macro", ratio: "1:1" },
  { id: "dark", label: "Dark", treatment: "Editorial", ratio: "9:16" },
];

const presentationStates = new Set<TaskState>([
  "queued",
  "generating",
  "verifying",
  "ready",
  "retrying",
  "failed",
  "blocked",
  "cancelled",
  "unavailable",
  "available_on_request",
]);

export function safePresentationState(value?: string): TaskState | "pending" {
  return value && presentationStates.has(value as TaskState)
    ? (value as TaskState)
    : "pending";
}

export function isProviderSupportedArabicStyle(style: ArabicStyle) {
  return (
    style === "none" ||
    ARABIC_STYLE_OPTIONS.some(
      (option) => option.id === style && option.providerSupported,
    )
  );
}

export function arabicStyleLabel(style: ArabicStyle) {
  if (style === "none") return "English · connected script";
  const option = ARABIC_STYLE_OPTIONS.find(
    (candidate) => candidate.id === style,
  );
  return `Arabic · ${option?.label ?? style}`;
}

function connectorFor(layout: PendantLayout) {
  if (layout === "connected-heart" || layout === "stacked-heart") return "♡";
  if (layout === "infinity") return "∞";
  if (layout === "interlocked") return "×";
  return "";
}

export function formatIdentity(
  names: readonly string[],
  layout: PendantLayout,
): { inline: string; lines: string[] } {
  const cleanNames = names.map((name) => name.normalize("NFKC").trim());
  const first = cleanNames[0] ?? "";
  const second = cleanNames[1];
  if (!second || layout === "single-name")
    return { inline: first, lines: [first] };

  const connector = connectorFor(layout);
  if (layout === "stacked" || layout === "stacked-heart") {
    const lines = connector ? [first, connector, second] : [first, second];
    return { inline: lines.join(" "), lines };
  }
  const inline = connector
    ? `${first} ${connector} ${second}`
    : `${first} ${second}`;
  return { inline, lines: [inline] };
}

export function identityFromSpecification(spec: JewelrySpecification) {
  const arabic = spec.arabicStyle !== "none";
  return formatIdentity(
    spec.names.map((name) =>
      arabic
        ? (name.approvedArabicText ?? "")
        : (name.approvedEnglishText ?? ""),
    ),
    spec.layout,
  );
}

export function formatCaleumsPrice(design?: {
  estimate?: { currency: "AED"; high: number };
  quote?: { status: string; total: number };
}) {
  const quoted =
    design?.quote && ["issued", "accepted"].includes(design.quote.status)
      ? design.quote.total
      : undefined;
  const amount =
    quoted ?? design?.estimate?.high ?? CALEUMS_STARTING_PRICE.amount;
  const currency =
    design?.estimate?.currency ?? CALEUMS_STARTING_PRICE.currency;
  return `${currency} ${amount.toLocaleString("en-AE")}`;
}
