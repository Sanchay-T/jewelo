"use client";
/* eslint-disable @next/next/no-img-element */

import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Film,
  Image as ImageIcon,
  RefreshCw,
  Sparkles,
  UploadCloud,
  Wand2,
} from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";
import { AdminNav } from "../../../components/admin/AdminNav";
import { PasswordGate, useAdminPassword } from "../../../components/admin/PasswordGate";
import { renderTextToCanvas } from "../../../lib/canvasTextRenderer";

type PromptEnvironment = "dev" | "staging" | "production";

type PlaygroundDraft = {
  name: string;
  language: string;
  font: string;
  size: string;
  karat: string;
  style: string;
  metalType: string;
  jewelryType: string;
  styleFamily: string;
  complexity: number;
  gemstones: string[];
  notes: string;
  occasion: string;
  lengthMm: number;
};

type UploadedReference = {
  storageId: Id<"_storage">;
  url: string;
  fileName: string;
};

const DEFAULT_DRAFT: PlaygroundDraft = {
  name: "Layla",
  language: "en",
  font: "script",
  size: "large",
  karat: "21K",
  style: "gold_only",
  metalType: "yellow",
  jewelryType: "name_pendant",
  styleFamily: "minimalist",
  complexity: 5,
  gemstones: [],
  notes: "Prioritize readable lettering and elegant chain balance.",
  occasion: "birthday gift",
  lengthMm: 30,
};

const REFERENCE_DRAFT: PlaygroundDraft = {
  ...DEFAULT_DRAFT,
  name: "Aaliyah",
  style: "gold_with_diamonds",
  styleFamily: "floral",
  complexity: 7,
  gemstones: ["diamond"],
  notes: "Use the uploaded reference as the style anchor and keep the lettering premium.",
};

type ValidatedRelease = NonNullable<
  ReturnType<typeof useQuery<typeof api.prompts.listValidatedReleases>>
>[number];
type Activation = NonNullable<
  ReturnType<typeof useQuery<typeof api.prompts.listEnvironmentActivations>>
>[number];
type RecentRun = NonNullable<
  ReturnType<typeof useQuery<typeof api.playground.listRuns>>
>[number];

const EMPTY_ACTIVATIONS: Activation[] = [];
const EMPTY_RELEASES: ValidatedRelease[] = [];
const EMPTY_RECENT_RUNS: RecentRun[] = [];

function serializeGemstones(gemstones: string[]) {
  return gemstones.join(", ");
}

