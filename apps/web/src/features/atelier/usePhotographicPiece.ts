"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resolveOptionFamily } from "./catalogue";
import { views, type Draft, type View, type VisualField } from "./model";
import { assemblyKey } from "./renderer/assembly";
import type { Capture } from "./renderer/usePiece";
import { saveSnapshotRecord } from "./renderer/storage";

export function usePhotographicPiece(draft: Draft, enabled: boolean, focus?: VisualField, activeView: View = "Studio") {
  const family = resolveOptionFamily(draft, focus);
  const familyKey = family.assets.map(asset => asset.id).join("|");
  const key = assemblyKey(draft);
  const identity = key + familyKey;
  const current = useRef({ key, enabled, identity, assets: family.assets });
  current.current = { key, enabled, identity, assets: family.assets };
  const [publishedIdentity, setPublishedIdentity] = useState("");
  const alive = useRef(false);
  const revision = useRef(0);
  const viewRevisions = useRef<Partial<Record<View, number>>>({});
  const retryQueue = useRef<Promise<unknown>>(Promise.resolve());
  const resultIdentity = useRef("");
  const lastImages = useRef<Partial<Record<View, { src: string; alt: string; identity: string }>>>({});
  const result = useRef<Capture>({ key: "", views: {}, errors: {} });
  const [state, setState] = useState<Capture>(result.current);
  const [warning, setWarning] = useState("");
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; revision.current++; };
  }, []);
  const capture = useCallback(async (requested: View[], failDark = false): Promise<Capture> => {
    const target = current.current.key;
    const targetIdentity = current.current.identity;
    const assets = current.current.assets;
    const token = revision.current;
    const tickets = Object.fromEntries(requested.map(view => {
      const next = (viewRevisions.current[view] ?? 0) + 1;
      viewRevisions.current[view] = next;
      return [view, next];
    })) as Partial<Record<View, number>>;
    const valid = () => alive.current && current.current.enabled && current.current.identity === targetIdentity && token === revision.current;
    await Promise.all(requested.map(async (view) => {
      let image: Capture["views"][View];
      let error: string | undefined;
      try {
        if (failDark && view === "Dark") throw new Error("This view failed. Retry Dark.");
        const photo = assets.find((sample) => sample.view === view);
        if (!photo) throw new Error("A matching photo is not available for this selection.");
        const response = await fetch(photo.src, { signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error("This photo could not load. Please retry.");
        const blob = await response.blob();
        if (!blob.type.startsWith("image/")) throw new Error("This photo is unavailable.");
        image = { blob, url: photo.src };
      } catch (reason) {
        error = reason instanceof Error ? reason.message : "This photo could not load.";
      }
      if (valid() && viewRevisions.current[view] === tickets[view]) {
        // Merge only this angle into the latest result: other in-flight angles
        // retain ownership of their own success/failure independently.
        const previous = resultIdentity.current === targetIdentity ? result.current : { key: target, views: {}, errors: {} };
        const partial: Capture = { key: target, views: { ...previous.views }, errors: { ...previous.errors } };
        if (image) {
          partial.views[view] = image;
          delete partial.errors[view];
          const photo = assets.find(asset => asset.view === view)!;
          lastImages.current[view] = { src: image.url, identity: targetIdentity,
            alt: `Previous illustrative ${view} photo: ${photo.draft.construction}, ${photo.draft.lettering}, ${photo.draft.metal}. The current selection is loading.` };
        }
        else partial.errors[view] = error ?? "This photo could not load.";
        result.current = partial;
        resultIdentity.current = targetIdentity;
        setState(partial);
        setPublishedIdentity(targetIdentity);
      }
    }));
    if (!valid() || requested.some(view => viewRevisions.current[view] !== tickets[view]))
      throw new Error("The selection or requested preview changed. Preview the current design.");
    return result.current;
  }, []);
  useEffect(() => {
    if (enabled) void capture([...views]).catch(() => {});
  }, [identity, enabled, capture]);
  const retry = useCallback((view?: View) => {
    const targetIdentity = current.current.identity;
    const work = retryQueue.current.catch(() => {}).then(() => {
      if (current.current.identity !== targetIdentity) throw new Error("The selection changed. Preview the current design.");
      return capture(view ? [view] : [...views]);
    });
    retryQueue.current = work;
    return work;
  }, [capture]);
  const captureReview = useCallback((failDark = false) => capture([...views], failDark), [capture]);
  const saveSnapshot = useCallback(async (id: string) => {
    const imageSet = result.current;
    const target = current.current.key;
    const targetIdentity = current.current.identity;
    const availableViews = views.filter((view) => imageSet.views[view] && !imageSet.errors[view]);
    if (imageSet.key !== target || resultIdentity.current !== targetIdentity || !availableViews.length) throw new Error("Load the preview before saving.");
    const descriptor = await saveSnapshotRecord({
      id, key: target, rendererVersion: "photographic-v1", availableViews,
      blobs: Object.fromEntries(availableViews.map((view) => [view, imageSet.views[view]!.blob])),
    });
    if (!alive.current || current.current.identity !== targetIdentity) throw new Error("The selection changed while saving.");
    if (!descriptor.persistent) setWarning("Image storage is unavailable. Saved photos are available only while this tab stays open.");
    return descriptor;
  }, []);
  const active = enabled && state.key === key && publishedIdentity === identity;
  const previous = lastImages.current[activeView];
  const hasSuccess = views.some(view => state.views[view] && !state.errors[view]);
  const unsettled = views.some(view => !state.views[view] && !state.errors[view]);
  return {
    previousImage: previous && previous.identity !== identity ? { src: previous.src, alt: previous.alt } : undefined,
    family, missing: family.missing, availableViews: family.assets.map(asset => asset.view),
    key, status: family.missing ? "missing" as const : !active || (!hasSuccess && unsettled) ? "pending" as const : hasSuccess ? "ready" as const : "failed" as const,
    views: active ? Object.fromEntries(Object.entries(state.views).map(([view, photo]) => [view, photo.url])) as Partial<Record<View, string>> : {},
    errors: active ? state.errors : {}, retry, captureReview, saveSnapshot, warning,
  };
}
