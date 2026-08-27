"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, SpinnerGap, X } from "@phosphor-icons/react";
import { AppShell } from "@/components/app-shell";
import { useJewelo } from "@/lib/jewelo-provider";
import type { Locale } from "@/lib/types";
import {
  adaptPresentationCards,
  applyPresentationReplay,
  applySamplePresentationAssets,
  type PresentationCardModel,
} from "@/features/studio/presentation-cards";

const progress = [
  "Reading your approved spelling",
  "Building the pendant geometry",
  "Rendering the Studio presentation",
  "Verifying every detail",
];

function CraftingCard({ card }: { card: PresentationCardModel }) {
  const ready = card.state === "ready" && Boolean(card.assetUrl);
  return (
    <article className="clm-crafting-card" data-state={card.state}>
      <div className="clm-crafting-card-media">
        {ready ? (
          <Image
            src={card.assetUrl!}
            alt={card.alt}
            fill
            priority={card.id === "studio" || card.id === "on_skin"}
            sizes="(max-width: 799px) 100vw, (max-width: 1100px) 50vw, 25vw"
          />
        ) : (
          <div className="clm-crafting-skeleton" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        )}
        <span>{card.number}</span>
      </div>
      <footer>
        <div>
          <strong>{card.label}</strong>
          <small>{card.treatment}</small>
        </div>
        <span className="clm-state" data-state={card.state}>
          {card.state.replaceAll("_", " ")}
        </span>
      </footer>
      {!ready && (
        <div className="clm-crafting-card-progress" role="status">
          <SpinnerGap className="clm-spin" size={14} />
          {card.state === "blocked"
            ? "Awaiting approval"
            : card.state === "failed"
              ? "Needs retry"
              : card.state === "cancelled"
                ? "Cancelled"
                : "Preparing presentation"}
        </div>
      )}
    </article>
  );
}

export function CraftingTransition({
  locale,
  designId,
}: {
  locale: Locale;
  designId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { client, state, refresh } = useJewelo();
  const sampleMode =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_JEWELO_SCENARIOS === "1";
  const design = state.designs.find((item) => item.id === designId);
  const run = design?.runs.at(-1);
  const replay = sampleMode && searchParams.get("replay") === "1";
  const [replayStep, setReplayStep] = useState(0);
  const rawCards = useMemo(() => adaptPresentationCards(run), [run]);
  const cards = useMemo(
    () =>
      replay
        ? applyPresentationReplay(
            applySamplePresentationAssets(rawCards),
            replayStep,
          )
        : rawCards,
    [rawCards, replay, replayStep],
  );
  useEffect(() => {
    if (design && design.runs.length === 0) void client.startRun(design.id);
  }, [client, design]);
  useEffect(
    () => (run ? client.subscribeToRun(run.id, refresh) : undefined),
    [client, refresh, run],
  );
  useEffect(() => {
    if (!replay) return;
    setReplayStep(0);
    const interval = window.setInterval(() => {
      setReplayStep((current) => {
        if (current >= 7) {
          window.clearInterval(interval);
          return 8;
        }
        return current + 1;
      });
    }, 700);
    return () => window.clearInterval(interval);
  }, [replay]);
  useEffect(() => {
    if (!replay || replayStep < 8) return;
    const timer = window.setTimeout(
      () => router.push(`/${locale}/studio/${designId}?sample=1`),
      1_800,
    );
    return () => window.clearTimeout(timer);
  }, [designId, locale, replay, replayStep, router]);

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
  const studioCard = cards[0]!;
  const task = studioCard.task;
  const taskState = studioCard.state;
  const readyCount = cards.filter(
    (card) => card.state === "ready" && card.assetUrl,
  ).length;
  const ready = readyCount === cards.length;
  const primaryReady = studioCard.state === "ready" && Boolean(studioCard.assetUrl);
  const failed = taskState === "failed";
  const cancelled = taskState === "cancelled";
  const blocked = taskState === "blocked" || taskState === "unavailable";
  const completed = ready
    ? 4
    : replay
      ? replayStep >= 7
        ? 3
        : 2
      : taskState === "verifying"
        ? 3
        : task
          ? 2
          : 1;
  return (
    <AppShell locale={locale}>
      <main className="clm-generation">
        <section className="clm-generation-copy" aria-live="polite">
          <p className="clm-kicker">Your Caleums design</p>
          {sampleMode && (
            <p className="clm-mock-mark">Mock workflow · no provider call</p>
          )}
          <h1>
            {ready
              ? "Your presentation set is ready."
              : failed
                ? "The Studio render needs another try."
                : blocked
                  ? "This presentation needs atelier approval."
                  : cancelled
                    ? "Generation was cancelled."
                    : "Bringing your piece to life."}
          </h1>
          <p>
            {ready
              ? "Four presentation views, all built from one approved pendant identity."
              : blocked
                ? "No image provider has been called. The approved design remains safely stored."
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
          {!ready && !failed && !cancelled && !blocked && !replay && (
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
          {blocked && (
            <Link className="clm-secondary" href={`/${locale}/operator`}>
              Open atelier review
            </Link>
          )}
          {sampleMode && !ready && !replay && (
            <div className="clm-sample-preview-link">
              <span>Want to watch the full completed transition now?</span>
              <Link
                className="clm-primary"
                href={`/${locale}/design/crafting?designId=${design.id}&replay=1`}
              >
                Replay mock generation <ArrowRight size={17} />
              </Link>
              <small>
                Four sample cards resolve one by one, then Studio opens.
              </small>
            </div>
          )}
        </section>
        <section className="clm-generation-stage">
          <header className="clm-crafting-set-heading">
            <div>
              <p className="clm-kicker">Presentation views</p>
              <h2>{readyCount} of 4 ready</h2>
            </div>
            {replay && <span>Sample generation replay</span>}
          </header>
          <div className="clm-crafting-grid" aria-live="polite">
            {cards.map((card) => (
              <CraftingCard key={card.id} card={card} />
            ))}
          </div>
          {primaryReady && (
            <div className="clm-crafting-complete" role="status">
              <Check size={18} weight="bold" />
              <span>
                {replay
                  ? "Opening Studio…"
                  : ready
                    ? "Every presentation is ready."
                    : "Your first view is ready. The rest continue in the background."}
              </span>
              <Link
                className="clm-primary"
                href={`/${locale}/studio/${design.id}`}
              >
                Open Studio <ArrowRight size={17} />
              </Link>
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}
