"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import useEmblaCarousel from "embla-carousel-react";
import {
  TransformComponent,
  TransformWrapper,
} from "react-zoom-pan-pinch";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useJewelo } from "@/lib/jewelo-provider";
import type {
  Design,
  Direction,
  RepresentationKind,
  TaskState,
} from "@/lib/types";
import styles from "./studio.module.css";

type Run = Design["runs"][number];
type Representation = Direction["representations"][RepresentationKind];
type Locale = "en" | "ar";

const KINDS: RepresentationKind[] = ["product", "worn", "motion"];
const ACTIVE_STATES = new Set<string>([
  "queued",
  "generating",
  "verifying",
  "retrying",
]);
const RETRYABLE_STATES = new Set<string>(["failed"]);
const REQUESTABLE_STATES = new Set<string>(["available_on_request"]);

const STATE_COPY: Record<string, { label: string; detail: string }> = {
  queued: {
    label: "Queued",
    detail: "Waiting for real generation capacity. No progress has been invented.",
  },
  generating: {
    label: "Generating",
    detail: "Jewelo is creating this representation now.",
  },
  verifying: {
    label: "Verifying",
    detail: "Checking the pendant identity and media quality.",
  },
  ready: { label: "Ready", detail: "Verified and ready to inspect." },
  retrying: {
    label: "Retrying",
    detail: "A bounded retry is running without affecting ready siblings.",
  },
  failed: {
    label: "Failed",
    detail: "This task stopped. Other completed work remains available.",
  },
  blocked: {
    label: "Blocked",
    detail: "This representation needs its product direction to pass first.",
  },
  cancelled: {
    label: "Cancelled",
    detail: "This task was cancelled. Completed media was preserved.",
  },
  unavailable: {
    label: "Unavailable",
    detail: "This representation is not included in the current run.",
  },
  available_on_request: {
    label: "Available on request",
    detail: "Request this representation when you want to generate it.",
  },
};

