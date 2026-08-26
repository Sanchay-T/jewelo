import { createHash } from "node:crypto";
import {
  FalSeedanceVideoAdapter,
  buildPromptVariableSnapshot,
  compilePrompt,
  type MotionSubmission,
  type PromptProfile,
} from "@jewelo/ai";
import { parseJobsEnv } from "@jewelo/config";

type Row = Record<string, unknown>;

export async function submitVideoTask(
  taskId: string,
  environment: Record<string, string | undefined> = process.env,
  fetcher: typeof fetch = fetch,
) {
  const config = parseJobsEnv(environment);
  const api = supabase(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY,
    fetcher,
  );
  const context = await loadVideoContext(api, taskId);
  if (context.task.status === "ready")
    return { status: "deduplicated" as const };
  if (context.task.status === "cancelled" || context.task.cancel_requested_at)
    return { status: "cancelled" as const };
  const prompt = await materializePrompt(api, context);
  const reservation = await api.rpc<
    Array<{ attempt_number: number; duplicate_complete: boolean }>
  >("reserve_provider_attempt", {
    p_task_id: taskId,
    p_provider: config.PROVIDER_MODE === "mock" ? "mock" : "fal",
    p_model: context.task.model_release,
    p_provider_key: `${context.task.dispatch_idempotency_key}:attempt:${Number(context.task.attempt) + 1}`,
  });
  const attempt = Number(reservation[0]?.attempt_number ?? 1);
  if (reservation[0]?.duplicate_complete)
    return { status: "deduplicated" as const };
  const sourceUrl = await api.sign(
    String(context.sourceAsset.bucket_id),
    String(context.sourceAsset.object_path),
  );
  if (config.PROVIDER_MODE === "mock") {
    await completeVideo(
      api,
      context,
      attempt,
      {
        provider: "mock",
        model: "mock-seedance-v1",
        requestId: `mock:${context.task.dispatch_idempotency_key}:${attempt}`,
        bytes: new Uint8Array(Buffer.from("mock-caleums-video")),
        estimatedCostCents: 0,
      },
      fetcher,
    );
    return { status: "ready" as const, attempt };
  }
  const adapter = new FalSeedanceVideoAdapter(
    config.FAL_KEY!,
    "bytedance/seedance-2.0/fast/image-to-video",
    "bytedance/seedance-2.0/image-to-video",
    config.FAL_VIDEO_ESTIMATED_COST_CENTS,
    fetcher,
  );
  const submission = await adapter.submit({
    idempotencyKey: `${context.task.dispatch_idempotency_key}:attempt:${attempt}`,
    prompt,
    verifiedStillUrl: sourceUrl,
    kind: context.task.task_profile === "video.final" ? "final" : "preview",
  });
  await api.patch(
    "provider_attempts",
    `task_id=eq.${taskId}&attempt=eq.${attempt}`,
    {
      status: "submitted",
      provider_request_id: submission.requestId,
    },
  );
  await api.patch("generation_tasks", `id=eq.${taskId}`, {
    status: "generating",
    provider_status_url: submission.statusUrl,
    provider_response_url: submission.responseUrl,
  });
  return { status: "submitted" as const, attempt, submission };
}

