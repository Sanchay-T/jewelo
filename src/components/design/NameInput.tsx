"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAction } from "convex/react";
import { Sparkles, Check, Loader2 } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { transliterate } from "@/lib/transliterate";

interface NameInputProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  onTransliterated?: (transliterated: string) => void;
}

const limits: Record<string, number> = { en: 15, ar: 12, zh: 8 };
const placeholders: Record<string, string> = {
  en: "Enter your name",
  ar: "Type your name in English",
  zh: "Type your name in English",
};

export function NameInput({ value, onChange, language, onTransliterated }: NameInputProps) {
  const max = limits[language] || 15;
  const needsTransliteration = language === "ar" || language === "zh";

  const [aiResult, setAiResult] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [isRefined, setIsRefined] = useState(false);
  const aiCacheRef = useRef<Record<string, string>>({});
  const transliterateAction = useAction(api.transliterate.transliterate);

  // Layer 1: Instant local transliteration (Arabic only — no local map for Chinese)
  const localPreview = language === "ar" && value ? transliterate(value) : "";

  // The active preview: AI result if refined, otherwise local
  const activePreview = needsTransliteration
    ? (aiResult || localPreview)
    : "";

  // Push the active transliteration up to the parent
  useEffect(() => {
    onTransliterated?.(activePreview);
  }, [activePreview, onTransliterated]);

  // Reset AI state when name or language changes
  useEffect(() => {
    setAiResult("");
    setIsRefined(false);
  }, [value, language]);

  // Layer 2: AI refine on demand
  const handleRefine = useCallback(async () => {
    if (!value.trim() || !needsTransliteration || isRefining) return;

    const cacheKey = `${language}:${value}`;
    if (aiCacheRef.current[cacheKey]) {
      setAiResult(aiCacheRef.current[cacheKey]);
      setIsRefined(true);
      return;
    }

    setIsRefining(true);
    try {
      const result = await transliterateAction({
        name: value,
        targetLanguage: language,
      });
      aiCacheRef.current[cacheKey] = result;
      setAiResult(result);
      setIsRefined(true);
    } catch (err) {
      console.error("AI transliteration failed:", err);
    } finally {
      setIsRefining(false);
    }
  }, [value, language, needsTransliteration, isRefining, transliterateAction]);

  return (
    <div>
      <label className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-2 block">
        Name
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => e.target.value.length <= max && onChange(e.target.value)}
        placeholder={placeholders[language] || placeholders.en}
        className="w-full bg-white border border-warm rounded-lg px-4 py-3 text-text-primary focus:border-brown focus:ring-2 focus:ring-brown/10 outline-none"
      />
      <div className="flex items-center justify-between mt-1.5">
        {needsTransliteration && value ? (
          <div className="flex items-center gap-2">
            {activePreview ? (
              <p
                className={`${language === "ar" ? "font-arabic" : ""} text-text-secondary text-sm`}
                dir={language === "ar" ? "rtl" : "ltr"}
              >
                {activePreview}
              </p>
            ) : (
              <p className="text-text-tertiary text-xs">
                Tap refine for {language === "zh" ? "Chinese" : "Arabic"}
              </p>
            )}
            {/* AI refine button */}
            {isRefining ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-text-tertiary">
                <Loader2 className="w-3 h-3 animate-spin" />
              </span>
            ) : isRefined ? (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600">
                <Check className="w-3 h-3" /> AI
              </span>
            ) : (
              <button
                type="button"
                onClick={handleRefine}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-brown/10 text-brown hover:bg-brown/20 transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                Refine
              </button>
            )}
          </div>
        ) : (
          <span />
        )}
        <p className="text-text-tertiary text-[10px]">
          {value.length}/{max}
        </p>
      </div>
    </div>
  );
}
