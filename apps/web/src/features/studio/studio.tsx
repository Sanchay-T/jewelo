"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowClockwise,
  ArrowLeft,
  ArrowRight,
  DownloadSimple,
  FloppyDisk,
  MagicWand,
  ShareNetwork,
  Sparkle,
  SpinnerGap,
  X,
} from "@phosphor-icons/react";
import { AppShell } from "@/components/app-shell";
import { useJewelo } from "@/lib/jewelo-provider";
import {
  arabicStyleLabel,
  formatCaleumsPrice,
  identityFromSpecification,
} from "@/lib/ui-presentation";
import type { Locale, TaskState } from "@/lib/types";
import {
  adaptPresentationCards,
  applySamplePresentationAssets,
  isPrimaryReady,
  type PresentationCardModel,
} from "./presentation-cards";

const activeStates = new Set<TaskState>([
  "queued",
  "generating",
  "verifying",
  "retrying",
]);

function stateCopy(state: TaskState) {
  if (state === "failed") return "This presentation needs another try.";
  if (state === "cancelled") return "This presentation was cancelled.";
  if (state === "blocked") return "Waiting for its verified parent task.";
  if (state === "unavailable" || state === "available_on_request")
    return "This presentation is not available yet.";
  if (state === "verifying") return "Checking the approved identity.";
  if (state === "retrying") return "Trying this presentation again.";
  if (state === "generating") return "Rendering this presentation.";
  return "Queued for presentation.";
}

function PresentationCard({
  card,
  busy,
  onCancel,
  onRetry,
}: {
  card: PresentationCardModel;
  busy?: string;
  onCancel(card: PresentationCardModel): void;
  onRetry(card: PresentationCardModel): void;
}) {
  const ready = card.state === "ready" && Boolean(card.assetUrl);
  return (
    <article className="clm-presentation-card" data-state={card.state}>
      <div className="clm-presentation-media">
        {ready ? (
          <Image
            src={card.assetUrl!}
            alt={card.alt}
            fill
            priority={card.id === "studio" || card.id === "on_skin"}
            sizes="(max-width: 799px) 100vw, (max-width: 1100px) 50vw, 25vw"
          />
        ) : (
          <div className="clm-presentation-placeholder" role="status">
            {activeStates.has(card.state) ? (
              <SpinnerGap className="clm-spin" size={30} />
            ) : (
              <Sparkle size={30} weight="duotone" />
            )}
            <strong>{card.state.replaceAll("_", " ")}</strong>
            <span>{stateCopy(card.state)}</span>
          </div>
        )}
        <span className="clm-presentation-number">{card.number}</span>
      </div>
      <footer>
        <div>
          <strong>{card.label}</strong>
          <span>{card.treatment}</span>
        </div>
        <span className="clm-state" data-state={card.state}>
          {card.state.replaceAll("_", " ")}
        </span>
      </footer>
      <div className="clm-presentation-actions">
        {ready && (
          <a href={card.assetUrl} download>
            <DownloadSimple size={16} /> Download
          </a>
        )}
        {card.task && activeStates.has(card.state) && (
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => onCancel(card)}
          >
            <X size={16} />
            {busy === `cancel-${card.task.id}` ? "Cancelling…" : "Cancel"}
          </button>
        )}
        {card.task && (card.state === "failed" || card.state === "blocked") && (
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => onRetry(card)}
          >
            <ArrowClockwise size={16} />
            {busy === `retry-${card.task.id}` ? "Retrying…" : "Retry"}
          </button>
        )}
      </div>
    </article>
  );
}

