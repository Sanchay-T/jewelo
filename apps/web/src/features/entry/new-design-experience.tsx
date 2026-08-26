"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  ImageSquare,
  PenNib,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react";
import { AppShell } from "@/components/app-shell";
import {
  AdditionalInfoSection,
  type AdditionalInfo,
} from "@/components/design/additional-info-section";
import { CategoryPills } from "@/components/design/category-pills";
import { ComplexitySlider } from "@/components/design/complexity-slider";
import { DecorationSelector } from "@/components/design/decoration-selector";
import { FontStylePicker } from "@/components/design/font-style-picker";
import { GemstoneSelector } from "@/components/design/gemstone-selector";
import {
  MetalSelector,
  getGoldColor,
} from "@/components/design/metal-selector";
import {
  PendantLengthSelector,
  SizeSelector,
} from "@/components/design/size-selector";
import { StickyBottomBar } from "@/components/design/sticky-bottom-bar";
import { useJewelo } from "@/lib/jewelo-provider";
import { saveReference, validateReference } from "@/lib/reference-store";
import type { JewelrySpecification, Locale } from "@/lib/types";

const sources: Array<{
  id: JewelrySpecification["source"];
  title: string;
  detail: string;
  icon: typeof Camera;
}> = [
  {
    id: "inspiration",
    title: "Start with inspiration",
    detail:
      "Choose a visual mood while keeping your approved identity authoritative.",
    icon: ImageSquare,
  },
  {
    id: "upload",
    title: "Upload a reference",
    detail:
      "Use a photo or sketch as context. It never overrides the approved name.",
    icon: Camera,
  },
  {
    id: "fresh",
    title: "Begin from scratch",
    detail: "Define the exact name, material, scale, and style directly.",
    icon: PenNib,
  },
];

