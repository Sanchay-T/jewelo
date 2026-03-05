"use client";

import { useState, useMemo } from "react";
import Handlebars from "handlebars";

const SAMPLE_CONTEXT = {
  name: "Sophia",
  language: "en",
  font: "script",
  size: "medium",
  karat: "21K",
  style: "gold_only",
  metalType: "yellow",
  jewelryType: "name_pendant",
  designStyle: "minimalist",
  fontStyle: "elegant flowing cursive script with connected letter strokes and graceful loops",
  decoration: "pure polished gold with no stones — clean, elegant surfaces with mirror-like reflections and subtle brushed accents",
  sizeFeel: "balanced and versatile, approximately 18mm in height — the classic statement pendant size",
  metalLabel: "yellow",
  background: "dark emerald green velvet fabric background (#1B3D2F), slightly draped with soft folds catching ambient light, providing rich contrast against yellow gold",
  aesthetic: "minimalist",
  isNamePendant: true,
  needsChain: true,
  chainDesc: "Include a delicate matching 21K yellow gold chain with spring ring clasp. The chain attaches at both ends of the name.",
  charSpelling: "S — o — p — h — i — a",
  charCount: 6,
  languageNote: "This is Latin text. Render each character exactly as specified with correct kerning.",
  spellingCheck: "S - o - p - h - i - a = 6 characters",
  variationName: "Hero",
  variationCamera: "front-facing straight-on view, pendant centered in frame with even margins on all sides",
  variationLighting: "even diffused studio lighting with twin soft-boxes at 45 degrees, minimal shadows, clean white bounce fill from below",
  variationFeel: "clean catalog product shot — crisp, symmetrical, no drama, maximum clarity for e-commerce",
  bodyPart: "neck and upper chest",
  bodyFraming: "chin to clavicle, tight crop centering the name pendant on the chest so every letter of the name is visible and readable",
  bodyPose: "straight-on or slight 3/4 turn, relaxed shoulders, pendant resting naturally",
  bodyRules: "NO face above the lips, NO eyes, NO full head visible",
  hasReference: false,
  referenceRule: "",
  videoMotion: "the model subtly tilts her chin upward and turns slightly, the name pendant catches a warm glint of light as each gold letter rests against her collarbone",
  videoLighting: "warm golden-hour studio lighting, soft key light from upper left, gentle fill from right, warm skin tones, gold glowing with rich luster",
};

export function TemplatePreview({
  template,
  partials,
}: {
  template: string;
  partials?: Array<{ slug: string; template: string }>;
}) {
  const [error, setError] = useState<string | null>(null);

  const rendered = useMemo(() => {
    try {
      const hbs = Handlebars.create();
      if (partials) {
        for (const p of partials) {
          hbs.registerPartial(p.slug, p.template);
        }
      }
      const compiled = hbs.compile(template, { noEscape: true });
      const result = compiled(SAMPLE_CONTEXT);
      setError(null);
      return result;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, [template, partials]);

  return (
    <div>
      <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-2">
        Preview (sample data)
      </h3>
      {error ? (
        <div className="bg-red-900/30 border border-red-700 rounded p-3 text-red-300 text-sm font-mono">
          {error}
        </div>
      ) : (
        <pre className="bg-zinc-800 border border-zinc-700 rounded p-3 text-zinc-300 text-xs font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
          {rendered}
        </pre>
      )}
    </div>
  );
}
