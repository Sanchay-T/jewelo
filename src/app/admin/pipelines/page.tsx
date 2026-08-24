"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { AdminNav } from "../../../components/admin/AdminNav";
import { PasswordGate, useAdminPassword } from "../../../components/admin/PasswordGate";

type StageForm = {
  stageKey: string;
  stageType: string;
  branch: string;
  templateSlug: string;
  note: string;
};

type PipelineDraft = {
  slug: string;
  name: string;
  description: string;
  stages: StageForm[];
};

const EMPTY_STAGE: StageForm = {
  stageKey: "",
  stageType: "product_image",
  branch: "always",
  templateSlug: "",
  note: "",
};

const STAGE_TYPES = ["product_image", "on_body_image", "video_prompt", "video_negative"] as const;
const BRANCHES = ["always", "has_reference", "from_scratch"] as const;

function createEmptyStage(): StageForm {
  return { ...EMPTY_STAGE };
}

function createEmptyDraft(): PipelineDraft {
  return {
    slug: "custom",
    name: "New Pipeline",
    description: "",
    stages: [createEmptyStage()],
  };
}

function createDraftFromVersion(version: {
  slug: string;
  name: string;
  description?: string;
  stages: Array<{
    stageKey: string;
    stageType: string;
    branch: string;
    templateSlug: string;
    note?: string;
  }>;
}): PipelineDraft {
  return {
    slug: version.slug,
    name: version.name,
    description: version.description ?? "",
    stages: version.stages.map((stage) => ({
      stageKey: stage.stageKey,
      stageType: stage.stageType,
      branch: stage.branch,
      templateSlug: stage.templateSlug,
      note: stage.note ?? "",
    })),
  };
}