export function NewDesignExperience({ locale }: { locale: Locale }) {
  const router = useRouter();
  const { createDesign } = useJewelo();
  const [step, setStep] = useState(0);
  const [source, setSource] = useState<JewelrySpecification["source"]>("fresh");
  const [name, setName] = useState(locale === "ar" ? "ليلى" : "Layla");
  const [language, setLanguage] = useState<Locale>(locale);
  const [complexity, setComplexity] = useState(5);
  const [category, setCategory] = useState("Pendants");
  const [fontStyle, setFontStyle] = useState(
    locale === "ar" ? "naskh" : "script",
  );
  const [goldType, setGoldType] = useState("yellow");
  const [karat, setKarat] = useState("18K");
  const [size, setSize] = useState("medium");
  const [lengthMm, setLengthMm] = useState(20);
  const [gemstones, setGemstones] = useState<string[]>(["diamond"]);
  const [decoration, setDecoration] = useState("balanced");
  const [additional, setAdditional] = useState<AdditionalInfo>({});
  const [referenceName, setReferenceName] = useState<string>();
  const [error, setError] = useState<string>();
  const hasLocalFixture =
    language === "en" && name.trim().toLocaleLowerCase() === "layla";

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  async function chooseReference(file?: File) {
    if (!file) return;
    try {
      validateReference(file);
      await saveReference("draft-reference", file);
      setReferenceName(file.name);
      setError(undefined);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Reference could not be saved.",
      );
    }
  }

  const dropzone = useDropzone({
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    onDrop: (files) => void chooseReference(files[0]),
    onDropRejected: () =>
      setError("Choose one PNG, JPEG, or WebP image up to 5 MB."),
  });

  async function approve() {
    const approvedName = {
      approvedEnglishText: language === "en" ? name : null,
      approvedArabicText: language === "ar" ? name : null,
    };
    const design = await createDesign({
      jewelryType: "name-pendant",
      nameCount: 1,
      names: [approvedName],
      arabicStyle:
        language !== "ar"
          ? "none"
          : fontStyle === "diwani" || fontStyle === "kufi"
            ? fontStyle
            : "contemporary",
      layout: "single-name",
      source,
      referenceAsset: referenceName
        ? { id: "draft-reference", fileName: referenceName }
        : undefined,
      metalKarat: "18K",
      metalColor:
        goldType === "rose" || goldType === "white" ? goldType : "yellow",
      finish:
        additional.metalFinish === "matte" || additional.metalFinish === "satin"
          ? additional.metalFinish
          : "polished",
      stoneCoverage: gemstones.length ? "accent" : "none",
      gemstone:
        gemstones[0] === "ruby" || gemstones[0] === "emerald"
          ? gemstones[0]
          : gemstones[0] === "sapphire"
            ? "blue-sapphire"
            : gemstones.length
              ? "natural-diamond"
              : "none",
      connector:
        decoration === "minimal"
          ? "none"
          : decoration === "ornate"
            ? "interlocked"
            : "plain",
      sizeProfile:
        size === "small"
          ? "delicate"
          : size === "large"
            ? "statement"
            : "classic",
      dimensions: {
        widthMm: lengthMm,
        heightMm: Math.round(lengthMm * 0.45 * 10) / 10,
        thicknessMm: 1.2,
      },
      chain: { style: "cable", lengthCm: 45 },
      complexity,
      occasion: additional.occasion,
      notes: additional.notes,
      spellingConfirmed: true,
    });
    router.push(`/${locale}/design/crafting?designId=${design.id}`);
  }

  return (
    <AppShell locale={locale}>
      <main className="page-wrap">
        <button
          className="ghost-button"
          onClick={() => (step ? setStep(step - 1) : router.push(`/${locale}`))}
        >
          <ArrowLeft size={18} />
          Back
        </button>
        <div
          className="stepper"
          aria-label={`Step ${Math.min(step + 1, 3)} of 3`}
        >
          {["Inspiration", "Customize", "Approve"].map((label, index) => (
            <div
              className={`step ${index <= step ? "active" : ""}`}
              aria-current={index === step ? "step" : undefined}
              data-complete={index < step || undefined}
              key={label}
            >
              <span>{label}</span>
            </div>
          ))}
        </div>
        {step === 0 && (
          <>
            <header className="page-heading">
              <p className="eyebrow">Create a design</p>
              <h1 className="display">Where should we begin?</h1>
              <p>
                Choose the context for the design. You will approve the exact
                identity and specification before anything is generated.
              </p>
            </header>
            <div className="choice-grid">
              {sources.map((item) => (
                <button
                  className="choice-card"
                  key={item.id}
                  aria-pressed={source === item.id}
                  onClick={() => setSource(item.id)}
                >
                  <item.icon size={30} weight="duotone" />
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </button>
              ))}
            </div>
            {source === "upload" && (
              <div
                className="form-card upload-dropzone"
                style={{ marginTop: 16 }}
                {...dropzone.getRootProps()}
              >
                <input {...dropzone.getInputProps()} />
                <Camera size={26} />
                <strong>
                  {referenceName ??
                    (dropzone.isDragActive
                      ? "Drop your reference here"
                      : "Choose or drop a reference")}
                </strong>
                <span className="tiny muted">
                  PNG, JPEG, or WebP · up to 5 MB
                </span>
                {error && (
                  <p role="alert" style={{ color: "var(--danger)" }}>
                    {error}
                  </p>
                )}
              </div>
            )}
            <div className="form-actions">
              <button
                className="primary-button"
                disabled={source === "upload" && !referenceName}
                onClick={() => setStep(1)}
              >
                Continue
                <ArrowRight size={18} />
              </button>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <header className="page-heading">
              <p className="eyebrow">Approved specification</p>
              <h1 className="display">Make the intent explicit.</h1>
              <p>
                This information becomes an immutable revision. Generated
                imagery may interpret it, but may not rewrite it.
              </p>
            </header>
            <CategoryPills selected={category} onChange={setCategory} />
            <div className="customization-layout">
              <aside className="live-preview-card">
                <p className="eyebrow">Live preview</p>
                <div
                  className={`preview-name ${fontStyle}`}
                  dir={language === "ar" ? "rtl" : "ltr"}
                  style={{
                    color: getGoldColor(karat, goldType),
                    fontSize:
                      size === "small"
                        ? "2.2rem"
                        : size === "large"
                          ? "4.4rem"
                          : "3.4rem",
                  }}
                >
                  {name || (language === "ar" ? "اسمك" : "Your name")}
                </div>
                <span className="tiny muted">
                  {lengthMm} mm · {karat} {goldType} gold
                </span>
                <p className="tiny muted">
                  Preview shows typography and material intent; canonical
                  manufacturing geometry is created separately.
                </p>
              </aside>
              <section className="customization-controls">
                <div className="control-card identity-controls">
                  <label htmlFor="approved-name">
                    Exact approved name
                    <input
                      id="approved-name"
                      value={name}
                      maxLength={18}
                      dir={language === "ar" ? "rtl" : "ltr"}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </label>
                  <div className="segmented">
                    <button
                      type="button"
                      aria-pressed={language === "en"}
                      onClick={() => {
                        setLanguage("en");
                        setName("Layla");
                        setFontStyle("script");
                      }}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      aria-pressed={language === "ar"}
                      onClick={() => {
                        setLanguage("ar");
                        setName("ليلى");
                        setFontStyle("naskh");
                      }}
                    >
                      العربية
                    </button>
                  </div>
                </div>
                <FontStylePicker
                  name={name}
                  value={fontStyle}
                  onChange={setFontStyle}
                  language={language}
                  metalColor={getGoldColor(karat, goldType)}
                />
                <MetalSelector
                  karat={karat}
                  goldType={goldType}
                  onKaratChange={setKarat}
                  onGoldTypeChange={setGoldType}
                />
                <SizeSelector value={size} onChange={setSize} />
                <PendantLengthSelector
                  value={lengthMm}
                  onChange={setLengthMm}
                />
                <ComplexitySlider value={complexity} onChange={setComplexity} />
                <GemstoneSelector value={gemstones} onChange={setGemstones} />
                <DecorationSelector
                  value={decoration}
                  onChange={setDecoration}
                />
                <AdditionalInfoSection
                  value={additional}
                  onChange={setAdditional}
                />
              </section>
            </div>
            <div className="form-actions desktop-review-action">
              <button
                className="primary-button"
                disabled={!name.trim()}
                onClick={() => setStep(2)}
              >
                Review identity
                <ArrowRight size={18} />
              </button>
            </div>
            <StickyBottomBar>
              <button
                className="primary-button"
                disabled={!name.trim()}
                onClick={() => setStep(2)}
              >
                Review identity
                <ArrowRight size={18} />
              </button>
            </StickyBottomBar>
          </>
        )}
        {step === 2 && (
          <>
            <header className="page-heading">
              <p className="eyebrow">Final approval</p>
              <h1 className="display">Approve what must not drift.</h1>
              <p>
                Once approved, this revision will never change underneath a
                generation run.
              </p>
            </header>
            <section className="form-card">
              <div className="approval">
                <div>
                  <p className="eyebrow">Canonical identity</p>
                  <div
                    className="canonical-name"
                    dir={language === "ar" ? "rtl" : "ltr"}
                  >
                    {name}
                  </div>
                  <p className="muted tiny">
                    {language === "ar"
                      ? "Arabic · Noto Naskh"
                      : "English · connected script"}
                  </p>
                </div>
                <ShieldCheck
                  size={46}
                  weight="duotone"
                  color="var(--success)"
                />
              </div>
              <ul className="spec-list">
                <li>
                  <span>Piece</span>
                  <strong>Name pendant</strong>
                </li>
                <li>
                  <span>Metal</span>
                  <strong>
                    {karat} {goldType} gold
                  </strong>
                </li>
                <li>
                  <span>Finish</span>
                  <strong>{additional.metalFinish ?? "polished"}</strong>
                </li>
                <li>
                  <span>Stones</span>
                  <strong>
                    {gemstones.length ? gemstones.join(", ") : "none"}
                  </strong>
                </li>
                <li>
                  <span>Target width</span>
                  <strong>
                    {lengthMm} mm · {size}
                  </strong>
                </li>
                <li>
                  <span>Source</span>
                  <strong>{source}</strong>
                </li>
              </ul>
              <p className="tiny muted" style={{ marginTop: 18 }}>
                <Sparkle size={14} /> Visual fixtures are exploratory and are
                not manufacturing-ready geometry.
              </p>
              {!hasLocalFixture && (
                <p role="status" style={{ color: "var(--warning)" }}>
                  No identity-matched local media fixture exists for this
                  spelling and language. The studio will preserve the revision
                  and show unavailable representations.
                </p>
              )}
            </section>
            <div className="form-actions">
              <button className="primary-button" onClick={() => void approve()}>
                <ShieldCheck size={19} />
                Approve revision
              </button>
            </div>
          </>
        )}
      </main>
    </AppShell>
  );
}
