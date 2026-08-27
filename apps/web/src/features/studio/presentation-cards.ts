import type {
  LegacyGenerationRun,
  Representation,
} from "../../lib/legacy-direction-compat";
import type {
  PresentationTask,
  PresentationView,
  TaskState,
} from "../../lib/types";

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
  motion: "/fixtures/layla-direction-1-motion-poster.jpg",
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
  task?: PresentationTask;
  state: TaskState;
  assetUrl?: string;
  alt: string;
  canonical: boolean;
}

export function adaptPresentationCards(
  run: LegacyGenerationRun | undefined,
  locallyCancelled: ReadonlySet<string> = new Set(),
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
    const state = locallyCancelled.has(task?.id ?? "")
      ? "cancelled"
      : (task?.state ??
        canonicalAsset?.state ??
        representation?.state ??
        "unavailable");
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
