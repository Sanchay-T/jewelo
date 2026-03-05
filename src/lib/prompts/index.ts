// ---------------------------------------------------------------------------
// Barrel export — re-exports every prompt module for convenient single-import.
// ---------------------------------------------------------------------------

export {
  // Types
  type DesignInput,
  // Lookup maps
  FONT_STYLES,
  DECORATION_STYLES,
  decorationFromSelection,
  SIZE_FEELS,
  complexityDescriptor,
  finishDescriptor,
  BACKGROUND_STYLES,
  // Reusable prompt blocks
  engravingPhysicsBlock,
  textReferenceBlock,
  absoluteRulesBlock,
} from "./shared";

export {
  type VariationModifier,
  VARIATIONS,
} from "./variations";

export { buildOnBodyPrompt } from "./onBody";
export { buildFromScratchPrompt } from "./fromScratch";
export { buildReferenceEngravePrompt } from "./referenceShot";
export { buildVideoPrompt, buildVideoNegativePrompt } from "./videoPrompt";
