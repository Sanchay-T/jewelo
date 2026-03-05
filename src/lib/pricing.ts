import {
  SIZE_MAP,
  JEWELRY_SIZE_MAP,
  KARAT_FACTOR,
  LABOR_COST,
  MARKUP_PERCENT,
  STONE_UNIT_COST_AED,
  METAL_FINISH_LABOR_SURCHARGE,
  styleFromGemstones,
} from "./constants";
import type { Size, Karat, Style, MetalFinish, Gemstone } from "./constants";

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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function defaultLengthBySize(size: Size): number {
  return size === "small" ? 15 : size === "large" ? 30 : 20;
}

function stoneCostFromSelection(size: Size, complexity: number, gemstones: readonly Gemstone[]): number {
  if (!gemstones.length) return 0;

  const baseStoneCount = { small: 6, medium: 10, large: 16 }[size];
  const complexityStoneFactor = 0.8 + complexity * 0.05;
  const totalStoneCount = Math.max(1, Math.round(baseStoneCount * complexityStoneFactor));
  const avgStoneUnit =
    gemstones.reduce((sum, gem) => sum + STONE_UNIT_COST_AED[gem], 0) / gemstones.length;

  return Math.round(totalStoneCount * avgStoneUnit);
}

function legacyStoneCost(size: Size, style: Style): number {
  if (style === "gold_with_stones") {
    return ({ small: 200, medium: 400, large: 700 } as const)[size];
  }
  if (style === "gold_with_diamonds") {
    return ({ small: 500, medium: 900, large: 1500 } as const)[size];
  }
  return 0;
}

export function calculatePrice(params: {
  karat: Karat;
  size: Size;
  style: Style;
  goldPricePerGram: number;
  jewelryType?: string;
  complexity?: number;
  gemstones?: readonly Gemstone[];
  metalFinish?: MetalFinish;
  lengthMm?: number;
}): PriceBreakdown {
  const complexity = clamp(Math.round(params.complexity ?? 5), 1, 10);
  const gemstones = params.gemstones ?? [];
  const resolvedStyle = styleFromGemstones(gemstones, params.style);
  const finish = params.metalFinish ?? "polished";

  const typeMap = params.jewelryType && params.jewelryType in JEWELRY_SIZE_MAP
    ? JEWELRY_SIZE_MAP[params.jewelryType as keyof typeof JEWELRY_SIZE_MAP]
    : null;
  const sizeData = (typeMap?.[params.size as keyof typeof typeMap] as typeof SIZE_MAP[Size]) || SIZE_MAP[params.size];
  const defaultLength = defaultLengthBySize(params.size);
  const lengthFactor =
    typeof params.lengthMm === "number"
      ? clamp(params.lengthMm / defaultLength, 0.8, 1.6)
      : 1;
  const complexityWeightFactor = clamp(1 + (complexity - 5) * 0.04, 0.8, 1.2);
  const baseWeight =
    resolvedStyle === "gold_only" ? sizeData.weightGoldOnly : sizeData.weightWithStones;
  const weight = baseWeight * lengthFactor * complexityWeightFactor;
  const goldContent = weight * KARAT_FACTOR[params.karat];
  const materialCost = goldContent * params.goldPricePerGram;
  const finishLaborFactor = 1 + METAL_FINISH_LABOR_SURCHARGE[finish] / 100;
  const laborComplexityFactor = clamp(1 + (complexity - 5) * 0.04, 0.8, 1.2);
  const laborCost = Math.round(LABOR_COST[params.size] * finishLaborFactor * laborComplexityFactor);
  const stoneCost = gemstones.length
    ? stoneCostFromSelection(params.size, complexity, gemstones)
    : legacyStoneCost(params.size, resolvedStyle);
  const markupPercent = MARKUP_PERCENT[resolvedStyle];
  const subtotal = materialCost + laborCost + stoneCost;
  const markup = subtotal * (markupPercent / 100);

  return {
    weight: Number(weight.toFixed(2)),
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
