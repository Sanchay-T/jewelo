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
      item.directionId === run.directions[0]?.id && item.kind === "product",
  );
  const ready = product?.state === "ready" && product.assetUrl;
  const failed = product?.state === "failed";
  const cancelled = product?.state === "cancelled";
  const completed = ready
    ? 4
    : product?.state === "verifying"
      ? 3
      : task
        ? 2
        : 1;
  return (
    <AppShell locale={locale}>
      <main className="clm-generation">
        <section className="clm-generation-copy" aria-live="polite">
          <p className="clm-kicker">Your Caleums design</p>
          <h1>
            {ready
              ? "Your pendant is ready."
              : failed
                ? "The Studio render needs another try."
                : cancelled
                  ? "Generation was cancelled."
                  : "Bringing your piece to life."}
          </h1>
          <p>
            {ready
              ? "One considered Studio result, built from your approved pendant identity."
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
                src={product.assetUrl!}
                alt={product.alt}
                fill
                priority
                sizes="(max-width: 799px) 100vw, 60vw"
              />
              <span>01 · Studio</span>
              <Link
                className="clm-result-open"
                href={`/${locale}/studio/${design.id}`}
              >
                Open Studio result <ArrowRight size={17} />
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
