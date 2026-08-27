"use client";

export const OPERATOR_PROMPT_PROFILES = [
  "image.studio",
  "video.preview",
  "video.final",
] as const;
export type OperatorPromptProfile = (typeof OPERATOR_PROMPT_PROFILES)[number];

export interface OperatorPromptRelease {
  id: string;
  profile: OperatorPromptProfile;
  version: number;
  template: string;
  parsedVariables: string[];
  changeNote: string;
  createdBy: string;
  createdAt: string;
}

export interface OperatorPromptLibraryState {
  profile: OperatorPromptProfile;
  activeReleaseId: string;
  publishedAt: string;
  allowedVariables: Array<{ name: string; description: string }>;
  releases: OperatorPromptRelease[];
  requestId: string;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      "x-request-id": crypto.randomUUID(),
      ...init.headers,
    },
  });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw new Error(
      payload.error ?? `Prompt request failed (${response.status})`,
    );
  return payload;
}

export function loadOperatorPrompts(profile: OperatorPromptProfile) {
  return request<OperatorPromptLibraryState>(
    `/api/operator/prompts?profile=${encodeURIComponent(profile)}`,
  );
}

export function createOperatorPromptRelease(input: {
  profile: OperatorPromptProfile;
  template: string;
  changeNote: string;
}) {
  return request<OperatorPromptRelease & { requestId: string }>(
    "/api/operator/prompts",
    { method: "POST", body: JSON.stringify({ action: "create", ...input }) },
  );
}

export function publishOperatorPromptRelease(input: {
  releaseId: string;
  expectedCurrentReleaseId: string;
}) {
  return request<{ requestId: string }>("/api/operator/prompts", {
    method: "POST",
    body: JSON.stringify({ action: "publish", ...input }),
  });
}
