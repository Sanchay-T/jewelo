"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { PasswordGate } from "../../../../components/admin/PasswordGate";
import { AdminNav } from "../../../../components/admin/AdminNav";
import { TemplateEditor } from "../../../../components/admin/TemplateEditor";
import { VersionHistory } from "../../../../components/admin/VersionHistory";
import { useState } from "react";
import Link from "next/link";

function TemplateDetail() {
  const params = useParams();
  const slug = params.slug as string;

  const versions = useQuery(api.prompts.getTemplateVersions, { slug });
  const allPartials = useQuery(api.prompts.listPartials);
  const partialDetails = useQuery(
    api.prompts.getPartialVersions,
    allPartials?.[0] ? { slug: allPartials[0].slug } : "skip",
  );

  // Collect all active partials for preview
  const activePartials = allPartials
    ?.filter((p) => p.activeVersion !== null)
    .map((p) => ({ slug: p.slug, template: "" })) ?? [];

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
          <span className="text-white">Templates</span>
          <span className="text-zinc-600">/</span>
          <span className="text-blue-400 font-medium">{slug}</span>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <div>
            {displayVersion ? (
              <TemplateEditor
                key={displayVersion.version}
                type="template"
                identifier={slug}
                initialTemplate={displayVersion.template}
                initialName={displayVersion.name}
                partials={activePartials}
              />
            ) : (
              <p className="text-zinc-500">No versions found for this template.</p>
            )}
          </div>

          <div>
            <VersionHistory
              versions={versions as any}
              type="template"
              identifier={slug}
              onSelect={(v) => setSelectedVersion(v.version)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TemplatePage() {
  return (
    <PasswordGate>
      <TemplateDetail />
    </PasswordGate>
  );
}
