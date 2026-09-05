/**
 * Catalog still map for the review journey.
 * look × sit × name-length → JPEG under /review/stills.
 * Missing cells return a legal sibling so a slot is never blank.
 * Drop sit files are upright stacks (`downwards`), never a 90° rotate.
 */
export type LookId = "window" | "halo" | "rails" | "drop";
export type SitId = "bar" | "drop" | "window";
export type LengthId = "short" | "medium" | "long";
export type SkinId = "v1" | "v2" | "v3" | "v4" | "v5" | "v6";
export type SizeMm = 22 | 32;
export type CameraId = "studio" | "skin" | "close" | "dark";
export type FlowStep = "compose" | "sit" | "atelier";
export type SlotState =
  | "catalog"
  | "queued"
  | "generating"
  | "verifying"
  | "ready"
  | "retrying"
  | "failed"
  | "cancelled";
export type ScriptId = "en" | "ar";

export const SKINS: SkinId[] = ["v1", "v2", "v3", "v4", "v5", "v6"];
export const LOOKS: LookId[] = ["window", "halo", "rails", "drop"];
export const SITS: SitId[] = ["bar", "drop", "window"];
export const SIZES: SizeMm[] = [22, 32];
export const CAMERAS: CameraId[] = ["studio", "skin", "close", "dark"];
export const STEPS: FlowStep[] = ["compose", "sit", "atelier"];

const LOOK_FILE: Record<LookId, string> = {
  window: "S03",
  halo: "S04",
  rails: "S18",
  drop: "S16",
};

const SIT_FILE: Record<SitId, string> = {
  bar: "normal",
  drop: "downwards",
  window: "in-frame",
};

const AVAILABLE = new Set([
  "S01-in-frame-long.jpg",
  "S01-in-frame-medium.jpg",
  "S01-in-frame-short.jpg",
  "S01-normal-long.jpg",
  "S03-downwards-long.jpg",
  "S03-downwards-medium.jpg",
  "S03-downwards-short.jpg",
  "S03-in-frame-long.jpg",
  "S03-in-frame-medium.jpg",
  "S03-in-frame-short.jpg",
  "S03-normal-long.jpg",
  "S03-normal-medium.jpg",
  "S03-normal-short.jpg",
  "S04-downwards-long.jpg",
  "S04-downwards-medium.jpg",
  "S04-downwards-short.jpg",
  "S04-in-frame-long.jpg",
  "S04-in-frame-medium.jpg",
  "S04-in-frame-short.jpg",
  "S04-normal-long.jpg",
  "S04-normal-medium.jpg",
  "S04-normal-short.jpg",
  "S11-downwards-long.jpg",
  "S11-downwards-short.jpg",
  "S11-in-frame-long.jpg",
  "S11-in-frame-medium.jpg",
  "S11-in-frame-short.jpg",
  "S11-normal-long.jpg",
  "S11-normal-short.jpg",
  "S13-downwards-long.jpg",
  "S13-downwards-medium.jpg",
  "S13-downwards-short.jpg",
  "S13-in-frame-long.jpg",
  "S13-in-frame-medium.jpg",
  "S13-in-frame-short.jpg",
  "S13-normal-long.jpg",
  "S13-normal-medium.jpg",
  "S13-normal-short.jpg",
  "S16-downwards-long.jpg",
  "S16-downwards-medium.jpg",
  "S16-downwards-short.jpg",
  "S16-in-frame-long.jpg",
  "S16-in-frame-medium.jpg",
  "S16-in-frame-short.jpg",
  "S16-normal-long.jpg",
  "S16-normal-medium.jpg",
  "S16-normal-short.jpg",
  "S17-downwards-long.jpg",
  "S17-downwards-medium.jpg",
  "S17-downwards-short.jpg",
  "S17-in-frame-long.jpg",
  "S17-in-frame-medium.jpg",
  "S17-in-frame-short.jpg",
  "S17-normal-long.jpg",
  "S17-normal-medium.jpg",
  "S17-normal-short.jpg",
  "S18-in-frame-long.jpg",
  "S18-in-frame-medium.jpg",
  "S18-normal-long.jpg",
  "S18-normal-medium.jpg",
  "S18-normal-short.jpg",
]);

