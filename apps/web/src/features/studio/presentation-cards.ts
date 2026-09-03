import type {
  LegacyGenerationRun,
  LegacyGenerationTask,
  Representation,
} from "../../lib/legacy-direction-compat";
import type { PresentationView, TaskState } from "../../lib/types";

export const PRESENTATION_CARDS = [
  { id: "studio", number: "01", label: "Studio", treatment: "Clean ivory" },
  { id: "on_skin", number: "02", label: "On model", treatment: "Worn scale" },
  { id: "close_up", number: "03", label: "Close up", treatment: "Fine detail" },
  { id: "dark", number: "04", label: "Dark mood", treatment: "Editorial" },
] as const satisfies ReadonlyArray<{
  id: PresentationView;
  number: string;
  label: string;
  treatment: string;
}>;

const SAMPLE_PRESENTATION_ASSETS: Record<PresentationView, string> = {
  studio: "/fixtures/layla-direction-1-product.png",
  on_skin: "/fixtures/layla-direction-1-worn.png",
  close_up: "/fixtures/layla-direction-3-product.png",
  dark: "/fixtures/layla-direction-4-product.png",
};

const legacyCoordinates = {
  studio: { directionIndex: 0, kind: "product" },
  on_skin: { directionIndex: 0, kind: "worn" },
  close_up: { directionIndex: 2, kind: "product" },
  dark: { directionIndex: 3, kind: "product" },
} as const;

export interface PresentationCardModel {
  id: PresentationView;
  number: string;
  label: string;
  treatment: string;
  task?: LegacyGenerationTask;
  state: TaskState;
  assetUrl?: string;
  alt: string;
  canonical: boolean;
}

export function adaptPresentationCards(
  run: LegacyGenerationRun | undefined,
): PresentationCardModel[] {
  return PRESENTATION_CARDS.map((details) => {
    const coordinate = legacyCoordinates[details.id];
    const direction = run?.directions[coordinate.directionIndex];
    const representation = direction?.representations[coordinate.kind] as
      Representation | undefined;
    const canonicalTask = run?.tasks.find(
      (candidate) => candidate.view === details.id,
    );
    const task =
      canonicalTask ??
      run?.tasks.find(
        (candidate) =>
          candidate.directionId === direction?.id &&
          candidate.kind === coordinate.kind,
      );
    const canonicalAsset =
      run?.assets.find(
        (candidate) => task && candidate.lineage.taskId === task.id,
      ) ?? run?.assets.find((candidate) => candidate.view === details.id);
    const state =
      task?.state ??
      canonicalAsset?.state ??
      representation?.state ??
      "unavailable";
    const canonicalReady =
      state === "ready" &&
      canonicalAsset?.state === "ready" &&
      Boolean(canonicalAsset.assetUrl);
    const legacyReady =
      state === "ready" &&
      representation?.state === "ready" &&
      Boolean(representation.assetUrl);

    return {
      ...details,
      task,
      state:
        state === "ready" && !canonicalReady && !legacyReady
          ? "verifying"
          : state,
      assetUrl: canonicalReady
        ? canonicalAsset?.assetUrl
        : legacyReady
          ? representation?.assetUrl
          : undefined,
      alt:
        (canonicalReady ? canonicalAsset?.alt : representation?.alt) ??
        `${details.label} presentation of the approved Caleums pendant`,
      canonical: Boolean(canonicalReady),
    };
  });
}

export function isPrimaryReady(cards: PresentationCardModel[]) {
  const studio = cards.find((card) => card.id === "studio");
  return studio?.state === "ready" && Boolean(studio.assetUrl);
}

export interface PresentationStatus {
  label: string;
  detail: string;
  /**
   * True only when the provider genuinely has work in flight for this view.
   * Shimmer and spinners are gated on this so a failed or cancelled card never
   * animates as though something is still happening.
   */
  pending: boolean;
}

const STATUS_COPY: Readonly<Record<TaskState, PresentationStatus>> = {
  queued: {
    label: "Queued",
    detail: "Waiting for a free slot in the render queue.",
    pending: true,
  },
  generating: {
    label: "Generating",
    detail: "Rendering this view now.",
    pending: true,
  },
  verifying: {
    label: "Checking spelling",
    detail: "Reading the name back to confirm it matches your approved spelling.",
    pending: true,
  },
  retrying: {
    label: "Retrying",
    detail: "The first attempt did not pass. Trying again.",
    pending: true,
  },
  ready: { label: "Ready", detail: "This view is finished.", pending: false },
  failed: {
    label: "Needs another try",
    detail: "This view did not complete. You can retry it on its own.",
    pending: false,
  },
  blocked: {
    label: "Not started",
    detail: "Waiting for the view it is built from.",
    pending: false,
  },
  cancelled: {
    label: "Cancelled",
    detail: "You cancelled this view. Nothing further was charged.",
    pending: false,
  },
  unavailable: {
    label: "Not available",
    detail: "This view is not part of the current set.",
    pending: false,
  },
  available_on_request: {
    label: "On request",
    detail: "We can render this view when you ask for it.",
    pending: false,
  },
};

/**
 * Customer-facing status for one view. Never exposes a raw enum member and
 * never invents a percentage — the states are discrete and that is all we know.
 *
 * The backend runs studio first: on_skin/close_up/dark stay `queued` behind a
 * dependency on the studio task, so plain "Queued" reads as if nothing is
 * happening.
 */
export function presentationStatus(
  card: PresentationCardModel,
  cards: PresentationCardModel[],
): PresentationStatus {
  if (
    card.id === "studio" &&
    card.state === "blocked" &&
    card.task?.terminalErrorCode?.startsWith("name_mismatch")
  )
    return {
      label: "Spelling check failed",
      detail:
        "The rendered name did not match your approved spelling, so it was not kept. Retry to render again.",
      pending: false,
    };
  if (card.state === "queued" && card.id !== "studio" && !isPrimaryReady(cards))
    return {
      label: "Waiting for studio",
      detail: "It starts as soon as the Studio view is verified.",
      pending: true,
    };
  return (
    STATUS_COPY[card.state] ?? {
      label: "Preparing",
      detail: "Preparing this view.",
      pending: true,
    }
  );
}

export function presentationStatusLabel(
  card: PresentationCardModel,
  cards: PresentationCardModel[],
) {
  return presentationStatus(card, cards).label;
}

export function applyPresentationReplay(
  cards: PresentationCardModel[],
  replayStep: number,
) {
  return cards.map((card, index) => {
    const phase = replayStep - index * 2;
    return {
      ...card,
      state:
        phase >= 2
          ? ("ready" as const)
          : phase === 1
            ? ("verifying" as const)
            : phase === 0
              ? ("generating" as const)
              : ("queued" as const),
    };
  });
}

export function applySamplePresentationAssets(
  cards: PresentationCardModel[],
  ready = false,
) {
  return cards.map((card) => {
    const usingFixture = !card.assetUrl;
    return {
      ...card,
      state: ready ? ("ready" as const) : card.state,
      assetUrl: card.assetUrl ?? SAMPLE_PRESENTATION_ASSETS[card.id],
      alt: usingFixture
        ? `${card.label} sample presentation fixture; no provider output`
        : card.alt,
      canonical: usingFixture ? false : card.canonical,
    };
  });
}
