import type { View } from "./model";

/** One in-flight or completed set of preview photographs, per camera view. */
export type Capture = {
  key: string;
  views: Partial<Record<View, { blob: Blob; url: string }>>;
  errors: Partial<Record<View, string>>;
};
