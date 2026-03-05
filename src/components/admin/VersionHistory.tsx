"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAdminPassword } from "./PasswordGate";

interface Version {
  _id: string;
  version: number;
  name: string;
  isActive: boolean;
  changeNote?: string;
  createdAt: number;
}

type ActivateFn = typeof api.prompts.activateTemplateVersion
  | typeof api.prompts.activatePartialVersion
  | typeof api.prompts.activateConfigVersion;

export function VersionHistory({
  versions,
  type,
  identifier,
  onSelect,
}: {
  versions: Version[];
  type: "template" | "partial" | "config";
  identifier: string;
  onSelect?: (version: Version) => void;
}) {
  const password = useAdminPassword();

  const activateTemplate = useMutation(api.prompts.activateTemplateVersion);
  const activatePartial = useMutation(api.prompts.activatePartialVersion);
  const activateConfig = useMutation(api.prompts.activateConfigVersion);

  const handleActivate = async (version: number) => {
    const args = { password, version } as any;
    if (type === "template") {
      await activateTemplate({ ...args, slug: identifier });
    } else if (type === "partial") {
      await activatePartial({ ...args, slug: identifier });
    } else {
      await activateConfig({ ...args, key: identifier });
    }
  };

  const sorted = [...versions].sort((a, b) => b.version - a.version);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">
        Versions
      </h3>
      {sorted.map((v) => (
        <div
          key={v._id}
          className={`border rounded-lg p-3 cursor-pointer transition-colors ${
            v.isActive
              ? "border-blue-500 bg-blue-500/10"
              : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"
          }`}
          onClick={() => onSelect?.(v)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-white font-mono text-sm">v{v.version}</span>
              {v.isActive && (
                <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                  ACTIVE
                </span>
              )}
            </div>
            {!v.isActive && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleActivate(v.version);
                }}
                className="bg-zinc-700 hover:bg-zinc-600 text-white text-xs px-3 py-1.5 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                Activate
              </button>
            )}
          </div>
          <p className="text-zinc-400 text-sm mt-1">{v.name}</p>
          {v.changeNote && (
            <p className="text-zinc-500 text-xs mt-1">{v.changeNote}</p>
          )}
          <p className="text-zinc-600 text-xs mt-1">
            {new Date(v.createdAt).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