export async function pollVideoTask(
  taskId: string,
  environment: Record<string, string | undefined> = process.env,
  fetcher: typeof fetch = fetch,
) {
  const config = parseJobsEnv(environment);
  const api = supabase(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY,
    fetcher,
  );
  const context = await loadVideoContext(api, taskId);
  if (context.task.status === "ready") return { status: "ready" as const };
  if (!context.task.provider_status_url || !context.task.provider_response_url)
    throw new Error("video_poll_lineage_missing");
  const attempts = await api.get<Row[]>(
    `provider_attempts?task_id=eq.${taskId}&attempt=eq.${context.task.attempt}`,
  );
  const attempt = attempts[0];
  if (!attempt?.provider_request_id)
    throw new Error("video_provider_request_missing");
  const submission: MotionSubmission = {
    provider: "fal",
    model: String(attempt.model),
    requestId: String(attempt.provider_request_id),
    statusUrl: String(context.task.provider_status_url),
    responseUrl: String(context.task.provider_response_url),
    estimatedCostCents: Number(attempt.estimated_cost_cents),
  };
  const adapter = new FalSeedanceVideoAdapter(
    config.FAL_KEY!,
    "bytedance/seedance-2.0/fast/image-to-video",
    "bytedance/seedance-2.0/image-to-video",
    config.FAL_VIDEO_ESTIMATED_COST_CENTS,
    fetcher,
  );
  const result = await adapter.poll(submission);
  if (result.state === "pending") return { status: "pending" as const };
  if (result.state === "failed") {
    const terminal = Number(context.task.attempt) >= 3;
    await api.rpc("reconcile_provider_attempt", {
      p_task_id: taskId,
      p_attempt: context.task.attempt,
      p_status: "failed",
      p_actual_cost_cents: 0,
      p_error_class: result.error,
      p_terminal: terminal,
    });
    await api.patch("generation_tasks", `id=eq.${taskId}`, {
      status: terminal ? "blocked" : "retrying",
      terminal_error_code: terminal ? result.error.slice(0, 120) : null,
      provider_status_url: null,
      provider_response_url: null,
    });
    if (!terminal)
      await api.post(
        "outbox_events",
        {
          aggregate_type: "task",
          aggregate_id: taskId,
          event_type: "video.retry_requested",
          payload: { taskId, taskKind: "video" },
          dispatch_idempotency_key: `video-retry:${taskId}:${context.task.attempt}`,
        },
        "resolution=ignore-duplicates",
      );
    return {
      status: terminal ? ("operator_review" as const) : ("retrying" as const),
    };
  }
  const mediaResponse = await fetcher(result.temporaryOutputUrl);
  if (!mediaResponse.ok)
    throw new Error(`fal video download failed:${mediaResponse.status}`);
  await completeVideo(
    api,
    context,
    Number(context.task.attempt),
    {
      provider: "fal",
      model: submission.model,
      requestId: submission.requestId,
      bytes: new Uint8Array(await mediaResponse.arrayBuffer()),
      estimatedCostCents: submission.estimatedCostCents,
    },
    fetcher,
  );
  return { status: "ready" as const };
}

function supabase(url: string, key: string, fetcher: typeof fetch) {
  async function request<T>(path: string, init: RequestInit = {}) {
    const response = await fetcher(`${url}/rest/v1/${path}`, {
      ...init,
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        ...init.headers,
      },
    });
    if (!response.ok)
      throw new Error(`Supabase video request failed:${response.status}`);
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }
  return {
    get: <T>(path: string) => request<T>(path),
    rpc: <T = unknown>(name: string, body: Record<string, unknown>) =>
      request<T>(`rpc/${name}`, { method: "POST", body: JSON.stringify(body) }),
    patch: (table: string, filter: string, body: Record<string, unknown>) =>
      request(`${table}?${filter}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    post: (table: string, body: Record<string, unknown>, prefer?: string) =>
      request(table, {
        method: "POST",
        headers: prefer ? { prefer } : undefined,
        body: JSON.stringify(body),
      }),
    async sign(bucket: string, path: string) {
      const response = await fetcher(
        `${url}/storage/v1/object/sign/${bucket}/${path}`,
        {
          method: "POST",
          headers: {
            apikey: key,
            authorization: `Bearer ${key}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ expiresIn: 300 }),
        },
      );
      if (!response.ok)
        throw new Error(`Video source signing failed:${response.status}`);
      const result = (await response.json()) as {
        signedURL?: string;
        signedUrl?: string;
      };
      const signed = result.signedURL ?? result.signedUrl;
      if (!signed) throw new Error("Video source signing omitted URL");
      return signed.startsWith("http") ? signed : `${url}/storage/v1${signed}`;
    },
    url,
    key,
  };
}

async function loadVideoContext(
  api: ReturnType<typeof supabase>,
  taskId: string,
) {
  const tasks = await api.get<Row[]>(`generation_tasks?id=eq.${taskId}`);
  const task = tasks[0];
  if (
    !task ||
    !["video.preview", "video.final"].includes(String(task.task_profile))
  )
    throw new Error("video_task_not_found");
  const runs = await api.get<Row[]>(`generation_runs?id=eq.${task.run_id}`);
  const run = runs[0];
  const revisions = await api.get<Row[]>(
    `design_revisions?id=eq.${run?.revision_id}`,
  );
  const revision = revisions[0];
  const releases = await api.get<Row[]>(
    `prompt_releases?id=eq.${task.prompt_release_id}`,
  );
  const sourceAssets = await api.get<Row[]>(
    `assets?id=eq.${(task.input_asset_ids as string[] | undefined)?.[0] ?? "missing"}`,
  );
  if (!run || !revision || !releases[0] || !sourceAssets[0])
    throw new Error("video_task_lineage_missing");
  return {
    task,
    run,
    revision,
    release: releases[0],
    sourceAsset: sourceAssets[0],
  };
}

