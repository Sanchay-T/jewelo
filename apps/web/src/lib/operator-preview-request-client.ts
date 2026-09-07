"use client";

import type {
  OperatorPreviewRequestRecord,
  PreviewRequestStatus,
} from "@jewelo/contracts";

export type { OperatorPreviewRequestRecord, PreviewRequestStatus };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...init.headers },
  });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw new Error(
      payload.error ?? `Preview request queue failed (${response.status})`,
    );
  return payload;
}

export async function loadOperatorPreviewRequests(status?: PreviewRequestStatus) {
  const payload = await request<{
    previewRequests: OperatorPreviewRequestRecord[];
  }>(
    `/api/operator/preview-requests${status ? `?status=${encodeURIComponent(status)}` : ""}`,
  );
  return payload.previewRequests;
}

export function markPreviewRequestContacted(id: string) {
  return request<Record<string, unknown>>("/api/operator/commands", {
    method: "POST",
    body: JSON.stringify({
      command: "preview_request.mark_contacted",
      targetId: id,
      idempotencyKey: crypto.randomUUID(),
    }),
  });
}
