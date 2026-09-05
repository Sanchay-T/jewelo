import { NextResponse } from "next/server";
import {
  addMessage,
  putFile,
  upsertItem,
  type SampleItem,
} from "@/lib/sample-images-board";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const id = String(form.get("id") ?? "").trim();
  if (!id || !(file instanceof File)) {
    return NextResponse.json({ error: "file and id required" }, { status: 400 });
  }
  if (file.size > 8_000_000) {
    return NextResponse.json({ error: "too large" }, { status: 413 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "image/png";
  putFile(id, bytes, mime);
  const item: SampleItem = {
    id,
    title: String(form.get("title") ?? id),
    stage: String(form.get("stage") ?? "1"),
    look: String(form.get("look") ?? ""),
    env: String(form.get("env") ?? ""),
    name: String(form.get("name") ?? ""),
    font: String(form.get("font") ?? ""),
    src: `/api/sample-images/file/${encodeURIComponent(id)}`,
    taskId: String(form.get("taskId") ?? "") || undefined,
    agentNote: String(form.get("agentNote") ?? ""),
    verdict: "unseen",
    createdAt: new Date().toISOString(),
  };
  upsertItem(item);
  addMessage({
    from: "agent",
    imageId: id,
    text: `Uploaded ${item.title}`,
  });
  return NextResponse.json({ ok: true, item });
}
