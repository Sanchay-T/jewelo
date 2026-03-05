"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAdminPassword } from "./PasswordGate";
import { TemplatePreview } from "./TemplatePreview";

const VARIABLE_REFERENCE = [
  { group: "Design", vars: ["name", "language", "font", "size", "karat", "style", "metalType", "jewelryType", "designStyle"] },
  { group: "Computed", vars: ["fontStyle", "decoration", "sizeFeel", "metalLabel", "background", "aesthetic", "chainDesc"] },
  { group: "Flags", vars: ["isNamePendant", "needsChain", "hasReference"] },
  { group: "Text", vars: ["charSpelling", "charCount", "languageNote", "spellingCheck", "referenceRule"] },
  { group: "Variation", vars: ["variationName", "variationCamera", "variationLighting", "variationFeel"] },
  { group: "Body", vars: ["bodyPart", "bodyFraming", "bodyPose", "bodyRules"] },
  { group: "Video", vars: ["videoMotion", "videoLighting"] },
];

const PARTIAL_SLUGS = ["textReference", "engravingPhysics", "absoluteRules", "onBody"];

export function TemplateEditor({
  type,
  identifier,
  initialTemplate,
  initialName,
  partials,
}: {
  type: "template" | "partial";
  identifier: string;
  initialTemplate: string;
  initialName: string;
  partials?: Array<{ slug: string; template: string }>;
}) {
  const password = useAdminPassword();
  const [template, setTemplate] = useState(initialTemplate);
  const [name, setName] = useState(initialName);
  const [changeNote, setChangeNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const createTemplate = useMutation(api.prompts.createTemplateVersion);
  const createPartial = useMutation(api.prompts.createPartialVersion);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (type === "template") {
        await createTemplate({
          password,
          slug: identifier,
          name,
          template,
          changeNote: changeNote || undefined,
          activate: true,
        });
      } else {
        await createPartial({
          password,
          slug: identifier,
          name,
          template,
          changeNote: changeNote || undefined,
          activate: true,
        });
      }
      setChangeNote("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const isDirty = template !== initialTemplate || name !== initialName;

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-zinc-400 block mb-1">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="text-sm text-zinc-400 block mb-1">Template</label>
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={20}
          className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-300 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          spellCheck={false}
        />
      </div>

      {/* Variable reference sidebar */}
      <details className="bg-zinc-800/50 border border-zinc-700 rounded-lg">
        <summary className="px-3 py-2 text-sm text-zinc-400 cursor-pointer hover:text-white">
          Variable Reference
        </summary>
        <div className="px-3 pb-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          {VARIABLE_REFERENCE.map((group) => (
            <div key={group.group}>
              <p className="text-zinc-500 font-medium mb-1">{group.group}</p>
              {group.vars.map((v) => (
                <code key={v} className="block text-blue-400 font-mono">
                  {`{{${v}}}`}
                </code>
              ))}
            </div>
          ))}
          <div>
            <p className="text-zinc-500 font-medium mb-1">Partials</p>
            {PARTIAL_SLUGS.map((s) => (
              <code key={s} className="block text-green-400 font-mono">
                {`{{> ${s}}}`}
              </code>
            ))}
          </div>
          <div>
            <p className="text-zinc-500 font-medium mb-1">Conditionals</p>
            <code className="block text-yellow-400 font-mono">{`{{#if var}}...{{/if}}`}</code>
            <code className="block text-yellow-400 font-mono">{`{{#unless var}}...{{/unless}}`}</code>
            <code className="block text-yellow-400 font-mono">{`{{else}}`}</code>
          </div>
        </div>
      </details>

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
        disabled={saving || !isDirty}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium py-3 rounded transition-colors min-h-[44px]"
      >
        {saving ? "Saving..." : saved ? "Saved!" : "Save New Version & Activate"}
      </button>

      <TemplatePreview template={template} partials={partials} />
    </div>
  );
}
