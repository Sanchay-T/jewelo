export const FINAL_MEDIA_SHOTS = {
  studio: { profile: "image.packshot", aspectRatio: "1:1" },
  on_skin: { profile: "image.worn", aspectRatio: "4:5" },
  close_up: { profile: "image.macro_gift", aspectRatio: "1:1" },
  dark: { profile: "image.dark_editorial", aspectRatio: "9:16" },
  studio_hero: { profile: "image.studio_hero", aspectRatio: "9:16" },
  billboard: { profile: "image.billboard", aspectRatio: "16:9" },
  motion_preview: { profile: "video.preview", aspectRatio: "9:16" },
  motion_final: { profile: "video.final", aspectRatio: "9:16" },
} as const;

export type DurablePresentationView = keyof typeof FINAL_MEDIA_SHOTS;

export interface DurableMediaTaskRow {
  id: string;
  run_id: string;
  presentation_view: DurablePresentationView;
  task_profile: (typeof FINAL_MEDIA_SHOTS)[DurablePresentationView]["profile"];
  aspect_ratio: (typeof FINAL_MEDIA_SHOTS)[DurablePresentationView]["aspectRatio"];
  dependency_task_id: string | null;
  input_asset_ids: string[];
  pipeline_release: string;
  model_release: string;
  prompt_release_id: string;
  style_anchor_release_id: string | null;
}
