// Legacy file — re-exports from the new modular prompt system.
// This file exists for backward compatibility with any imports
// that reference "@/lib/prompts" directly.
export {
  buildOnBodyPrompt,
  buildFromScratchPrompt,
  buildReferenceEngravePrompt,
  buildVideoPrompt,
  buildVideoNegativePrompt,
  type DesignInput,
  FONT_STYLES,
  DECORATION_STYLES,
  SIZE_FEELS,
  BACKGROUND_STYLES,
  VARIATIONS,
} from "./prompts/index";
