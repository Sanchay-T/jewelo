"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Diamond,
  Heart,
  Minus,
  PencilSimple,
  Sparkle,
  SpinnerGap,
} from "@phosphor-icons/react";
import { AppShell } from "@/components/app-shell";
import { useJewelo } from "@/lib/jewelo-provider";
import {
  ARABIC_STYLE_OPTIONS,
  formatIdentity,
  isProviderSupportedArabicStyle,
} from "@/lib/ui-presentation";
import type {
  ArabicStyle,
  ChainStyle,
  DesignInput,
  Gemstone,
  Locale,
  MetalColor,
  PendantLayout,
  SizeProfile,
  StoneCoverage,
} from "@/lib/types";
import {
  CONSTRUCTION_STAGES,
  clearConfiguratorDraft,
  configuratorReviewSummary,
  isNameStageValid,
  navigationSequence,
  readConfiguratorDraft,
  writeConfiguratorDraft,
  type ConfiguratorDraftV1,
  type ConfiguratorStageId,
} from "./configurator-draft";

const layouts: Array<{ id: PendantLayout; label: string }> = [
  { id: "side-by-side", label: "Side by side" },
  { id: "connected-heart", label: "Connected heart" },
  { id: "stacked", label: "Stacked" },
  { id: "stacked-heart", label: "Stacked + heart" },
  { id: "infinity", label: "Infinity" },
  { id: "interlocked", label: "Interlocked" },
];

const sizeWidths: Partial<Record<SizeProfile, number>> = {
  delicate: 22,
  classic: 30,
  statement: 36,
};

function titleCaseOption(value: string) {
  return value
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

type ArabicReflectionStatus =
  "idle" | "refining" | "refined" | "edited" | "error";

async function refineArabicName(name: string, signal: AbortSignal) {
  const response = await fetch("/api/transliterate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
    signal,
  });
  if (!response.ok) throw new Error("Arabic refinement unavailable");
  const result = (await response.json()) as {
    arabicText?: unknown;
    model?: unknown;
  };
  if (typeof result.arabicText !== "string" || !result.arabicText.trim())
    throw new Error("Arabic refinement returned no spelling");
  return result.arabicText.trim();
}

function useArabicNameReflection(latinName: string, enabled: boolean) {
  const [arabicText, setArabicText] = useState("");
  const [status, setStatus] = useState<ArabicReflectionStatus>(() =>
    enabled && latinName.trim().length >= 2 ? "refining" : "idle",
  );
  const [retryToken, setRetryToken] = useState(0);
  const manuallyEdited = useRef(false);
  const restoredForName = useRef<string | null>(null);

  useEffect(() => {
    if (restoredForName.current === latinName) {
      restoredForName.current = null;
      return;
    }
    manuallyEdited.current = false;
    setArabicText("");
    setStatus(enabled && latinName.trim().length >= 2 ? "refining" : "idle");
  }, [enabled, latinName]);

  useEffect(() => {
    const name = latinName.trim();
    if (!enabled || name.length < 2 || manuallyEdited.current) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void refineArabicName(name, controller.signal)
        .then((refined) => {
          if (controller.signal.aborted || manuallyEdited.current) return;
          setArabicText(refined);
          setStatus("refined");
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          void error;
          setArabicText("");
          setStatus("error");
        });
    }, 650);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, latinName, retryToken]);

  const editArabicText = useCallback((value: string) => {
    manuallyEdited.current = true;
    setArabicText(value);
    setStatus("edited");
  }, []);

  const retry = useCallback(() => {
    manuallyEdited.current = false;
    setArabicText("");
    setStatus("refining");
    setRetryToken((current) => current + 1);
  }, []);

  const restore = useCallback(
    (
      value: string,
      restoredLatinName: string,
      restoredStatus: "refined" | "edited" = "refined",
    ) => {
      restoredForName.current = restoredLatinName;
      manuallyEdited.current = Boolean(value);
      setArabicText(value);
      setStatus(value ? restoredStatus : "idle");
    },
    [],
  );

  return { arabicText, editArabicText, restore, retry, status };
}

function Option<const T extends string>({
  selected,
  value,
  onSelect,
  children,
}: {
  selected: boolean;
  value: T;
  onSelect(value: T): void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className="clm-option"
      aria-pressed={selected}
      onClick={() => onSelect(value)}
    >
      {selected && <Check className="clm-check" size={14} weight="bold" />}
      {children}
    </button>
  );
}

