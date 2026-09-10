"use client";

import type {
  OperatorPreviewRequestRecord,
  PreviewRequestCommand,
  PreviewRequestStatus,
} from "@jewelo/contracts";
import type { StatePayload } from "@/features/atelier/personalizedRun";

export type { OperatorPreviewRequestRecord, PreviewRequestStatus };

/** One run in `operator_review`, as `GET /api/operator/review-runs` sends it. */
export interface OperatorReviewTask {
  id: string;
  view?: string;
  status: string;
  attempt: number;
  errorCode?: string;
  cancelRequested: boolean;
}
export interface OperatorReviewRun {
  id: string;
  designId?: string;
  revisionId?: string;
  status: string;
  reason?: string;
  createdAt: string;
  tasks: OperatorReviewTask[];
}

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

/**
 * One preview-request command. The route validates the same envelope against
 * `previewRequestCommandSchema`, so an unknown command or an over-long note is
 * refused there, not here.
 */
export function sendPreviewRequestCommand(
  command: PreviewRequestCommand,
  id: string,
  note?: string,
) {
  return request<Record<string, unknown>>("/api/operator/commands", {
    method: "POST",
    body: JSON.stringify({
      command,
      targetId: id,
      idempotencyKey: crypto.randomUUID(),
      ...(note === undefined ? {} : { payload: { note } }),
    }),
  });
}

export async function loadOperatorReviewRuns() {
  const payload = await request<{ runs: OperatorReviewRun[] }>(
    "/api/operator/review-runs",
  );
  return payload.runs;
}

/**
 * The durable rows for one design, signed by `/api/state` - the same signer and
 * the same published column allowlist the shopper's page reads. A storage path
 * never reaches the operator's browser either.
 */
export function loadOperatorDesignState(designId: string) {
  return request<StatePayload>(
    `/api/state?designId=${encodeURIComponent(designId)}`,
  );
}

/**
 * Ask the pipeline to make one photograph again. The database refuses past
 * `runtime_policy.provider_attempt_budget`, and that refusal is the message the
 * caller shows.
 */
export function retryGenerationTask(
  designId: string,
  taskId: string,
  reason: string,
) {
  return request<Record<string, unknown>>("/api/operator/commands", {
    method: "POST",
    body: JSON.stringify({
      command: "review_task",
      designId,
      targetId: taskId,
      idempotencyKey: crypto.randomUUID(),
      payload: { decision: "retry", reason },
    }),
  });
}