function parseGemstones(raw: string) {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function ArtifactGrid({
  title,
  items,
  statuses,
  onOpen,
}: {
  title: string;
  items: Array<string | null> | undefined;
  statuses?: string[];
  onOpen: (url: string) => void;
}) {
  const readyCount = (items ?? []).filter(Boolean).length;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium text-white">{title}</h2>
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{readyCount}/4 ready</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => {
          const url = items?.[index] ?? null;
          const status = statuses?.[index] ?? (url ? "completed" : "pending");

          return (
            <article
              key={`${title}-${index}`}
              className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-white">Variation {index + 1}</p>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${
                    status === "completed"
                      ? "bg-emerald-500/10 text-emerald-200"
                      : status === "generating"
                        ? "bg-amber-500/10 text-amber-200"
                        : status === "failed"
                          ? "bg-red-500/10 text-red-200"
                          : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {status}
                </span>
              </div>

              {url ? (
                <button
                  type="button"
                  onClick={() => onOpen(url)}
                  className="block aspect-square w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
                >
                  {title === "Videos" ? (
                    <video
                      src={url}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img src={url} alt={`${title} ${index + 1}`} className="h-full w-full object-cover" />
                  )}
                </button>
              ) : (
                <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900 text-xs text-zinc-500">
                  No artifact yet
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PlaygroundView() {
  const password = useAdminPassword();
  const router = useRouter();
  const searchParams = useSearchParams();
  const designId = searchParams.get("designId") as Id<"designs"> | null;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hydratedRunRef = useRef<string | null>(null);

  const createRun = useMutation(api.playground.createRun);
  const runPlayground = useMutation(api.playground.run);
  const previewDraft = useAction(api.playgroundPreview.previewDraft);
  const previewSavedRun = useAction(api.playgroundPreview.previewRun);
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const saveReference = useMutation(api.uploads.saveReference);

  const activations = useQuery(api.prompts.listEnvironmentActivations) ?? EMPTY_ACTIVATIONS;
  const validatedReleases = useQuery(api.prompts.listValidatedReleases) ?? EMPTY_RELEASES;
  const recentRuns = useQuery(api.playground.listRuns, { limit: 12 }) ?? EMPTY_RECENT_RUNS;
  const run = useQuery(api.playground.getRun, designId ? { designId } : "skip");

  const [draft, setDraft] = useState<PlaygroundDraft>(DEFAULT_DRAFT);
  const [gemstoneInput, setGemstoneInput] = useState(serializeGemstones(DEFAULT_DRAFT.gemstones));
  const [reference, setReference] = useState<UploadedReference | null>(null);
  const [environment, setEnvironment] = useState<PromptEnvironment>("production");
  const [selectedReleaseId, setSelectedReleaseId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [previewResult, setPreviewResult] = useState<Awaited<ReturnType<typeof previewDraft>> | null>(null);
  const [previewVariation, setPreviewVariation] = useState(0);
  const [lightbox, setLightbox] = useState<{ type: "image" | "video"; url: string } | null>(null);

  const activeActivation = useMemo(
    () => activations.find((item: Activation) => item.environment === environment) ?? null,
    [activations, environment]
  );

  const activeRelease = useMemo(
    () =>
      validatedReleases.find(
        (item: ValidatedRelease) =>
          item.slug === activeActivation?.releaseSlug
          && item.version === activeActivation.releaseVersion
      ) ?? null,
    [activeActivation, validatedReleases]
  );

  const selectedRelease = useMemo(
    () =>
      validatedReleases.find((item: ValidatedRelease) => String(item._id) === selectedReleaseId) ?? null,
    [selectedReleaseId, validatedReleases]
  );

  useEffect(() => {
    if (!run || hydratedRunRef.current === String(run._id)) {
      return;
    }

    hydratedRunRef.current = String(run._id);
    setDraft({
      name: run.name,
      language: run.language,
      font: run.font,
      size: run.size,
      karat: run.karat,
      style: run.style,
      metalType: run.metalType || "yellow",
      jewelryType: run.jewelryType || "name_pendant",
      styleFamily: run.styleFamily || run.designStyle || "minimalist",
      complexity: run.complexity || 5,
      gemstones: run.gemstones || [],
      notes: run.additionalInfo?.notes || "",
      occasion: run.additionalInfo?.occasion || "",
      lengthMm: run.lengthMm || DEFAULT_DRAFT.lengthMm,
    });
    setGemstoneInput(serializeGemstones(run.gemstones || []));
    setEnvironment((run.requestedPromptEnvironment as PromptEnvironment | undefined) ?? "production");

    if (run.referenceUrl && run.referenceStorageId) {
      setReference({
        storageId: run.referenceStorageId as Id<"_storage">,
        url: run.referenceUrl,
        fileName: "Saved reference",
      });
    } else {
      setReference(null);
    }

    if (run.requestedPromptRelease) {
      const matchingRelease = validatedReleases.find(
        (item: ValidatedRelease) =>
          item.slug === run.requestedPromptRelease?.slug
          && item.version === run.requestedPromptRelease.version
      );
      setSelectedReleaseId(matchingRelease ? String(matchingRelease._id) : "");
    } else {
      setSelectedReleaseId("");
    }
  }, [run, validatedReleases]);

  const updateDraft = <K extends keyof PlaygroundDraft>(key: K, value: PlaygroundDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const applyPreset = (next: PlaygroundDraft) => {
    hydratedRunRef.current = null;
    setDraft(next);
    setGemstoneInput(serializeGemstones(next.gemstones));
    setPreviewResult(null);
    setSubmitError(null);
    setStatus(null);
  };

  const currentPromptRelease = selectedRelease
    ? `${selectedRelease.slug} v${selectedRelease.version}`
    : activeRelease
      ? `${activeRelease.slug} v${activeRelease.version}`
      : "no active release";

  const requestedPromptRelease = selectedRelease
    ? {
        slug: selectedRelease.slug,
        version: selectedRelease.version,
      }
    : undefined;

  const buildDraftArgs = () => {
    const gemstones = parseGemstones(gemstoneInput);
    const additionalInfo = {
      metalFinish: "polished" as const,
      ...(draft.occasion.trim() ? { occasion: draft.occasion.trim() } : {}),
      ...(draft.notes.trim() ? { notes: draft.notes.trim() } : {}),
    };

    return {
      name: draft.name.trim(),
      language: draft.language,
      font: draft.font,
      size: draft.size,
      karat: draft.karat,
      style: draft.style,
      ...(reference ? { referenceType: "upload" as const } : {}),
      ...(reference?.url ? { referenceUrl: reference.url } : {}),
      ...(reference?.storageId ? { referenceStorageId: reference.storageId } : {}),
      jewelryType: draft.jewelryType,
      designStyle: draft.styleFamily,
      metalType: draft.metalType,
      styleFamily: draft.styleFamily,
      complexity: draft.complexity,
      gemstones,
      ...(gemstones[0] ? { primaryGemstone: gemstones[0] } : {}),
      lengthMm: draft.lengthMm,
      thicknessMm: 1.8,
      additionalInfo,
      requestedPromptEnvironment: environment,
      ...(requestedPromptRelease ? { requestedPromptRelease } : {}),
    };
  };

  const uploadBlob = async (blob: Blob, contentType: string) => {
    const uploadUrl = await generateUploadUrl();
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: blob,
    });

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    const { storageId } = await response.json();
    return storageId as Id<"_storage">;
  };

  const handleReferenceUpload = async (file: File) => {
    setIsBusy(true);
    setSubmitError(null);

    try {
      const storageId = await uploadBlob(file, file.type || "image/jpeg");
      const saved = await saveReference({ storageId });
      if (!saved.url) {
        throw new Error("Reference URL could not be resolved");
      }
      setReference({
        storageId,
        url: saved.url,
        fileName: file.name,
      });
      setStatus(`Uploaded reference: ${file.name}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Reference upload failed");
    } finally {
      setIsBusy(false);
    }
  };

  const handlePreviewDraft = async () => {
    if (!password) {
      setSubmitError("Admin password is not available. Re-open the page and unlock again.");
      return;
    }

    setIsBusy(true);
    setSubmitError(null);

    try {
      const result = await previewDraft({
        password,
        ...buildDraftArgs(),
      });
      setPreviewResult(result);
      setPreviewVariation(0);
      setStatus(`Previewed ${result.release.slug} v${result.release.version} using current inputs.`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not preview current inputs");
    } finally {
      setIsBusy(false);
    }
  };

  const handlePreviewRun = async () => {
    if (!password) {
      setSubmitError("Admin password is not available. Re-open the page and unlock again.");
      return;
    }
    if (!designId) {
      setSubmitError("Create or select a playground run first.");
      return;
    }

    setIsBusy(true);
    setSubmitError(null);

    try {
      const result = await previewSavedRun({ password, designId });
      setPreviewResult(result);
      setPreviewVariation(0);
      setStatus(`Previewed saved run prompts for ${result.release.slug} v${result.release.version}.`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not preview saved run");
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreateRun = async (runImmediately: boolean) => {
    if (!password) {
      setSubmitError("Admin password is not available. Re-open the page and unlock again.");
      return;
    }

    setIsBusy(true);
    setSubmitError(null);
    setPreviewResult(null);

    try {
      const textBlob = await renderTextToCanvas(draft.name.trim(), draft.font, draft.language);
      const textReferenceStorageId = await uploadBlob(textBlob, "image/png");
      const nextDesignId = await createRun({
        password,
        textReferenceStorageId,
        ...buildDraftArgs(),
      });

      hydratedRunRef.current = null;
      router.replace(`/admin/playground?designId=${nextDesignId}`);

      if (runImmediately) {
        const queued = await runPlayground({
          password,
          designId: nextDesignId,
          mode: "fullChain",
          requestedPromptEnvironment: environment,
          ...(requestedPromptRelease ? { requestedPromptRelease } : {}),
        });
        setStatus(`Created run and queued ${queued.mode}.`);
      } else {
        setStatus("Created a playground run. You can now preview prompts or execute stages.");
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not create playground run");
    } finally {
      setIsBusy(false);
    }
  };

  const handleRun = async (mode: "fullChain" | "product" | "onBody" | "video") => {
    if (!password) {
      setSubmitError("Admin password is not available. Re-open the page and unlock again.");
      return;
    }
    if (!designId) {
      setSubmitError("Create or select a playground run first.");
      return;
    }

    setIsBusy(true);
    setSubmitError(null);

    try {
      const result = await runPlayground({
        password,
        designId,
        mode,
        requestedPromptEnvironment: environment,
        ...(requestedPromptRelease ? { requestedPromptRelease } : {}),
      });

      if (mode === "video") {
        setStatus(`Queued ${result.queued} video job${result.queued === 1 ? "" : "s"}.`);
      } else {
        setStatus(`Scheduled ${mode} run.`);
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : `Could not run ${mode}`);
    } finally {
      setIsBusy(false);
    }
  };

  const openRun = (item: RecentRun) => {
    hydratedRunRef.current = null;
    setPreviewResult(null);
    router.replace(`/admin/playground?designId=${item._id}`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <AdminNav />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Pipeline Playground</h1>
            <p className="mt-2 max-w-3xl text-sm text-zinc-400">
              Test the real pendant-to-on-body-to-video chain with the same prompt resolution,
              generation logic, and storage flow the customer app uses.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyPreset(DEFAULT_DRAFT)}
              className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-500"
            >
              Load From-Scratch Preset
            </button>
            <button
              type="button"
              onClick={() => applyPreset(REFERENCE_DRAFT)}
              className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-500"
            >
              Load Reference Preset
            </button>
          </div>
        </div>

        {(status || submitError) && (
          <div
            className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${
              submitError
                ? "border-red-500/30 bg-red-500/10 text-red-200"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
            }`}
          >
            {submitError ?? status}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
              <h2 className="text-lg font-medium text-white">Recent Playground Runs</h2>
              <div className="mt-4 space-y-3">
                {recentRuns.length === 0 && (
                  <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-5 text-sm text-zinc-500">
                    No playground runs yet.
                  </p>
                )}
                {recentRuns.map((item: RecentRun) => (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => openRun(item)}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                      item._id === designId
                        ? "border-amber-400/40 bg-amber-500/10"
                        : "border-zinc-800 bg-zinc-950/70 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-zinc-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{item.name}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {item.requestedPromptRelease
                          ? `${item.requestedPromptRelease.slug} v${item.requestedPromptRelease.version}`
                          : item.requestedPromptEnvironment ?? "active"}
                      </p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                        {item.status}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
              <h2 className="text-lg font-medium text-white">Run Inputs</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Current target: {currentPromptRelease} in {environment}.
              </p>

              <div className="mt-4 grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-zinc-400">
                    Name
                    <input
                      value={draft.name}
                      onChange={(event) => updateDraft("name", event.target.value)}
                      className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                    />
                  </label>
                  <label className="text-sm text-zinc-400">
                    Language
                    <select
                      value={draft.language}
                      onChange={(event) => updateDraft("language", event.target.value)}
                      className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                    >
                      <option value="en">English</option>
                      <option value="ar">Arabic</option>
                      <option value="zh">Chinese</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-zinc-400">
                    Font
                    <select
                      value={draft.font}
                      onChange={(event) => updateDraft("font", event.target.value)}
                      className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                    >
                      <option value="script">script</option>
                      <option value="modern">modern</option>
                      <option value="classic">classic</option>
                      <option value="naskh">naskh</option>
                      <option value="diwani">diwani</option>
                      <option value="kufi">kufi</option>
                    </select>
                  </label>
                  <label className="text-sm text-zinc-400">
                    Size
                    <select
                      value={draft.size}
                      onChange={(event) => updateDraft("size", event.target.value)}
                      className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                    >
                      <option value="small">small</option>
                      <option value="medium">medium</option>
                      <option value="large">large</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-zinc-400">
                    Karat
                    <select
                      value={draft.karat}
                      onChange={(event) => updateDraft("karat", event.target.value)}
                      className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                    >
                      <option value="18K">18K</option>
                      <option value="21K">21K</option>
                      <option value="22K">22K</option>
                    </select>
                  </label>
                  <label className="text-sm text-zinc-400">
                    Metal
                    <select
                      value={draft.metalType}
                      onChange={(event) => updateDraft("metalType", event.target.value)}
                      className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                    >
                      <option value="yellow">yellow</option>
                      <option value="rose">rose</option>
                      <option value="white">white</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-zinc-400">
                    Jewelry Type
                    <select
                      value={draft.jewelryType}
                      onChange={(event) => updateDraft("jewelryType", event.target.value)}
                      className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                    >
                      <option value="name_pendant">name_pendant</option>
                      <option value="pendant">pendant</option>
                      <option value="necklace">necklace</option>
                      <option value="chain">chain</option>
                    </select>
                  </label>
                  <label className="text-sm text-zinc-400">
                    Style
                    <select
                      value={draft.style}
                      onChange={(event) => updateDraft("style", event.target.value)}
                      className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                    >
                      <option value="gold_only">gold_only</option>
                      <option value="gold_with_diamonds">gold_with_diamonds</option>
                      <option value="gold_with_stones">gold_with_stones</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-zinc-400">
                    Style Family
                    <select
                      value={draft.styleFamily}
                      onChange={(event) => updateDraft("styleFamily", event.target.value)}
                      className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                    >
                      <option value="minimalist">minimalist</option>
                      <option value="floral">floral</option>
                      <option value="modern">modern</option>
                      <option value="vintage">vintage</option>
                      <option value="art_deco">art_deco</option>
                    </select>
                  </label>
                  <label className="text-sm text-zinc-400">
                    Occasion
                    <input
                      value={draft.occasion}
                      onChange={(event) => updateDraft("occasion", event.target.value)}
                      className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-zinc-400">
                    Complexity
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={draft.complexity}
                      onChange={(event) => updateDraft("complexity", Number(event.target.value))}
                      className="mt-2 w-full"
                    />
                    <span className="mt-1 block text-xs text-zinc-500">{draft.complexity}/10</span>
                  </label>
                  <label className="text-sm text-zinc-400">
                    Length (mm)
                    <input
                      type="number"
                      min={12}
                      max={60}
                      value={draft.lengthMm}
                      onChange={(event) => updateDraft("lengthMm", Number(event.target.value))}
                      className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                    />
                  </label>
                </div>

                <label className="text-sm text-zinc-400">
                  Gemstones
                  <input
                    value={gemstoneInput}
                    onChange={(event) => {
                      setGemstoneInput(event.target.value);
                      updateDraft("gemstones", parseGemstones(event.target.value));
                    }}
                    placeholder="diamond, ruby"
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                  />
                </label>

                <label className="text-sm text-zinc-400">
                  Notes
                  <textarea
                    value={draft.notes}
                    onChange={(event) => updateDraft("notes", event.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-zinc-400">
                    Environment
                    <select
                      value={environment}
                      onChange={(event) => setEnvironment(event.target.value as PromptEnvironment)}
                      className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                    >
                      <option value="dev">dev</option>
                      <option value="staging">staging</option>
                      <option value="production">production</option>
                    </select>
                  </label>
                  <label className="text-sm text-zinc-400">
                    Pinned Release
                    <select
                      value={selectedReleaseId}
                      onChange={(event) => setSelectedReleaseId(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                    >
                      <option value="">
                        Use active release {activeRelease ? `(${activeRelease.slug} v${activeRelease.version})` : ""}
                      </option>
                      {validatedReleases.map((release: ValidatedRelease) => (
                        <option key={String(release._id)} value={String(release._id)}>
                          {release.slug} v{release.version}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "copy";
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const file = event.dataTransfer.files?.[0];
                    if (file) {
                      void handleReferenceUpload(file);
                    }
                  }}
                  className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/60 p-5 text-center transition hover:border-zinc-500"
                >
                  <UploadCloud className="mx-auto h-5 w-5 text-zinc-500" />
                  <p className="mt-3 text-sm font-medium text-white">Upload reference image</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Drag and drop a reference here, or click to browse.
                  </p>
                  {reference && (
                    <p className="mt-3 text-xs text-emerald-300">
                      Using reference: {reference.fileName}
                    </p>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void handleReferenceUpload(file);
                      }
                    }}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => void handleCreateRun(false)}
                    disabled={isBusy}
                    className="rounded-full border border-zinc-700 px-4 py-3 text-sm text-zinc-200 hover:border-zinc-500 disabled:opacity-60"
                  >
                    Create Run
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCreateRun(true)}
                    disabled={isBusy}
                    className="rounded-full bg-amber-500 px-4 py-3 text-sm font-medium text-zinc-950 hover:bg-amber-400 disabled:opacity-60"
                  >
                    Create + Run Full Chain
                  </button>
                </div>
              </div>
            </section>
          </aside>

          <section className="space-y-6">
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-medium text-white">Run Controls</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Dry-run prompts from the current form, or execute saved runs through the real pipeline.
                  </p>
                </div>
                {run && (
                  <div className="text-right text-xs text-zinc-500">
                    <p>{run.name}</p>
                    <p>
                      {run.requestedPromptRelease
                        ? `${run.requestedPromptRelease.slug} v${run.requestedPromptRelease.version}`
                        : run.requestedPromptEnvironment ?? "active"}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handlePreviewDraft()}
                  disabled={isBusy}
                  className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-200 disabled:opacity-60"
                >
                  Preview Current Inputs
                </button>
                <button
                  type="button"
                  onClick={() => void handlePreviewRun()}
                  disabled={!designId || isBusy}
                  className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-200 disabled:opacity-60"
                >
                  Preview Saved Run
                </button>
                <button
                  type="button"
                  onClick={() => void handleRun("fullChain")}
                  disabled={!designId || isBusy}
                  className="rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-60"
                >
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Run Full Chain
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleRun("product")}
                  disabled={!run?.stageAvailability.canRunProduct || isBusy}
                  className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-200 disabled:opacity-60"
                >
                  <span className="inline-flex items-center gap-2">
                    <Wand2 className="h-4 w-4" />
                    Rerun Product
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleRun("onBody")}
                  disabled={!run?.stageAvailability.canRunOnBody || isBusy}
                  className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-200 disabled:opacity-60"
                >
                  <span className="inline-flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Rerun On-Body
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleRun("video")}
                  disabled={!run?.stageAvailability.canRunVideo || isBusy}
                  className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-200 disabled:opacity-60"
                >
                  <span className="inline-flex items-center gap-2">
                    <Film className="h-4 w-4" />
                    Rerun Video
                  </span>
                </button>
              </div>
            </section>

            {previewResult && (
              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-medium text-white">Prompt Preview</h2>
                    <p className="mt-1 text-sm text-zinc-400">
                      {previewResult.release.slug} v{previewResult.release.version} · {previewResult.pipeline.slug} v{previewResult.pipeline.version}
                    </p>
                    <p className="mt-2 max-w-3xl text-sm text-zinc-500">
                      {previewResult.flowSummary}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {previewResult.variations.map((variation) => (
                      <button
                        key={variation.index}
                        type="button"
                        onClick={() => setPreviewVariation(variation.index)}
                        className={`rounded-full px-3 py-1.5 text-xs ${
                          previewVariation === variation.index
                            ? "bg-amber-500 text-zinc-950"
                            : "border border-zinc-700 text-zinc-300"
                        }`}
                      >
                        Variation {variation.index + 1}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Flow Type</p>
                    <p className="mt-2 text-sm font-medium text-white">
                      {previewResult.flowType === "reference" ? "Reference image path" : "From-scratch path"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Variation</p>
                    <p className="mt-2 text-sm font-medium text-white">Variation {previewVariation + 1}</p>
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Chain</p>
                    <p className="mt-2 text-sm font-medium text-white">{"product -> on-body -> video"}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {previewResult.variations[previewVariation]?.stages.map((stage) => (
                    <article
                      key={`${previewVariation}-${stage.stageKey}`}
                      className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-white">{stage.stageKey}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
                            {stage.templateSlug} · {stage.stageType}
                          </p>
                        </div>
                        <div className="rounded-full border border-zinc-800 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-zinc-400">
                          {stage.outputArtifact}
                        </div>
                      </div>

                      <p className="mt-4 text-sm text-zinc-300">{stage.purpose}</p>

                      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">This Stage Receives</p>
                          <div className="mt-2 space-y-2">
                            {stage.inputArtifacts.map((inputArtifact) => (
                              <p key={inputArtifact} className="text-sm text-zinc-300">
                                {inputArtifact}
                              </p>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Next Handoff</p>
                          <p className="mt-2 text-sm text-zinc-300">{stage.downstreamConsumer}</p>
                        </div>
                      </div>

                      <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-xs text-zinc-300">
                        {stage.prompt}
                      </pre>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {run && (
              <>
                <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Status</p>
                      <p className="mt-2 text-lg font-medium text-white">{run.status}</p>
                      <p className="mt-2 text-sm text-zinc-500">{run.analysisStep || "Idle"}</p>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Prompt Target</p>
                      <p className="mt-2 text-sm text-white">
                        {run.requestedPromptRelease
                          ? `${run.requestedPromptRelease.slug} v${run.requestedPromptRelease.version}`
                          : run.requestedPromptEnvironment ?? "active"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Counts</p>
                      <p className="mt-2 text-sm text-zinc-300">
                        Product {run.counts.product} · On-body {run.counts.onBody} · Video {run.counts.video}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Snapshot</p>
                      <p className="mt-2 text-sm text-zinc-300">
                        {run.promptSnapshot?.release
                          ? `${run.promptSnapshot.release.slug} v${run.promptSnapshot.release.version}`
                          : "Not captured yet"}
                      </p>
                    </div>
                  </div>
                </section>

                {run.referenceUrl && (() => {
                  const referenceUrl = run.referenceUrl;

                  return (
                    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-lg font-medium text-white">Reference</h2>
                      <button
                        type="button"
                        onClick={() => setLightbox({ type: "image", url: referenceUrl })}
                        className="text-sm text-amber-200 hover:text-amber-100"
                      >
                        Open
                      </button>
                    </div>
                    <div className="max-w-xs overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
                      <img src={referenceUrl} alt="Reference" className="h-full w-full object-cover" />
                    </div>
                    </section>
                  );
                })()}

                <ArtifactGrid
                  title="Product Images"
                  items={run.productImageUrls}
                  onOpen={(url) => setLightbox({ type: "image", url })}
                />
                <ArtifactGrid
                  title="On-Body Images"
                  items={run.onBodyImageUrls}
                  onOpen={(url) => setLightbox({ type: "image", url })}
                />
                <ArtifactGrid
                  title="Videos"
                  items={run.videoUrls}
                  statuses={run.videoStatuses}
                  onOpen={(url) => setLightbox({ type: "video", url })}
                />
              </>
            )}
          </section>
        </div>
      </main>

      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-6"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute right-6 top-6 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-sm text-white"
          >
            Close
          </button>
          <div className="max-h-full max-w-5xl overflow-auto" onClick={(event) => event.stopPropagation()}>
            {lightbox.type === "video" ? (
              <video
                src={lightbox.url}
                controls
                autoPlay
                loop
                className="max-h-[85vh] max-w-full rounded-2xl"
              />
            ) : (
              <img src={lightbox.url} alt="Artifact preview" className="max-h-[85vh] max-w-full rounded-2xl" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlaygroundPage() {
  return (
    <PasswordGate>
      <PlaygroundView />
    </PasswordGate>
  );
}
