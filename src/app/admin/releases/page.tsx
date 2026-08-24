"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { AdminNav } from "../../../components/admin/AdminNav";
import { PasswordGate, useAdminPassword } from "../../../components/admin/PasswordGate";

type AssetCatalog = NonNullable<ReturnType<typeof useQuery<typeof api.prompts.getAssetCatalog>>>;
type ReleaseVersion = NonNullable<ReturnType<typeof useQuery<typeof api.prompts.getReleaseVersions>>>[number];
type PipelineSummary = NonNullable<ReturnType<typeof useQuery<typeof api.prompts.listPipelines>>>[number];
function latestVersion<T extends { version: number }>(items: T[]) {
  return [...items].sort((a, b) => b.version - a.version)[0];
}

function ReleaseEditor({
  initialRelease,
  assetCatalog,
  pipelines,
  onSaved,
}: {
  initialRelease: ReleaseVersion | null;
  assetCatalog: AssetCatalog | null | undefined;
  pipelines: PipelineSummary[];
  onSaved: (slug: string) => void;
}) {
  const password = useAdminPassword();
  const saveRelease = useMutation(api.prompts.createReleaseVersion);
  const validateRelease = useAction(api.promptValidation.validateRelease);

  const [slug, setSlug] = useState(initialRelease?.slug ?? "baseline");
  const [name, setName] = useState(initialRelease?.name ?? "New Release");
  const [pipelineSlug, setPipelineSlug] = useState(initialRelease?.pipelineSlug ?? pipelines[0]?.slug ?? "core");
  const pipelineVersions = useQuery(
    api.prompts.getPipelineVersions,
    pipelineSlug ? { slug: pipelineSlug } : "skip"
  ) ?? [];
  const [pipelineVersionSelection, setPipelineVersionSelection] = useState<number>(
    initialRelease?.pipelineVersion ?? latestVersion(pipelineVersions)?.version ?? 1
  );
  const selectedPipeline =
    pipelineVersions.find((version) => version.version === pipelineVersionSelection) ??
    latestVersion(pipelineVersions) ??
    null;

  const [templateSelections, setTemplateSelections] = useState<Record<string, number>>(
    Object.fromEntries(initialRelease?.templateVersions.map((item) => [item.slug, item.version]) ?? [])
  );
  const [partialSelections, setPartialSelections] = useState<Record<string, number>>(
    Object.fromEntries(initialRelease?.partialVersions.map((item) => [item.slug, item.version]) ?? [])
  );
  const [configSelections, setConfigSelections] = useState<Record<string, number>>(
    Object.fromEntries(initialRelease?.configVersions.map((item) => [item.key, item.version]) ?? [])
  );
  const [status, setStatus] = useState<string | null>(null);

  const templateSlugs = [...new Set(selectedPipeline?.stages.map((stage) => stage.templateSlug) ?? [])];

  const effectiveTemplateSelections = Object.fromEntries(
    templateSlugs.map((templateSlug) => {
      const versions = assetCatalog?.templates.find((item) => item.slug === templateSlug)?.versions ?? [];
      return [templateSlug, templateSelections[templateSlug] ?? latestVersion(versions)?.version ?? 1];
    })
  );

  const effectivePartialSelections = Object.fromEntries(
    (assetCatalog?.partials ?? []).map((partial) => [
      partial.slug,
      partialSelections[partial.slug] ?? latestVersion(partial.versions)?.version ?? 1,
    ])
  );

  const effectiveConfigSelections = Object.fromEntries(
    (assetCatalog?.configs ?? []).map((config) => [
      config.key,
      configSelections[config.key] ?? latestVersion(config.versions)?.version ?? 1,
    ])
  );

  const handleSave = async () => {
    if (!password || !selectedPipeline || !assetCatalog) return;

    await saveRelease({
      password,
      slug,
      name,
      pipelineSlug: selectedPipeline.slug,
      pipelineVersion: selectedPipeline.version,
      templateVersions: templateSlugs.map((templateSlug) => ({
        slug: templateSlug,
        version: effectiveTemplateSelections[templateSlug],
      })),
      partialVersions: assetCatalog.partials.map((partial) => ({
        slug: partial.slug,
        version: effectivePartialSelections[partial.slug],
      })),
      configVersions: assetCatalog.configs.map((config) => ({
        key: config.key,
        version: effectiveConfigSelections[config.key],
      })),
    });

    setStatus("Saved new release version.");
    onSaved(slug);
  };

  const handleValidate = async () => {
    if (!initialRelease) return;
    const result = await validateRelease({
      slug: initialRelease.slug,
      version: initialRelease.version,
    });
    setStatus(
      result.valid
        ? `Validated ${result.release.slug} v${result.release.version}`
        : result.errors.join(" ")
    );
  };

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Slug</label>
          <input
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Name</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Pipeline</label>
          <select
            value={pipelineSlug}
            onChange={(event) => {
              setPipelineSlug(event.target.value);
              setPipelineVersionSelection(1);
            }}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
          >
            {pipelines.map((pipeline) => (
              <option key={pipeline.slug} value={pipeline.slug}>
                {pipeline.slug}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Pipeline Version</label>
          <select
            value={selectedPipeline?.version ?? ""}
            onChange={(event) => setPipelineVersionSelection(Number(event.target.value))}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
          >
            {[...pipelineVersions]
              .sort((a, b) => b.version - a.version)
              .map((version) => (
                <option key={version._id} value={version.version}>
                  v{version.version} · {version.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">Template Versions</h2>
          <div className="mt-4 space-y-3">
            {templateSlugs.map((templateSlug) => {
              const versions = assetCatalog?.templates.find((item) => item.slug === templateSlug)?.versions ?? [];
              return (
                <div key={templateSlug}>
                  <label className="mb-1 block text-sm text-zinc-300">{templateSlug}</label>
                  <select
                    value={effectiveTemplateSelections[templateSlug]}
                    onChange={(event) =>
                      setTemplateSelections((current) => ({
                        ...current,
                        [templateSlug]: Number(event.target.value),
                      }))
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                  >
                    {versions.map((version) => (
                      <option key={`${templateSlug}-${version.version}`} value={version.version}>
                        v{version.version} · {version.name}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">Partial Versions</h2>
          <div className="mt-4 space-y-3">
            {(assetCatalog?.partials ?? []).map((partial) => (
              <div key={partial.slug}>
                <label className="mb-1 block text-sm text-zinc-300">{partial.slug}</label>
                <select
                  value={effectivePartialSelections[partial.slug]}
                  onChange={(event) =>
                    setPartialSelections((current) => ({
                      ...current,
                      [partial.slug]: Number(event.target.value),
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                >
                  {partial.versions.map((version) => (
                    <option key={`${partial.slug}-${version.version}`} value={version.version}>
                      v{version.version} · {version.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">Config Versions</h2>
          <div className="mt-4 space-y-3">
            {(assetCatalog?.configs ?? []).map((config) => (
              <div key={config.key}>
                <label className="mb-1 block text-sm text-zinc-300">{config.key}</label>
                <select
                  value={effectiveConfigSelections[config.key]}
                  onChange={(event) =>
                    setConfigSelections((current) => ({
                      ...current,
                      [config.key]: Number(event.target.value),
                    }))
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
                >
                  {config.versions.map((version) => (
                    <option key={`${config.key}-${version.version}`} value={version.version}>
                      v{version.version}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={handleSave}
          className="rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-400"
        >
          Save New Version
        </button>
        {initialRelease && (
          <button
            onClick={handleValidate}
            className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-200"
          >
            Validate Displayed Version
          </button>
        )}
        {status && <p className="text-sm text-zinc-400">{status}</p>}
      </div>

      {initialRelease && (
        <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <p className="text-sm font-medium text-white">
            {initialRelease.slug} v{initialRelease.version} · {initialRelease.status}
          </p>
          {initialRelease.validationErrors.length > 0 ? (
            <div className="mt-3 space-y-2">
              {initialRelease.validationErrors.map((error, index) => (
                <p key={`${error}-${index}`} className="text-sm text-red-300">
                  {error}
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">No recorded validation errors.</p>
          )}
        </div>
      )}
    </section>
  );
}

function ReleaseManager() {
  const releaseSummaries = useQuery(api.prompts.listReleases) ?? [];
  const pipelines = useQuery(api.prompts.listPipelines) ?? [];
  const assetCatalog = useQuery(api.prompts.getAssetCatalog);
  const [selectedSlugOverride, setSelectedSlugOverride] = useState("");
  const selectedSlug = selectedSlugOverride || releaseSummaries[0]?.slug || "";
  const versions = useQuery(
    api.prompts.getReleaseVersions,
    selectedSlug ? { slug: selectedSlug } : "skip"
  ) ?? [];
  const [selectedVersionOverride, setSelectedVersionOverride] = useState<number | null>(null);
  const activeRelease =
    versions.find((version) => version.version === selectedVersionOverride) ??
    latestVersion(versions) ??
    null;
  const [createNonce, setCreateNonce] = useState(0);
  const isCreatingNew = createNonce > 0 && !selectedVersionOverride && !selectedSlugOverride;

  const editorKey = isCreatingNew
    ? `new-${createNonce}`
    : activeRelease
      ? `${activeRelease.slug}-${activeRelease.version}`
      : "new-default";

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Release Composer</h1>
            <p className="mt-2 max-w-3xl text-sm text-zinc-400">
              Bind one pipeline version to exact template, partial, and config versions, then validate it before activation.
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedSlugOverride("");
              setSelectedVersionOverride(null);
              setCreateNonce((count) => count + 1);
            }}
            className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-600 hover:text-white"
          >
            New Release
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">Releases</h2>
            <div className="mt-4 space-y-2">
              {releaseSummaries.map((release) => (
                <button
                  key={release.slug}
                  onClick={() => {
                    setSelectedSlugOverride(release.slug);
                    setSelectedVersionOverride(null);
                  }}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                    selectedSlug === release.slug
                      ? "border-amber-400/40 bg-amber-500/10"
                      : "border-zinc-800 bg-zinc-950/70 hover:border-zinc-700"
                  }`}
                >
                  <p className="text-sm font-medium text-white">{release.slug}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    v{release.latestVersion} · {release.status}
                  </p>
                </button>
              ))}
            </div>
          </aside>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {[...versions]
                .sort((a, b) => b.version - a.version)
                .map((version) => (
                  <button
                    key={version._id}
                    onClick={() => setSelectedVersionOverride(version.version)}
                    className={`rounded-full border px-3 py-1.5 text-xs ${
                      activeRelease?.version === version.version
                        ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
                        : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white"
                    }`}
                  >
                    v{version.version}
                  </button>
                ))}
            </div>

            <ReleaseEditor
              key={editorKey}
              initialRelease={isCreatingNew ? null : activeRelease}
              assetCatalog={assetCatalog}
              pipelines={pipelines}
              onSaved={(nextSlug) => {
                setSelectedSlugOverride(nextSlug);
                setSelectedVersionOverride(null);
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ReleasesPage() {
  return (
    <PasswordGate>
      <ReleaseManager />
    </PasswordGate>
  );
}
