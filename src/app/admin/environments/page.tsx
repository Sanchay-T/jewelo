"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { AdminNav } from "../../../components/admin/AdminNav";
import { PasswordGate, useAdminPassword } from "../../../components/admin/PasswordGate";

type EnvironmentName = "dev" | "staging" | "production";

const ENVIRONMENTS: EnvironmentName[] = ["dev", "staging", "production"];

function EnvironmentPageContent() {
  const password = useAdminPassword();
  const runtimeEnvironment = useQuery(api.prompts.getRuntimeEnvironment);
  const activations = useQuery(api.prompts.listEnvironmentActivations) ?? [];
  const validatedReleases = useQuery(api.prompts.listValidatedReleases) ?? [];
  const activateRelease = useMutation(api.prompts.activateReleaseForEnvironment);
  const [status, setStatus] = useState<{
    state: "idle" | "saving" | "done" | "error";
    message?: string;
  }>({ state: "idle" });

  const handleActivate = async (environment: EnvironmentName, releaseId: string) => {
    setStatus({ state: "saving" });
    try {
      await activateRelease({
        password,
        environment,
        releaseId: releaseId as never,
      });
      setStatus({
        state: "done",
        message: `Activated the selected release for ${environment}.`,
      });
    } catch (error) {
      setStatus({
        state: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <AdminNav />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Environment activation</p>
          <h1 className="mt-2 text-3xl font-semibold">Control what each environment actually runs.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400">
            Only validated releases appear here. Activation is environment-specific, so `dev`, `staging`, and `production` can run different release bundles without changing one another.
          </p>
          <div className="mt-5 inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-sm text-amber-200">
            Runtime environment: {runtimeEnvironment ?? "Loading..."}
          </div>
          {status.message ? (
            <p className={`mt-4 text-sm ${status.state === "error" ? "text-red-300" : "text-emerald-300"}`}>
              {status.message}
            </p>
          ) : null}
        </section>

        <div className="mt-8 grid gap-4 xl:grid-cols-3">
          {ENVIRONMENTS.map((environment) => {
            const activation = activations.find((item) => item.environment === environment);
            return (
              <section
                key={environment}
                className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">{environment}</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      {environment === runtimeEnvironment ? "Current runtime" : "Inactive here"}
                    </h2>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <p className="text-sm text-zinc-400">Active release</p>
                  <p className="mt-2 text-lg font-medium text-white">
                    {activation
                      ? `${activation.releaseSlug} v${activation.releaseVersion}`
                      : "Nothing activated yet"}
                  </p>
                  {activation ? (
                    <p className="mt-2 text-xs text-zinc-500">
                      Activated {new Date(activation.activatedAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>

                <div className="mt-5 space-y-3">
                  {validatedReleases.map((release) => {
                    const label = `${release.slug} v${release.version}`;
                    const isActive =
                      activation?.releaseSlug === release.slug
                      && activation.releaseVersion === release.version;
                    return (
                      <div
                        key={`${environment}-${release._id}`}
                        className={`rounded-2xl border p-4 ${
                          isActive
                            ? "border-emerald-500/30 bg-emerald-500/10"
                            : "border-zinc-800 bg-zinc-950/60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-white">{label}</p>
                            <p className="mt-1 text-xs text-zinc-500">
                              Pipeline {release.pipelineSlug} v{release.pipelineVersion}
                            </p>
                          </div>
                          {isActive ? (
                            <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-emerald-200">
                              Active
                            </span>
                          ) : null}
                        </div>

                        {!isActive ? (
                          <button
                            onClick={() => handleActivate(environment, release._id as string)}
                            disabled={status.state === "saving"}
                            className="mt-4 rounded-full border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Activate in {environment}
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function EnvironmentsPage() {
  return (
    <PasswordGate>
      <EnvironmentPageContent />
    </PasswordGate>
  );
}
