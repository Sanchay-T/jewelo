import { createHash } from "node:crypto";
import {
  FalStudioAdapter,
  MockStudioGenerator,
  MockStudioVerifier,
  OpenAIStudioVerifier,
  type GeneratedMedia,
  type StudioGenerator,
  type StudioVerifier,
} from "@jewelo/ai";
import { parseJobsEnv } from "@jewelo/config";
import { renderIdentityAnchor } from "./identity-anchor";

interface TaskRow {
  id: string;
  run_id: string;
  owner_principal_id: string;
  presentation_view: "studio";
  status: string;
  attempt: number;
  dispatch_idempotency_key: string;
  prompt_release: string;
  cancel_requested_at?: string;
}
interface RunRow {
  id: string;
  design_id: string;
  revision_id: string;
  owner_principal_id: string;
  status: string;
}
interface RevisionRow {
  id: string;
  specification: Record<string, unknown>;
  identity_anchor: {
    approvedText: string;
    language: "en" | "ar";
    typography: string;
    fingerprint: string;
  };
}

export interface PresentationRepository {
  load(
    taskId: string,
  ): Promise<{ task: TaskRow; run: RunRow; revision: RevisionRow }>;
  reserveAttempt(
    task: TaskRow,
    provider: string,
    model: string,
  ): Promise<{
    attempt: number;
    idempotencyKey: string;
    duplicateComplete: boolean;
  }>;
  markTask(
    taskId: string,
    status: string,
    detail?: Record<string, unknown>,
  ): Promise<void>;
  storeProviderOutput(input: {
    task: TaskRow;
    run: RunRow;
    revision: RevisionRow;
    attempt: number;
    media: GeneratedMedia;
  }): Promise<{ bucket: string; path: string; checksum: string }>;
  complete(input: {
    task: TaskRow;
    run: RunRow;
    revision: RevisionRow;
    attempt: number;
    media: GeneratedMedia;
    stored: { bucket: string; path: string; checksum: string };
    verification: Record<string, unknown>;
  }): Promise<void>;
  fail(input: {
    task: TaskRow;
    run: RunRow;
    attempt: number;
    error: unknown;
    terminal: boolean;
    actualCostCents: number;
  }): Promise<void>;
  signedIdentityUrl(revision: RevisionRow, ownerId: string): Promise<string>;
}

export async function executePresentationTask(
  taskId: string,
  repository: PresentationRepository,
  generator: StudioGenerator,
  verifier: StudioVerifier,
) {
  const { task, run, revision } = await repository.load(taskId);
  if (task.presentation_view !== "studio")
    throw new Error(`Disabled presentation view:${task.presentation_view}`);
  if (task.status === "ready") return { status: "deduplicated" as const };
  if (task.status === "cancelled" || task.cancel_requested_at)
    return { status: "cancelled" as const };
  const provider = generator instanceof MockStudioGenerator ? "mock" : "fal";
  const model =
    provider === "mock" ? "mock-studio-v1" : "openai/gpt-image-2/edit";
  const reservation = await repository.reserveAttempt(task, provider, model);
  if (reservation.duplicateComplete) return { status: "deduplicated" as const };
  let actualCostCents = 0;
  try {
    await repository.markTask(task.id, "generating", {
      attempt: reservation.attempt,
    });
    // Persist the deterministic identity anchor in every mode. Mock execution
    // must exercise the same private-storage lineage without making a paid call.
    const identityImageUrl = await repository.signedIdentityUrl(
      revision,
      task.owner_principal_id,
    );
    const media = await generator.generate({
      idempotencyKey: reservation.idempotencyKey,
      identityImageUrl,
      identityFingerprint: revision.identity_anchor.fingerprint,
      specification: revision.specification,
    });
    actualCostCents = media.estimatedCostCents;
    const stored = await repository.storeProviderOutput({
      task,
      run,
      revision,
      attempt: reservation.attempt,
      media,
    });
    await repository.markTask(task.id, "verifying");
    const verification = await verifier.verify({
      approvedText: revision.identity_anchor.approvedText,
      identityFingerprint: revision.identity_anchor.fingerprint,
      media,
    });
    if (!verification.passed || !verification.exactText)
      throw new Error("identity_verification_failed");
    await repository.complete({
      task,
      run,
      revision,
      attempt: reservation.attempt,
      media,
      stored,
      verification: verification as unknown as Record<string, unknown>,
    });
    return { status: "ready" as const, attempt: reservation.attempt };
  } catch (error) {
    const terminal = reservation.attempt >= 3;
    await repository.fail({
      task,
      run,
      attempt: reservation.attempt,
      error,
      terminal,
      actualCostCents,
    });
    if (!terminal) throw error;
    return { status: "operator_review" as const, attempt: reservation.attempt };
  }
}