async function materializePrompt(
  api: ReturnType<typeof supabase>,
  context: Awaited<ReturnType<typeof loadVideoContext>>,
) {
  const snapshots = await api.get<Row[]>(
    `generation_prompt_snapshots?task_id=eq.${context.task.id}`,
  );
  if (snapshots[0]) return String(snapshots[0].compiled_prompt);
  const anchor = context.revision.identity_anchor as Record<string, unknown>;
  const variables = buildPromptVariableSnapshot({
    approvedName: anchor.approvedText,
    language: anchor.language,
    specification: context.revision.specification as Record<string, unknown>,
    presentationView: context.task.presentation_view,
  });
  const compiled = compilePrompt({
    profile: context.release.profile as PromptProfile,
    template: String(context.release.template),
    variables,
  });
  const snapshot = await api.rpc<Row>("materialize_prompt_snapshot", {
    p_task_id: context.task.id,
    p_prompt_release_id: context.task.prompt_release_id,
    p_variable_snapshot: compiled.variableSnapshot,
    p_compiled_prompt: compiled.compiledPrompt,
    p_compiler_version: compiled.compilerVersion,
    p_sha256: compiled.sha256,
  });
  return String(snapshot.compiled_prompt);
}

async function completeVideo(
  api: ReturnType<typeof supabase>,
  context: Awaited<ReturnType<typeof loadVideoContext>>,
  attempt: number,
  media: {
    provider: string;
    model: string;
    requestId: string;
    bytes: Uint8Array;
    estimatedCostCents: number;
  },
  fetcher: typeof fetch,
) {
  const checksum = createHash("sha256").update(media.bytes).digest("hex");
  const path = `principal/${context.task.owner_principal_id}/design/${context.run.design_id}/revision/${context.revision.id}/run/${context.run.id}/${context.task.presentation_view}/attempt-${attempt}-${checksum.slice(0, 12)}.mp4`;
  const upload = await fetcher(
    `${api.url}/storage/v1/object/generated-assets/${path}`,
    {
      method: "POST",
      headers: {
        apikey: api.key,
        authorization: `Bearer ${api.key}`,
        "content-type": "video/mp4",
        "x-upsert": "false",
      },
      body: Buffer.from(media.bytes),
    },
  );
  if (!upload.ok && upload.status !== 409)
    throw new Error(`video upload failed:${upload.status}`);
  await api.post(
    "assets",
    {
      design_id: context.run.design_id,
      revision_id: context.revision.id,
      run_id: context.run.id,
      task_id: context.task.id,
      owner_principal_id: context.task.owner_principal_id,
      presentation_view: context.task.presentation_view,
      bucket_id: "generated-assets",
      object_path: path,
      mime_type: "video/mp4",
      byte_size: media.bytes.byteLength,
      checksum_sha256: checksum,
      provider: media.provider,
      model: media.model,
      prompt_release: context.task.prompt_release,
      prompt_release_id: context.task.prompt_release_id,
      identity_fingerprint: (context.revision.identity_anchor as Row)
        .fingerprint,
      input_asset_ids: context.task.input_asset_ids,
      attempt,
      verification_result: {
        status: "passed",
        passed: true,
        sourceStillVerified: true,
        generateAudio: false,
      },
      pipeline_release: context.task.pipeline_release,
    },
    "resolution=ignore-duplicates",
  );
  await api.rpc("reconcile_provider_attempt", {
    p_task_id: context.task.id,
    p_attempt: attempt,
    p_status: "succeeded",
    p_actual_cost_cents: media.estimatedCostCents,
    p_terminal: true,
  });
  await api.patch("generation_tasks", `id=eq.${context.task.id}`, {
    status: "ready",
    provider_status_url: null,
    provider_response_url: null,
  });
}
