/* ─────────────────────────────────────────────────────────
 * VITRINE
 *
 * Light and paper may move. The gold geometry may not.
 * No spring. No scale-pop. No percent.
 * ───────────────────────────────────────────────────────── */

export const VITRINE = {
  easeLuxury: [0.16, 1, 0.3, 1] as const,
  easeCrossfade: [0.4, 0, 0.2, 1] as const,
  luxuryMs: 600,
  crossfadeMs: 400,
  veilMs: 200,
  pressMs: 120,
  hairlineMs: 2400,
  slotStaggerMs: 50,
  landingStillDelayMs: 120,
  landingKickerDelayMs: 320,
  landingCtaDelayMs: 480,
  castHoldMs: 160,
};

export const CAST_TIMELINE: Record<
  "studio" | "skin" | "close" | "dark",
  {
    generating: number;
    verifying: number;
    retrying?: number;
    ready: number;
  }
> = {
  studio: { generating: 400, verifying: 1800, ready: 2600 },
  skin: { generating: 900, verifying: 3400, ready: 4300 },
  close: { generating: 1400, verifying: 5000, ready: 5900 },
  dark: { generating: 1800, retrying: 3200, verifying: 6400, ready: 7600 },
};

export type CameraRunState =
  | "queued"
  | "generating"
  | "verifying"
  | "ready"
  | "retrying"
  | "failed"
  | "cancelled";

export function cameraStateAt(
  camera: keyof typeof CAST_TIMELINE,
  elapsedMs: number,
): CameraRunState {
  const t = CAST_TIMELINE[camera];
  if (elapsedMs < t.generating) return "queued";
  if (t.retrying !== undefined && elapsedMs >= t.retrying && elapsedMs < t.verifying) {
    if (elapsedMs < t.retrying + 900) return "retrying";
  }
  if (elapsedMs < t.verifying) return "generating";
  if (elapsedMs < t.ready) return "verifying";
  return "ready";
}
