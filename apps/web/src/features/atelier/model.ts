/** Customer prototype state only. Never sent to backend or manufacturing. */
export const STORAGE_KEY = "caleums.atelier.v1";
export const constructions = [
  "Classical",
  "Origami ribbon",
  "Framed minimal",
  "Diamond rails",
] as const;
export const letters = [
  "Classic",
  "Minimal",
  "Diwani",
  "Kufi",
  "Signature",
  "Thuluth inspired",
] as const;
export const layouts = [
  "Side by side",
  "Connected heart",
  "Stacked",
  "Infinity",
  "Interlocked",
] as const;
export const metals = ["Yellow gold", "White gold", "Rose gold"] as const;
export const coverages = [
  "No stones",
  "Accent",
  "Partial pavé",
  "Full pavé",
] as const;
export const gems = [
  "Lab diamond",
  "Natural diamond",
  "Ruby",
  "Emerald",
  "Blue sapphire",
  "Pink sapphire",
] as const;
export const chains = ["Cable", "Rolo", "Box", "Curb"] as const;
export type Draft = {
  version: 1;
  name: string;
  secondName: string;
  twoNames: boolean;
  script: "English" | "Arabic";
  construction: (typeof constructions)[number];
  lettering: (typeof letters)[number];
  layout: (typeof layouts)[number];
  metal: (typeof metals)[number];
  coverage: (typeof coverages)[number];
  gem: (typeof gems)[number];
  size: 22 | 32;
  chain: (typeof chains)[number];
  length: 40 | 45 | 50 | 55;
  engraving: string;
  requests: string;
};
export const visualFields = [
  "script",
  "twoNames",
  "construction",
  "lettering",
  "layout",
  "metal",
  "coverage",
  "gem",
  "size",
  "chain",
] as const;
export type VisualField = (typeof visualFields)[number];
export const emptyDraft: Draft = {
  version: 1,
  name: "",
  secondName: "",
  twoNames: false,
  script: "English",
  construction: "Classical",
  lettering: "Classic",
  layout: "Connected heart",
  metal: "Yellow gold",
  coverage: "No stones",
  gem: "Lab diamond",
  size: 32,
  chain: "Cable",
  length: 45,
  engraving: "",
  requests: "",
};
export const views = ["Studio", "On skin", "Close-up", "Dark"] as const;
export type View = (typeof views)[number];
export type Slot = {
  view: View;
  status: "pending" | "ready" | "failed";
  due: number;
  attempt: number;
  fail: boolean;
};
export type Run = {
  version: 1;
  id: string;
  signature: string;
  draft: Draft;
  slots: Slot[];
};
export type BagItem = {
  version: 1;
  id: string;
  draft: Draft;
  run: Run;
  quantity: number;
  confirmed: true;
  snapshot?: {
    id: string;
    key: string;
    rendererVersion: string;
    availableViews: View[];
    persistent: boolean;
  };
  sampleId?: string;
  sampleFocus?: VisualField;
};
export type State = {
  version: 1;
  draft: Draft;
  runs: Run[];
  bag: BagItem[];
  stage: "design" | "review";
  editing: string | null;
  sampleFocus?: VisualField;
  editReturn?: {
    draft: Draft;
    runs: Run[];
    stage: "design" | "review";
    sampleFocus?: VisualField;
  };
};
export const initialState = (): State => ({
  version: 1,
  draft: { ...emptyDraft },
  runs: [],
  bag: [],
  stage: "design",
  editing: null,
});
export function specification(d: Draft): Draft {
  return {
    ...d,
    name: d.name.trim().normalize("NFC"),
    secondName: d.twoNames ? d.secondName.trim().normalize("NFC") : "",
    layout: d.twoNames ? d.layout : "Connected heart",
    gem: d.coverage === "No stones" ? "Lab diamond" : d.gem,
  };
}
export const signature = (d: Draft) => JSON.stringify(specification(d));
export const nameLabel = (d: Draft) =>
  [d.name, ...(d.twoNames ? [d.secondName] : [])].filter(Boolean).join(" & ") ||
  "Your name";