export function NewDesignExperience({ locale }: { locale: Locale }) {
  const router = useRouter();
  const { client, createDesign } = useJewelo();
  const [stage, setStage] = useState<ConfiguratorStageId>("name-language");
  const [nameCount, setNameCount] = useState<1 | 2>(1);
  const [nameOne, setNameOne] = useState("Layla");
  const [nameTwo, setNameTwo] = useState("Mariam");
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const {
    arabicText: arabicOne,
    editArabicText: setArabicOne,
    restore: restoreArabicOne,
    retry: retryArabicOne,
    status: arabicOneStatus,
  } = useArabicNameReflection(nameOne, true);
  const {
    arabicText: arabicTwo,
    editArabicText: setArabicTwo,
    restore: restoreArabicTwo,
    retry: retryArabicTwo,
    status: arabicTwoStatus,
  } = useArabicNameReflection(nameTwo, nameCount === 2);
  const [arabicStyle, setArabicStyle] = useState<ArabicStyle>("contemporary");
  const [layout, setLayout] = useState<PendantLayout>("connected-heart");
  const [metal, setMetal] = useState<MetalColor>("yellow");
  const [coverage, setCoverage] = useState<StoneCoverage>("full-pave");
  const [gemstone, setGemstone] = useState<Gemstone>("lab-diamond");
  const [size, setSize] = useState<SizeProfile>("classic");
  const [chain, setChain] = useState<ChainStyle>("cable");
  const [chainLength, setChainLength] = useState<40 | 45 | 50 | 55>(45);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewFace, setPreviewFace] = useState<"front" | "side">("front");
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [draftRestored, setDraftRestored] = useState(false);
  const [reviewSent, setReviewSent] = useState(false);

  const displayOne =
    language === "ar" ? (nameOne.trim() ? arabicOne : "") : nameOne;
  const displayTwo =
    language === "ar" ? (nameTwo.trim() ? arabicTwo : "") : nameTwo;
  const resolvedLayout = nameCount === 1 ? "single-name" : layout;
  const identity = formatIdentity(
    nameCount === 1 ? [displayOne] : [displayOne, displayTwo],
    resolvedLayout,
  );
  const emptyIdentity = { inline: "", lines: ["", "", ""] };
  const selectedArabicStyle = ARABIC_STYLE_OPTIONS.find(
    (option) => option.id === arabicStyle,
  );
  const needsOperatorReview =
    language === "ar" &&
    (nameCount === 2 || !isProviderSupportedArabicStyle(arabicStyle));
  const arabicPreviewPending =
    language === "ar" &&
    (arabicOneStatus === "refining" ||
      (nameCount === 2 && arabicTwoStatus === "refining"));
  const previewScale =
    (size === "delicate" ? 0.82 : size === "statement" ? 1.12 : 1) *
    previewZoom;
  const previewScript =
    language === "ar"
      ? (selectedArabicStyle?.label ?? titleCaseOption(arabicStyle))
      : "English script";
  const sequence = useMemo(() => navigationSequence(language), [language]);
  const stageIndex = sequence.indexOf(stage);
  const safeStageIndex = stageIndex < 0 ? 0 : stageIndex;
  const constructionIndex =
    stage === "review"
      ? CONSTRUCTION_STAGES.length - 1
      : CONSTRUCTION_STAGES.findIndex((item) => item.id === stage);

  useEffect(() => {
    const draft = readConfiguratorDraft(window.sessionStorage);
    if (draft) {
      setStage(draft.stage);
      setNameCount(draft.nameCount);
      setNameOne(draft.nameOne);
      setNameTwo(draft.nameTwo);
      setLanguage(draft.language);
      setArabicStyle(draft.arabicStyle);
      setLayout(draft.layout);
      setMetal(draft.metal);
      setCoverage(draft.coverage);
      setGemstone(draft.gemstone);
      setSize(draft.size);
      setChain(draft.chain);
      setChainLength(draft.chainLength);
      restoreArabicOne(draft.arabicOne, draft.nameOne, draft.arabicOneStatus);
      restoreArabicTwo(draft.arabicTwo, draft.nameTwo, draft.arabicTwoStatus);
      setDraftRestored(true);
      return;
    }
    setDraftRestored(true);
  }, [restoreArabicOne, restoreArabicTwo]);

  useEffect(() => {
    if (!draftRestored) return;
    const draft: ConfiguratorDraftV1 = {
      version: 1,
      stage,
      nameCount,
      nameOne,
      nameTwo,
      language,
      arabicOne,
      arabicTwo,
      arabicOneStatus: arabicOneStatus === "edited" ? "edited" : "refined",
      arabicTwoStatus: arabicTwoStatus === "edited" ? "edited" : "refined",
      arabicStyle,
      layout,
      metal,
      coverage,
      gemstone,
      size,
      chain,
      chainLength,
    };
    writeConfiguratorDraft(window.sessionStorage, draft);
  }, [
    arabicOne,
    arabicOneStatus,
    arabicStyle,
    arabicTwo,
    arabicTwoStatus,
    chain,
    chainLength,
    coverage,
    draftRestored,
    gemstone,
    language,
    layout,
    metal,
    nameCount,
    nameOne,
    nameTwo,
    size,
    stage,
  ]);

  useEffect(() => {
    if (language === "en" && stage === "arabic-style") setStage("names-layout");
  }, [language, stage]);

  useEffect(() => {
    setConfirmed(false);
  }, [
    arabicOne,
    arabicStyle,
    arabicTwo,
    chain,
    chainLength,
    coverage,
    gemstone,
    language,
    layout,
    metal,
    nameCount,
    nameOne,
    nameTwo,
    size,
  ]);

  const namesValid = isNameStageValid({
    language,
    nameCount,
    nameOne,
    nameTwo,
    arabicOne,
    arabicTwo,
  });
  const primaryNameValid = Boolean(
    nameOne.trim() && (language === "en" || arabicOne.trim()),
  );
  const previewIdentity = namesValid ? identity : emptyIdentity;

  function stageIsValid(id: ConfiguratorStageId) {
    if (id === "name-language") return primaryNameValid;
    if (id === "names-layout") return namesValid;
    return true;
  }

  function updateNameOne(value: string) {
    setNameOne(value);
    if (!value.trim()) setArabicOne("");
  }

  function updateNameTwo(value: string) {
    setNameTwo(value);
    if (!value.trim()) setArabicTwo("");
  }

  function goBack() {
    if (safeStageIndex === 0) {
      router.push(`/${locale}`);
      return;
    }
    setStage(sequence[safeStageIndex - 1]!);
  }

  function goForward() {
    const next = sequence[safeStageIndex + 1];
    if (next && stageIsValid(stage)) setStage(next);
  }

  function buildSpecification(): DesignInput {
    const names =
      nameCount === 1
        ? ([
            {
              approvedEnglishText: nameOne,
              approvedArabicText: language === "ar" ? arabicOne : null,
            },
          ] as const)
        : ([
            {
              approvedEnglishText: nameOne,
              approvedArabicText: language === "ar" ? arabicOne : null,
            },
            {
              approvedEnglishText: nameTwo,
              approvedArabicText: language === "ar" ? arabicTwo : null,
            },
          ] as const);
    return {
      jewelryType: "name-pendant",
      nameCount,
      names,
      arabicStyle: language === "ar" ? arabicStyle : "none",
      layout: nameCount === 1 ? "single-name" : layout,
      source: "fresh",
      metalKarat: "18K",
      metalColor: metal,
      finish: "polished",
      stoneCoverage: coverage,
      gemstone: coverage === "none" ? "none" : gemstone,
      connector:
        nameCount === 1
          ? "none"
          : layout === "connected-heart" || layout === "stacked-heart"
            ? "heart"
            : layout === "infinity"
              ? "infinity"
              : layout === "interlocked"
                ? "interlocked"
                : "plain",
      sizeProfile: size,
      dimensions: {
        widthMm: size === "delicate" ? 22 : size === "classic" ? 30 : 36,
        heightMm: size === "delicate" ? 9 : size === "classic" ? 12 : 15,
        thicknessMm: 1.2,
      },
      chain: { style: chain, lengthCm: chainLength },
      complexity:
        coverage === "full-pave" ? 8 : coverage === "partial-pave" ? 6 : 4,
      spellingConfirmed: true,
    };
  }

  async function approve() {
    setSaving(true);
    setError(undefined);
    try {
      const design = await createDesign(buildSpecification());
      clearConfiguratorDraft(window.sessionStorage);
      const replay =
        process.env.NODE_ENV === "development" &&
        process.env.NEXT_PUBLIC_JEWELO_SCENARIOS === "1"
          ? "&replay=1"
          : "";
      router.push(`/${locale}/design/crafting?designId=${design.id}${replay}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The design could not be approved.",
      );
      setSaving(false);
    }
  }

  async function sendForAtelierReview() {
    setSaving(true);
    setError(undefined);
    try {
      const { spellingConfirmed, ...draftInput } = buildSpecification();
      void spellingConfirmed;
      const draft = await client.createDraft(draftInput);
      await client.updateDraft(draft.id, { spellingConfirmed: true });
      clearConfiguratorDraft(window.sessionStorage);
      setReviewSent(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The review request could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  const reviewSummary = configuratorReviewSummary({
    version: 1,
    stage,
    nameCount,
    nameOne,
    nameTwo,
    language,
    arabicOne,
    arabicTwo,
    arabicStyle,
    layout,
    metal,
    coverage,
    gemstone,
    size,
    chain,
    chainLength,
  });

  return (
    <AppShell locale={locale}>
      <main className="clm-config-page" dir={locale === "ar" ? "rtl" : "ltr"}>
        <div className="clm-config-progress">
          <span>
            {stage === "review"
              ? "Live Editor · Review"
              : `Step ${constructionIndex + 1} of ${CONSTRUCTION_STAGES.length}`}
          </span>
          <div>
            {CONSTRUCTION_STAGES.map((item, index) => {
              const notApplicable =
                item.id === "arabic-style" && language === "en";
              const futureLocked = !primaryNameValid
                ? index > 0
                : !namesValid
                  ? index > 2
                  : false;
              return (
                <button
                  key={item.id}
                  aria-label={`${item.label}${notApplicable ? ", not applicable for English" : ""}`}
                  aria-current={stage === item.id ? "step" : undefined}
                  data-active={
                    (index <= constructionIndex && !notApplicable) || undefined
                  }
                  data-not-applicable={notApplicable || undefined}
                  disabled={notApplicable || futureLocked}
                  onClick={() => setStage(item.id)}
                >
                  <i /> <small>{item.label}</small>
                </button>
              );
            })}
          </div>
        </div>
        <div className="clm-config-shell">
          <section className="clm-preview" aria-label="Live pendant preview">
            <Image
              src="/fixtures/layla-direction-1-product.png"
              alt="Live preview of the approved Caleums name pendant"
              fill
              priority
              sizes="(max-width: 799px) 100vw, 58vw"
            />
            <div className="clm-preview-badge">Live preview</div>
            <div
              className="clm-live-chain"
              data-chain={chain}
              data-metal={metal}
              aria-label={`${titleCaseOption(chain)} chain, ${chainLength} centimetres`}
            >
              <i />
              <span>
                {chain === "curb" ? "Fine curb" : titleCaseOption(chain)} ·{" "}
                {chainLength} cm
              </span>
              <i />
            </div>
            <div
              className="clm-live-name"
              data-metal={metal}
              data-stones={coverage}
              data-layout={nameCount === 1 ? "single-name" : layout}
              data-arabic-style={language === "ar" ? arabicStyle : undefined}
              data-size={size}
              data-gemstone={coverage === "none" ? "none" : gemstone}
              dir={language === "ar" ? "rtl" : "ltr"}
              aria-label={`Deterministic identity preview: ${previewIdentity.inline}`}
              style={{
                transform: `scale(${previewScale}) scaleX(${previewFace === "side" ? 0.22 : 1})`,
              }}
            >
              {arabicPreviewPending ? (
                <span className="clm-preview-loader" role="status">
                  <SpinnerGap className="clm-spin" size={30} />
                  Preparing Arabic spelling…
                </span>
              ) : (
                <>
                  {resolvedLayout === "stacked-heart" ? (
                    <div
                      className="clm-stacked-heart-simple"
                      aria-hidden="true"
                    >
                      <strong>{previewIdentity.lines[0]}</strong>
                      <Heart className="clm-heart-between" weight="light" />
                      <strong>{previewIdentity.lines[2]}</strong>
                    </div>
                  ) : (
                    previewIdentity.lines.map((line, index) => (
                      <strong key={`${line}-${index}`}>{line}</strong>
                    ))
                  )}
                  {coverage !== "none" && (
                    <small>
                      {coverage.replaceAll("-", " ")} ·{" "}
                      {gemstone.replaceAll("-", " ")}
                    </small>
                  )}
                </>
              )}
            </div>
            <div className="clm-preview-caption">
              <strong dir={language === "ar" ? "rtl" : "ltr"}>
                {arabicPreviewPending
                  ? "Preparing Arabic spelling…"
                  : previewIdentity.inline}
              </strong>
              <span>
                {previewScript} · {titleCaseOption(resolvedLayout)} · 18K{" "}
                {metal} gold
              </span>
              <div className="clm-preview-specs" aria-live="polite">
                <small>{titleCaseOption(coverage)}</small>
                <small>
                  {coverage === "none"
                    ? "No gemstone"
                    : titleCaseOption(gemstone)}
                </small>
                <small>
                  {titleCaseOption(size)} · {sizeWidths[size] ?? 30} mm
                </small>
                <small>
                  {chain === "curb" ? "Fine curb" : titleCaseOption(chain)} ·{" "}
                  {chainLength} cm
                </small>
              </div>
            </div>
            <div className="clm-view-controls">
              <button
                type="button"
                aria-pressed={previewZoom > 1}
                onClick={() =>
                  setPreviewZoom((current) => (current > 1 ? 1 : 1.15))
                }
              >
                Zoom
              </button>
              <button
                type="button"
                aria-pressed={previewFace === "front"}
                onClick={() => setPreviewFace("front")}
              >
                Front
              </button>
              <button
                type="button"
                aria-pressed={previewFace === "side"}
                onClick={() => setPreviewFace("side")}
              >
                Side
              </button>
            </div>
          </section>

          <section className="clm-controls">
            {stage === "name-language" && (
              <>
                <header>
                  <p className="clm-kicker">Name &amp; language</p>
                  <h1>Let’s start with your name</h1>
                  <p>Enter the exact spelling and choose its script.</p>
                </header>
                <label className="clm-label">
                  Enter your name
                  <input
                    value={nameOne}
                    maxLength={18}
                    onChange={(event) => updateNameOne(event.target.value)}
                  />
                </label>
                <fieldset className="clm-label clm-choice-fieldset">
                  <legend>Choose language / script</legend>
                  <span className="clm-segmented">
                    <button
                      type="button"
                      aria-pressed={language === "en"}
                      onClick={() => setLanguage("en")}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      aria-pressed={language === "ar"}
                      onClick={() => setLanguage("ar")}
                    >
                      العربية
                    </button>
                  </span>
                </fieldset>
                {language === "ar" && (
                  <div className="clm-arabic-approved" aria-live="polite">
                    <label className="clm-label" htmlFor="arabic-name-one">
                      <span className="clm-approved-label">
                        Approved Arabic spelling
                        {arabicOneStatus === "refined" && (
                          <small>
                            <Sparkle size={12} weight="fill" /> AI refined
                          </small>
                        )}
                        {arabicOneStatus === "edited" && (
                          <small>
                            <PencilSimple size={12} /> Edited by you
                          </small>
                        )}
                      </span>
                      <input
                        id="arabic-name-one"
                        dir="rtl"
                        value={arabicOne}
                        disabled={arabicOneStatus === "refining"}
                        placeholder={
                          arabicOneStatus === "refining"
                            ? "Luna is preparing the spelling…"
                            : undefined
                        }
                        onChange={(event) => setArabicOne(event.target.value)}
                      />
                    </label>
                    {arabicOneStatus === "refining" && (
                      <span className="clm-reflection-status">
                        <SpinnerGap className="clm-spin" size={14} />
                        Refining spelling…
                      </span>
                    )}
                    {arabicOneStatus === "error" && (
                      <button
                        type="button"
                        className="clm-inline-retry"
                        onClick={retryArabicOne}
                      >
                        Retry Arabic refinement
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            {stage === "arabic-style" && (
              <>
                <header>
                  <p className="clm-kicker">Arabic style</p>
                  <h1>Choose your Arabic style</h1>
                  <p>
                    Each style gives a distinct look and feel to your pendant.
                  </p>
                </header>
                <div className="clm-style-grid">
                  {ARABIC_STYLE_OPTIONS.map((item) => (
                    <Option
                      key={item.id}
                      value={item.id}
                      selected={arabicStyle === item.id}
                      onSelect={(value) => setArabicStyle(value as ArabicStyle)}
                    >
                      <strong dir="rtl">{arabicOne}</strong>
                      <span>{item.label}</span>
                      <small className="clm-support-note">
                        {item.providerSupported
                          ? "Supported"
                          : "Atelier review"}
                      </small>
                    </Option>
                  ))}
                </div>
                <p
                  className={
                    needsOperatorReview
                      ? "clm-support-message review"
                      : "clm-support-message"
                  }
                  role={needsOperatorReview ? "status" : undefined}
                >
                  {needsOperatorReview
                    ? `${selectedArabicStyle?.label} is reviewed by the atelier before any generation or provider spend.`
                    : "Classic and Minimal can proceed directly to generation."}
                </p>
              </>
            )}

            {stage === "names-layout" && (
              <>
                <header>
                  <p className="clm-kicker">Names &amp; layout</p>
                  <h1>One name or two?</h1>
                  <p>Confirm every name, then choose how they connect.</p>
                </header>
                <fieldset className="clm-label clm-choice-fieldset">
                  <legend>How many names?</legend>
                  <span className="clm-segmented">
                    <button
                      type="button"
                      aria-pressed={nameCount === 1}
                      onClick={() => setNameCount(1)}
                    >
                      One name
                    </button>
                    <button
                      type="button"
                      aria-pressed={nameCount === 2}
                      onClick={() => setNameCount(2)}
                    >
                      Two names
                    </button>
                  </span>
                </fieldset>
                <div className="clm-arabic-edits">
                  <label className="clm-label">
                    Name 1
                    <input
                      value={nameOne}
                      maxLength={18}
                      onChange={(event) => updateNameOne(event.target.value)}
                    />
                  </label>
                  {nameCount === 2 && (
                    <label className="clm-label">
                      Name 2
                      <input
                        value={nameTwo}
                        maxLength={18}
                        onChange={(event) => updateNameTwo(event.target.value)}
                      />
                    </label>
                  )}
                </div>
                {language === "ar" && (
                  <div className="clm-arabic-edits">
                    <label className="clm-label">
                      Approved Arabic spelling 1
                      <input
                        dir="rtl"
                        value={arabicOne}
                        disabled={arabicOneStatus === "refining"}
                        placeholder={
                          arabicOneStatus === "refining"
                            ? "Luna is preparing the spelling…"
                            : undefined
                        }
                        onChange={(event) => setArabicOne(event.target.value)}
                      />
                      {arabicOneStatus === "error" && (
                        <button
                          type="button"
                          className="clm-inline-retry"
                          onClick={retryArabicOne}
                        >
                          Retry Luna
                        </button>
                      )}
                    </label>
                    {nameCount === 2 && (
                      <label className="clm-label">
                        Approved Arabic spelling 2
                        <input
                          id="arabic-name-two"
                          dir="rtl"
                          value={arabicTwo}
                          disabled={arabicTwoStatus === "refining"}
                          placeholder={
                            arabicTwoStatus === "refining"
                              ? "Luna is preparing the spelling…"
                              : undefined
                          }
                          onChange={(event) => setArabicTwo(event.target.value)}
                        />
                        {arabicTwoStatus === "error" && (
                          <button
                            type="button"
                            className="clm-inline-retry"
                            onClick={retryArabicTwo}
                          >
                            Retry Luna
                          </button>
                        )}
                      </label>
                    )}
                  </div>
                )}
                {nameCount === 2 ? (
                  <div>
                    <p className="clm-label-heading">Choose your layout</p>
                    <div className="clm-layout-grid">
                      {layouts.map((item) => (
                        <Option
                          key={item.id}
                          value={item.id}
                          selected={layout === item.id}
                          onSelect={(value) =>
                            setLayout(value as PendantLayout)
                          }
                        >
                          <strong>
                            {formatIdentity(
                              [displayOne, displayTwo],
                              item.id,
                            ).lines.join("\n")}
                          </strong>
                          <span>{item.label}</span>
                        </Option>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="clm-support-message">
                    One name uses the classic single-name layout.
                  </p>
                )}
              </>
            )}

            {stage === "metal" && (
              <>
                <header>
                  <p className="clm-kicker">18K solid gold</p>
                  <h1>Choose your metal</h1>
                  <p>The beauty of fine gold, in your choice of colour.</p>
                </header>
                <div className="clm-metal-list">
                  {(["yellow", "white", "rose"] as MetalColor[]).map((item) => (
                    <Option
                      key={item}
                      value={item}
                      selected={metal === item}
                      onSelect={(value) => setMetal(value as MetalColor)}
                    >
                      <i data-metal={item} />
                      <div>
                        <strong>18K {item} gold</strong>
                        <span>Solid gold · polished finish</span>
                      </div>
                    </Option>
                  ))}
                </div>
              </>
            )}

            {stage === "stones" && (
              <>
                <header>
                  <p className="clm-kicker">Diamonds &amp; gemstones</p>
                  <h1>Add your light</h1>
                  <p>
                    Choose how much of the name should be set, then select your
                    stone.
                  </p>
                </header>
                <p className="clm-label-heading">Stone setting</p>
                <div className="clm-coverage-grid">
                  {(
                    [
                      "none",
                      "accent",
                      "partial-pave",
                      "full-pave",
                    ] as StoneCoverage[]
                  ).map((item) => (
                    <Option
                      key={item}
                      value={item}
                      selected={coverage === item}
                      onSelect={(value) => setCoverage(value as StoneCoverage)}
                    >
                      <span className="clm-stone-sample" aria-hidden="true">
                        {item === "none" ? (
                          <Minus size={24} />
                        ) : (
                          Array.from({
                            length:
                              item === "accent"
                                ? 1
                                : item === "partial-pave"
                                  ? 3
                                  : 5,
                          }).map((_, index) => (
                            <Sparkle key={index} size={15} weight="fill" />
                          ))
                        )}
                      </span>
                      <span>{item.replaceAll("-", " ")}</span>
                    </Option>
                  ))}
                </div>
                {coverage !== "none" && (
                  <>
                    <p className="clm-label-heading">Choose your stone</p>
                    <div className="clm-gem-grid">
                      {(
                        [
                          "lab-diamond",
                          "natural-diamond",
                          "ruby",
                          "emerald",
                          "blue-sapphire",
                          "pink-sapphire",
                        ] as Gemstone[]
                      ).map((item) => (
                        <Option
                          key={item}
                          value={item}
                          selected={gemstone === item}
                          onSelect={(value) => setGemstone(value as Gemstone)}
                        >
                          <Diamond
                            className="clm-gem-icon"
                            data-gem={item}
                            size={24}
                            weight="duotone"
                            aria-hidden="true"
                          />
                          <span>{item.replaceAll("-", " ")}</span>
                        </Option>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {stage === "size-chain" && (
              <>
                <header>
                  <p className="clm-kicker">Size &amp; chain</p>
                  <h1>Make it yours to wear</h1>
                  <p>Choose the scale of your pendant and how it sits.</p>
                </header>
                <p className="clm-label-heading">Pendant size</p>
                <div className="clm-three-grid">
                  {(["delicate", "classic", "statement"] as SizeProfile[]).map(
                    (item, index) => (
                      <Option
                        key={item}
                        value={item}
                        selected={size === item}
                        onSelect={(value) => setSize(value as SizeProfile)}
                      >
                        <strong>{item}</strong>
                        <span>~{[22, 30, 36][index]} mm</span>
                      </Option>
                    ),
                  )}
                </div>
                <p className="clm-label-heading">Chain style</p>
                <div className="clm-four-grid">
                  {(["cable", "rolo", "box", "curb"] as ChainStyle[]).map(
                    (item) => (
                      <Option
                        key={item}
                        value={item}
                        selected={chain === item}
                        onSelect={(value) => setChain(value as ChainStyle)}
                      >
                        <strong>{item === "curb" ? "Fine curb" : item}</strong>
                      </Option>
                    ),
                  )}
                </div>
                <p className="clm-label-heading">Chain length</p>
                <div className="clm-four-grid">
                  {([40, 45, 50, 55] as const).map((item) => (
                    <button
                      className="clm-option"
                      type="button"
                      key={item}
                      aria-pressed={chainLength === item}
                      onClick={() => setChainLength(item)}
                    >
                      {item} cm
                    </button>
                  ))}
                </div>
              </>
            )}

            {stage === "review" && !reviewSent && (
              <>
                <header>
                  <p className="clm-kicker">Review your design</p>
                  <h1>Every detail, exactly right</h1>
                  <p>
                    This approved spelling becomes the immutable identity of
                    your piece.
                  </p>
                </header>
                <dl className="clm-summary">
                  <div>
                    <dt>Names</dt>
                    <dd dir={language === "ar" ? "rtl" : "ltr"}>
                      {reviewSummary.names}
                    </dd>
                  </div>
                  <div>
                    <dt>Script</dt>
                    <dd>{reviewSummary.script}</dd>
                  </div>
                  <div>
                    <dt>Layout</dt>
                    <dd>{reviewSummary.layout}</dd>
                  </div>
                  <div>
                    <dt>Metal</dt>
                    <dd>{reviewSummary.metal}</dd>
                  </div>
                  <div>
                    <dt>Stones</dt>
                    <dd>{reviewSummary.stones}</dd>
                  </div>
                  <div>
                    <dt>Size &amp; chain</dt>
                    <dd>{reviewSummary.sizeAndChain}</dd>
                  </div>
                </dl>
                <label className="clm-confirm">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(event) => setConfirmed(event.target.checked)}
                  />
                  <span>
                    <strong>
                      I confirm the spelling shown above is correct.
                    </strong>
                    <small>
                      Custom jewellery cannot be changed once production begins.
                    </small>
                  </span>
                </label>
                <div className="clm-estimate">
                  <span>Price estimate</span>
                  <strong>Calculated after Studio verification</strong>
                  <small>
                    Your price estimate carries into the final quote.
                  </small>
                </div>
                {needsOperatorReview && (
                  <p className="clm-review-notice" role="status">
                    {nameCount === 2
                      ? "Two-name Arabic layouts enter operator review."
                      : "This style will enter operator review."}{" "}
                    Generation stays stopped until the atelier approves a
                    supported production path.
                  </p>
                )}
                {error && (
                  <p className="clm-error" role="alert">
                    {error}
                  </p>
                )}
              </>
            )}

            {stage === "review" && reviewSent && (
              <>
                <header>
                  <p className="clm-kicker">Atelier review</p>
                  <h1>Sent for atelier review</h1>
                  <p role="status">
                    Arabic ·{" "}
                    {selectedArabicStyle?.label ?? titleCaseOption(arabicStyle)}{" "}
                    is hand-finished by our atelier. We have your approved
                    spelling and will contact you before any piece is made.
                  </p>
                </header>
                <div className="clm-config-actions">
                  <button
                    type="button"
                    className="clm-primary"
                    onClick={() => setReviewSent(false)}
                  >
                    <ArrowLeft size={17} /> Back to design
                  </button>
                </div>
              </>
            )}

            {!reviewSent && (
              <div className="clm-config-actions">
                <button type="button" className="clm-back" onClick={goBack}>
                  <ArrowLeft size={17} /> Back
                </button>
                {stage !== "review" ? (
                  <button
                    type="button"
                    className="clm-primary"
                    aria-label={
                      stage === "size-chain" ? "Review identity" : "Continue"
                    }
                    disabled={!stageIsValid(stage)}
                    onClick={goForward}
                  >
                    Continue <ArrowRight size={17} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="clm-primary"
                    aria-label={
                      needsOperatorReview
                        ? "Send to atelier review"
                        : "Approve revision"
                    }
                    disabled={!confirmed || saving}
                    onClick={() => {
                      if (needsOperatorReview) {
                        void sendForAtelierReview();
                        return;
                      }
                      void approve();
                    }}
                  >
                    {saving
                      ? needsOperatorReview
                        ? "Sending…"
                        : "Approving…"
                      : needsOperatorReview
                        ? "Send for atelier review"
                        : "See my pendant"}{" "}
                    <ArrowRight size={17} />
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </AppShell>
  );
}
