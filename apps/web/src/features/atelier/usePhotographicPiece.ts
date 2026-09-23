"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SAMPLE_PHOTO_TIMEOUT_MS } from "@jewelo/config/sellable";
import { resolveOptionFamily } from "./catalogue";
import { views, type Draft, type View, type VisualField } from "./model";
import { assemblyKey } from "./assembly";
import type { Capture } from "./capture";
import { saveSnapshotRecord, SNAPSHOT_VERSION } from "./snapshotStore";

/* Every sample photograph ships twice: the WebP the manifests name and a JPEG
   twin of the same pixels next to it. A browser without WebP (Safari before 14,
   an old kiosk) reads the twin. The decision is the client's alone - the server
   and the hydrating render always say WebP - so the markup React hydrates is
   the markup the server sent, and the swap arrives in the re-render after. */
const noSubscribers = () => () => {};
let clientSupport: "webp" | "jpeg" | undefined;
const clientFormat = () =>
  (clientSupport ??= document
    .createElement("canvas")
    .toDataURL("image/webp")
    .startsWith("data:image/webp")
    ? "webp"
    : "jpeg");
const serverFormat = () => "webp" as const;
const sameUrl = (src: string) => src;
const jpegTwin = (src: string) => src.replace(/\.webp$/, ".jpg");
/** The one place a sample URL is resolved: fetch, img, bag, zoom and snapshot all read it. */
export function useSampleUrl(): (src: string) => string {
  return useSyncExternalStore(noSubscribers, clientFormat, serverFormat) === "jpeg"
    ? jpegTwin
    : sameUrl;
}

export function usePhotographicPiece(draft: Draft, enabled: boolean, focus?: VisualField, activeView: View = "Studio") {
  const family = resolveOptionFamily(draft, focus);
  const familyKey = family.assets.map(asset => asset.id).join("|");
  const key = assemblyKey(draft);
  // The illustrated photograph is keyed on the design (Tier 1) alone, so a gold,
  // stone, gem, size or chain click neither reloads it nor flashes a loading
  // state over a pendant that has not changed.
  const identity = familyKey || "sample-coming:" + family.tier1Key;
  const sampleUrl = useSampleUrl();
  const current = useRef({ key, enabled, identity, assets: family.assets, activeView, sampleUrl });
  current.current = { key, enabled, identity, assets: family.assets, activeView, sampleUrl };
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
  const shownViews = useCallback(() => current.current.assets.map(asset => asset.view), []);
  const capture = useCallback(async (requested: View[], failDark = false): Promise<Capture> => {
    const target = current.current.key;
    const targetIdentity = current.current.identity;
    const assets = current.current.assets;
    const toUrl = current.current.sampleUrl;
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
        const url = toUrl(photo.src);
        const response = await fetch(url, { signal: AbortSignal.timeout(SAMPLE_PHOTO_TIMEOUT_MS) });
        if (!response.ok) throw new Error("This photo could not load. Please retry.");
        const blob = await response.blob();
        if (!blob.type.startsWith("image/")) throw new Error("This photo is unavailable.");
        image = { blob, url };
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
    // Only the views this family actually has: an absent camera is hidden, not failed.
    if (!enabled) return;
    const available = shownViews();
    // The camera on screen is fetched alone and first; the other angles of the
    // same look follow once it has landed. Asking for all four at once put the
    // photograph the shopper is actually looking at in a four-way race with
    // three she cannot see, which is what made the first paint feel slow.
    const hero = available.includes(current.current.activeView) ? current.current.activeView : available[0];
    if (!hero) return;
    void capture([hero])
      .then(() => {
        const rest = available.filter((view) => view !== hero);
        return rest.length ? capture(rest) : undefined;
      })
      .catch(() => {});
    // `sampleUrl` is in the deps because a browser without WebP only says so in
    // the render after hydration: that re-fetches the JPEG twin of the same look.
  }, [identity, enabled, capture, sampleUrl]);
  const retry = useCallback((view?: View) => {
    const targetIdentity = current.current.identity;
    const work = retryQueue.current.catch(() => {}).then(() => {
      if (current.current.identity !== targetIdentity) throw new Error("The selection changed. Preview the current design.");
      return capture(view ? [view] : shownViews());
    });
    retryQueue.current = work;
    return work;
  }, [capture]);
  const captureReview = useCallback((failDark = false) => capture(shownViews(), failDark), [capture]);
  const saveSnapshot = useCallback(async (id: string) => {
    const imageSet = result.current;
    const target = current.current.key;
    const targetIdentity = current.current.identity;
    const availableViews = views.filter((view) => imageSet.views[view] && !imageSet.errors[view]);
    // The saved record carries the customer's complete assembly; the images it
    // stores are the illustrated design, which depends on Tier 1 only.
    if (resultIdentity.current !== targetIdentity || !availableViews.length) throw new Error("Load the preview before saving.");
    const descriptor = await saveSnapshotRecord({
      id, key: target, rendererVersion: SNAPSHOT_VERSION, availableViews,
      blobs: Object.fromEntries(availableViews.map((view) => [view, imageSet.views[view]!.blob])),
    });
    if (!alive.current || current.current.identity !== targetIdentity) throw new Error("The selection changed while saving.");
    if (!descriptor.persistent) setWarning("Image storage is unavailable. Saved photos are available only while this tab stays open.");
    return descriptor;
  }, []);
  const active = enabled && publishedIdentity === identity;
  const previous = lastImages.current[activeView];
  const available = family.assets.map(asset => asset.view);
  const hasSuccess = available.some(view => state.views[view] && !state.errors[view]);
  const unsettled = available.some(view => !state.views[view] && !state.errors[view]);
  return {
    previousImage: previous && previous.identity !== identity ? { src: previous.src, alt: previous.alt } : undefined,
    /** No photograph of this exact design yet: the option reads "sample coming". */
    family, missing: family.missing, sampleComing: family.missing, availableViews: available,
    key, status: !family.assets.length ? "missing" as const : !active || (!hasSuccess && unsettled) ? "pending" as const : hasSuccess ? "ready" as const : "failed" as const,
    views: active ? Object.fromEntries(Object.entries(state.views).map(([view, photo]) => [view, photo.url])) as Partial<Record<View, string>> : {},
    errors: active ? state.errors : {}, retry, captureReview, saveSnapshot, warning,
  };
}