export function validate(
  d: Draft,
): Partial<Record<"name" | "secondName", string>> {
  const errors: Partial<Record<"name" | "secondName", string>> = {};
  for (const field of [
    "name",
    ...(d.twoNames ? ["secondName" as const] : []),
  ] as const) {
    const text = d[field].trim();
    if (!text || !/\p{L}/u.test(text))
      errors[field] = "Enter a name containing letters.";
    else if (text.length > 30 || !/^[\p{L}\p{M}\s'’-]+$/u.test(text))
      errors[field] = "Use up to 30 letters, spaces, apostrophes or hyphens.";
    else if (d.script === "Arabic" && !/\p{Script=Arabic}/u.test(text))
      errors[field] = "Enter the exact Arabic spelling, or choose English.";
  }
  return errors;
}
/** Replace this port with real generation only in a separately authorized integration. */
export interface GenerationPort {
  start(draft: Draft, id: string, now: number, failView?: View): Run;
  settle(run: Run, now: number): Run;
  retry(run: Run, view: View, now: number): Run;
}
export const mockGeneration: GenerationPort = {
  start: (draft, id, now, failView) => ({
    version: 1,
    id,
    signature: signature(draft),
    draft: specification(draft),
    slots: views.map((view, index) => ({
      view,
      status: "pending",
      due: now + 700 + index * 450,
      attempt: 1,
      fail: view === failView,
    })),
  }),
  settle: (run, now) => ({
    ...run,
    slots: run.slots.map((slot) =>
      slot.status === "pending" && slot.due <= now
        ? { ...slot, status: slot.fail ? "failed" : "ready" }
        : slot,
    ),
  }),
  retry: (run, view, now) => ({
    ...run,
    slots: run.slots.map((slot) =>
      slot.view === view && slot.status === "failed"
        ? {
            ...slot,
            status: "pending",
            fail: false,
            attempt: slot.attempt + 1,
            due: now + 900,
          }
        : slot,
    ),
  }),
};
export function canAdd(d: Draft, run: Run | undefined, confirmed: boolean) {
  return (
    confirmed &&
    Object.keys(validate(d)).length === 0 &&
    !!run &&
    run.signature === signature(d) &&
    run.slots.some((s) => s.status === "ready")
  );
}
export function putInBag(
  state: State,
  confirmed: boolean,
  id: string,
  sampleId?: string,
): State {
  const run = state.runs.at(-1);
  if (!canAdd(state.draft, run, confirmed) || !run) return state;
  const existing = state.bag.find((item) => item.id === state.editing);
  const item: BagItem = {
    version: 1,
    id: existing?.id ?? id,
    draft: specification(state.draft),
    run: structuredClone(run),
    quantity: existing?.quantity ?? 1,
    confirmed: true,
    ...(sampleId ? { sampleId } : {}),
    ...(state.sampleFocus ? { sampleFocus: state.sampleFocus } : {}),
  };
  return {
    ...state,
    editing: null,
    editReturn: undefined,
    bag: existing
      ? state.bag.map((b) => (b.id === existing.id ? item : b))
      : [...state.bag, item],
  };
}
export function beginBagEdit(state: State, id: string): State {
  const item = state.bag.find((item) => item.id === id);
  if (!item) return state;
  return {
    ...state,
    editReturn:
      state.editReturn ??
      structuredClone({
        draft: state.draft,
        runs: state.runs,
        stage: state.stage,
        sampleFocus: state.sampleFocus,
      }),
    draft: structuredClone(item.draft),
    runs: [structuredClone(item.run)],
    sampleFocus: item.sampleFocus,
    editing: id,
    stage: "design",
  };
}
export function cancelBagEdit(state: State): State {
  const previous = state.editReturn;
  return {
    ...state,
    ...(previous ?? initialState()),
    bag: state.bag,
    editing: null,
    editReturn: undefined,
    sampleFocus: previous?.sampleFocus,
  };
}
function record(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}
function draftValid(x: unknown): x is Draft {
  if (!record(x) || x.version !== 1) return false;
  for (const key of ["name", "secondName", "engraving", "requests"])
    if (
      typeof x[key] !== "string" ||
      (x[key] as string).length >
        (key === "requests" ? 1000 : key === "engraving" ? 80 : 30)
    )
      return false;
  const sets = {
    script: ["English", "Arabic"],
    construction: constructions,
    lettering: letters,
    layout: layouts,
    metal: metals,
    coverage: coverages,
    gem: gems,
    size: [22, 32],
    chain: chains,
    length: [40, 45, 50, 55],
  };
  return (
    typeof x.twoNames === "boolean" &&
    Object.entries(sets).every(([key, values]) =>
      (values as readonly unknown[]).includes(x[key]),
    )
  );
}
function runValid(x: unknown): x is Run {
  return (
    record(x) &&
    x.version === 1 &&
    typeof x.id === "string" &&
    draftValid(x.draft) &&
    x.signature === signature(x.draft) &&
    Array.isArray(x.slots) &&
    x.slots.length === 4 &&
    x.slots.every(
      (s, i) =>
        record(s) &&
        s.view === views[i] &&
        ["pending", "ready", "failed"].includes(s.status as string) &&
        typeof s.due === "number" &&
        Number.isFinite(s.due) &&
        typeof s.attempt === "number" &&
        Number.isInteger(s.attempt) &&
        s.attempt > 0 &&
        typeof s.fail === "boolean",
    )
  );
}
export function restore(raw: string | null): State {
  if (!raw) return initialState();
  const x: unknown = JSON.parse(raw);
  if (
    !record(x) ||
    x.version !== 1 ||
    !draftValid(x.draft) ||
    (x.sampleFocus !== undefined &&
      !(visualFields as readonly unknown[]).includes(x.sampleFocus)) ||
    (x.editReturn !== undefined &&
      (!record(x.editReturn) ||
        !draftValid(x.editReturn.draft) ||
        !Array.isArray(x.editReturn.runs) ||
        !x.editReturn.runs.every(runValid) ||
        !["design", "review"].includes(x.editReturn.stage as string) ||
        (x.editReturn.sampleFocus !== undefined &&
          !(visualFields as readonly unknown[]).includes(
            x.editReturn.sampleFocus,
          )))) ||
    !Array.isArray(x.runs) ||
    !x.runs.every(runValid) ||
    !Array.isArray(x.bag) ||
    !x.bag.every(
      (b) =>
        record(b) &&
        b.version === 1 &&
        typeof b.id === "string" &&
        draftValid(b.draft) &&
        runValid(b.run) &&
        b.run.signature === signature(b.draft) &&
        b.confirmed === true &&
        (b.sampleFocus === undefined ||
          (visualFields as readonly unknown[]).includes(b.sampleFocus)) &&
        (b.snapshot === undefined ||
          (record(b.snapshot) &&
            typeof b.snapshot.id === "string" &&
            typeof b.snapshot.key === "string" &&
            typeof b.snapshot.rendererVersion === "string" &&
            typeof b.snapshot.persistent === "boolean" &&
            Array.isArray(b.snapshot.availableViews) &&
            b.snapshot.availableViews.every((v) =>
              (views as readonly unknown[]).includes(v),
            ))) &&
        (b.sampleId === undefined ||
          (typeof b.sampleId === "string" && b.sampleId.length <= 100)) &&
        Number.isInteger(b.quantity) &&
        Number(b.quantity) >= 1 &&
        Number(b.quantity) <= 99,
    ) ||
    !["design", "review"].includes(x.stage as string) ||
    !(x.editing === null || typeof x.editing === "string")
  )
    throw new Error("Invalid saved design");
  const recovered = x as unknown as State;
  return {
    ...recovered,
    stage: recovered.runs.length ? recovered.stage : "design",
    editing: recovered.bag.some((item) => item.id === recovered.editing)
      ? recovered.editing
      : null,
  };
}
export const sampleSource = (view: View, draft?: Draft) =>
  view === "Studio" && draft?.twoNames
    ? "/atelier/v1/asma-fatima.png"
    : view === "Studio" && draft?.script === "Arabic"
      ? "/atelier/v1/asma-arabic.png"
      : `/atelier/v1/asma-${view === "On skin" ? "worn" : view === "Dark" ? "dark" : view === "Close-up" ? "close" : "studio"}.png`;