function fileFor(look: LookId, sit: SitId, length: LengthId): string {
  return `${LOOK_FILE[look]}-${SIT_FILE[sit]}-${length}.jpg`;
}

export function stillSrc(
  look: LookId,
  sit: SitId,
  length: LengthId,
): { src: string; sibling: boolean } {
  const exact = fileFor(look, sit, length);
  const fallbacks = [
    exact,
    fileFor(look, sit, "medium"),
    fileFor(look, sit, "short"),
    fileFor(look, sit, "long"),
    fileFor(look, "window", length),
    fileFor(look, "bar", length),
    fileFor("window", sit, length),
    "S03-in-frame-medium.jpg",
  ];
  for (const name of fallbacks) {
    if (AVAILABLE.has(name)) {
      return { src: `/review/stills/${name}`, sibling: name !== exact };
    }
  }
  return { src: "/review/stills/S03-in-frame-medium.jpg", sibling: true };
}

export function lengthFromName(name: string): LengthId {
  const letters = Array.from(name.replace(/\s+/g, "")).filter((ch) =>
    /\p{L}/u.test(ch),
  );
  const n = letters.length;
  if (n === 0) return "medium";
  if (n <= 3) return "short";
  if (n >= 7) return "long";
  return "medium";
}

export const SKIN_META: Record<
  SkinId,
  { en: string; ar: string; library: string }
> = {
  v1: { en: "Altar", ar: "مذبح", library: "Motion" },
  v2: { en: "Look reel", ar: "شريط", library: "Snap" },
  v3: { en: "Inspect", ar: "تفقد", library: "Zoom" },
  v4: { en: "Name live", ar: "الاسم حي", library: "Motion" },
  v5: { en: "Atelier RTL", ar: "الأتيليه", library: "Logical CSS" },
  v6: { en: "Spec board", ar: "لوحة", library: "Grid" },
};

export const LOOK_META: Record<
  LookId,
  { en: string; ar: string; captionEn: string; captionAr: string }
> = {
  window: { en: "Window", ar: "إطار", captionEn: "frame", captionAr: "إطار" },
  halo: { en: "Halo", ar: "هالة", captionEn: "circle", captionAr: "دائرة" },
  rails: { en: "Rails", ar: "قضبان", captionEn: "bars", captionAr: "قضبان" },
  drop: { en: "Drop", ar: "سقوط", captionEn: "hang", captionAr: "تعليق" },
};

export const SIT_META: Record<
  SitId,
  { en: string; ar: string; captionEn: string; captionAr: string }
> = {
  bar: { en: "Bar", ar: "شريط", captionEn: "across", captionAr: "عرض" },
  drop: { en: "Drop", ar: "تساقط", captionEn: "fall", captionAr: "سقوط" },
  window: { en: "Window", ar: "إطار", captionEn: "inside", captionAr: "داخل" },
};

export const CAMERA_META: Record<
  CameraId,
  { en: string; ar: string; ratio: "1" | "4-5" | "9-16" }
> = {
  studio: { en: "Studio", ar: "ستوديو", ratio: "1" },
  skin: { en: "On skin", ar: "على البشرة", ratio: "4-5" },
  close: { en: "Close", ar: "قرب", ratio: "1" },
  dark: { en: "Dark", ar: "عتمة", ratio: "9-16" },
};

export function isSkin(value: string): value is SkinId {
  return (SKINS as string[]).includes(value);
}

export function isStep(value: string): value is FlowStep {
  return (STEPS as string[]).includes(value);
}

export function cameraRatio(camera: CameraId): "1" | "4-5" | "9-16" {
  return CAMERA_META[camera].ratio;
}
