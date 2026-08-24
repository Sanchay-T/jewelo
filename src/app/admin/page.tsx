"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AdminNav } from "../../components/admin/AdminNav";
import { PasswordGate, useAdminPassword } from "../../components/admin/PasswordGate";

function Dashboard() {
  const password = useAdminPassword();
  const overview = useQuery(api.prompts.getAdminOverview);
  const seedBaseline = useMutation(api.prompts.seedBaselinePromptControl);

  const handleSeed = async () => {
    if (!password) return;
    await seedBaseline({ password });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Prompt Control Plane</h1>
            <p className="mt-2 max-w-3xl text-sm text-zinc-400">
              Manage versioned assets, compose them into a release-bound pipeline, preview the exact stage prompts,
              and activate one coherent runtime per environment.
            </p>
          </div>
          <button
            onClick={handleSeed}
            className="rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-200 transition-colors hover:bg-amber-500/20"
          >
            Seed Baseline
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Runtime Environment</p>
            <p className="mt-3 text-2xl font-semibold text-white">
              {overview?.runtimeEnvironment ?? "Loading"}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Pipelines</p>
            <p className="mt-3 text-2xl font-semibold text-white">
              {overview?.counts.pipelines ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Releases</p>
            <p className="mt-3 text-2xl font-semibold text-white">
              {overview?.counts.releases ?? 0}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Link
            href="/admin/pipelines"
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition-colors hover:border-zinc-700"
          >
            <p className="text-lg font-medium text-white">Pipelines</p>
            <p className="mt-2 text-sm text-zinc-400">
              Define known stages, branches, and which template slug each stage should resolve.
            </p>
          </Link>
          <Link
            href="/admin/releases"
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition-colors hover:border-zinc-700"
          >
            <p className="text-lg font-medium text-white">Releases</p>
            <p className="mt-2 text-sm text-zinc-400">
              Bind one pipeline version to exact template, partial, and config versions.
            </p>
          </Link>
          <Link
            href="/admin/validation"
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition-colors hover:border-zinc-700"
          >
            <p className="text-lg font-medium text-white">Validation</p>
            <p className="mt-2 text-sm text-zinc-400">
              Preview the exact prompt text per stage and validate before activation.
            </p>
          </Link>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium text-white">Activation Status</h2>
              <Link href="/admin/environments" className="text-sm text-amber-200 hover:text-amber-100">
                Manage
              </Link>
            </div>
            <div className="space-y-3">
              {(overview?.activations ?? []).length === 0 && (
                <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-5 text-sm text-zinc-500">
                  No environments are activated yet. Seed the baseline and activate a validated release.
                </p>
              )}
              {overview?.activations.map((activation) => (
                <div
                  key={activation._id}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{activation.environment}</p>
                    <p className="text-xs text-zinc-500">
                      {activation.releaseSlug} v{activation.releaseVersion}
                    </p>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {new Date(activation.activatedAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="text-lg font-medium text-white">Asset Library</h2>
            <div className="mt-4 space-y-3 text-sm">
              <Link href="/admin/templates/fromScratch" className="block rounded-xl border border-zinc-800 px-4 py-3 text-zinc-300 hover:border-zinc-700 hover:text-white">
                Templates
              </Link>
              <Link href="/admin/partials/textReference" className="block rounded-xl border border-zinc-800 px-4 py-3 text-zinc-300 hover:border-zinc-700 hover:text-white">
                Partials
              </Link>
              <Link href="/admin/configs/fontStyles" className="block rounded-xl border border-zinc-800 px-4 py-3 text-zinc-300 hover:border-zinc-700 hover:text-white">
                Configs
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default function AdminPage() {
  return (
    <PasswordGate>
      <Dashboard />
    </PasswordGate>
  );
}