export class SupabasePresentationRepository implements PresentationRepository {
  constructor(
    private readonly url: string,
    private readonly key: string,
  ) {}
  async #request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.url}${path}`, {
      ...init,
      headers: {
        apikey: this.key,
        authorization: `Bearer ${this.key}`,
        "content-type": "application/json",
        ...init.headers,
      },
    });
    if (!response.ok)
      throw new Error(
        `Supabase job request ${response.status}:${(await response.text()).slice(0, 300)}`,
      );
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }
  async load(taskId: string) {
    const tasks = await this.#request<TaskRow[]>(
      `/rest/v1/generation_tasks?id=eq.${taskId}`,
    );
    const task = tasks[0];
    if (!task) throw new Error("task_not_found");
    const runs = await this.#request<RunRow[]>(
      `/rest/v1/generation_runs?id=eq.${task.run_id}`,
    );
    const run = runs[0];
    if (!run) throw new Error("run_not_found");
    const revisions = await this.#request<RevisionRow[]>(
      `/rest/v1/design_revisions?id=eq.${run.revision_id}`,
    );
    const revision = revisions[0];
    if (!revision) throw new Error("revision_not_found");
    return { task, run, revision };
  }
  async reserveAttempt(task: TaskRow, provider: string, model: string) {
    const attempt = task.attempt + 1;
    const idempotencyKey = `${task.dispatch_idempotency_key}:attempt:${attempt}`;
    const rows = await this.#request<
      Array<{ attempt_number: number; duplicate_complete: boolean }>
    >("/rest/v1/rpc/reserve_provider_attempt", {
      method: "POST",
      body: JSON.stringify({
        p_task_id: task.id,
        p_provider: provider,
        p_model: model,
        p_provider_key: idempotencyKey,
      }),
    });
    return {
      attempt: rows[0]?.attempt_number ?? attempt,
      idempotencyKey,
      duplicateComplete: rows[0]?.duplicate_complete ?? false,
    };
  }
  async markTask(
    taskId: string,
    status: string,
    detail: Record<string, unknown> = {},
  ) {
    await this.#request(`/rest/v1/generation_tasks?id=eq.${taskId}`, {
      method: "PATCH",
      body: JSON.stringify({ status, ...detail }),
    });
  }
  async signedIdentityUrl(revision: RevisionRow, ownerId: string) {
    const basePath = `principal/${ownerId}/revision/${revision.id}/identity-${revision.identity_anchor.fingerprint}`;
    const rendered = await renderIdentityAnchor(
      {
        approvedText: revision.identity_anchor.approvedText,
        language: revision.identity_anchor.language,
        typography: revision.identity_anchor.typography,
        fingerprint: revision.identity_anchor.fingerprint,
      },
      revision.specification,
    );
    for (const [extension, body, contentType] of [
      ["svg", rendered.svg, "image/svg+xml"],
      ["png", rendered.png, "image/png"],
    ] as const) {
      const uploadBody = body.buffer.slice(
        body.byteOffset,
        body.byteOffset + body.byteLength,
      ) as ArrayBuffer;
      const upload = await fetch(
        `${this.url}/storage/v1/object/identity-anchors/${basePath}.${extension}`,
        {
          method: "POST",
          headers: {
            apikey: this.key,
            authorization: `Bearer ${this.key}`,
            "content-type": contentType,
            "x-upsert": "false",
          },
          body: uploadBody,
        },
      );
      if (!upload.ok && upload.status !== 409)
        throw new Error(`identity anchor upload failed:${upload.status}`);
    }
    const path = `${basePath}.png`;
    const result = await this.#request<{
      signedURL?: string;
      signedUrl?: string;
    }>(`/storage/v1/object/sign/identity-anchors/${path}`, {
      method: "POST",
      body: JSON.stringify({ expiresIn: 300 }),
    });
    const signed = result.signedURL ?? result.signedUrl;
    if (!signed) throw new Error("identity_anchor_missing");
    return signed.startsWith("http")
      ? signed
      : `${this.url}/storage/v1${signed}`;
  }
  async storeProviderOutput(input: {
    task: TaskRow;
    run: RunRow;
    revision: RevisionRow;
    attempt: number;
    media: GeneratedMedia;
  }) {
    const checksum = createHash("sha256")
      .update(input.media.bytes)
      .digest("hex");
    const path = `principal/${input.task.owner_principal_id}/design/${input.run.design_id}/revision/${input.revision.id}/run/${input.run.id}/studio/attempt-${input.attempt}-${checksum.slice(0, 12)}.png`;
    const response = await fetch(
      `${this.url}/storage/v1/object/generated-assets/${path}`,
      {
        method: "POST",
        headers: {
          apikey: this.key,
          authorization: `Bearer ${this.key}`,
          "content-type": input.media.mimeType,
          "x-upsert": "false",
        },
        body: Buffer.from(input.media.bytes),
      },
    );
    if (!response.ok && response.status !== 409)
      throw new Error(`asset upload failed:${response.status}`);
    return { bucket: "generated-assets", path, checksum };
  }
  async complete(input: {
    task: TaskRow;
    run: RunRow;
    revision: RevisionRow;
    attempt: number;
    media: GeneratedMedia;
    stored: { bucket: string; path: string; checksum: string };
    verification: Record<string, unknown>;
  }) {
    await this.#request("/rest/v1/assets", {
      method: "POST",
      headers: { prefer: "resolution=ignore-duplicates" },
      body: JSON.stringify({
        design_id: input.run.design_id,
        revision_id: input.revision.id,
        run_id: input.run.id,
        task_id: input.task.id,
        owner_principal_id: input.task.owner_principal_id,
        presentation_view: "studio",
        bucket_id: input.stored.bucket,
        object_path: input.stored.path,
        mime_type: input.media.mimeType,
        byte_size: input.media.bytes.byteLength,
        checksum_sha256: input.stored.checksum,
        provider: input.media.provider,
        model: input.media.model,
        prompt_release: input.task.prompt_release,
        identity_fingerprint: input.revision.identity_anchor.fingerprint,
        attempt: input.attempt,
        verification_result: input.verification,
      }),
    });
    await this.#request("/rest/v1/rpc/reconcile_provider_attempt", {
      method: "POST",
      body: JSON.stringify({
        p_task_id: input.task.id,
        p_attempt: input.attempt,
        p_status: "succeeded",
        p_actual_cost_cents: input.media.estimatedCostCents,
        p_terminal: true,
      }),
    });
    await this.markTask(input.task.id, "ready");
    await this.#request(`/rest/v1/generation_runs?id=eq.${input.run.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "complete" }),
    });
    await this.#request("/rest/v1/audit_events", {
      method: "POST",
      body: JSON.stringify({
        design_id: input.run.design_id,
        principal_id: input.task.owner_principal_id,
        actor_type: "job",
        action: "task.ready",
        detail: { taskId: input.task.id, attempt: input.attempt },
      }),
    });
  }
  async fail(input: {
    task: TaskRow;
    run: RunRow;
    attempt: number;
    error: unknown;
    terminal: boolean;
    actualCostCents: number;
  }) {
    const message =
      input.error instanceof Error ? input.error.message : "unknown";
    await this.#request("/rest/v1/rpc/reconcile_provider_attempt", {
      method: "POST",
      body: JSON.stringify({
        p_task_id: input.task.id,
        p_attempt: input.attempt,
        p_status: "failed",
        p_actual_cost_cents: input.actualCostCents,
        p_error_class: message.slice(0, 120),
        p_terminal: input.terminal,
      }),
    });
    await this.markTask(
      input.task.id,
      input.terminal ? "blocked" : "retrying",
      input.terminal ? { terminal_error_code: message.slice(0, 120) } : {},
    );
    if (input.terminal)
      await this.#request(`/rest/v1/generation_runs?id=eq.${input.run.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "operator_review",
          operator_review_reason: message.slice(0, 300),
        }),
      });
    await this.#request("/rest/v1/audit_events", {
      method: "POST",
      body: JSON.stringify({
        design_id: input.run.design_id,
        principal_id: input.task.owner_principal_id,
        actor_type: "job",
        action: input.terminal ? "task.operator_review" : "task.retrying",
        detail: {
          taskId: input.task.id,
          attempt: input.attempt,
          error: message.slice(0, 120),
        },
      }),
    });
  }
}

export function productionPresentationDependencies(
  environment: Record<string, string | undefined> = process.env,
) {
  const config = parseJobsEnv(environment);
  const repository = new SupabasePresentationRepository(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY,
  );
  if (config.PROVIDER_MODE === "mock")
    return {
      repository,
      generator: new MockStudioGenerator(),
      verifier: new MockStudioVerifier(),
    };
  return {
    repository,
    generator: new FalStudioAdapter(config.FAL_KEY!, config.FAL_IMAGE_MODEL),
    verifier: new OpenAIStudioVerifier(
      config.OPENAI_API_KEY!,
      config.OPENAI_VERIFIER_MODEL,
    ),
  };
}
