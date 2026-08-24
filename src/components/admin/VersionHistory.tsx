"use client";

interface Version {
  _id: string;
  version: number;
  name: string;
  isActive: boolean;
  changeNote?: string;
  createdAt: number;
}

export function VersionHistory({
  versions,
  onSelect,
}: {
  versions: Version[];
  onSelect?: (version: Version) => void;
}) {
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
                  LEGACY ACTIVE
                </span>
              )}
            </div>
            <span className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              Release-managed
            </span>
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
