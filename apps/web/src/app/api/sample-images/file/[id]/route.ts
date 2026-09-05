import { NextResponse } from "next/server";
import { getFile } from "@/lib/sample-images-board";

export function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return context.params.then(({ id }) => {
    const file = getFile(id);
    if (!file) return NextResponse.json({ error: "missing" }, { status: 404 });
    return new NextResponse(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.mime,
        "Cache-Control": "no-store",
      },
    });
  });
}
