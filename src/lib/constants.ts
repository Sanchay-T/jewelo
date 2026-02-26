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

export const JEWELRY_SIZE_MAP = {
  pendant: {
    small:  { label: "S", dimension: "12mm", weightGoldOnly: 2.5, weightWithStones: 3.0 },
    medium: { label: "M", dimension: "18mm", weightGoldOnly: 4.0, weightWithStones: 5.0 },
    large:  { label: "L", dimension: "25mm", weightGoldOnly: 6.5, weightWithStones: 8.0 },
  },
  name_pendant: {
    small:  { label: "S", dimension: "15mm tall", weightGoldOnly: 2.0, weightWithStones: 2.5 },
    medium: { label: "M", dimension: "20mm tall", weightGoldOnly: 3.5, weightWithStones: 4.5 },
    large:  { label: "L", dimension: "30mm tall", weightGoldOnly: 5.5, weightWithStones: 7.0 },
  },
  ring: {
    small:  { label: "US 5-6", dimension: "15.7-16.5mm", weightGoldOnly: 3.0, weightWithStones: 3.5 },
    medium: { label: "US 7-8", dimension: "17.3-18.1mm", weightGoldOnly: 4.5, weightWithStones: 5.5 },
    large:  { label: "US 9-11", dimension: "19.0-20.6mm", weightGoldOnly: 6.0, weightWithStones: 7.5 },
  },
  bracelet: {
    small:  { label: "S", dimension: "16cm", weightGoldOnly: 5.0, weightWithStones: 6.0 },
    medium: { label: "M", dimension: "18cm", weightGoldOnly: 7.0, weightWithStones: 8.5 },
    large:  { label: "L", dimension: "20cm", weightGoldOnly: 9.0, weightWithStones: 11.0 },
  },
  earrings: {
    small:  { label: "S", dimension: "8mm", weightGoldOnly: 1.5, weightWithStones: 2.0 },
    medium: { label: "M", dimension: "12mm", weightGoldOnly: 2.5, weightWithStones: 3.0 },
    large:  { label: "L", dimension: "16mm", weightGoldOnly: 3.5, weightWithStones: 4.5 },
  },
} as const;

export type JewelryType = keyof typeof JEWELRY_SIZE_MAP;
export type Size = keyof typeof SIZE_MAP;
export type Karat = keyof typeof KARAT_FACTOR;
export type Style = keyof typeof MARKUP_PERCENT;
export type Language = keyof typeof NAME_LIMITS;