export function Studio({
  locale,
  designId,
}: {
  locale: Locale;
  designId: string;
}) {
  const { client, state, design: activeDesign, refresh } = useJewelo();
  const design =
    state.designs.find((candidate) => candidate.id === designId) ??
    (activeDesign?.id === designId ? activeDesign : undefined);
  const isRtl = locale === "ar";
  const reduceMotion = useReducedMotion();
  const [selectedRunId, setSelectedRunId] = useState<string>();
  const [selectedDirectionId, setSelectedDirectionId] = useState<string>();
  const [kind, setKind] = useState<RepresentationKind>("product");
  const [compare, setCompare] = useState(false);
  const [busyAction, setBusyAction] = useState<string>();
  const [announcement, setAnnouncement] = useState("");
  const [error, setError] = useState<string>();

  const latestRun = design?.runs.at(-1);
  const run =
    design?.runs.find((candidate) => candidate.id === selectedRunId) ?? latestRun;
  const direction =
    run?.directions.find((candidate) => candidate.id === selectedDirectionId) ??
    run?.directions[0];
  const representation = direction?.representations[kind];
  const comparison =
    representation?.state === "ready" && representation.assetUrl
      ? run?.directions.find((candidate) => {
          const candidateRepresentation = candidate.representations[kind];
          return (
            candidate.id !== direction?.id &&
            candidateRepresentation.state === "ready" &&
            Boolean(candidateRepresentation.assetUrl)
          );
        })
      : undefined;
  const revision = design?.revisions.find(
    (candidate) => candidate.id === run?.revisionId,
  ) ?? design?.revisions.at(-1);

  useEffect(() => {
    if (!run) return;
    return client.subscribeToRun(run.id, () => refresh());
  }, [client, refresh, run]);

  const act = useCallback(
    async (key: string, success: string, action: () => unknown) => {
      setBusyAction(key);
      setError(undefined);
      try {
        await action();
        refresh();
        setAnnouncement(success);
      } catch (actionError) {
        const message =
          actionError instanceof Error ? actionError.message : "Action unavailable";
        setError(message);
        setAnnouncement(message);
      } finally {
        setBusyAction(undefined);
      }
    },
    [refresh],
  );

  const chooseRun = useCallback((nextRun: Run) => {
    setSelectedRunId(nextRun.id);
    setSelectedDirectionId(nextRun.directions[0]?.id);
    setKind("product");
    setAnnouncement(`${nextRun.label} opened.`);
  }, []);

  const startRun = useCallback(() => {
    void act("new-run", "A fresh four-direction run was started.", () => {
      const nextDesign = client.startRun(designId);
      const nextRun = nextDesign.runs.at(-1);
      if (nextRun) chooseRun(nextRun);
    });
  }, [act, chooseRun, client, designId]);

  const refine = useCallback(() => {
    void act("refine", "A new revision and run were created.", () => {
      client.refineDesign(
        designId,
        `Refinement from ${direction?.label ?? "current direction"}`,
      );
      const nextDesign = client.startRun(designId);
      const nextRun = nextDesign.runs.at(-1);
      if (nextRun) chooseRun(nextRun);
    });
  }, [act, chooseRun, client, designId, direction?.label]);

  if (!design || !revision) {
    return (
      <main className={styles.empty} dir={isRtl ? "rtl" : "ltr"}>
        <p className={styles.eyebrow}>Jewelo studio</p>
        <h1>Design not found</h1>
        <p>This saved design is not available in the current workspace.</p>
        <Link className={styles.primaryButton} href={`/${locale}`}>
          Return home
        </Link>
      </main>
    );
  }

  if (!run) {
    return (
      <main className={styles.empty} dir={isRtl ? "rtl" : "ltr"}>
        <p className={styles.eyebrow}>Approved revision</p>
        <h1>{design.name} is ready for directions.</h1>
        <p>
          Start four independent product directions. Each can reveal, retry, or
          stop without blocking its siblings.
        </p>
        <button
          className={styles.primaryButton}
          disabled={busyAction === "new-run"}
          onClick={startRun}
        >
          {busyAction === "new-run" ? "Starting…" : "Create four directions"}
        </button>
      </main>
    );
  }

  if (!direction || !representation) {
    return (
      <main className={styles.empty} dir={isRtl ? "rtl" : "ltr"}>
        <p className={styles.eyebrow}>Jewelo studio</p>
        <h1>This run has no directions yet.</h1>
        <p>Live run updates will restore the studio when a direction is ready.</p>
        <button className={styles.secondaryButton} onClick={() => refresh()}>
          Check again
        </button>
      </main>
    );
  }

  const readyToSelect = direction.representations.product.state === "ready";
  const currentSelected = design.selectedDirectionId === direction.id;
  const activeCount = run.tasks.filter((task) => ACTIVE_STATES.has(task.state)).length;
  const readyCount = run.tasks.filter((task) => task.state === "ready").length;

  return (
    <div className={styles.page} dir={isRtl ? "rtl" : "ltr"}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <Link
            className={styles.iconButton}
            href={`/${locale}`}
            aria-label="Back to home"
          >
            <ArrowIcon rtl={isRtl} />
          </Link>
          <div>
            <h1>{design.name}</h1>
            <p>
              Saved · Revision {revision.number} · {readyCount} ready
              {activeCount > 0 ? ` · ${activeCount} active` : ""}
            </p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.secondaryButton}
            disabled={!comparison}
            aria-pressed={compare}
            onClick={() => setCompare((current) => !current)}
          >
            {compare ? "Close compare" : "Compare"}
          </button>
          <StatusChip state={run.status as TaskState} label={run.status} />
        </div>
      </header>

      <div className={styles.workspace}>
        <aside className={styles.configure} aria-label="Design identity">
          <SectionTitle label="Configure" detail="Identity locked" />
          <IdentityCard revision={revision} />
          <SpecificationList revision={revision} />
          <button
            className={styles.secondaryButton}
            disabled={busyAction === "refine"}
            onClick={refine}
          >
            {busyAction === "refine" ? "Refining…" : "Refine as new revision"}
          </button>
        </aside>

        <main className={styles.inspector}>
          <div className={styles.mobileIdentity}>
            <span>Canonical identity</span>
            <strong dir={revision.identity.language === "ar" ? "rtl" : "ltr"}>
              {revision.identity.approvedText}
            </strong>
            <code>{revision.identity.fingerprint}</code>
          </div>

          <div className={styles.tabs} role="tablist" aria-label="Representation">
            {KINDS.map((candidate) => (
              <button
                id={`studio-tab-${candidate}`}
                key={candidate}
                role="tab"
                aria-selected={kind === candidate}
                aria-controls="studio-media-panel"
                tabIndex={kind === candidate ? 0 : -1}
                onClick={() => setKind(candidate)}
              >
                {capitalize(candidate)}
                <StatusDot state={direction.representations[candidate].state} />
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait" initial={!reduceMotion}>
            <motion.section
              id="studio-media-panel"
              key={`${run.id}-${direction.id}-${kind}-${compare}`}
              role="tabpanel"
              aria-labelledby={`studio-tab-${kind}`}
              className={styles.stagePanel}
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.18 }}
            >
              {compare && comparison ? (
                <CompareView
                  first={direction}
                  second={comparison}
                  kind={kind}
                />
              ) : (
                <MediaStage
                  representation={representation}
                  kind={kind}
                  directionLabel={direction.label}
                  onRequest={() =>
                    void act(
                      `request-${representation.lineage.taskId}`,
                      `${capitalize(kind)} requested.`,
                      () =>
                        client.retryTask(designId, representation.lineage.taskId),
                    )
                  }
                />
              )}
            </motion.section>
          </AnimatePresence>

          <div className={styles.mediaMeta}>
            <span>
              <strong>{direction.label}</strong> · {direction.brief}
            </span>
            <span>
              Identity {direction.identityFingerprint} · attempt{" "}
              {representation.lineage.attempt}
            </span>
          </div>

          <div className={styles.mobileRail}>
            <DirectionFilmstrip
              run={run}
              selectedId={direction.id}
              isRtl={isRtl}
              onSelect={setSelectedDirectionId}
            />
          </div>

          <details className={styles.mobileDetails}>
            <summary>Configuration and run details</summary>
            <div className={styles.detailsBody}>
              <IdentityCard revision={revision} />
              <SpecificationList revision={revision} />
              <RunHistory
                design={design}
                selectedRunId={run.id}
                onSelect={chooseRun}
              />
            </div>
          </details>
        </main>

        <aside className={styles.runRail} aria-label="Directions and run tasks">
          <SectionTitle
            label="Directions / run"
            detail={`${readyCount} of ${run.tasks.length} tasks ready`}
          />
          <DirectionFilmstrip
            run={run}
            selectedId={direction.id}
            isRtl={isRtl}
            onSelect={setSelectedDirectionId}
          />
          <TaskRail
            run={run}
            direction={direction}
            busyAction={busyAction}
            onRetry={(taskId, label) =>
              void act(`retry-${taskId}`, `${label} retry started.`, () =>
                client.retryTask(designId, taskId),
              )
            }
            onCancel={(taskId, label) =>
              void act(`cancel-${taskId}`, `${label} cancelled.`, () =>
                client.cancelTask(designId, taskId),
              )
            }
          />
          <RunHistory
            design={design}
            selectedRunId={run.id}
            onSelect={chooseRun}
          />
          <button
            className={styles.secondaryButton}
            disabled={busyAction === "new-run"}
            onClick={startRun}
          >
            {busyAction === "new-run" ? "Starting…" : "Create fresh run"}
          </button>
        </aside>
      </div>

      <footer className={styles.actionBar}>
        <div className={styles.actionSummary}>
          <strong>{currentSelected ? "Selected direction" : direction.label}</strong>
          <span>
            {readyToSelect
              ? "Verified product ready for selection"
              : `${STATE_COPY[direction.representations.product.state]?.label ?? direction.representations.product.state} product cannot be selected`}
          </span>
        </div>
        {design.estimate && (
          <div className={styles.estimate} aria-label="Estimate">
            <strong>
              {design.estimate.currency} {design.estimate.low.toLocaleString()}–
              {design.estimate.high.toLocaleString()}
            </strong>
            <span>
              {design.estimate.confidence} confidence · assumptions apply
            </span>
          </div>
        )}
        <div className={styles.footerActions}>
          <button
            className={styles.secondaryButton}
            disabled={!readyToSelect || busyAction === "select"}
            onClick={() =>
              void act("select", `${direction.label} selected.`, () =>
                client.selectDirection(designId, direction.id),
              )
            }
          >
            {currentSelected ? "Selected" : "Select direction"}
          </button>
          <button
            className={styles.primaryButton}
            disabled={
              !design.selectedDirectionId || busyAction === "estimate"
            }
            onClick={() =>
              void act("estimate", "Estimate calculated.", () =>
                client.calculateEstimate(designId),
              )
            }
          >
            {busyAction === "estimate"
              ? "Calculating…"
              : design.estimate
                ? "Refresh estimate"
                : "Calculate estimate"}
          </button>
        </div>
      </footer>

      {error && (
        <div className={styles.errorToast} role="alert">
          {error}
          <button aria-label="Dismiss error" onClick={() => setError(undefined)}>
            ×
          </button>
        </div>
      )}
      <p className={styles.live} aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </div>
  );
}

