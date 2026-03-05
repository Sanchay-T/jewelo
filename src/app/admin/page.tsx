"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PasswordGate } from "../../components/admin/PasswordGate";
import { AdminNav } from "../../components/admin/AdminNav";
import Link from "next/link";

function Dashboard() {
  const templates = useQuery(api.prompts.listTemplates);
  const partials = useQuery(api.prompts.listPartials);
  const configs = useQuery(api.prompts.listConfigs);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <AdminNav />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold mb-8">Prompt Management</h1>

        {/* Templates */}
        <section className="mb-10">
          <h2 className="text-lg font-medium text-zinc-300 mb-4">Templates</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates?.map((t) => (
              <Link
                key={t.slug}
                href={`/admin/templates/${t.slug}`}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 transition-colors"
              >
                <p className="text-white font-medium">{t.slug}</p>
                <p className="text-zinc-500 text-sm mt-1">{t.activeName}</p>
                <div className="flex items-center gap-2 mt-2">
                  {t.activeVersion !== null && (
                    <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded">
                      v{t.activeVersion} active
                    </span>
                  )}
                  <span className="text-zinc-600 text-xs">
                    {t.versionCount} version{t.versionCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </Link>
            ))}
            {templates?.length === 0 && (
              <p className="text-zinc-500 text-sm col-span-full">
                No templates yet. Run the seed migration to populate.
              </p>
            )}
          </div>
        </section>

        {/* Partials */}
        <section className="mb-10">
          <h2 className="text-lg font-medium text-zinc-300 mb-4">Partials</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {partials?.map((p) => (
              <Link
                key={p.slug}
                href={`/admin/partials/${p.slug}`}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 transition-colors"
              >
                <p className="text-white font-medium">{p.slug}</p>
                <p className="text-zinc-500 text-sm mt-1">{p.activeName}</p>
                <div className="flex items-center gap-2 mt-2">
                  {p.activeVersion !== null && (
                    <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded">
                      v{p.activeVersion} active
                    </span>
                  )}
                  <span className="text-zinc-600 text-xs">
                    {p.versionCount} version{p.versionCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </Link>
            ))}
            {partials?.length === 0 && (
              <p className="text-zinc-500 text-sm col-span-full">
                No partials yet.
              </p>
            )}
          </div>
        </section>

        {/* Configs */}
        <section className="mb-10">
          <h2 className="text-lg font-medium text-zinc-300 mb-4">Configs</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {configs?.map((c) => (
              <Link
                key={c.key}
                href={`/admin/configs/${c.key}`}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-600 transition-colors"
              >
                <p className="text-white font-medium">{c.key}</p>
                <div className="flex items-center gap-2 mt-2">
                  {c.activeVersion !== null && (
                    <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-0.5 rounded">
                      v{c.activeVersion} active
                    </span>
                  )}
                  <span className="text-zinc-600 text-xs">
                    {c.versionCount} version{c.versionCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </Link>
            ))}
            {configs?.length === 0 && (
              <p className="text-zinc-500 text-sm col-span-full">
                No configs yet.
              </p>
            )}
          </div>
        </section>
      </div>
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
