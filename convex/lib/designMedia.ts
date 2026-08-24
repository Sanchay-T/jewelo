import type { Id } from "../_generated/dataModel";

type StorageId = Id<"_storage">;

type MediaDesign = {
  productImageStorageIds?: (StorageId | null)[];
  onBodyImageStorageIds?: (StorageId | null)[];
  videoStorageIds?: (StorageId | null)[];
  videoStatuses?: string[];
  videoOperationIds?: string[];
  selectedVariationIndex?: number;
  videoStorageId?: StorageId;
};

const DEFAULT_VARIATION_COUNT = 4;

export function getVariationSlotCount(design: MediaDesign): number {
  return Math.max(
    DEFAULT_VARIATION_COUNT,
    design.productImageStorageIds?.length || 0,
    design.onBodyImageStorageIds?.length || 0,
    design.videoStorageIds?.length || 0,
    design.videoStatuses?.length || 0,
    design.videoOperationIds?.length || 0
  );
}

export function normalizeStorageSlots(
  storageIds: (StorageId | null)[] | undefined,
  slotCount: number
): (StorageId | null)[] {
  const slots = [...(storageIds || [])];
  while (slots.length < slotCount) slots.push(null);
  return slots;
}

export function normalizeStringSlots(
  values: string[] | undefined,
  slotCount: number,
  fillValue: string
): string[] {
  const slots = [...(values || [])];
  while (slots.length < slotCount) slots.push(fillValue);
  return slots;
}

export function setStorageSlot(
  storageIds: (StorageId | null)[] | undefined,
  variationIndex: number,
  storageId: StorageId,
  slotCount: number
): (StorageId | null)[] {
  const slots = normalizeStorageSlots(
    storageIds,
    Math.max(slotCount, variationIndex + 1)
  );
  slots[variationIndex] = storageId;
  return slots;
}

export function setStringSlot(
  values: string[] | undefined,
  variationIndex: number,
  value: string,
  fillValue: string,
  slotCount: number
): string[] {
  const slots = normalizeStringSlots(
    values,
    Math.max(slotCount, variationIndex + 1),
    fillValue
  );
  slots[variationIndex] = value;
  return slots;
}

export function getSelectedVariationIndex(design: MediaDesign): number {
  const slotCount = getVariationSlotCount(design);
  const rawIndex = design.selectedVariationIndex ?? 0;
  return Math.max(0, Math.min(rawIndex, Math.max(slotCount - 1, 0)));
}

export async function resolveStorageUrls(
  ctx: {
    storage: {
      getUrl: (storageId: StorageId) => Promise<string | null>;
    };
  },
  storageIds: (StorageId | null)[] | undefined,
  slotCount: number
): Promise<(string | null)[]> {
  const slots = normalizeStorageSlots(storageIds, slotCount);
  return Promise.all(slots.map((storageId) => (storageId ? ctx.storage.getUrl(storageId) : null)));
}

export async function resolveSelectedVideoUrl(
  ctx: {
    storage: {
      getUrl: (storageId: StorageId) => Promise<string | null>;
    };
  },
  design: MediaDesign
): Promise<string | null> {
  const slotCount = getVariationSlotCount(design);
  const selectedIdx = getSelectedVariationIndex(design);
  const videoSlots = normalizeStorageSlots(design.videoStorageIds, slotCount);
  const selectedVideoId = videoSlots[selectedIdx];
  if (selectedVideoId) {
    return ctx.storage.getUrl(selectedVideoId);
  }
  if (design.videoStorageId) {
    return ctx.storage.getUrl(design.videoStorageId);
  }
  return null;
}
