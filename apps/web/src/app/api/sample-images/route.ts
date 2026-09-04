import { NextResponse } from "next/server";
import {
  addMessage,
  getBoard,
  setStatus,
  upsertItem,
  type SampleItem,
  type SampleVerdict,
} from "@/lib/sample-images-board";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getBoard());
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    kind?: "feedback" | "note" | "status" | "item";
    from?: "sanchay" | "agent";
    imageId?: string;
    verdict?: SampleVerdict;
    text?: string;
    status?: string;
    item?: SampleItem;
  };

  if (body.kind === "status" && body.status) {
    setStatus(body.status.slice(0, 500));
    addMessage({
      from: body.from === "sanchay" ? "sanchay" : "agent",
      text: body.status.slice(0, 2000),
    });
    return NextResponse.json(getBoard());
  }

  if (body.kind === "item" && body.item?.id && body.item.src) {
    upsertItem(body.item);
    addMessage({
      from: "agent",
      imageId: body.item.id,
      text: `New still: ${body.item.title}`,
    });
    return NextResponse.json(getBoard());
  }

  const text = (body.text ?? "").trim().slice(0, 4000);
  if (!text && !body.verdict) {
    return NextResponse.json({ error: "empty" }, { status: 400 });
  }

  addMessage({
    from: body.from === "agent" ? "agent" : "sanchay",
    imageId: body.imageId,
    verdict: body.verdict,
    text:
      text ||
      (body.verdict === "pass"
        ? "Pass"
        : body.verdict === "fail"
          ? "Fail"
          : body.verdict === "tweak"
            ? "Tweak"
            : "Note"),
  });

  return NextResponse.json(getBoard());
}