function IdentityCard({ revision }: { revision: Design["revisions"][number] }) {
  return (
    <div className={styles.identityCard}>
      <p className={styles.eyebrow}>Canonical identity</p>
      <strong dir={revision.identity.language === "ar" ? "rtl" : "ltr"}>
        {revision.identity.approvedText}
      </strong>
      <code>{revision.identity.fingerprint}</code>
      <span>✓ Approved geometry proof</span>
    </div>
  );
}

function SpecificationList({
  revision,
}: {
  revision: Design["revisions"][number];
}) {
  const specification = revision.specification;
  return (
    <dl className={styles.specifications}>
      <div><dt>Metal</dt><dd>{specification.metal}</dd></div>
      <div><dt>Finish</dt><dd>{specification.finish}</dd></div>
      <div><dt>Stones</dt><dd>{specification.stones}</dd></div>
      <div><dt>Width</dt><dd>{specification.widthMm} mm</dd></div>
      <div><dt>Complexity</dt><dd>{specification.complexity}/10</dd></div>
    </dl>
  );
}

function MediaStage({
  representation,
  kind,
  directionLabel,
  onRequest,
}: {
  representation: Representation;
  kind: RepresentationKind;
  directionLabel: string;
  onRequest(): void;
}) {
  if (representation.state !== "ready" || !representation.assetUrl) {
    return (
      <div
        className={`${styles.mediaStage} ${styles[kind]} ${styles.placeholder}`}
        aria-busy={ACTIVE_STATES.has(representation.state)}
      >
        <StateArtwork state={representation.state} />
        <StatusChip state={representation.state} />
        <h2>{STATE_COPY[representation.state]?.label ?? representation.state}</h2>
        <p>{STATE_COPY[representation.state]?.detail}</p>
        {REQUESTABLE_STATES.has(representation.state) && (
          <button className={styles.primaryButton} onClick={onRequest}>
            Request {kind}
          </button>
        )}
      </div>
    );
  }

  const readyAssetUrl = representation.assetUrl;

  if (kind === "motion") {
    return (
      <div className={`${styles.mediaStage} ${styles.motion}`}>
        <video
          src={readyAssetUrl}
          poster={representation.posterUrl}
          controls
          loop
          muted
          playsInline
          preload="metadata"
          aria-label={representation.alt}
        />
        <span className={styles.verifiedBadge}>✓ Identity verified</span>
      </div>
    );
  }

  return (
    <TransformWrapper
      minScale={1}
      maxScale={4}
      centerOnInit
      wheel={{ step: 0.12 }}
      doubleClick={{ mode: "toggle" }}
    >
      {({ zoomIn, zoomOut, resetTransform }) => (
        <div
          className={`${styles.mediaStage} ${styles[kind]}`}
          tabIndex={0}
          aria-label={`${directionLabel} ${kind} inspection canvas. Use plus, minus, or zero to control zoom.`}
          onKeyDown={(event) => {
            if (event.key === "+" || event.key === "=") zoomIn();
            if (event.key === "-") zoomOut();
            if (event.key === "0") resetTransform();
          }}
        >
          <TransformComponent
            wrapperStyle={{ width: "100%", height: "100%" }}
            contentStyle={{ width: "100%", height: "100%" }}
          >
            <Image
              src={readyAssetUrl}
              alt={representation.alt}
              width={kind === "worn" ? 1024 : 1200}
              height={kind === "worn" ? 1280 : 1200}
              sizes="(max-width: 1023px) 94vw, 54vw"
              priority
              unoptimized
              className={styles.inspectImage}
            />
          </TransformComponent>
          <div className={styles.zoomControls} aria-label="Zoom controls">
            <span className={styles.verifiedBadge}>✓ Verified</span>
            <button aria-label="Zoom in" onClick={() => zoomIn()}>+</button>
            <button aria-label="Zoom out" onClick={() => zoomOut()}>−</button>
            <button aria-label="Reset zoom" onClick={() => resetTransform()}>1:1</button>
          </div>
        </div>
      )}
    </TransformWrapper>
  );
}

