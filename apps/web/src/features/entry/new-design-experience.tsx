"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Diamond,
  Heart,
  Minus,
  PencilSimple,
  Plus,
  Sparkle,
  SpinnerGap,
  X,
} from "@phosphor-icons/react";
import { AppShell } from "@/components/app-shell";
import { useJewelo } from "@/lib/jewelo-provider";
import {
  ARABIC_STYLE_OPTIONS,
  CALEUMS_STARTING_PRICE,
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
  DEFAULT_CONFIGURATOR_DRAFT,
  LAYOUT_LABELS,
  PRIMARY_LAYOUTS,
  SECONDARY_LAYOUTS,
  SIZE_WIDTHS_MM,
  clearConfiguratorDraft,
  configuratorReviewSummary,
  isIdentityValid,
  readConfiguratorDraft,
  resolvedLayoutFor,
  writeConfiguratorDraft,
  type ConfiguratorDraftV2,
} from "./configurator-draft";

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

/**
 * Proposes an Arabic spelling for a Latin name. The customer remains the
 * spelling authority: an edited spelling is never overwritten.
 *
 * `enabled` gates the model call on Arabic being the chosen script. Together
 * with the two-character floor it means a visitor who lands on the page, or who
 * only ever wants English, never causes a provider call.
 */
function useArabicNameReflection(latinName: string, enabled: boolean) {
  const [arabicText, setArabicText] = useState("");
  const [status, setStatus] = useState<ArabicReflectionStatus>("idle");
  const [retryToken, setRetryToken] = useState(0);
  const manuallyEdited = useRef(false);
  const restoredForName = useRef<string | null>(null);
  // The name a spelling already exists for, so switching script back and forth
  // neither refetches nor discards an approved spelling.
  const reflectedName = useRef<string | null>(null);

  useEffect(() => {
    if (restoredForName.current === latinName) {
      restoredForName.current = null;
      return;
    }
    manuallyEdited.current = false;
    reflectedName.current = null;
    setArabicText("");
    setStatus("idle");
  }, [latinName]);

  useEffect(() => {
    const name = latinName.trim();
    if (!enabled || name.length < 2) return;
    if (manuallyEdited.current || reflectedName.current === name) return;
    const controller = new AbortController();
    setStatus("refining");
    const timer = window.setTimeout(() => {
      void refineArabicName(name, controller.signal)
        .then((refined) => {
          if (controller.signal.aborted || manuallyEdited.current) return;
          reflectedName.current = name;
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

  const editArabicText = useCallback(
    (value: string) => {
      manuallyEdited.current = true;
      reflectedName.current = latinName.trim();
      setArabicText(value);
      setStatus("edited");
    },
    [latinName],
  );

  const retry = useCallback(() => {
    manuallyEdited.current = false;
    reflectedName.current = null;
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
      reflectedName.current = value ? restoredLatinName.trim() : null;
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

function ApprovedSpellingField({
  id,
  label,
  value,
  status,
  onEdit,
  onRetry,
}: {
  id: string;
  label: string;
  value: string;
  status: ArabicReflectionStatus;
  onEdit(next: string): void;
  onRetry(): void;
}) {
  return (
    <div className="clm-arabic-approved" aria-live="polite">
      <label className="clm-label" htmlFor={id}>
        <span className="clm-approved-label">
          {label}
          {status === "refined" && (
            <small>
              <Sparkle size={12} weight="fill" /> AI refined
            </small>
          )}
          {status === "edited" && (
            <small>
              <PencilSimple size={12} /> Edited by you
            </small>
          )}
        </span>
        <input
          id={id}
          dir="rtl"
          value={value}
          disabled={status === "refining"}
          placeholder={
            status === "refining" ? "Preparing the spelling…" : undefined
          }
          onChange={(event) => onEdit(event.target.value)}
        />
      </label>
      {status === "refining" && (
        <span className="clm-reflection-status">
          <SpinnerGap className="clm-spin" size={14} />
          Refining spelling…
        </span>
      )}
      {status === "error" && (
        <span className="clm-reflection-status">
          <button type="button" className="clm-inline-retry" onClick={onRetry}>
            Retry Arabic refinement
          </button>
        </span>
      )}
    </div>
  );
}

export function NewDesignExperience({ locale }: { locale: Locale }) {
  const router = useRouter();
  const { client, createDesign } = useJewelo();
  const [nameCount, setNameCount] = useState<1 | 2>(
    DEFAULT_CONFIGURATOR_DRAFT.nameCount,
  );
  const [nameOne, setNameOne] = useState(DEFAULT_CONFIGURATOR_DRAFT.nameOne);
  const [nameTwo, setNameTwo] = useState(DEFAULT_CONFIGURATOR_DRAFT.nameTwo);
  const [language, setLanguage] = useState<"en" | "ar">(
    DEFAULT_CONFIGURATOR_DRAFT.language,
  );
  const {
    arabicText: arabicOne,
    editArabicText: setArabicOne,
    restore: restoreArabicOne,
    retry: retryArabicOne,
    status: arabicOneStatus,
  } = useArabicNameReflection(nameOne, language === "ar");
  const {
    arabicText: arabicTwo,
    editArabicText: setArabicTwo,
    restore: restoreArabicTwo,
    retry: retryArabicTwo,
    status: arabicTwoStatus,
  } = useArabicNameReflection(nameTwo, language === "ar" && nameCount === 2);
  const [arabicStyle, setArabicStyle] = useState<ArabicStyle>(
    DEFAULT_CONFIGURATOR_DRAFT.arabicStyle,
  );
  const [layout, setLayout] = useState<PendantLayout>(
    DEFAULT_CONFIGURATOR_DRAFT.layout,
  );
  const [metal, setMetal] = useState<MetalColor>(
    DEFAULT_CONFIGURATOR_DRAFT.metal,
  );
  const [coverage, setCoverage] = useState<StoneCoverage>(
    DEFAULT_CONFIGURATOR_DRAFT.coverage,
  );
  const [gemstone, setGemstone] = useState<Gemstone>(
    DEFAULT_CONFIGURATOR_DRAFT.gemstone,
  );
  const [size, setSize] = useState<SizeProfile>(
    DEFAULT_CONFIGURATOR_DRAFT.size,
  );
  const [chain, setChain] = useState<ChainStyle>(
    DEFAULT_CONFIGURATOR_DRAFT.chain,
  );
  const [chainLength, setChainLength] = useState<40 | 45 | 50 | 55>(
    DEFAULT_CONFIGURATOR_DRAFT.chainLength,
  );
  const [moreLayouts, setMoreLayouts] = useState(false);
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
  const resolvedLayout = resolvedLayoutFor({ nameCount, layout });
  const identity = formatIdentity(
    nameCount === 1 ? [displayOne] : [displayOne, displayTwo],
    resolvedLayout,
  );
  const selectedArabicStyle = ARABIC_STYLE_OPTIONS.find(
    (option) => option.id === arabicStyle,
  );
  // Two-name Arabic has no deterministic identity solution today
  // (`unsupported_arabic_two_name`), so it routes to the atelier instead of
  // generation. Surfaced at the affordance, not only at approval.
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

  useEffect(() => {
    const draft = readConfiguratorDraft(
      window.localStorage,
      window.sessionStorage,
    );
    if (draft) {
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
      // A restored layout must never be invisible behind the disclosure.
      if (SECONDARY_LAYOUTS.includes(draft.layout)) setMoreLayouts(true);
      restoreArabicOne(draft.arabicOne, draft.nameOne, draft.arabicOneStatus);
      restoreArabicTwo(draft.arabicTwo, draft.nameTwo, draft.arabicTwoStatus);
    }
    setDraftRestored(true);
  }, [restoreArabicOne, restoreArabicTwo]);

  useEffect(() => {
    if (!draftRestored) return;
    const draft: ConfiguratorDraftV2 = {
      version: 2,
      nameCount,
      nameOne,
      nameTwo,
      language,
      arabicOne,
      arabicTwo,
      arabicOneStatus:
        arabicOneStatus === "edited"
          ? "edited"
          : arabicOneStatus === "refined"
            ? "refined"
            : undefined,
      arabicTwoStatus:
        arabicTwoStatus === "edited"
          ? "edited"
          : arabicTwoStatus === "refined"
            ? "refined"
            : undefined,
      arabicStyle,
      layout,
      metal,
      coverage,
      gemstone,
      size,
      chain,
      chainLength,
    };
    writeConfiguratorDraft(window.localStorage, draft);
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
  ]);

  // The checkbox confirms the *spelling*, so only identity-affecting changes
  // invalidate it. Choosing a different chain must not silently untick it.
  useEffect(() => {
    setConfirmed(false);
  }, [
    arabicOne,
    arabicStyle,
    arabicTwo,
    language,
    layout,
    nameCount,
    nameOne,
    nameTwo,
  ]);

  const namesValid = isIdentityValid({
    language,
    nameCount,
    nameOne,
    nameTwo,
    arabicOne,
    arabicTwo,
  });
  const previewIdentity = namesValid
    ? identity
    : { inline: "", lines: ["", "", ""] };

  function updateNameOne(value: string) {
    setNameOne(value);
    if (!value.trim()) setArabicOne("");
  }

  function updateNameTwo(value: string) {
    setNameTwo(value);
    if (!value.trim()) setArabicTwo("");
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
      layout: resolvedLayout,
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

  function forgetDraft() {
    clearConfiguratorDraft(window.localStorage, window.sessionStorage);
  }

  async function approve() {
    setSaving(true);
    setError(undefined);
    try {
      const design = await createDesign(buildSpecification());
      forgetDraft();
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
      forgetDraft();
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
    version: 2,
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
  const visibleLayouts = moreLayouts
    ? [...PRIMARY_LAYOUTS, ...SECONDARY_LAYOUTS]
    : PRIMARY_LAYOUTS;

  if (reviewSent)
    return (
      <AppShell locale={locale}>
        <main className="clm-config-page" dir={locale === "ar" ? "rtl" : "ltr"}>
          <div className="clm-config-shell single">
            <section className="clm-controls" dir="ltr">
              <header>
                <p className="clm-kicker">Atelier review</p>
                <h1>Sent for atelier review</h1>
                <p role="status">
                  Two Arabic names are hand-finished by our atelier. We have your
                  approved spelling and will contact you before any piece is
                  made.
                </p>
              </header>
              <div className="clm-config-actions">
                <button
                  type="button"
                  className="clm-primary"
                  onClick={() => setReviewSent(false)}
                >
                  <ArrowLeft size={17} /> Back to my design
                </button>
              </div>
            </section>
          </div>
        </main>
      </AppShell>
    );

  return (
    <AppShell locale={locale}>
      <main className="clm-config-page" dir={locale === "ar" ? "rtl" : "ltr"}>
        <div className="clm-config-shell">
          <section className="clm-preview" aria-label="Live pendant preview">
            {/* Deliberately no photograph here: a fixture of somebody else's
                pendant used to bleed through under the visitor's own name. */}
            <div className="clm-preview-frame" aria-hidden="true" />
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
              data-layout={resolvedLayout}
              data-arabic-style={language === "ar" ? arabicStyle : undefined}
              data-size={size}
              data-gemstone={coverage === "none" ? "none" : gemstone}
              dir={language === "ar" ? "rtl" : "ltr"}
              aria-label={
                namesValid
                  ? `Deterministic identity preview: ${previewIdentity.inline}`
                  : "Identity preview, waiting for your name"
              }
              style={{
                transform: `scale(${previewScale}) scaleX(${previewFace === "side" ? 0.22 : 1})`,
              }}
            >
              {arabicPreviewPending ? (
                <span className="clm-preview-loader" role="status">
                  <SpinnerGap className="clm-spin" size={30} />
                  Preparing Arabic spelling…
                </span>
              ) : !namesValid ? (
                <span className="clm-preview-empty" dir="ltr">
                  Your name appears here
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
                  : previewIdentity.inline || "\u00A0"}
              </strong>
              <span dir="ltr">
                {previewScript} · {LAYOUT_LABELS[resolvedLayout]} · 18K {metal}{" "}
                gold
              </span>
              <div className="clm-preview-specs" aria-live="polite" dir="ltr">
                <small>
                  {coverage === "none" ? "No stones" : titleCaseOption(coverage)}
                </small>
                <small>
                  {coverage === "none"
                    ? "No gemstone"
                    : titleCaseOption(gemstone)}
                </small>
                <small>
                  {titleCaseOption(size)} · {SIZE_WIDTHS_MM[size]} mm
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

          {/* The page mirrors for Arabic, but this copy is still English:
              keeping it LTR stops trailing punctuation reordering into ".name" */}
          <section className="clm-controls" dir="ltr">
            <header>
              <p className="clm-kicker">Design your pendant</p>
              <h1>Your name, made precious</h1>
              <p>
                Everything is on this one page. Type a name, choose how it
                should look, and approve the spelling when it is exactly right.
              </p>
            </header>

            <section className="clm-config-block" aria-labelledby="block-name">
              <h2 id="block-name">
                <span>1</span> Your name
              </h2>
              <label className="clm-label">
                Name
                <input
                  value={nameOne}
                  maxLength={18}
                  autoComplete="off"
                  placeholder="Enter the exact spelling"
                  onChange={(event) => updateNameOne(event.target.value)}
                />
              </label>
              <fieldset className="clm-label clm-choice-fieldset">
                <legend>Script</legend>
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
              {language === "ar" && Boolean(nameOne.trim()) && (
                <ApprovedSpellingField
                  id="arabic-name-one"
                  label="Approved Arabic spelling"
                  value={arabicOne}
                  status={arabicOneStatus}
                  onEdit={setArabicOne}
                  onRetry={retryArabicOne}
                />
              )}

              {nameCount === 1 ? (
                <>
                  <button
                    type="button"
                    className="clm-add-name"
                    onClick={() => setNameCount(2)}
                  >
                    <Plus size={15} /> Add a second name
                  </button>
                  {language === "ar" && (
                    <small className="clm-field-hint">
                      Two Arabic names are finished by hand in our atelier
                      rather than generated, so they take a little longer.
                    </small>
                  )}
                </>
              ) : (
                <div className="clm-second-name">
                  <label className="clm-label">
                    Second name
                    <input
                      value={nameTwo}
                      maxLength={18}
                      autoComplete="off"
                      placeholder="Enter the exact spelling"
                      onChange={(event) => updateNameTwo(event.target.value)}
                    />
                  </label>
                  {language === "ar" && Boolean(nameTwo.trim()) && (
                    <ApprovedSpellingField
                      id="arabic-name-two"
                      label="Approved Arabic spelling, second name"
                      value={arabicTwo}
                      status={arabicTwoStatus}
                      onEdit={setArabicTwo}
                      onRetry={retryArabicTwo}
                    />
                  )}
                  <button
                    type="button"
                    className="clm-remove-name"
                    onClick={() => {
                      setNameCount(1);
                      updateNameTwo("");
                    }}
                  >
                    <X size={15} /> Remove the second name
                  </button>
                </div>
              )}
            </section>

            {language === "ar" ? (
              <section
                className="clm-config-block"
                aria-labelledby="block-style"
              >
                <h2 id="block-style">
                  <span>2</span> Design style
                </h2>
                <p className="clm-block-hint">
                  Six styles our atelier renders today.
                </p>
                <div className="clm-style-grid">
                  {ARABIC_STYLE_OPTIONS.map((item) => (
                    <Option
                      key={item.id}
                      value={item.id}
                      selected={arabicStyle === item.id}
                      onSelect={(value) => setArabicStyle(value as ArabicStyle)}
                    >
                      <strong dir="rtl">{arabicOne || item.sample}</strong>
                      <span>{item.label}</span>
                      <small className="clm-support-note">{item.blurb}</small>
                    </Option>
                  ))}
                </div>
              </section>
            ) : (
              <section
                className="clm-config-block"
                aria-labelledby="block-style"
              >
                <h2 id="block-style">
                  <span>2</span> Design style
                </h2>
                <p className="clm-block-hint">
                  English names are cut in our classical Latin script. Choose
                  العربية above to pick between six Arabic styles.
                </p>
              </section>
            )}

            {nameCount === 2 && (
              <section
                className="clm-config-block"
                aria-labelledby="block-layout"
              >
                <h2 id="block-layout">
                  <span>3</span> Layout
                </h2>
                <p className="clm-block-hint">How the two names sit together.</p>
                <div className="clm-layout-grid">
                  {visibleLayouts.map((item) => (
                    <Option
                      key={item}
                      value={item}
                      selected={layout === item}
                      onSelect={(value) => setLayout(value as PendantLayout)}
                    >
                      <strong>
                        {formatIdentity(
                          [displayOne || "Name", displayTwo || "Name"],
                          item,
                        ).lines.join("\n")}
                      </strong>
                      <span>{LAYOUT_LABELS[item]}</span>
                    </Option>
                  ))}
                </div>
                {!moreLayouts && (
                  <button
                    type="button"
                    className="clm-inline-more"
                    onClick={() => setMoreLayouts(true)}
                  >
                    <Plus size={14} /> More layouts
                  </button>
                )}
              </section>
            )}

            <section className="clm-config-block" aria-labelledby="block-metal">
              <h2 id="block-metal">
                <span>{nameCount === 2 ? 4 : 3}</span> Metal
              </h2>
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
            </section>

            {/* Stones, size and chain are defaulted and folded away. Nothing is
                removed from the draft or the API contract. */}
            <details className="clm-details-block">
              <summary>
                <span>
                  <strong>Stones, size and chain</strong>
                  <small>
                    {reviewSummary.stones} · {reviewSummary.sizeAndChain}
                  </small>
                </span>
              </summary>

              <p className="clm-label-heading">Stone setting</p>
              <div className="clm-coverage-grid">
                {(
                  ["none", "accent", "partial-pave", "full-pave"] as StoneCoverage[]
                ).map((item) => (
                  <Option
                    key={item}
                    value={item}
                    selected={coverage === item}
                    onSelect={(value) => {
                      const next = value as StoneCoverage;
                      setCoverage(next);
                      if (next !== "none" && gemstone === "none")
                        setGemstone("lab-diamond");
                    }}
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

              <p className="clm-label-heading">Pendant size</p>
              <div className="clm-three-grid">
                {(["delicate", "classic", "statement"] as SizeProfile[]).map(
                  (item) => (
                    <Option
                      key={item}
                      value={item}
                      selected={size === item}
                      onSelect={(value) => setSize(value as SizeProfile)}
                    >
                      <strong>{item}</strong>
                      <span>~{SIZE_WIDTHS_MM[item]} mm</span>
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
            </details>

            <section className="clm-review-strip" aria-labelledby="block-review">
              <h2 id="block-review">
                <span>
                  <Check size={13} weight="bold" />
                </span>{" "}
                Approve your design
              </h2>
              <dl className="clm-summary compact">
                <div>
                  <dt>Name</dt>
                  <dd dir={language === "ar" ? "rtl" : "ltr"}>
                    {reviewSummary.names || "—"}
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
                  disabled={!namesValid}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                <span>
                  <strong>I confirm the spelling shown above is correct.</strong>
                  <small>
                    This spelling becomes the immutable identity of your piece.
                    Custom jewellery cannot be changed once production begins.
                  </small>
                </span>
              </label>
              {needsOperatorReview && (
                <p className="clm-review-notice" role="status">
                  {nameCount === 2
                    ? "Two Arabic names enter atelier review."
                    : "This style enters atelier review."}{" "}
                  Generation stays stopped until the atelier approves a supported
                  production path.
                </p>
              )}
              {error && (
                <p className="clm-error" role="alert">
                  {error}
                </p>
              )}
            </section>

            {/* Estimate lives inside the action bar so the sticky bar can never
                cover the commercial information at the moment of approval. */}
            <div className="clm-config-actions">
              <div className="clm-actions-estimate">
                <span>Starting price</span>
                <strong>
                  {CALEUMS_STARTING_PRICE.currency}{" "}
                  {CALEUMS_STARTING_PRICE.amount.toLocaleString("en-AE")}
                </strong>
                <small>
                  Your estimate is calculated after Studio verification and
                  carries into the final quote.
                </small>
              </div>
              <button
                type="button"
                className="clm-primary"
                aria-label={
                  needsOperatorReview
                    ? "Send to atelier review"
                    : "Approve revision"
                }
                disabled={!namesValid || !confirmed || saving}
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
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
