export type SampleVerdict = "pass" | "fail" | "tweak" | "unseen";

export interface SampleItem {
  id: string;
  title: string;
  stage: string;
  look: string;
  env: string;
  name: string;
  font: string;
  src: string;
  taskId?: string;
  agentNote: string;
  verdict: SampleVerdict;
  createdAt: string;
}

export interface SampleMessage {
  id: string;
  at: string;
  from: "sanchay" | "agent";
  imageId?: string;
  verdict?: SampleVerdict;
  text: string;
}

export interface SampleBoard {
  updatedAt: string;
  status: string;
  items: SampleItem[];
  messages: SampleMessage[];
}

const SEED_ITEMS: SampleItem[] = [
  {
    id: "stencil-asma-naskh",
    title: "Stencil · أسماء · Noto Naskh",
    stage: "0",
    look: "classical",
    env: "identity-mask",
    name: "أسماء",
    font: "Noto Naskh classic",
    src: "/sample-images/assets/stencil-asma-naskh.png",
    agentNote:
      "Stage 0 pass. 4 components before fuse, 3 fuse moves, 1 piece, 2 rings. Hamza fused to alif. أ–س gap kept. ء welded.",
    verdict: "pass",
    createdAt: "2026-09-04T03:46:00.000Z",
  },
  {
    id: "s1-framed-ivory-locked",
    title: "Framed Minimal · ivory · أسماء",
    stage: "1",
    look: "framed-minimal",
    env: "ivory-packshot",
    name: "أسماء",
    font: "Noto Naskh classic",
    src: "/sample-images/assets/s1-framed-ivory-locked.png",
    taskId: "44ab9023-e4fc-4c6a-be25-a55e05979893",
    agentNote:
      "Identity-locked 9:16. Photography is store-ready. Letters match the stencil. Jump rings from the stencil still sit on the letters AND the frame corners — double hang. Needs your call.",
    verdict: "unseen",
    createdAt: "2026-09-04T03:48:56.000Z",
  },
  {
    id: "r0-framed-ivory-textonly",
    title: "R0 Framed · ivory · no stencil",
    stage: "0-photo",
    look: "framed-minimal",
    env: "ivory-packshot",
    name: "أسماء",
    font: "text-only",
    src: "/sample-images/assets/r0-framed-ivory-textonly.png",
    taskId: "f4b1109e-be73-4e56-a647-8a21feccca30",
    agentNote: "Text-only. Luxury photo, floating hamza. Reject. Kept as baseline.",
    verdict: "fail",
    createdAt: "2026-09-04T03:25:56.000Z",
  },
  {
    id: "r0-rails-dark-textonly",
    title: "R0 Rails · dark window · no stencil",
    stage: "0-photo",
    look: "floating-rails",
    env: "dark-window",
    name: "أسماء",
    font: "text-only",
    src: "/sample-images/assets/r0-rails-dark-textonly.png",
    taskId: "601bbf9a-87ff-4321-a45a-ba6794e2ee97",
    agentNote: "Text-only. Best store-window light. Floating hamza. Reject.",
    verdict: "fail",
    createdAt: "2026-09-04T03:25:43.000Z",
  },
  {
    id: "r0-worn-textonly",
    title: "R0 Worn · campaign · no stencil",
    stage: "0-photo",
    look: "classical",
    env: "worn-campaign",
    name: "أسماء",
    font: "text-only",
    src: "/sample-images/assets/r0-worn-textonly.png",
    taskId: "c8c93ea6-7419-4d3c-96ec-035186c4d77d",
    agentNote: "Text-only. Skin is unmatched. Extra disconnected glyph. Identity fail.",
    verdict: "fail",
    createdAt: "2026-09-04T03:25:46.000Z",
  },
];

type GlobalBoard = {
  board: SampleBoard;
  files: Map<string, { bytes: Buffer; mime: string }>;
};

function slot(): GlobalBoard {
  const global = globalThis as typeof globalThis & { __jeweloSample?: GlobalBoard };
  if (!global.__jeweloSample) {
    global.__jeweloSample = {
      board: {
        updatedAt: new Date().toISOString(),
        status: "Stage 0 stencils done. Stage 1 identity-locked framed ivory is up. Waiting on your verdict.",
        items: SEED_ITEMS.map((item) => ({ ...item })),
        messages: [
          {
            id: "m0",
            at: new Date().toISOString(),
            from: "agent",
            text: "Board is live. Tap an image, mark pass / fail / tweak, or write me a note. I am polling this page.",
          },
        ],
      },
      files: new Map(),
    };
  }
  return global.__jeweloSample;
}

function touch(board: SampleBoard) {
  board.updatedAt = new Date().toISOString();
}

export function getBoard(): SampleBoard {
  return slot().board;
}

export function addMessage(
  input: Omit<SampleMessage, "id" | "at"> & { id?: string; at?: string },
): SampleMessage {
  const board = slot().board;
  const message: SampleMessage = {
    id: input.id ?? `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: input.at ?? new Date().toISOString(),
    from: input.from,
    imageId: input.imageId,
    verdict: input.verdict,
    text: input.text,
  };
  board.messages = [...board.messages, message].slice(-200);
  if (input.imageId && input.verdict) {
    board.items = board.items.map((item) =>
      item.id === input.imageId ? { ...item, verdict: input.verdict! } : item,
    );
  }
  touch(board);
  return message;
}

export function upsertItem(item: SampleItem): SampleItem {
  const board = slot().board;
  const exists = board.items.some((entry) => entry.id === item.id);
  board.items = exists
    ? board.items.map((entry) => (entry.id === item.id ? item : entry))
    : [item, ...board.items];
  touch(board);
  return item;
}

export function setStatus(status: string) {
  const board = slot().board;
  board.status = status;
  touch(board);
}

export function putFile(id: string, bytes: Buffer, mime: string) {
  slot().files.set(id, { bytes, mime });
}

export function getFile(id: string) {
  return slot().files.get(id);
}
