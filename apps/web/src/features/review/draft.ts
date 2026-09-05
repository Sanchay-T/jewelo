"use client";

/**
 * Session-only draft and simulated run clock.
 * Bump DRAFT_KEY if the shape changes so stale finish/metal drafts are ignored.
 */

import { useCallback, useEffect, useState } from "react";
import type { CameraId, LookId, ScriptId, SitId, SizeMm } from "./still-board";

const DRAFT_KEY = "jewelo-review-draft-v2";
const RUN_KEY = "jewelo-review-run-v1";

export type Draft = {
  name: string;
  script: ScriptId;
  look: LookId;
  sit: SitId;
  size: SizeMm;
  camera: CameraId;
};

export const emptyDraft: Draft = {
  name: "",
  script: "en",
  look: "window",
  sit: "window",
  size: 32,
  camera: "studio",
};

export type Run = {
  startedAt: number;
};

export function useDraft(): [Draft, (patch: Partial<Draft>) => void] {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) setDraft({ ...emptyDraft, ...(JSON.parse(raw) as Draft) });
    } catch {
      /* ignore */
    }
  }, []);
  const update = useCallback((patch: Partial<Draft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);
  return [draft, update];
}

export function readRun(): Run | null {
  try {
    const raw = sessionStorage.getItem(RUN_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Run;
  } catch {
    return null;
  }
}

export function startRun(): Run {
  const run = { startedAt: Date.now() };
  sessionStorage.setItem(RUN_KEY, JSON.stringify(run));
  return run;
}

export function clearRun() {
  sessionStorage.removeItem(RUN_KEY);
}