function PipelineManager() {
  const password = useAdminPassword();
  const pipelineSummaries = useQuery(api.prompts.listPipelines) ?? [];
  const assetCatalog = useQuery(api.prompts.getAssetCatalog);
  const createPipelineVersion = useMutation(api.prompts.createPipelineVersion);

  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedSlugOverride, setSelectedSlugOverride] = useState("core");
  const [selectedVersionOverride, setSelectedVersionOverride] = useState<number | null>(null);
  const [draftOverride, setDraftOverride] = useState<PipelineDraft | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const selectedSlug =
    mode === "existing"
      ? pipelineSummaries.find((pipeline) => pipeline.slug === selectedSlugOverride)?.slug
        ?? pipelineSummaries[0]?.slug
        ?? ""
      : "";

  const versionDocuments = useQuery(
    api.prompts.getPipelineVersions,
    mode === "existing" && selectedSlug ? { slug: selectedSlug } : "skip"
  );

  const sortedVersions = useMemo(
    () => [...(versionDocuments ?? [])].sort((left, right) => right.version - left.version),
    [versionDocuments]
  );

  const activeVersion =
    selectedVersionOverride !== null
      ? sortedVersions.find((version) => version.version === selectedVersionOverride) ?? sortedVersions[0] ?? null
      : sortedVersions[0] ?? null;

  const baseDraft =
    mode === "new"
      ? createEmptyDraft()
      : activeVersion
        ? createDraftFromVersion(activeVersion)
        : createEmptyDraft();

  const currentDraft = draftOverride ?? baseDraft;
  const templateOptions = assetCatalog?.templates.map((item) => item.slug) ?? [];

  const updateDraft = (updater: (current: PipelineDraft) => PipelineDraft) => {
    setDraftOverride((current) => updater(current ?? baseDraft));
  };

  const handleCreate = () => {
    setMode("new");
    setSelectedSlugOverride("");
    setSelectedVersionOverride(null);
    setDraftOverride(createEmptyDraft());
    setStatus(null);
  };

  const handleSelectPipeline = (slug: string) => {
    setMode("existing");
    setSelectedSlugOverride(slug);
    setSelectedVersionOverride(null);
    setDraftOverride(null);
    setStatus(null);
  };

  const handleSelectVersion = (version: number) => {
    setSelectedVersionOverride(version);
    setDraftOverride(null);
    setStatus(null);
  };

  const savePipeline = async () => {
    if (!password) {
      setStatus("Admin password is required.");
      return;
    }

    await createPipelineVersion({
      password,
      slug: currentDraft.slug,
      name: currentDraft.name,
      description: currentDraft.description || undefined,
      stages: currentDraft.stages.map((stage) => ({
        stageKey: stage.stageKey,
        stageType: stage.stageType,
        branch: stage.branch,
        templateSlug: stage.templateSlug,
        note: stage.note || undefined,
      })),
    });

    setMode("existing");
    setSelectedSlugOverride(currentDraft.slug);
    setSelectedVersionOverride(null);
    setDraftOverride(null);
    setStatus(`Saved ${currentDraft.slug} as a new pipeline version.`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Pipeline Builder</h1>
            <p className="mt-2 max-w-3xl text-sm text-zinc-400">
              Define the known runtime stages, branch rules, and template slugs that each release can bind together.
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-200 transition-colors hover:border-zinc-600 hover:text-white"
          >
            New Pipeline
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">Pipelines</h2>
            <div className="mt-4 space-y-2">
              {pipelineSummaries.map((pipeline) => (
                <button
                  key={pipeline.slug}
                  onClick={() => handleSelectPipeline(pipeline.slug)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                    mode === "existing" && selectedSlug === pipeline.slug
                      ? "border-amber-400/40 bg-amber-500/10"
                      : "border-zinc-800 bg-zinc-950/70 hover:border-zinc-700"
                  }`}
                >
                  <p className="text-sm font-medium text-white">{pipeline.slug}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    v{pipeline.latestVersion} · {pipeline.stageCount} stages
                  </p>
                </button>
              ))}
            </div>
          </aside>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Slug</label>
                <input
                  value={currentDraft.slug}
                  onChange={(event) =>
                    updateDraft((current) => ({
                      ...current,
                      slug: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-amber-400/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Name</label>
                <input
                  value={currentDraft.name}
                  onChange={(event) =>
                    updateDraft((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-amber-400/40 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm text-zinc-400">Description</label>
              <textarea
                value={currentDraft.description}
                onChange={(event) =>
                  updateDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={3}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-amber-400/40 focus:outline-none"
              />
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-white">Stages</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Known stage types only. Releases decide the exact template, partial, and config versions.
                </p>
              </div>
              <button
                onClick={() =>
                  updateDraft((current) => ({
                    ...current,
                    stages: [...current.stages, createEmptyStage()],
                  }))
                }
                className="rounded-full border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-600 hover:text-white"
              >
                Add Stage
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {currentDraft.stages.map((stage, index) => (
                <div key={`${stage.stageKey || "stage"}-${index}`} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-xs uppercase tracking-[0.2em] text-zinc-500">Stage Key</label>
                      <input
                        value={stage.stageKey}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            stages: current.stages.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, stageKey: event.target.value } : item
                            ),
                          }))
                        }
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs uppercase tracking-[0.2em] text-zinc-500">Stage Type</label>
                      <select
                        value={stage.stageType}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            stages: current.stages.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, stageType: event.target.value } : item
                            ),
                          }))
                        }
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                      >
                        {STAGE_TYPES.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs uppercase tracking-[0.2em] text-zinc-500">Branch</label>
                      <select
                        value={stage.branch}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            stages: current.stages.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, branch: event.target.value } : item
                            ),
                          }))
                        }
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                      >
                        {BRANCHES.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs uppercase tracking-[0.2em] text-zinc-500">Template Slug</label>
                      <input
                        list="pipeline-template-slugs"
                        value={stage.templateSlug}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            stages: current.stages.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, templateSlug: event.target.value } : item
                            ),
                          }))
                        }
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-end gap-3">
                    <div className="flex-1">
                      <label className="mb-1 block text-xs uppercase tracking-[0.2em] text-zinc-500">Note</label>
                      <input
                        value={stage.note}
                        onChange={(event) =>
                          updateDraft((current) => ({
                            ...current,
                            stages: current.stages.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, note: event.target.value } : item
                            ),
                          }))
                        }
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <button
                      onClick={() =>
                        updateDraft((current) => ({
                          ...current,
                          stages: current.stages.filter((_, itemIndex) => itemIndex !== index),
                        }))
                      }
                      className="rounded-full border border-red-500/30 px-3 py-2 text-sm text-red-300 hover:border-red-500/50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <datalist id="pipeline-template-slugs">
              {templateOptions.map((slugOption) => (
                <option key={slugOption} value={slugOption} />
              ))}
            </datalist>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {sortedVersions.map((version) => (
                  <button
                    key={version._id}
                    onClick={() => handleSelectVersion(version.version)}
                    className={`rounded-full border px-3 py-1.5 text-xs ${
                      mode === "existing" && activeVersion?.version === version.version
                        ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
                        : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white"
                    }`}
                  >
                    v{version.version}
                  </button>
                ))}
              </div>
              <button
                onClick={savePipeline}
                className="rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-400"
              >
                Save New Version
              </button>
            </div>

            {status ? <p className="mt-4 text-sm text-zinc-400">{status}</p> : null}
          </section>
        </div>
      </main>
    </div>
  );
}

export default function PipelinesPage() {
  return (
    <PasswordGate>
      <PipelineManager />
    </PasswordGate>
  );
}
