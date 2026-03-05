"use client";

import { useState, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAdminPassword } from "./PasswordGate";
import yaml from "js-yaml";

export function YamlEditor({
  configKey,
  initialData,
}: {
  configKey: string;
  initialData: string;
}) {
  const password = useAdminPassword();
  const createConfig = useMutation(api.prompts.createConfigVersion);

  // Convert JSON string to YAML for editing
  const initialYaml = useMemo(() => {
    try {
      const parsed = JSON.parse(initialData);
      return yaml.dump(parsed, { lineWidth: 120, noRefs: true });
    } catch {
      return initialData;
    }
  }, [initialData]);

  const [yamlText, setYamlText] = useState(initialYaml);
  const [changeNote, setChangeNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Parse YAML to JSON for preview
  const { json, error } = useMemo(() => {
    try {
      const parsed = yaml.load(yamlText);
      return { json: JSON.stringify(parsed, null, 2), error: null };
    } catch (err: any) {
      return { json: null, error: err.message };
    }
  }, [yamlText]);

  const handleSave = async () => {
    if (!json) return;
    setSaving(true);
    try {
      await createConfig({
        password,
        key: configKey,
        data: json,
        changeNote: changeNote || undefined,
        activate: true,
      });
      setChangeNote("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const isDirty = yamlText !== initialYaml;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-zinc-400 block mb-1">YAML Editor</label>
        <textarea
          value={yamlText}
          onChange={(e) => setYamlText(e.target.value)}
          rows={20}
          className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-300 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          spellCheck={false}
        />
      </div>

      <div>
        <label className="text-sm text-zinc-400 block mb-1">Change Note (optional)</label>
        <input
          value={changeNote}
          onChange={(e) => setChangeNote(e.target.value)}
          placeholder="What changed?"
          className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !isDirty || !!error}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium py-3 rounded transition-colors min-h-[44px]"
      >
        {saving ? "Saving..." : saved ? "Saved!" : "Save New Version & Activate"}
      </button>

      <div>
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-2">
          JSON Preview
        </h3>
        {error ? (
          <div className="bg-red-900/30 border border-red-700 rounded p-3 text-red-300 text-sm font-mono">
            {error}
          </div>
        ) : (
          <pre className="bg-zinc-800 border border-zinc-700 rounded p-3 text-zinc-300 text-xs font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
            {json}
          </pre>
        )}
      </div>
    </div>
  );
}
