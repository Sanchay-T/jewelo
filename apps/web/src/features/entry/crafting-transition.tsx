"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { ArrowRight, Check, SpinnerGap, X } from "@phosphor-icons/react";
import { AppShell } from "@/components/app-shell";
import { useJewelo } from "@/lib/jewelo-provider";
import type { Locale } from "@/lib/types";

const progress = [
  "Reading your approved spelling",
  "Building the pendant geometry",
  "Rendering the Studio presentation",
  "Verifying every detail",
];

export function CraftingTransition({
  locale,
  designId,
}: {
  locale: Locale;
  designId: string;
}) {
  const { client, state, refresh } = useJewelo();
  const design = state.designs.find((item) => item.id === designId);
  const run = design?.runs.at(-1);
  useEffect(() => {
    if (design && design.runs.length === 0) void client.startRun(design.id);
  }, [client, design]);
  useEffect(
    () => (run ? client.subscribeToRun(run.id, refresh) : undefined),
    [client, refresh, run],
  );

  if (!design)
    return (
      <AppShell locale={locale}>
        <main className="clm-empty">
          <h1>Design not found</h1>
          <Link className="clm-primary" href={`/${locale}/design/new`}>
            Start a design
          </Link>
        </main>
      </AppShell>
    );
  const product = run?.directions[0]?.representations.product;
  const task = run?.tasks.find(
    (item) =>
      item.view === "studio" && item.directionId === run.directions[0]?.id,
  );
  const studioAsset = run?.assets.find(
    (asset) =>
      asset.view === "studio" && (!task || asset.lineage.taskId === task.id),
  );
  const firstReadyAsset = run?.assets.find(
    (asset) => asset.state === "ready" && Boolean(asset.assetUrl),
  );
  const visibleAsset =
    studioAsset?.state === "ready" && studioAsset.assetUrl
      ? studioAsset
      : firstReadyAsset;
  const taskState = task?.state ?? product?.state;
  const assetUrl = visibleAsset?.assetUrl;
  const ready = Boolean(assetUrl);
  const failed = taskState === "failed" || taskState === "blocked";
  const cancelled = taskState === "cancelled";
  const completed = ready ? 4 : taskState === "verifying" ? 3 : task ? 2 : 1;
  const viewLabel =
    visibleAsset?.view === "on_skin"
      ? "On Skin"
      : visibleAsset?.view === "close_up"
        ? "Close Up"
        : visibleAsset?.view === "dark"
          ? "Dark"
          : "Studio";
  return (
    <AppShell locale={locale}>
      <main className="clm-generation">
        <section className="clm-generation-copy" aria-live="polite">
          <p className="clm-kicker">Your Caleums design</p>
          <h1>
            {ready
              ? "Your first view is ready."
              : failed
                ? "The Studio render needs another try."
                : cancelled
                  ? "Generation was cancelled."
                  : "Bringing your piece to life."}
          </h1>
          <p>
            {ready
              ? "Open your studio now. The remaining views continue independently in the background."
              : "Your work is durable. You can leave this page and return without losing the approved design."}
          </p>
          <ol className="clm-progress-list">
            {progress.map((label, index) => (
              <li
                key={label}
                data-complete={index < completed || undefined}
                data-current={(index === completed && !ready) || undefined}
              >
                <span>
                  {index < completed ? (
                    <Check size={14} weight="bold" />
                  ) : index === completed && !ready ? (
                    <SpinnerGap size={15} />
                  ) : (
                    index + 1
                  )}
                </span>
                <strong>{label}</strong>
              </li>
            ))}
          </ol>
          {!ready && !failed && !cancelled && (
            <button
              className="clm-secondary"
              type="button"
              onClick={() => {
                const active = run?.tasks.find((item) =>
                  ["queued", "generating", "verifying", "retrying"].includes(
                    item.state,
                  ),
                );
                if (active) void client.cancelTask(design.id, active.id);
              }}
            >
              <X size={16} /> Cancel generation
            </button>
          )}
          {failed && task && (
            <button
              className="clm-primary"
              type="button"
              onClick={() => void client.retryTask(design.id, task.id)}
            >
              Retry Studio render
            </button>
          )}
          {cancelled && (
            <button
              className="clm-primary"
              type="button"
              onClick={() => void client.startRun(design.id)}
            >
              Start again
            </button>
          )}
        </section>
        <section className="clm-generation-stage">
          {ready ? (
            <article className="clm-result-card">
              <Image
                src={assetUrl!}
                alt={
                  visibleAsset?.alt ??
                  product?.alt ??
                  "Verified Caleums pendant presentation"
                }
                fill
                priority
                sizes="(max-width: 799px) 100vw, 60vw"
              />
              <span>01 · {viewLabel}</span>
              <Link
                className="clm-result-open"
                href={`/${locale}/studio/${design.id}`}
              >
                Open results <ArrowRight size={17} />
              </Link>
            </article>
          ) : (
            <div className="clm-result-skeleton">
              <div />
              <span>
                {failed
                  ? "Render paused"
                  : cancelled
                    ? "Cancelled"
                    : "Creating your Studio result"}
              </span>
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}
