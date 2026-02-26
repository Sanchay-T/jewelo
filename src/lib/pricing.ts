import { SIZE_MAP, JEWELRY_SIZE_MAP, KARAT_FACTOR, LABOR_COST, MARKUP_PERCENT } from "./constants";
import type { Size, Karat, Style } from "./constants";

export type PriceBreakdown = {
  weight: number;
  materialCost: number;
  laborCost: number;
  stoneCost: number;
  markup: number;
  total: number;
  currency: "AED";
  goldPricePerGram: number;
  updatedAt: number;
};

export function calculatePrice(params: {
  karat: Karat;
  size: Size;
  style: Style;
  goldPricePerGram: number;
  jewelryType?: string;
}): PriceBreakdown {
  const typeMap = params.jewelryType && params.jewelryType in JEWELRY_SIZE_MAP
    ? JEWELRY_SIZE_MAP[params.jewelryType as keyof typeof JEWELRY_SIZE_MAP]
    : null;
  const sizeData = (typeMap?.[params.size as keyof typeof typeMap] as typeof SIZE_MAP[Size]) || SIZE_MAP[params.size];
  const weight = params.style === "gold_only" ? sizeData.weightGoldOnly : sizeData.weightWithStones;
  const goldContent = weight * KARAT_FACTOR[params.karat];
  const materialCost = goldContent * params.goldPricePerGram;
  const laborCost = LABOR_COST[params.size];
  const stoneCost =
    params.style === "gold_with_stones"
      ? ({ small: 200, medium: 400, large: 700 } as const)[params.size]
      : params.style === "gold_with_diamonds"
        ? ({ small: 500, medium: 900, large: 1500 } as const)[params.size]
        : 0;
  const markupPercent = MARKUP_PERCENT[params.style];
  const subtotal = materialCost + laborCost + stoneCost;
  const markup = subtotal * (markupPercent / 100);
  return {
    weight,
    materialCost: Math.round(materialCost),
    laborCost,
    stoneCost,
    markup: Math.round(markup),
    total: Math.round(subtotal + markup),
    currency: "AED",
    goldPricePerGram: params.goldPricePerGram,
    updatedAt: Date.now(),
  };
}
