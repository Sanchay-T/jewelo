"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { PasswordGate } from "../../../../components/admin/PasswordGate";
import { AdminNav } from "../../../../components/admin/AdminNav";
import { YamlEditor } from "../../../../components/admin/YamlEditor";
import { VersionHistory } from "../../../../components/admin/VersionHistory";
import { useState } from "react";
import Link from "next/link";

function ConfigDetail() {
  const params = useParams();
  const configKey = params.key as string;

  const versions = useQuery(api.prompts.getConfigVersions, { key: configKey });
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  if (!versions) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
        <AdminNav />
        <div className="max-w-5xl mx-auto px-4 py-8">
          <p className="text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  const activeVersion = versions.find((v) => v.isActive);
  const displayVersion = selectedVersion
    ? versions.find((v) => v.version === selectedVersion)
    : activeVersion;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <AdminNav />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Link href="/admin" className="text-zinc-500 hover:text-white transition-colors">
            Dashboard
          </Link>
          <span className="text-zinc-600">/</span>
          <span className="text-white">Configs</span>
          <span className="text-zinc-600">/</span>
          <span className="text-purple-400 font-medium">{configKey}</span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <div>
            {displayVersion ? (
              <YamlEditor
                key={displayVersion.version}
                configKey={configKey}
                initialData={displayVersion.data}
              />
            ) : (
              <p className="text-zinc-500">No versions found for this config.</p>
            )}
          </div>

          <div>
            <VersionHistory
              versions={versions.map((v) => ({
                ...v,
                _id: v._id as string,
                name: `v${v.version}`,
              }))}
              type="config"
              identifier={configKey}
              onSelect={(v) => setSelectedVersion(v.version)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConfigPage() {
  return (
    <PasswordGate>
      <ConfigDetail />
    </PasswordGate>
  );
}
