import type { Size } from "./constants";

export function isQuoteEligible(params: {
  jewelryType?: string;
  lengthMm?: number;
  size?: Size;
}): boolean {
  const jewelryType = (params.jewelryType || "").toLowerCase();
  if (jewelryType === "ring" || jewelryType === "necklace" || jewelryType === "chain") {
    return true;
  }

  const inferredLength =
    typeof params.lengthMm === "number"
      ? params.lengthMm
      : params.size === "large"
        ? 30
        : params.size === "small"
          ? 15
          : 20;

  const isPendant = jewelryType === "pendant" || jewelryType === "name_pendant";
  return isPendant && inferredLength >= 30;
}
