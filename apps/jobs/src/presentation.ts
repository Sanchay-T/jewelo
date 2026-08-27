import { createHash } from "node:crypto";
import {
  MockStudioGenerator,
  MockStudioVerifier,
  OpenAINameReader,
  OpenAIStillAdapter,
  PRESENTATION_ASPECT_RATIO,
  buildPromptVariableSnapshot,
  compilePrompt,
  identityTextMatches,
  type GeneratedMedia,
  type PromptProfile,
  type PromptVariableSnapshot,
  type StudioGenerator,
  type StudioNameReader,
  type StudioVerifier,
} from "@jewelo/ai";
import { parseJobsEnv } from "@jewelo/config";
import { isDuplicateObject } from "@jewelo/media";
import sharp from "sharp";
import { renderIdentityAnchor } from "./identity-anchor";

interface TaskRow {
  id: string;
  run_id: string;
  owner_principal_id: string;
  presentation_view:
    "studio" | "on_skin" | "close_up" | "dark" | "studio_hero" | "billboard";
  status: string;
  attempt: number;
  dispatch_idempotency_key: string;
  prompt_release: string;
  prompt_release_id: string;
  style_anchor_release_id: string;
  pipeline_release: string;
  aspect_ratio: "1:1" | "4:5" | "9:16" | "16:9";
  cancel_requested_at?: string;
  /** Set on the three model views: the studio still they must reproduce. */
  dependency_task_id?: string | null;
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
interface PromptReleaseRow {
  id: string;
  profile: PromptProfile;
  template: string;
}
interface PromptSnapshotRow {
  task_id: string;
  prompt_release_id: string;
  variable_snapshot: PromptVariableSnapshot;
  compiled_prompt: string;
  compiler_version: string;
  sha256: string;
}
interface StoredOutput {
  media: GeneratedMedia;
  stored: { bucket: string; path: string; checksum: string };
}

export type TransitionOutcome = "applied" | "cancelled";

/** The transition RPC raises `task cancelled`; that is a clean stop, not a failure. */
export function isTaskCancelled(error: unknown): boolean {
  return error instanceof Error && /task cancelled/i.test(error.message);
}

export interface PresentationRepository {
  load(taskId: string): Promise<{
    task: TaskRow;
    run: RunRow;
    revision: RevisionRow;
    release: PromptReleaseRow;
    snapshot?: PromptSnapshotRow;
  }>;
  materializePromptSnapshot(input: {
    task: TaskRow;
    release: PromptReleaseRow;
    variables: PromptVariableSnapshot;
    compiledPrompt: string;
    compilerVersion: string;
    sha256: string;
  }): Promise<PromptSnapshotRow>;
  loadStoredOutput(task: TaskRow): Promise<StoredOutput | undefined>;
  reserveAttempt(
    task: TaskRow,
    provider: string,
    model: string,
    attemptOverride?: number,
  ): Promise<{
    attempt: number;
    idempotencyKey: string;
    duplicateComplete: boolean;
  }>;
  transitionTask(
    taskId: string,
    from: readonly string[],
    to: string,
    patch?: Record<string, unknown>,
  ): Promise<TransitionOutcome>;
  storeProviderOutput(input: {
    task: TaskRow;
    run: RunRow;
    revision: RevisionRow;
    attempt: number;
    media: GeneratedMedia;
  }): Promise<{ bucket: string; path: string; checksum: string }>;
  /** Keeps a name-rejected still in private storage for inspection. */
  storeRejectedOutput?(input: {
    task: TaskRow;
    run: RunRow;
    revision: RevisionRow;
    attempt: number;
    media: GeneratedMedia;
  }): Promise<string>;
  complete(input: {
    task: TaskRow;
    run: RunRow;
    revision: RevisionRow;
    attempt: number;
    media: GeneratedMedia;
    stored: { bucket: string; path: string; checksum: string };
    verification: Record<string, unknown>;
    identityFingerprint: string;
    identityArtifactId: string;
    inputAssetIds?: readonly string[];
  }): Promise<TransitionOutcome | void>;
  fail(input: {
    task: TaskRow;
    run: RunRow;
    attempt: number;
    error: unknown;
    terminal: boolean;
    actualCostCents: number;
    rejectedObjectPaths?: readonly string[];
  }): Promise<void>;
  signedIdentityUrl(
    revision: RevisionRow,
    ownerId: string,
    taskId: string,
  ): Promise<{ url: string; fingerprint: string; artifactId: string }>;
  signedStyleAnchorUrl(task: TaskRow): Promise<string>;
  /** Ready still of `dependency_task_id`; undefined while it is not ready yet. */
  signedDependencyStillUrl?(
    task: TaskRow,
  ): Promise<{ url: string; assetId: string } | undefined>;
  signedInspirationUrl(
    revision: RevisionRow,
    ownerId: string,
  ): Promise<string | undefined>;
  blockPreSpend(input: {
    task: TaskRow;
    run: RunRow;
    error: unknown;
  }): Promise<void>;
}

/**
 * The three model views edit the approved studio still, so the compiled prompt
 * has to name the extra first image before the published template's own
 * "first image is the only source for the pendant" rule is read.
 */
export const DEPENDENT_REFERENCE_RULE =
  "REFERENCE: the first supplied image is the finished pendant photographed in the studio; reproduce this exact object - same letterforms, same metal, same stones, same chain - in the new scene. The second image is its black stencil (identical shape). The third image is style only.";

export async function executePresentationTask(
  taskId: string,
  repository: PresentationRepository,
  generator: StudioGenerator,
  verifier: StudioVerifier,
  nameReader?: StudioNameReader,
) {
  const {
    task,
    run,
    revision,
    release,
    snapshot: existingSnapshot,
  } = await repository.load(taskId);
  if (task.status === "ready") return { status: "deduplicated" as const };
  if (task.status === "cancelled" || task.cancel_requested_at)
    return { status: "cancelled" as const };
  if (release.id !== task.prompt_release_id)
    throw new Error("task_prompt_release_mismatch");
  let snapshot = existingSnapshot;
  if (!snapshot) {
    const variables = buildPromptVariableSnapshot({
      approvedName: revision.identity_anchor.approvedText,
      language: revision.identity_anchor.language,
      specification: revision.specification,
      presentationView: task.presentation_view,
    });
    const compiled = compilePrompt({
      profile: release.profile,
      template: release.template,
      variables,
    });
    const compiledPrompt = task.dependency_task_id
      ? `${DEPENDENT_REFERENCE_RULE} ${compiled.compiledPrompt}`
      : compiled.compiledPrompt;
    snapshot = await repository.materializePromptSnapshot({
      task,
      release,
      variables: compiled.variableSnapshot,
      compiledPrompt,
      compilerVersion: compiled.compilerVersion,
      sha256: createHash("sha256").update(compiledPrompt, "utf8").digest("hex"),
    });
  }
  if (
    snapshot.task_id !== task.id ||
    snapshot.prompt_release_id !== task.prompt_release_id ||
    createHash("sha256")
      .update(snapshot.compiled_prompt, "utf8")
      .digest("hex") !== snapshot.sha256
  )
    throw new Error("prompt_snapshot_lineage_mismatch");
  let identity: { url: string; fingerprint: string; artifactId: string };
  let styleAnchorUrl: string;
  let inspirationImageUrl: string | undefined;
  let reference: { url: string; assetId: string } | undefined;
  try {
    if (task.dependency_task_id) {
      reference = await repository.signedDependencyStillUrl?.(task);
      // A recovery dispatch can arrive before the studio still exists; wait for
      // the release instead of spending on a scene with no pendant to copy.
      if (!reference) return { status: "deferred" as const };
    }
    // Identity and exact style release existence are hard pre-spend gates.
    identity = await repository.signedIdentityUrl(
      revision,
      task.owner_principal_id,
      task.id,
    );
    styleAnchorUrl = await repository.signedStyleAnchorUrl(task);
    inspirationImageUrl = await repository.signedInspirationUrl(
      revision,
      task.owner_principal_id,
    );
  } catch (error) {
    await repository.blockPreSpend({ task, run, error });
    return { status: "operator_review" as const, attempt: task.attempt };
  }
  const checkpoint = await repository.loadStoredOutput(task);
  const provider = generator instanceof MockStudioGenerator ? "mock" : "openai";
  const model =
    generator instanceof OpenAIStillAdapter
      ? generator.model
      : "mock-openai-still-v1";
  let reservation: {
    attempt: number;
    idempotencyKey: string;
    duplicateComplete: boolean;
  };
  try {
    // Reservation itself raises `task cancelled`; that is a clean stop.
    reservation = checkpoint
      ? {
          attempt: task.attempt,
          idempotencyKey: `${task.dispatch_idempotency_key}:attempt:${task.attempt}`,
          duplicateComplete: false,
        }
      : await repository.reserveAttempt(task, provider, model);
  } catch (error) {
    if (isTaskCancelled(error)) return { status: "cancelled" as const };
    throw error;
  }
  if (reservation.duplicateComplete) return { status: "deduplicated" as const };
  const inputAssetIds = reference ? [reference.assetId] : [];
  // Undefined until an attempt actually reaches the provider, so a failure
  // before that never reconciles a sibling attempt's cost.
  let actualCostCents: number | undefined;
  // Name-rejected stills are kept in private storage so an operator can see
  // what the model actually engraved; they never become assets.
  const rejectedObjectPaths: string[] = [];
  try {
    // A studio still whose engraved name is not the approved one is regenerated
    // in place: at most two extra paid attempts, then operator review.
    for (let regeneration = 0; ; regeneration += 1) {
      const resumable = regeneration === 0 ? checkpoint : undefined;
      let media: GeneratedMedia;
      let stored: StoredOutput["stored"];
      if (resumable) {
        media = resumable.media;
        stored = resumable.stored;
        actualCostCents = media.estimatedCostCents;
      } else {
        const started = await repository.transitionTask(
          task.id,
          ["queued", "retrying", "generating"],
          "generating",
          { attempt: reservation.attempt, input_asset_ids: inputAssetIds },
        );
        if (started === "cancelled") return { status: "cancelled" as const };
        media = await generator.generate({
          idempotencyKey: reservation.idempotencyKey,
          prompt: snapshot.compiled_prompt,
          referenceImageUrl: reference?.url,
          identityImageUrl: identity.url,
          styleAnchorUrl,
          inspirationImageUrl,
          identityFingerprint: identity.fingerprint,
          aspectRatio:
            task.aspect_ratio ??
            PRESENTATION_ASPECT_RATIO[task.presentation_view],
          presentationView: task.presentation_view,
          specification: revision.specification,
        });
        actualCostCents = media.estimatedCostCents;
        stored = await repository.storeProviderOutput({
          task,
          run,
          revision,
          attempt: reservation.attempt,
          media,
        });
      }
      const verifying = await repository.transitionTask(
        task.id,
        ["generating", "verifying"],
        "verifying",
      );
      if (verifying === "cancelled") return { status: "cancelled" as const };
      const verification = await verifier.verify({
        approvedText: revision.identity_anchor.approvedText,
        identityFingerprint: identity.fingerprint,
        identityImageUrl: identity.url,
        presentationView: task.presentation_view,
        specification: revision.specification,
        media,
      });
      if (
        !verification.passed ||
        !verification.exactText ||
        !verification.exactScript ||
        !verification.exactlyTwoConnectedRings ||
        !verification.correctShot ||
        !verification.noAddedIdentityElements
      )
        throw new Error("identity_verification_failed");
      const record = verification as unknown as Record<string, unknown>;
      if (nameReader && task.presentation_view === "studio") {
        const expected = revision.identity_anchor.approvedText;
        const reading = await nameReader.read(media, expected);
        const readText = reading.text;
        const passed =
          reading.matches || identityTextMatches(readText, expected);
        record.nameCheck = { passed, readText, expected };
        if (!passed) {
          const terminal = regeneration >= 2 || reservation.attempt >= 3;
          if (repository.storeRejectedOutput)
            rejectedObjectPaths.push(
              await repository.storeRejectedOutput({
                task,
                run,
                revision,
                attempt: reservation.attempt,
                media,
              }),
            );
          await repository.fail({
            task,
            run,
            attempt: reservation.attempt,
            error: new Error(`name_mismatch:${readText}`),
            terminal,
            actualCostCents: actualCostCents ?? 0,
            rejectedObjectPaths,
          });
          if (terminal)
            return {
              status: "operator_review" as const,
              attempt: reservation.attempt,
            };
          reservation = await repository.reserveAttempt(
            task,
            provider,
            model,
            reservation.attempt + 1,
          );
          actualCostCents = undefined;
          continue;
        }
      }
      if (rejectedObjectPaths.length)
        record.rejectedObjectPaths = [...rejectedObjectPaths];
      const completed = await repository.complete({
        task,
        run,
        revision,
        attempt: reservation.attempt,
        media,
        stored,
        verification: record,
        identityFingerprint: identity.fingerprint,
        identityArtifactId: identity.artifactId,
        inputAssetIds,
      });
      if (completed === "cancelled") return { status: "cancelled" as const };
      return { status: "ready" as const, attempt: reservation.attempt };
    }
  } catch (error) {
    if (isTaskCancelled(error)) return { status: "cancelled" as const };
    const terminal = reservation.attempt >= 3;
    await repository.fail({
      task,
      run,
      attempt: reservation.attempt,
      error,
      terminal,
      actualCostCents: actualCostCents ?? 0,
      rejectedObjectPaths,
    });
    if (!terminal) throw error;
    return { status: "operator_review" as const, attempt: reservation.attempt };
  }
}

export class SupabasePresentationRepository implements PresentationRepository {
  constructor(
    private readonly url: string,
    private readonly key: string,
    private readonly allowMockAnchors = false,
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
    const body = await response.text();
    return (body ? JSON.parse(body) : undefined) as T;
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
    const releases = await this.#request<PromptReleaseRow[]>(
      `/rest/v1/prompt_releases?id=eq.${task.prompt_release_id}`,
    );
    const release = releases[0];
    if (!release) throw new Error("prompt_release_not_found");
    const snapshots = await this.#request<PromptSnapshotRow[]>(
      `/rest/v1/generation_prompt_snapshots?task_id=eq.${task.id}`,
    );
    return { task, run, revision, release, snapshot: snapshots[0] };
  }
  async materializePromptSnapshot(input: {
    task: TaskRow;
    release: PromptReleaseRow;
    variables: PromptVariableSnapshot;
    compiledPrompt: string;
    compilerVersion: string;
    sha256: string;
  }) {
    return this.#request<PromptSnapshotRow>(
      "/rest/v1/rpc/materialize_prompt_snapshot",
      {
        method: "POST",
        body: JSON.stringify({
          p_task_id: input.task.id,
          p_prompt_release_id: input.release.id,
          p_variable_snapshot: input.variables,
          p_compiled_prompt: input.compiledPrompt,
          p_compiler_version: input.compilerVersion,
          p_sha256: input.sha256,
        }),
      },
    );
  }
  async reserveAttempt(
    task: TaskRow,
    provider: string,
    model: string,
    attemptOverride?: number,
  ) {
    const attempt = attemptOverride ?? task.attempt + 1;
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
  async loadStoredOutput(task: TaskRow): Promise<StoredOutput | undefined> {
    if (task.attempt < 1) return undefined;
    const checkpoints = await this.#request<
      Array<{
        bucket_id: string;
        object_path: string;
        mime_type: string;
        checksum_sha256: string;
        provider_request_id?: string;
      }>
    >(
      `/rest/v1/provider_output_checkpoints?task_id=eq.${task.id}&attempt=eq.${task.attempt}`,
    );
    const checkpoint = checkpoints[0];
    if (!checkpoint) return undefined;
    const attempts = await this.#request<
      Array<{
        provider: "mock" | "openai" | "fal";
        model: string;
        provider_request_id?: string;
        estimated_cost_cents: number;
      }>
    >(
      `/rest/v1/provider_attempts?task_id=eq.${task.id}&attempt=eq.${task.attempt}`,
    );
    const attempt = attempts[0];
    if (!attempt) throw new Error("provider_attempt_checkpoint_missing");
    const signedUrl = await this.signedStorageUrl(
      checkpoint.bucket_id,
      checkpoint.object_path,
    );
    const response = await fetch(signedUrl);
    if (!response.ok)
      throw new Error(
        `stored_provider_output_download_failed:${response.status}`,
      );
    return {
      media: {
        provider: attempt.provider,
        model: attempt.model,
        requestId:
          checkpoint.provider_request_id ??
          attempt.provider_request_id ??
          `recovered:${task.id}:${task.attempt}`,
        bytes: new Uint8Array(await response.arrayBuffer()),
        mimeType: checkpoint.mime_type,
        estimatedCostCents: attempt.estimated_cost_cents,
      },
      stored: {
        bucket: checkpoint.bucket_id,
        path: checkpoint.object_path,
        checksum: checkpoint.checksum_sha256,
      },
    };
  }
  async transitionTask(
    taskId: string,
    from: readonly string[],
    to: string,
    patch: Record<string, unknown> = {},
  ): Promise<TransitionOutcome> {
    try {
      await this.#request("/rest/v1/rpc/transition_generation_task", {
        method: "POST",
        body: JSON.stringify({
          p_task_id: taskId,
          p_from: from,
          p_to: to,
          p_patch: patch,
        }),
      });
      return "applied";
    } catch (error) {
      if (isTaskCancelled(error)) return "cancelled";
      throw error;
    }
  }
  async signedIdentityUrl(
    revision: RevisionRow,
    ownerId: string,
    taskId: string,
  ) {
    const rendered = await renderIdentityAnchor(
      {
        approvedText: revision.identity_anchor.approvedText,
        language: revision.identity_anchor.language,
        typography: revision.identity_anchor.typography,
        fingerprint: revision.identity_anchor.fingerprint,
      },
      revision.specification,
      "caleums-final-media-v1",
    );
    const basePath = `principal/${ownerId}/revision/${revision.id}/identity-${rendered.fingerprint}`;
    const bodies: Array<[string, Buffer, string]> = [
      ["png", rendered.png, "image/png"],
    ];
    if (rendered.svg) bodies.unshift(["svg", rendered.svg, "image/svg+xml"]);
    for (const [extension, body, contentType] of bodies) {
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
      const uploadDetail = await upload.text();
      if (!upload.ok && !isDuplicateObject(upload, uploadDetail))
        throw new Error(`identity anchor upload failed:${upload.status}`);
    }
    // Four sibling tasks race to insert the same artifact; a loser can hit the
    // (bucket_id, object_path) unique key instead of the on_conflict target.
    try {
      await this.#request(
        "/rest/v1/identity_artifacts?on_conflict=revision_id,fingerprint",
        {
          method: "POST",
          headers: { prefer: "resolution=ignore-duplicates,return=minimal" },
          body: JSON.stringify({
            revision_id: revision.id,
            owner_principal_id: ownerId,
            engine_release: String(rendered.report.engineRelease),
            font_release: String(
              rendered.report.fontSha256 ?? "existing-latin",
            ),
            approved_text: revision.identity_anchor.approvedText,
            script: revision.identity_anchor.language,
            fingerprint: rendered.fingerprint,
            bucket_id: "identity-anchors",
            object_path: `${basePath}.png`,
            png_sha256: rendered.pngSha256,
            validation_report: rendered.report,
          }),
        },
      );
    } catch (error) {
      if (!String(error).includes("23505")) throw error;
    }
    const artifacts = await this.#request<Array<{ id: string }>>(
      `/rest/v1/identity_artifacts?revision_id=eq.${revision.id}&fingerprint=eq.${rendered.fingerprint}&select=id`,
    );
    const artifactId = artifacts[0]?.id;
    if (!artifactId) throw new Error("identity_artifact_lineage_missing");
    await this.#request(`/rest/v1/generation_tasks?id=eq.${taskId}`, {
      method: "PATCH",
      body: JSON.stringify({ identity_artifact_id: artifactId }),
    });
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
    const url = signed.startsWith("http")
      ? signed
      : `${this.url}/storage/v1${signed}`;
    return { url, fingerprint: rendered.fingerprint, artifactId };
  }
  async signedStyleAnchorUrl(task: TaskRow) {
    if (!task.style_anchor_release_id)
      throw new Error(`style_anchor_missing:${task.presentation_view}`);
    const releases = await this.#request<
      Array<{
        id: string;
        source_task_id: string;
        bucket_id?: string;
        object_path?: string;
        checksum_sha256?: string;
        status: string;
      }>
    >(`/rest/v1/style_anchor_releases?id=eq.${task.style_anchor_release_id}`);
    const release = releases[0];
    if (
      !release ||
      release.status !== "published" ||
      !release.bucket_id ||
      !release.object_path ||
      !release.checksum_sha256
    ) {
      if (this.allowMockAnchors)
        return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
      throw new Error(
        `style_anchor_missing:${release?.source_task_id ?? task.presentation_view}`,
      );
    }
    const signed = await this.signedStorageUrl(
      release.bucket_id,
      release.object_path,
    );
    // Every anchor carries a different customer's name; the low-pass keeps its
    // light, palette and mood while destroying the letterforms the model kept
    // copying into the pendant.
    const response = await fetch(signed);
    if (!response.ok)
      throw new Error(`style_anchor_unreadable:${release.source_task_id}`);
    const lowPassed = await sharp(Buffer.from(await response.arrayBuffer()))
      .resize(512, null, { fit: "inside" })
      .blur(8)
      .resize(1024, null, { fit: "inside" })
      .png()
      .toBuffer();
    return `data:image/png;base64,${lowPassed.toString("base64")}`;
  }
  async signedDependencyStillUrl(task: TaskRow) {
    if (!task.dependency_task_id) return undefined;
    const assets = await this.#request<
      Array<{ id: string; bucket_id: string; object_path: string }>
    >(
      `/rest/v1/assets?task_id=eq.${task.dependency_task_id}&provider=in.(openai,mock)&select=id,bucket_id,object_path&order=created_at.desc&limit=1`,
    );
    const asset = assets[0];
    if (!asset) return undefined;
    return {
      url: await this.signedStorageUrl(asset.bucket_id, asset.object_path),
      assetId: asset.id,
    };
  }
  async signedInspirationUrl(revision: RevisionRow, ownerId: string) {
    const reference = revision.specification.referenceAsset;
    if (!reference || typeof reference !== "object") return undefined;
    const id = String((reference as Record<string, unknown>).id ?? "");
    const fileName = String(
      (reference as Record<string, unknown>).fileName ?? "reference",
    ).replaceAll(/[^a-zA-Z0-9._-]/g, "_");
    if (!id) throw new Error("inspiration_reference_missing");
    return this.signedStorageUrl(
      "references",
      `principal/${ownerId}/${id}/${fileName}`,
    ).catch(() => {
      throw new Error(`inspiration_reference_missing:${id}`);
    });
  }
  async signedStorageUrl(bucket: string, path: string) {
    const result = await this.#request<{
      signedURL?: string;
      signedUrl?: string;
    }>(`/storage/v1/object/sign/${bucket}/${path}`, {
      method: "POST",
      body: JSON.stringify({ expiresIn: 300 }),
    });
    const signed = result.signedURL ?? result.signedUrl;
    if (!signed) throw new Error("signed_storage_url_missing");
    return signed.startsWith("http")
      ? signed
      : `${this.url}/storage/v1${signed}`;
  }
  async blockPreSpend(input: { task: TaskRow; run: RunRow; error: unknown }) {
    const message =
      input.error instanceof Error
        ? input.error.message
        : "pre_spend_gate_failed";
    await this.#request("/rest/v1/rpc/mark_task_pre_spend_blocked", {
      method: "POST",
      body: JSON.stringify({
        p_task_id: input.task.id,
        p_reason: message.slice(0, 300),
      }),
    });
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
    const path = `principal/${input.task.owner_principal_id}/design/${input.run.design_id}/revision/${input.revision.id}/run/${input.run.id}/${input.task.presentation_view}/attempt-${input.attempt}-${checksum.slice(0, 12)}.png`;
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
    const uploadBody = await response.text();
    if (!response.ok && !isDuplicateObject(response, uploadBody))
      throw new Error(`asset upload failed:${response.status}`);
    await this.#request(
      "/rest/v1/provider_output_checkpoints?on_conflict=task_id,attempt",
      {
        method: "POST",
        headers: { prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify({
          task_id: input.task.id,
          attempt: input.attempt,
          owner_principal_id: input.task.owner_principal_id,
          bucket_id: "generated-assets",
          object_path: path,
          mime_type: input.media.mimeType,
          byte_size: input.media.bytes.byteLength,
          checksum_sha256: checksum,
          provider_request_id: input.media.requestId,
        }),
      },
    );
    const checkpoints = await this.#request<
      Array<{ object_path: string; checksum_sha256: string }>
    >(
      `/rest/v1/provider_output_checkpoints?task_id=eq.${input.task.id}&attempt=eq.${input.attempt}&select=object_path,checksum_sha256`,
    );
    if (
      checkpoints[0]?.object_path !== path ||
      checkpoints[0]?.checksum_sha256 !== checksum
    )
      throw new Error("provider_output_checkpoint_conflict");
    return { bucket: "generated-assets", path, checksum };
  }
  async storeRejectedOutput(input: {
    task: TaskRow;
    run: RunRow;
    revision: RevisionRow;
    attempt: number;
    media: GeneratedMedia;
  }) {
    const checksum = createHash("sha256")
      .update(input.media.bytes)
      .digest("hex");
    const path = `principal/${input.task.owner_principal_id}/design/${input.run.design_id}/revision/${input.revision.id}/run/${input.run.id}/${input.task.presentation_view}/rejected-attempt-${input.attempt}-${checksum.slice(0, 12)}.png`;
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
    const uploadBody = await response.text();
    if (!response.ok && !isDuplicateObject(response, uploadBody))
      throw new Error(`rejected asset upload failed:${response.status}`);
    return path;
  }
  async complete(input: {
    task: TaskRow;
    run: RunRow;
    revision: RevisionRow;
    attempt: number;
    media: GeneratedMedia;
    stored: { bucket: string; path: string; checksum: string };
    verification: Record<string, unknown>;
    identityFingerprint: string;
    identityArtifactId: string;
    inputAssetIds?: readonly string[];
  }): Promise<TransitionOutcome> {
    // Claim `ready` first: a task cancelled mid-verification must not gain an
    // asset, a motion request, or a `task.ready` audit event.
    const ready = await this.transitionTask(
      input.task.id,
      ["generating", "verifying"],
      "ready",
    );
    if (ready === "cancelled") return "cancelled";
    await this.#request("/rest/v1/assets", {
      method: "POST",
      headers: { prefer: "resolution=ignore-duplicates" },
      body: JSON.stringify({
        design_id: input.run.design_id,
        revision_id: input.revision.id,
        run_id: input.run.id,
        task_id: input.task.id,
        owner_principal_id: input.task.owner_principal_id,
        presentation_view: input.task.presentation_view,
        bucket_id: input.stored.bucket,
        object_path: input.stored.path,
        mime_type: input.media.mimeType,
        byte_size: input.media.bytes.byteLength,
        checksum_sha256: input.stored.checksum,
        provider: input.media.provider,
        model: input.media.model,
        prompt_release: input.task.prompt_release,
        prompt_release_id: input.task.prompt_release_id,
        identity_fingerprint: input.identityFingerprint,
        identity_artifact_id: input.identityArtifactId,
        attempt: input.attempt,
        verification_result: input.verification,
        pipeline_release: input.task.pipeline_release,
        style_anchor_release_id: input.task.style_anchor_release_id,
        input_asset_ids: input.inputAssetIds ?? [],
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
    let motionPreview = "not_applicable";
    if (input.task.presentation_view === "studio") {
      // The three model views only become dispatchable once this still exists.
      await this.#request("/rest/v1/rpc/release_dependent_tasks", {
        method: "POST",
        body: JSON.stringify({ p_source_task_id: input.task.id }),
      });
      try {
        await this.#request("/rest/v1/rpc/request_video_task", {
          method: "POST",
          body: JSON.stringify({
            p_run_id: input.run.id,
            p_kind: "preview",
            p_source_task_id: input.task.id,
            p_request_key: `auto-preview:${input.run.id}:${input.task.id}`,
          }),
        });
        motionPreview = "requested";
      } catch (error) {
        motionPreview = "operator_review";
        const reason = String(
          error instanceof Error ? error.message : "unknown",
        ).slice(0, 120);
        await this.#request("/rest/v1/audit_events", {
          method: "POST",
          body: JSON.stringify({
            design_id: input.run.design_id,
            principal_id: input.task.owner_principal_id,
            actor_type: "job",
            action: "video.auto_request_failed",
            detail: { sourceTaskId: input.task.id, reason },
          }),
        });
        // The still stays ready; only the run carries the visible motion failure.
        await this.#request(`/rest/v1/generation_runs?id=eq.${input.run.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            operator_review_reason: `video_request_failed:${reason}`.slice(
              0,
              300,
            ),
          }),
        });
      }
    }
    await this.#request("/rest/v1/audit_events", {
      method: "POST",
      body: JSON.stringify({
        design_id: input.run.design_id,
        principal_id: input.task.owner_principal_id,
        actor_type: "job",
        action: "task.ready",
        detail: {
          taskId: input.task.id,
          attempt: input.attempt,
          motionPreview,
        },
      }),
    });
    return "applied";
  }
  async fail(input: {
    task: TaskRow;
    run: RunRow;
    attempt: number;
    error: unknown;
    terminal: boolean;
    actualCostCents: number;
    rejectedObjectPaths?: readonly string[];
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
    await this.transitionTask(
      input.task.id,
      ["queued", "generating", "verifying", "retrying"],
      input.terminal ? "blocked" : "retrying",
      input.terminal ? { terminal_error_code: message.slice(0, 120) } : {},
    );
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
          ...(input.rejectedObjectPaths?.length
            ? { rejectedObjectPaths: input.rejectedObjectPaths }
            : {}),
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
    config.PROVIDER_MODE === "mock",
  );
  if (config.PROVIDER_MODE === "mock")
    return {
      repository,
      generator: new MockStudioGenerator(),
      verifier: new MockStudioVerifier(),
      nameReader: undefined as StudioNameReader | undefined,
    };
  return {
    repository,
    generator: new OpenAIStillAdapter(
      config.OPENAI_API_KEY!,
      config.OPENAI_IMAGE_MODEL,
      config.OPENAI_STILL_ESTIMATED_COST_CENTS,
    ),
    // Verifier removed 2026-08-27: the OpenAI vision check passed wrong names.
    verifier: new MockStudioVerifier(),
    // Narrow replacement: transcribe the engraved name and regenerate on drift.
    nameReader: new OpenAINameReader(
      config.OPENAI_API_KEY!,
      config.OPENAI_VERIFIER_MODEL,
    ) as StudioNameReader | undefined,
  };
}
