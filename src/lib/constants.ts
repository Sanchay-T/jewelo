export const NAME_LIMITS = {
  en: { min: 1, max: 15 },
  ar: { min: 1, max: 12 },
  zh: { min: 1, max: 8 },
} as const;

export const SIZE_MAP = {
  small: { label: "S", dimension: "12mm", weightGoldOnly: 2.5, weightWithStones: 3.0 },
  medium: { label: "M", dimension: "18mm", weightGoldOnly: 4.0, weightWithStones: 5.0 },
  large: { label: "L", dimension: "25mm", weightGoldOnly: 6.5, weightWithStones: 8.0 },
} as const;

export const KARAT_FACTOR = { "18K": 0.750, "21K": 0.875, "22K": 0.916 } as const;
export const LABOR_COST = { small: 150, medium: 250, large: 400 } as const;
export const MARKUP_PERCENT = { gold_only: 80, gold_with_stones: 100, gold_with_diamonds: 120 } as const;
export const AED_USD_PEG = 3.6725;
export const MAX_REGENERATIONS = 3;
export const MAX_GENERATIONS_PER_HOUR = 10;

export type Size = keyof typeof SIZE_MAP;
export type Karat = keyof typeof KARAT_FACTOR;
export type Style = keyof typeof MARKUP_PERCENT;
export type Language = keyof typeof NAME_LIMITS;
