"use client";

import { createElement, useCallback, useEffect, useRef, useState } from "react";
import { views as cameraViews, type Draft, type View } from "../model";
import { assemblyKey } from "./assembly";
import {
  getSnapshot,
  RENDERER_VERSION,
  saveSnapshotRecord,
  type SnapshotDescriptor,
} from "./storage";

type Engine = {
  apply(draft: Draft): Promise<void>;
  capture(view: View, width?: number): Promise<Blob>;
  dispose(): void;
};
type Images = Partial<Record<View, { blob: Blob; url: string }>>;
export type Capture = {
  key: string;
  views: Images;
  errors: Partial<Record<View, string>>;
};
const message = (error: unknown) =>
  error instanceof Error ? error.message : "This view could not be rendered.";

export function usePiece(draft: Draft, enabled: boolean) {
  const key = assemblyKey(draft);
  const current = useRef({ key, draft, enabled });
  current.current = { key, draft, enabled };
  const engine = useRef<Promise<Engine> | undefined>(undefined);
  const canvas = useRef<HTMLCanvasElement | undefined>(undefined);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const alive = useRef(false);
  const epoch = useRef(0);
  const result = useRef<Capture>({ key: "", views: {}, errors: {} });
  const [state, setState] = useState<{
    key: string;
    status: "pending" | "ready" | "failed";
    views: Partial<Record<View, string>>;
    errors: Partial<Record<View, string>>;
  }>({ key, status: "pending", views: {}, errors: {} });
  const [warning, setWarning] = useState("");
  const revoke = (capture: Capture) =>
    Object.values(capture.views).forEach((image) =>
      URL.revokeObjectURL(image.url),
    );
  const publish = useCallback((capture: Capture) => {
    result.current = capture;
    if (!alive.current) return;
    setState({
      key: capture.key,
      status: cameraViews.some(
        (view) => capture.views[view] && !capture.errors[view],
      )
        ? "ready"
        : "failed",
      views: Object.fromEntries(
        Object.entries(capture.views).map(([view, image]) => [view, image.url]),
      ),
      errors: capture.errors,
    });
  }, []);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      epoch.current++;
      revoke(result.current);
      const pending = engine.current;
      engine.current = undefined;
      void queue.current.finally(() =>
        pending?.then((renderer) => renderer.dispose()).catch(() => {}),
      );
    };
  }, []);

  const capture = useCallback(
    (requested: View[], width: number, failDark = false): Promise<Capture> => {
      const target = {
        ...current.current,
        draft: structuredClone(current.current.draft),
      };
      const token = epoch.current;
      const obsolete = () =>
        !alive.current ||
        !current.current.enabled ||
        token !== epoch.current ||
        target.key !== current.current.key;
      const work = async (): Promise<Capture> => {
        if (obsolete())
          throw new Error("The design changed. Preview the current selection.");
        if (result.current.key !== target.key) {
          revoke(result.current);
          result.current = { key: target.key, views: {}, errors: {} };
        }
        if (!engine.current) {
          const element = document.createElement("canvas");
          canvas.current = element;
          element.addEventListener("webglcontextlost", (event) => {
            event.preventDefault();
            if (canvas.current !== element) return;
            if (alive.current) {
              setWarning(
                "The preview renderer stopped. Retry to rebuild your piece.",
              );
              publish({
                ...result.current,
                errors: Object.fromEntries(
                  cameraViews.map((view) => [
                    view,
                    "The renderer stopped. Retry this view.",
                  ]),
                ),
              });
            }
            epoch.current++;
            const lost = engine.current;
            engine.current = undefined;
            void queue.current.finally(() =>
              lost?.then((instance) => instance.dispose()).catch(() => {}),
            );
          });
          engine.current = import("./scene").then(({ createRenderer }) =>
            createRenderer(element),
          );
        }
        let renderer: Engine | undefined;
        try {
          renderer = await engine.current;
          if (obsolete())
            throw new Error(
              "The design changed. Preview the current selection.",
            );
          await renderer.apply(target.draft);
        } catch (error) {
          renderer?.dispose();
          engine.current = undefined;
          if (obsolete()) throw error;
          const failed = {
            key: target.key,
            views: result.current.views,
            errors: {
              ...result.current.errors,
              ...Object.fromEntries(
                requested.map((view) => [view, message(error)]),
              ),
            },
          };
          publish(failed);
          return failed;
        }
        const unpublished = new Set<string>();
        try {
          const next: Capture = {
            key: target.key,
            views: { ...result.current.views },
            errors: { ...result.current.errors },
          };
          for (const view of requested) {
            if (obsolete())
              throw new Error(
                "The design changed. Preview the current selection.",
              );
            try {
              if (failDark && view === "Dark")
                throw new Error("This view failed. Retry Dark.");
              const blob = await renderer.capture(view, width);
              if (obsolete())
                throw new Error(
                  "The design changed. Preview the current selection.",
                );
              const old = next.views[view];
              if (old) URL.revokeObjectURL(old.url);
              const url = URL.createObjectURL(blob);
              unpublished.add(url);
              next.views[view] = { blob, url };
              delete next.errors[view];
              if (alive.current)
                setWarning((oldWarning) =>
                  oldWarning.startsWith("The preview renderer stopped.")
                    ? ""
                    : oldWarning,
                );
            } catch (error) {
              if (obsolete()) throw error;
              next.errors[view] = message(error);
            }
            publish({
              ...next,
              views: { ...next.views },
              errors: { ...next.errors },
            });
            unpublished.clear(); // Published URLs now belong to result.current and its cleanup.
          }
          return next;
        } finally {
          unpublished.forEach((url) => URL.revokeObjectURL(url));
        }
      };
      const promise = queue.current.catch(() => {}).then(work);
      queue.current = promise.catch(() => {});
      return promise;
    },
    [publish],
  );

  useEffect(() => {
    epoch.current++;
    if (!enabled) return;
    setState({ key, status: "pending", views: {}, errors: {} });
    void capture([...cameraViews], 768).catch(() => {});
  }, [key, enabled, capture]);

  const retry = useCallback(
    (view?: View): Promise<Capture> => {
      if (!current.current.enabled)
        return Promise.reject(
          new Error("Enable the design preview before retrying."),
        );
      return capture(view ? [view] : [...cameraViews], 768);
    },
    [capture],
  );
  const captureReview = useCallback(
    (failDark = false) => capture([...cameraViews], 1400, failDark),
    [capture],
  );
  const saveSnapshot = useCallback(
    async (id: string): Promise<SnapshotDescriptor> => {
      const targetKey = current.current.key;
      const saveEpoch = epoch.current;
      await queue.current;
      const images = result.current;
      const availableViews = cameraViews.filter(
        (view) => !!images.views[view] && !images.errors[view],
      );
      if (
        !alive.current ||
        saveEpoch !== epoch.current ||
        !current.current.enabled ||
        images.key !== targetKey ||
        targetKey !== current.current.key ||
        !availableViews.length
      )
        throw new Error("Preview the current design before saving it.");
      const descriptor = await saveSnapshotRecord({
        id,
        key: targetKey,
        rendererVersion: RENDERER_VERSION,
        availableViews,
        blobs: Object.fromEntries(
          availableViews.map((view) => [view, images.views[view]!.blob]),
        ),
      });
      if (
        !alive.current ||
        !current.current.enabled ||
        saveEpoch !== epoch.current ||
        targetKey !== current.current.key
      )
        throw new Error(
          "The design changed or renderer stopped while saving. Preview the current selection.",
        );
      if (!descriptor.persistent && alive.current)
        setWarning(
          "Image storage is unavailable. This piece's images are kept only while this tab stays open; they may be missing after reload.",
        );
      return descriptor;
    },
    [],
  );
  return {
    key,
    status: state.key === key ? state.status : ("pending" as const),
    views: state.key === key ? state.views : {},
    errors: state.key === key ? state.errors : {},
    retry,
    captureReview,
    saveSnapshot,
    warning,
  };
}

/** A snapshot owns its URLs and never resolves to unrelated catalogue photography. */
export function SnapshotImage({
  snapshotId,
  alt,
  fallback,
}: {
  snapshotId: string;
  alt: string;
  fallback?: string;
}) {
  const [image, setImage] = useState<{ id: string; url: string }>();
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let live = true;
    let url: string | undefined;
    setMissing(false);
    void getSnapshot(snapshotId).then((snapshot) => {
      if (!live) return;
      const blob =
        snapshot &&
        cameraViews.map((view) => snapshot.blobs[view]).find(Boolean);
      if (!blob) {
        setMissing(true);
        return;
      }
      url = URL.createObjectURL(blob);
      setImage({ id: snapshotId, url });
    });
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [snapshotId]);
  if (image?.id === snapshotId && !missing)
    return createElement("img", {
      src: image.url,
      alt,
      onError: () => setMissing(true),
    });
  return createElement(
    "div",
    { role: "img", "aria-label": alt, "data-snapshot-missing": missing },
    missing
      ? (fallback ?? "Saved piece image is unavailable on this device.")
      : "Loading your saved piece…",
  );
}
