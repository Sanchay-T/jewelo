"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowClockwise,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  DownloadSimple,
  FloppyDisk,
  ImageSquare,
  MagicWand,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  ShareNetwork,
  Sparkle,
  X,
} from "@phosphor-icons/react";
import { AppShell } from "@/components/app-shell";
import { useJewelo } from "@/lib/jewelo-provider";
import { ENABLED_PRESENTATION_VIEWS } from "@/lib/types";

type Locale = "en" | "ar";
const activeStates = new Set(["queued", "generating", "verifying", "retrying"]);

export function Studio({
  locale,
  designId,
}: {
  locale: Locale;
  designId: string;
}) {
  const router = useRouter();
  const { client, state, refresh } = useJewelo();
  const design = state.designs.find((item) => item.id === designId);
  const run = design?.runs.at(-1);
  const direction = run?.directions[0];
  const revision =
    design?.revisions.find((item) => item.id === run?.revisionId) ??
    design?.revisions.at(-1);
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState<string>();
  const [message, setMessage] = useState("");
  const [locallyCancelled, setLocallyCancelled] = useState<string[]>([]);
  const scenarioMode = process.env.NEXT_PUBLIC_JEWELO_SCENARIOS === "1";
  const visibleViews = run
    ? ENABLED_PRESENTATION_VIEWS.filter((view) =>
        run.tasks.some((task) => task.view === view),
      )
    : [];
  const studioTask = run?.tasks.find(
    (task) =>
      task.view === "studio" &&
      (!direction || task.directionId === direction.id),
  );
  const presentationAsset = run?.assets.find(
    (candidate) =>
      candidate.view === "studio" &&
      (!studioTask || candidate.lineage.taskId === studioTask.id),
  );
  const representation = direction?.representations.product;
  useEffect(
    () => (run ? client.subscribeToRun(run.id, refresh) : undefined),
    [client, refresh, run],
  );
  useEffect(() => {
    if (studioTask)
      setMessage(`Studio task is ${studioTask.state.replaceAll("_", " ")}.`);
  }, [studioTask?.state]);

  async function action(
    key: string,
    work: () => Promise<unknown>,
    success: string,
  ) {
    setBusy(key);
    setMessage("");
    try {
      await work();
      refresh();
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action unavailable");
    } finally {
      setBusy(undefined);
    }
  }
  async function continueToPiece() {
    if (!direction) return;
    await action(
      "commerce",
      async () => {
        if (design?.selectedDirectionId !== direction.id)
          await client.selectDirection(designId, direction.id);
        if (!design?.estimate) await client.calculateEstimate(designId);
        router.push(`/${locale}/commerce/${designId}`);
      },
      "Opening your final piece.",
    );
  }
  async function regenerate() {
    setLocallyCancelled([]);
    await action(
      "regenerate",
      async () => {
        await client.startRun(designId);
      },
      "A fresh Studio render has started.",
    );
  }
  async function refine() {
    await action(
      "refine",
      async () => {
        await client.refineDesign(designId, "Caleums Studio refinement");
        await client.startRun(designId);
      },
      "A refined revision is being rendered.",
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
            Create Studio result
          </button>
        </main>
      </AppShell>
    );
  const spec = revision.specification;
  const approved = revision.identityAnchor.approvedText;
  const taskState = studioTask
    ? locallyCancelled.includes(studioTask.id)
      ? "cancelled"
      : studioTask.state
    : (representation?.state ?? "queued");
  const asset =
    taskState === "ready"
      ? (presentationAsset?.assetUrl ?? representation?.assetUrl)
      : undefined;
  return (
    <AppShell locale={locale}>
      <main className="clm-studio">
        <aside className="clm-studio-summary">
          <Link className="clm-back" href={`/${locale}/design/new`}>
            <ArrowLeft size={16} /> Back to design
          </Link>
          <p className="clm-kicker">Your design</p>
          <h1>{approved}</h1>
          <dl className="clm-summary compact">
            <div>
              <dt>Names</dt>
              <dd>
                {spec.names
                  .map(
                    (item) =>
                      item.approvedEnglishText ?? item.approvedArabicText,
                  )
                  .join(" & ")}
              </dd>
            </div>
            <div>
              <dt>Script</dt>
              <dd>
                {spec.arabicStyle === "none"
                  ? "English · connected script"
                  : `Arabic · ${spec.arabicStyle}`}
              </dd>
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
              onClick={() => setMessage("Design saved in this mock workspace.")}
            >
              <FloppyDisk size={17} /> Save
            </button>
            <button
              type="button"
              onClick={() =>
                void navigator.clipboard
                  ?.writeText(window.location.href)
                  .then(() => setMessage("Design link copied."))
              }
            >
              <ShareNetwork size={17} /> Share
            </button>
          </div>
          <div className="clm-estimate">
            <span>Estimated price</span>
            <strong>AED 7,950</strong>
            <small>Price updates after atelier review</small>
          </div>
        </aside>

        <section className="clm-studio-canvas">
          <header>
            <div>
              <p className="clm-kicker">One considered result</p>
              <h2>Studio 01</h2>
            </div>
            <span className="clm-state" data-state={taskState}>
              {taskState.replaceAll("_", " ")}
            </span>
          </header>
          <div className="clm-studio-media">
            {asset ? (
              <Image
                src={asset}
                alt={
                  presentationAsset?.alt ??
                  representation?.alt ??
                  "Caleums pendant presentation"
                }
                fill
                priority
                sizes="(max-width: 799px) 100vw, 68vw"
                style={{ transform: `scale(${zoom})` }}
              />
            ) : (
              <div className="clm-studio-loading">
                <Sparkle size={34} weight="duotone" />
                <strong>
                  {taskState === "failed"
                    ? "This view needs another try"
                    : taskState === "cancelled"
                      ? "This view was cancelled"
                      : taskState === "blocked"
                        ? "This task is waiting on its dependency"
                        : "Preparing this view"}
                </strong>
                <span>Ready media remains preserved.</span>
              </div>
            )}
            <div className="clm-zoom">
              <button
                aria-label="Zoom out"
                onClick={() => setZoom(Math.max(1, zoom - 0.15))}
              >
                <MagnifyingGlassMinus size={18} />
              </button>
              <button
                aria-label="Zoom in"
                onClick={() => setZoom(Math.min(1.6, zoom + 0.15))}
              >
                <MagnifyingGlassPlus size={18} />
              </button>
              <span>{Math.round(zoom * 100)}%</span>
            </div>
          </div>
          <div
            className="clm-studio-tabs"
            role="tablist"
            aria-label="Presentation views"
          >
            {visibleViews.map((view) => (
              <button key={view} role="tab" aria-selected>
                <span>
                  <ImageSquare size={16} /> Studio
                </span>
                <small>
                  {taskState === "ready" && <CheckCircle size={12} />}
                  {taskState}
                </small>
              </button>
            ))}
          </div>
          {scenarioMode && (
            <details className="clm-task-audit">
              <summary>Development task status audit</summary>
              <p>
                Frozen mock task states only. These do not add customer-facing
                presentation directions.
              </p>
              <ul>
                {run.tasks.map((task, index) => {
                  const auditedState = locallyCancelled.includes(task.id)
                    ? "cancelled"
                    : task.state;
                  return (
                    <li key={task.id}>
                      <span>
                        Task {index + 1} · {auditedState.replaceAll("_", " ")}
                      </span>
                      {activeStates.has(auditedState) && (
                        <button
                          type="button"
                          disabled={Boolean(busy)}
                          aria-label={`Cancel task ${index + 1}`}
                          onClick={() =>
                            void action(
                              `cancel-audit-${task.id}`,
                              async () => {
                                const result = await client.cancelTask(
                                  designId,
                                  task.id,
                                );
                                setLocallyCancelled((current) => [
                                  ...new Set([...current, task.id]),
                                ]);
                                return result;
                              },
                              `Task ${index + 1} cancelled.`,
                            )
                          }
                        >
                          Cancel
                        </button>
                      )}
                      {auditedState === "failed" && (
                        <button
                          type="button"
                          disabled={Boolean(busy)}
                          aria-label={`Retry task ${index + 1}`}
                          onClick={() =>
                            void action(
                              `retry-audit-${task.id}`,
                              async () => {
                                const result = await client.retryTask(
                                  designId,
                                  task.id,
                                );
                                setLocallyCancelled((current) =>
                                  current.filter((id) => id !== task.id),
                                );
                                return result;
                              },
                              `Task ${index + 1} retry completed.`,
                            )
                          }
                        >
                          Retry
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </details>
          )}
        </section>

        <footer className="clm-studio-actions">
          <div>
            <strong>{approved}</strong>
            <span>Identity verified · Studio presentation</span>
          </div>
          <button
            className="clm-secondary"
            disabled={Boolean(busy)}
            onClick={() => void refine()}
          >
            <MagicWand size={17} />
            {busy === "refine" ? "Refining…" : "Refine"}
          </button>
          <button
            className="clm-secondary"
            disabled={Boolean(busy)}
            onClick={() => void regenerate()}
          >
            <ArrowClockwise size={17} />
            {busy === "regenerate" ? "Starting…" : "Regenerate"}
          </button>
          {studioTask && activeStates.has(taskState) && (
            <button
              className="clm-secondary clm-task-action"
              disabled={Boolean(busy)}
              onClick={() =>
                void action(
                  "cancel-task",
                  async () => {
                    const result = await client.cancelTask(
                      designId,
                      studioTask.id,
                    );
                    setLocallyCancelled((current) => [
                      ...new Set([...current, studioTask.id]),
                    ]);
                    return result;
                  },
                  "Studio task cancelled. Ready assets remain preserved.",
                )
              }
            >
              <X size={16} />{" "}
              {busy === "cancel-task" ? "Cancelling…" : "Cancel task"}
            </button>
          )}
          {studioTask && taskState === "failed" && (
            <button
              className="clm-secondary clm-task-action"
              disabled={Boolean(busy)}
              onClick={() =>
                void action(
                  "retry-task",
                  () => client.retryTask(designId, studioTask.id),
                  "Studio task retry started.",
                )
              }
            >
              <ArrowClockwise size={16} />
              {busy === "retry-task" ? "Retrying…" : "Retry task"}
            </button>
          )}
          {asset && (
            <a className="clm-secondary" href={asset} download>
              <DownloadSimple size={17} /> Download
            </a>
          )}
          <button
            className="clm-primary"
            disabled={taskState !== "ready" || Boolean(busy)}
            onClick={() => void continueToPiece()}
          >
            {busy === "commerce" ? "Preparing…" : "Continue to your piece"}{" "}
            <ArrowRight size={17} />
          </button>
        </footer>
        {message && (
          <p className="clm-toast" role="status">
            {message}
          </p>
        )}
        <p className="clm-sr-live" aria-live="polite" aria-atomic="true">
          Studio presentation task {taskState}.
        </p>
      </main>
    </AppShell>
  );
}