export function Studio({
  locale,
  designId,
}: {
  locale: Locale;
  designId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { client, state, refresh } = useJewelo();
  const design = state.designs.find((item) => item.id === designId);
  const run = design?.runs.at(-1);
  const direction = run?.directions[0];
  const revision =
    design?.revisions.find((item) => item.id === run?.revisionId) ??
    design?.revisions.at(-1);
  const [busy, setBusy] = useState<string>();
  const [actionMessage, setActionMessage] = useState("");
  const estimateRequested = useRef(false);
  const scenarioMode = process.env.NEXT_PUBLIC_JEWELO_SCENARIOS === "1";
  const samplePresentation = scenarioMode && searchParams.get("sample") === "1";
  const cards = useMemo(() => {
    const adapted = adaptPresentationCards(run);
    return samplePresentation
      ? applySamplePresentationAssets(adapted, true)
      : adapted;
  }, [run, samplePresentation]);
  const primaryReady = isPrimaryReady(cards);
  const ordered = Boolean(design?.order);

  useEffect(
    () => (run ? client.subscribeToRun(run.id, refresh) : undefined),
    [client, refresh, run],
  );
  useEffect(() => {
    estimateRequested.current = false;
  }, [revision?.id, run?.id]);
  useEffect(() => {
    if (
      !design ||
      !direction ||
      direction.representations.product.state !== "ready" ||
      !primaryReady ||
      design.estimate ||
      estimateRequested.current
    )
      return;
    estimateRequested.current = true;
    void (async () => {
      if (design.selectedDirectionId !== direction.id)
        await client.selectDirection(design.id, direction.id);
      await client.calculateEstimate(design.id);
    })()
      .then(() => {
        setActionMessage("");
        refresh();
      })
      .catch(() => {
        estimateRequested.current = false;
        setActionMessage("The price estimate could not be calculated yet.");
      });
  }, [client, design, direction, primaryReady, refresh]);

  async function action(
    key: string,
    work: () => Promise<unknown>,
    success: string,
  ) {
    setBusy(key);
    setActionMessage("");
    try {
      await work();
      refresh();
      setActionMessage(success);
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code?: unknown }).code ?? "")
          : "";
      setActionMessage(
        error instanceof Error
          ? code
            ? `${error.message} (${code})`
            : error.message
          : "Action unavailable",
      );
    } finally {
      setBusy(undefined);
    }
  }

  async function continueToPiece() {
    if (!direction || !primaryReady || !design?.estimate) return;
    await action(
      "commerce",
      async () => {
        if (design.selectedDirectionId !== direction.id)
          await client.selectDirection(designId, direction.id);
        await client.calculateEstimate(designId);
        refresh();
        router.push(`/${locale}/commerce/${designId}`);
      },
      "Opening your final piece.",
    );
  }

  if (!design || !revision)
    return (
      <AppShell locale={locale}>
        <main className="clm-empty">
          <h1>Design not found</h1>
          <Link className="clm-primary" href={`/${locale}`}>
            Return home
          </Link>
        </main>
      </AppShell>
    );
  if (!run || !direction)
    return (
      <AppShell locale={locale}>
        <main className="clm-empty">
          <p className="clm-kicker">Approved design</p>
          <h1>Your piece is ready to render.</h1>
          <button
            className="clm-primary"
            onClick={() => void client.startRun(designId)}
          >
            Create presentation set
          </button>
        </main>
      </AppShell>
    );

  const spec = revision.specification;
  const identity = identityFromSpecification(spec);
  return (
    <AppShell locale={locale}>
      <main
        className="clm-studio clm-studio-set"
        dir={locale === "ar" ? "rtl" : "ltr"}
      >
        <aside className="clm-studio-summary">
          <Link className="clm-back" href={`/${locale}/design/new`}>
            <ArrowLeft size={16} /> Back to design
          </Link>
          <p className="clm-kicker">Your design</p>
          <h1 dir={spec.arabicStyle === "none" ? "ltr" : "rtl"}>
            {identity.inline}
          </h1>
          <dl className="clm-summary compact">
            <div>
              <dt>Names</dt>
              <dd>{identity.inline}</dd>
            </div>
            <div>
              <dt>Script</dt>
              <dd>{arabicStyleLabel(spec.arabicStyle)}</dd>
            </div>
            <div>
              <dt>Layout</dt>
              <dd>{spec.layout.replaceAll("-", " ")}</dd>
            </div>
            <div>
              <dt>Metal</dt>
              <dd>18K {spec.metalColor} gold</dd>
            </div>
            <div>
              <dt>Stones</dt>
              <dd>
                {spec.stoneCoverage.replaceAll("-", " ")} ·{" "}
                {spec.gemstone.replaceAll("-", " ")}
              </dd>
            </div>
            <div>
              <dt>Chain</dt>
              <dd>
                {spec.chain.style} · {spec.chain.lengthCm} cm
              </dd>
            </div>
            <div>
              <dt>Size</dt>
              <dd>
                {spec.sizeProfile} ({spec.dimensions.widthMm} mm)
              </dd>
            </div>
          </dl>
          <div className="clm-studio-save">
            <button
              type="button"
              onClick={() =>
                setActionMessage("Design saved in this workspace.")
              }
            >
              <FloppyDisk size={17} /> Save
            </button>
            <button
              type="button"
              onClick={() =>
                void navigator.clipboard
                  ?.writeText(window.location.href)
                  .then(() => setActionMessage("Design link copied."))
              }
            >
              <ShareNetwork size={17} /> Share
            </button>
          </div>
          <div className="clm-estimate">
            <span>Estimated price</span>
            <strong>
              {design.estimate ? formatCaleumsPrice(design) : "Calculating…"}
            </strong>
            <small>
              Estimate upper bound · final quote follows atelier review
            </small>
          </div>
        </aside>

        <section className="clm-studio-canvas clm-presentation-set">
          <header>
            <div>
              <p className="clm-kicker">Your presentation set</p>
              <h2>Four views of one approved pendant.</h2>
            </div>
            <div className="clm-presentation-status">
              {scenarioMode && (
                <span className="clm-mock-mark">
                  {samplePresentation
                    ? "Sample presentation assets · no provider call"
                    : "Sample presentation assets"}
                </span>
              )}
              <span>
                {cards.filter((card) => card.state === "ready").length} of 4
                ready
              </span>
            </div>
          </header>
          <div className="clm-presentation-grid">
            {cards.map((card) => (
              <PresentationCard
                key={card.id}
                card={card}
                busy={busy}
                onCancel={(selected) => {
                  if (!selected.task) return;
                  void action(
                    `cancel-${selected.task.id}`,
                    () => client.cancelTask(designId, selected.task!.id),
                    `${selected.label} task cancelled.`,
                  );
                }}
                onRetry={(selected) => {
                  if (!selected.task) return;
                  void action(
                    `retry-${selected.task.id}`,
                    () => client.retryTask(designId, selected.task!.id),
                    `${selected.label} retry started.`,
                  );
                }}
              />
            ))}
          </div>
          {scenarioMode && (
            <details className="clm-task-audit">
              <summary>Development task status audit</summary>
              <ul>
                {run.tasks.map((task) => (
                  <li key={task.id}>
                    <span>
                      {task.view.replaceAll("_", " ")} ·{" "}
                      {task.state}
                    </span>
                    <small>Attempt {task.attempt}</small>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <footer className="clm-studio-actions">
          <div>
            <strong>{identity.inline}</strong>
            <span>Verified identity · four presentation views</span>
          </div>
          {scenarioMode && (
            <Link
              className="clm-secondary"
              href={`/${locale}/design/crafting?designId=${designId}&replay=1`}
            >
              <Sparkle size={17} /> Replay generation journey
            </Link>
          )}
          <button
            type="button"
            className="clm-secondary"
            disabled={Boolean(busy) || ordered}
            title={ordered ? "Ordered designs are locked" : undefined}
            onClick={() =>
              void action(
                "refine",
                async () => {
                  await client.refineDesign(
                    designId,
                    "Caleums Studio refinement",
                  );
                  await client.startRun(designId);
                },
                "A refined presentation set has started.",
              )
            }
          >
            <MagicWand size={17} />
            {busy === "refine" ? "Refining…" : "Refine"}
          </button>
          <button
            type="button"
            className="clm-secondary"
            disabled={Boolean(busy) || ordered}
            title={ordered ? "Ordered designs are locked" : undefined}
            onClick={() =>
              void action(
                "regenerate",
                () => client.startRun(designId),
                "A fresh presentation set has started.",
              )
            }
          >
            <ArrowClockwise size={17} />
            {busy === "regenerate" ? "Starting…" : "Regenerate"}
          </button>
          <button
            type="button"
            className="clm-primary"
            disabled={!primaryReady || !design.estimate || Boolean(busy)}
            onClick={() => void continueToPiece()}
          >
            {busy === "commerce" ? "Preparing…" : "Continue to your piece"}{" "}
            <ArrowRight size={17} />
          </button>
        </footer>
        {ordered && (
          <p className="clm-ordered-lock">
            This ordered design is locked; refinement and regeneration are
            unavailable.
          </p>
        )}
        {actionMessage && (
          <p className="clm-toast" role="status">
            {actionMessage}
          </p>
        )}
        <p className="clm-sr-live" aria-live="polite" aria-atomic="true">
          Presentation tasks:{" "}
          {cards.map((card) => `${card.label} ${card.state}`).join(", ")}.
        </p>
      </main>
    </AppShell>
  );
}