function CompareView({
  first,
  second,
  kind,
}: {
  first: Direction;
  second: Direction;
  kind: RepresentationKind;
}) {
  return (
    <div className={`${styles.compareStage} ${styles[kind]}`}>
      <ComparePane direction={first} kind={kind} />
      <ComparePane direction={second} kind={kind} />
    </div>
  );
}

function ComparePane({
  direction,
  kind,
}: {
  direction: Direction;
  kind: RepresentationKind;
}) {
  const representation = direction.representations[kind];
  if (representation.state !== "ready" || !representation.assetUrl) {
    return (
      <figure>
        <StateArtwork state={representation.state} />
        <figcaption>{direction.label}</figcaption>
      </figure>
    );
  }

  return (
    <figure>
      {kind === "motion" ? (
        <video
          src={representation.assetUrl}
          poster={representation.posterUrl}
          controls
          muted
          playsInline
          aria-label={representation.alt}
        />
      ) : (
        <Image
          src={representation.assetUrl}
          alt={representation.alt}
          fill
          unoptimized
          sizes="(max-width: 700px) 46vw, 28vw"
        />
      )}
      <figcaption>{direction.label}</figcaption>
    </figure>
  );
}

function DirectionFilmstrip({
  run,
  selectedId,
  isRtl,
  onSelect,
}: {
  run: Run;
  selectedId: string;
  isRtl: boolean;
  onSelect(id: string): void;
}) {
  const [viewportRef, embla] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    direction: isRtl ? "rtl" : "ltr",
  });
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const selectedIndex = Math.max(
    0,
    run.directions.findIndex((candidate) => candidate.id === selectedId),
  );

  useEffect(() => {
    embla?.scrollTo(selectedIndex);
  }, [embla, selectedIndex]);

  function move(fdelta: number) {
    const next = Math.min(
      run.directions.length - 1,
      Math.max(0, selectedIndex + fdelta),
    );
    const nextDirection = run.directions[next];
    if (!nextDirection) return;
    onSelect(nextDirection.id);
    buttons.current.get(nextDirection.id)?.focus();
  }

  function navigate(event: KeyboardEvent<HTMLButtonElement>) {
    const previousKey = isRtl ? "ArrowRight" : "ArrowLeft";
    const nextKey = isRtl ? "ArrowLeft" : "ArrowRight";
    if (event.key === previousKey) { event.preventDefault(); move(-1); }
    if (event.key === nextKey) { event.preventDefault(); move(1); }
    if (event.key === "Home") { event.preventDefault(); move(-selectedIndex); }
    if (event.key === "End") {
      event.preventDefault();
      move(run.directions.length - 1 - selectedIndex);
    }
  }

  return (
    <div className={styles.filmstrip} aria-label="Four design directions">
      <div className={styles.filmstripControls}>
        <span>Directions</span>
        <div>
          <button
            aria-label="Previous direction"
            disabled={selectedIndex === 0}
            onClick={() => move(-1)}
          >
            <ArrowIcon rtl={!isRtl} />
          </button>
          <button
            aria-label="Next direction"
            disabled={selectedIndex === run.directions.length - 1}
            onClick={() => move(1)}
          >
            <ArrowIcon rtl={isRtl} />
          </button>
        </div>
      </div>
      <div className={styles.emblaViewport} ref={viewportRef}>
        <div className={styles.emblaContainer}>
          {run.directions.map((candidate, index) => {
            const product = candidate.representations.product;
            return (
              <div className={styles.emblaSlide} key={candidate.id}>
                <button
                  ref={(node) => {
                    if (node) buttons.current.set(candidate.id, node);
                    else buttons.current.delete(candidate.id);
                  }}
                  className={styles.directionCard}
                  aria-current={candidate.id === selectedId ? "true" : undefined}
                  aria-label={`${candidate.label}, product ${product.state}`}
                  tabIndex={candidate.id === selectedId ? 0 : -1}
                  onClick={() => onSelect(candidate.id)}
                  onKeyDown={navigate}
                >
                  <span className={styles.directionThumb}>
                    {product.state === "ready" && product.assetUrl ? (
                      <Image
                        src={product.assetUrl}
                        alt=""
                        fill
                        unoptimized
                        sizes="96px"
                      />
                    ) : (
                      <StateArtwork state={product.state} compact />
                    )}
                  </span>
                  <span className={styles.directionCopy}>
                    <span>0{index + 1}</span>
                    <strong>{candidate.label}</strong>
                    <small>{candidate.brief}</small>
                  </span>
                  <span className={styles.stateRow}>
                    {KINDS.map((candidateKind) => (
                      <StatusChip
                        key={candidateKind}
                        state={candidate.representations[candidateKind].state}
                        label={candidateKind.slice(0, 1).toUpperCase()}
                      />
                    ))}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TaskRail({
  run,
  direction,
  busyAction,
  onRetry,
  onCancel,
}: {
  run: Run;
  direction: Direction;
  busyAction?: string;
  onRetry(taskId: string, label: string): void;
  onCancel(taskId: string, label: string): void;
}) {
  const tasks = run.tasks.filter((task) => task.directionId === direction.id);
  return (
    <section className={styles.taskRail} aria-label={`${direction.label} tasks`}>
      <h3>Task rail</h3>
      {tasks.map((task) => {
        const label = capitalize(task.kind);
        const isActive = ACTIVE_STATES.has(task.state);
        const canRetry = RETRYABLE_STATES.has(task.state);
        return (
          <div className={styles.taskItem} key={task.id}>
            <div>
              <strong>{label}</strong>
              <StatusChip state={task.state} />
            </div>
            <span>Attempt {task.attempt}</span>
            {(isActive || canRetry) && (
              <div className={styles.taskActions}>
                {canRetry && (
                  <button
                    disabled={busyAction === `retry-${task.id}`}
                    onClick={() => onRetry(task.id, label)}
                  >
                    Retry
                  </button>
                )}
                {isActive && (
                  <button
                    disabled={busyAction === `cancel-${task.id}`}
                    onClick={() => onCancel(task.id, label)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

function RunHistory({
  design,
  selectedRunId,
  onSelect,
}: {
  design: Design;
  selectedRunId: string;
  onSelect(run: Run): void;
}) {
  return (
    <section className={styles.history} aria-label="Run history">
      <h3>Run history</h3>
      <div>
        {[...design.runs].reverse().map((run) => {
          const revision = design.revisions.find(
            (candidate) => candidate.id === run.revisionId,
          );
          return (
            <button
              key={run.id}
              aria-current={run.id === selectedRunId ? "true" : undefined}
              onClick={() => onSelect(run)}
            >
              <strong>{run.label}</strong>
              <span>Revision {revision?.number ?? "—"} · {run.status}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function StatusChip({ state, label }: { state: TaskState; label?: string }) {
  const text = STATE_COPY[state]?.label ?? state;
  return (
    <span className={styles.statusChip} data-state={state} title={text}>
      {label ? `${label} · ${text}` : text}
    </span>
  );
}

function StatusDot({ state }: { state: TaskState }) {
  return <span className={styles.statusDot} data-state={state} aria-hidden="true" />;
}

function StateArtwork({
  state,
  compact = false,
}: {
  state: TaskState;
  compact?: boolean;
}) {
  const active = ACTIVE_STATES.has(state);
  return (
    <span
      className={styles.stateArtwork}
      data-active={active || undefined}
      data-compact={compact || undefined}
      aria-hidden="true"
    >
      <span />
      <span />
      <span />
    </span>
  );
}

function SectionTitle({ label, detail }: { label: string; detail: string }) {
  return (
    <div className={styles.sectionTitle}>
      <h2>{label}</h2>
      <span>{detail}</span>
    </div>
  );
}

function ArrowIcon({ rtl }: { rtl: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d={rtl ? "m9 5 7 7-7 7" : "m15 5-7 7 7 7"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
