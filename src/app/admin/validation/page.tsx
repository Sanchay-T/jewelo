"use client";

import { useAction, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { AdminNav } from "../../../components/admin/AdminNav";
import { PasswordGate } from "../../../components/admin/PasswordGate";

function ValidationView() {
  const releaseSummaries = useQuery(api.prompts.listReleases) ?? [];
  const [selectedSlugOverride, setSelectedSlugOverride] = useState("");
  const selectedSlug = selectedSlugOverride || releaseSummaries[0]?.slug || "";
  const versions = useQuery(
    api.prompts.getReleaseVersions,
    selectedSlug ? { slug: selectedSlug } : "skip"
  ) ?? [];
  const [selectedVersionOverride, setSelectedVersionOverride] = useState<number | null>(null);
  const selectedVersion = selectedVersionOverride ?? [...versions].sort((a, b) => b.version - a.version)[0]?.version ?? null;
  const runtimeEnvironment = useQuery(api.prompts.getRuntimeEnvironment);
  const [environmentOverride, setEnvironmentOverride] = useState("");
  const environment = environmentOverride || runtimeEnvironment || "production";
  const dryRunRelease = useAction(api.promptValidation.dryRunRelease);
  const validateRelease = useAction(api.promptValidation.validateRelease);

  const [result, setResult] = useState<Awaited<ReturnType<typeof dryRunRelease>> | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const currentVersion = versions.find((version) => version.version === selectedVersion) ?? null;

  const handleRun = async () => {
    if (!selectedSlug || selectedVersion === null) return;
    const nextResult = await dryRunRelease({
      slug: selectedSlug,
      version: selectedVersion,
      environment,
    });
    setResult(nextResult);
    setStatus(`Previewed ${nextResult.release.slug} v${nextResult.release.version} in ${environment}.`);
  };

  const handleValidate = async () => {
    if (!selectedSlug || selectedVersion === null) return;
    const validation = await validateRelease({
      slug: selectedSlug,
      version: selectedVersion,
    });
    setStatus(
      validation.valid
        ? `Validated ${validation.release.slug} v${validation.release.version}.`
        : validation.errors.join(" ")
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Release Validation</h1>
          <p className="mt-2 max-w-3xl text-sm text-zinc-400">
            Render the exact prompt text the runtime would use for each stage and scenario before activation.
          </p>
        </div>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Release</label>
              <select
                value={selectedSlug}
                onChange={(event) => {
                  setSelectedSlugOverride(event.target.value);
                  setSelectedVersionOverride(null);
                }}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
              >
                {releaseSummaries.map((release) => (
                  <option key={release.slug} value={release.slug}>
                    {release.slug}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Version</label>
              <select
                value={selectedVersion ?? ""}
                onChange={(event) => setSelectedVersionOverride(Number(event.target.value))}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
              >
                {[...versions]
                  .sort((a, b) => b.version - a.version)
                  .map((version) => (
                    <option key={version._id} value={version.version}>
                      v{version.version} · {version.status}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Environment</label>
              <select
                value={environment}
                onChange={(event) => setEnvironmentOverride(event.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
              >
                {["dev", "staging", "production"].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleRun}
              disabled={!selectedSlug || selectedVersion === null}
              className="rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-50"
            >
              Run Dry Run
            </button>
            <button
              onClick={handleValidate}
              disabled={!selectedSlug || selectedVersion === null}
              className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-200 disabled:opacity-50"
            >
              Validate Release
            </button>
            {status && <p className="text-sm text-zinc-400">{status}</p>}
          </div>

          {currentVersion && currentVersion.validationErrors.length > 0 && (
            <div className="mt-4 space-y-2">
              {currentVersion.validationErrors.map((error, index) => (
                <p
                  key={`${error}-${index}`}
                  className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200"
                >
                  {error}
                </p>
              ))}
            </div>
          )}
        </section>

        {result && (
          <div className="mt-6 space-y-6">
            {result.scenarios.map((scenario) => (
              <section key={scenario.label} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                <div className="mb-4">
                  <h2 className="text-xl font-medium text-white">{scenario.label}</h2>
                  <p className="text-sm text-zinc-500">
                    {result.release.slug} v{result.release.version} · {result.pipeline.slug} v{result.pipeline.version}
                  </p>
                </div>
                <div className="space-y-4">
                  {scenario.previews.map((preview) => (
                    <article
                      key={`${scenario.label}-${preview.stageKey}`}
                      className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4"
                    >
                      <p className="text-sm font-medium text-white">{preview.stageKey}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
                        {preview.templateSlug}
                      </p>
                      <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-xs text-zinc-300">
                        {preview.prompt}
                      </pre>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ValidationPage() {
  return (
    <PasswordGate>
      <ValidationView />
    </PasswordGate>
  );
}
