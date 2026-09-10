"use client";

import { useEffect, useState } from "react";
import { views as cameraViews } from "./model";
import { getSnapshot } from "./snapshotStore";

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
    return <img src={image.url} alt={alt} onError={() => setMissing(true)} />;
  return (
    <div role="img" aria-label={alt} data-snapshot-missing={missing}>
      {missing
        ? (fallback ?? "Saved piece image is unavailable on this device.")
        : "Loading your saved piece…"}
    </div>
  );
}
