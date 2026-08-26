"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ImageSquare,
  MagicWand,
  MagnifyingGlass,
  PencilSimple,
  Sparkle,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";
import { AppShell } from "@/components/app-shell";
import { useJewelo } from "@/lib/jewelo-provider";
import {
  loadReferenceUrl,
  saveReference,
  validateReference,
} from "@/lib/reference-store";
import {
  ARABIC_STYLE_OPTIONS,
  arabicStyleLabel,
  formatCaleumsPrice,
  formatIdentity,
  isProviderSupportedArabicStyle,
} from "@/lib/ui-presentation";
import type {
  ArabicStyle,
  ChainStyle,
  Gemstone,
  Locale,
  MetalColor,
  PendantLayout,
  SizeProfile,
  StoneCoverage,
} from "@/lib/types";

const stageNames = [
  "Name & script",
  "Inspiration",
  "Metal",
  "Stones",
  "Size & chain",
  "Review",
];
const layouts: Array<{ id: PendantLayout; label: string }> = [
  { id: "side-by-side", label: "Side by side" },
  { id: "connected-heart", label: "Connected heart" },
  { id: "stacked", label: "Stacked" },
  { id: "stacked-heart", label: "Stacked + heart" },
  { id: "infinity", label: "Infinity" },
  { id: "interlocked", label: "Interlocked" },
];
const inspirations = [
  {
    id: "studio",
    label: "Fine script",
    filter: "Minimal",
    src: "/fixtures/layla-direction-1-product.png",
  },
  {
    id: "worn",
    label: "On mood",
    filter: "Elegant",
    src: "/fixtures/layla-direction-1-worn.png",
  },
  {
    id: "botanical",
    label: "Botanical",
    filter: "Bold",
    src: "/fixtures/layla-direction-2-product.png",
  },
  {
    id: "diamond",
    label: "Diamond rhythm",
    filter: "Elegant",
    src: "/fixtures/layla-direction-3-product.png",
  },
  {
    id: "gallery",
    label: "Gallery minimal",
    filter: "Minimal",
    src: "/fixtures/layla-direction-4-product.png",
  },
];

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
  const { createDesign } = useJewelo();
  const [stage, setStage] = useState(0);
  const [nameCount, setNameCount] = useState<1 | 2>(1);
  const [nameOne, setNameOne] = useState("Layla");
  const [nameTwo, setNameTwo] = useState("Mariam");
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [arabicOne, setArabicOne] = useState("ليلى");
  const [arabicTwo, setArabicTwo] = useState("مريم");
  const [arabicStyle, setArabicStyle] = useState<ArabicStyle>("contemporary");
  const [layout, setLayout] = useState<PendantLayout>("connected-heart");
  const [source, setSource] = useState<"fresh" | "inspiration" | "upload">(
    "fresh",
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [selectedInspiration, setSelectedInspiration] = useState<string>();
  const [referenceName, setReferenceName] = useState<string>();
  const [referencePreview, setReferencePreview] = useState<string>();
  const [uploadError, setUploadError] = useState<string>();
  const [metal, setMetal] = useState<MetalColor>("yellow");
  const [coverage, setCoverage] = useState<StoneCoverage>("full-pave");
  const [gemstone, setGemstone] = useState<Gemstone>("lab-diamond");
  const [size, setSize] = useState<SizeProfile>("classic");
  const [chain, setChain] = useState<ChainStyle>("cable");
  const [chainLength, setChainLength] = useState<40 | 45 | 50 | 55>(45);
  const [previewRotation, setPreviewRotation] = useState(0);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewFace, setPreviewFace] = useState<"front" | "side">("front");
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (source !== "upload" || referencePreview) return;
    let active = true;
    void loadReferenceUrl("draft-reference").then((stored) => {
      if (!active || !stored) return;
      setReferenceName("Saved reference");
      setReferencePreview(stored.url);
    });
    return () => {
      active = false;
    };
  }, [referencePreview, source]);

  const displayOne = language === "ar" ? arabicOne : nameOne;
  const displayTwo = language === "ar" ? arabicTwo : nameTwo;
  const resolvedLayout = nameCount === 1 ? "single-name" : layout;
  const identity = formatIdentity(
    nameCount === 1 ? [displayOne] : [displayOne, displayTwo],
    resolvedLayout,
  );
  const selectedArabicStyle = ARABIC_STYLE_OPTIONS.find(
    (option) => option.id === arabicStyle,
  );
  const needsOperatorReview =
    language === "ar" &&
    (nameCount === 2 || !isProviderSupportedArabicStyle(arabicStyle));
  const operatorReviewReason =
    language === "ar" && nameCount === 2
      ? "Two-name Arabic layouts are reviewed by the atelier before any generation or provider spend."
      : `${selectedArabicStyle?.label} is reviewed by the atelier before any generation or provider spend.`;
  const previewImage = selectedInspiration
    ? inspirations.find((item) => item.id === selectedInspiration)?.src
    : "/fixtures/layla-direction-1-product.png";
  const filtered = useMemo(
    () =>
      inspirations.filter(
        (item) =>
          (filter === "All" || item.filter === filter) &&
          item.label.toLowerCase().includes(search.toLowerCase()),
      ),
    [filter, search],
  );

  async function receiveFile(file?: File) {
    if (!file) return;
    try {
      validateReference(file);
      await saveReference("draft-reference", file);
      setReferenceName(file.name);
      setReferencePreview(URL.createObjectURL(file));
      setUploadError(undefined);
      setSource("upload");
    } catch (caught) {
      setUploadError(
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
    onDrop: (files) => void receiveFile(files[0]),
    onDropRejected: () =>
      setUploadError("Choose one PNG, JPEG, or WebP image up to 5 MB."),
  });

  async function removeReference() {
    if (referencePreview) URL.revokeObjectURL(referencePreview);
    await new Promise<void>((resolve) => {
      const request = indexedDB.open("jewelo-ui-spike", 1);
      request.onerror = () => resolve();
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction("references", "readwrite");
        transaction.objectStore("references").delete("draft-reference");
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => {
          database.close();
          resolve();
        };
      };
    });
    setReferenceName(undefined);
    setReferencePreview(undefined);
  }

  function stageIsValid(index: number) {
    if (index === 0)
      return Boolean(
        nameOne.trim() &&
        (nameCount === 1 || nameTwo.trim()) &&
        (language === "en" ||
          (arabicOne.trim() && (nameCount === 1 || arabicTwo.trim()))),
      );
    if (index === 1) return source !== "upload" || Boolean(referenceName);
    return true;
  }

  async function approve() {
    setSaving(true);
    setError(undefined);
    try {
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
      const design = await createDesign({
        jewelryType: "name-pendant",
        nameCount,
        names,
        arabicStyle: language === "ar" ? arabicStyle : "none",
        layout: nameCount === 1 ? "single-name" : layout,
        source,
        referenceAsset: referenceName
          ? { id: "draft-reference", fileName: referenceName }
          : selectedInspiration
            ? {
                id: selectedInspiration,
                fileName: `${selectedInspiration}.png`,
              }
            : undefined,
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
        notes: selectedInspiration
          ? `Inspiration: ${selectedInspiration}`
          : undefined,
        spellingConfirmed: true,
      });
      router.push(`/${locale}/design/crafting?designId=${design.id}`);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The design could not be approved.",
      );
      setSaving(false);
    }
  }

  return (
    <AppShell locale={locale}>
      <main className="clm-config-page" dir={locale === "ar" ? "rtl" : "ltr"}>
        <div className="clm-config-progress">
          <span>Step {stage + 1} of 6</span>
          <div>
            {stageNames.map((label, index) => (
              <button
                key={label}
                aria-label={`Go to ${label}`}
                aria-current={stage === index ? "step" : undefined}
                data-active={index <= stage || undefined}
                disabled={
                  index > stage && (index !== stage + 1 || !stageIsValid(stage))
                }
                onClick={() => {
                  if (
                    index <= stage ||
                    (index === stage + 1 && stageIsValid(stage))
                  )
                    setStage(index);
                }}
              >
                <i /> <small>{label}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="clm-config-shell">
          <section className="clm-preview" aria-label="Live pendant preview">
            <Image
              src={previewImage ?? "/fixtures/layla-direction-1-product.png"}
              alt="Live preview of the approved Caleums name pendant"
              fill
              priority
              sizes="(max-width: 799px) 100vw, 58vw"
            />
            <div className="clm-preview-badge">Live preview</div>
            <div
              className="clm-live-name"
              data-metal={metal}
              data-stones={coverage}
              data-layout={nameCount === 1 ? "single-name" : layout}
              dir={language === "ar" ? "rtl" : "ltr"}
              aria-label={`Deterministic identity preview: ${identity.inline}`}
              style={{
                transform: `rotate(${previewRotation}deg) scale(${previewZoom}) scaleX(${previewFace === "side" ? 0.22 : 1})`,
              }}
            >
              {identity.lines.map((line, index) => (
                <strong key={`${line}-${index}`}>{line}</strong>
              ))}
              {coverage !== "none" && (
                <small>
                  {coverage.replaceAll("-", " ")} ·{" "}
                  {gemstone.replaceAll("-", " ")}
                </small>
              )}
            </div>
            <div className="clm-preview-caption">
              <strong dir={language === "ar" ? "rtl" : "ltr"}>
                {identity.inline}
              </strong>
              <span>
                18K {metal} gold · {coverage.replaceAll("-", " ")} ·{" "}
                {chainLength} cm
              </span>
            </div>
            <div className="clm-view-controls">
              <button
                type="button"
                onClick={() => setPreviewRotation((current) => current + 12)}
              >
                Rotate
              </button>
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
            {stage === 0 && (
              <>
                <header>
                  <p className="clm-kicker">Create your name</p>
                  <h1>Let’s start with your name</h1>
                  <p>Choose the exact letters that will become your pendant.</p>
                </header>
                <label className="clm-label">
                  How many names?
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
                </label>
                <label className="clm-label">
                  Name 1
                  <input
                    value={nameOne}
                    maxLength={18}
                    onChange={(event) => setNameOne(event.target.value)}
                  />
                </label>
                {nameCount === 2 && (
                  <label className="clm-label">
                    Name 2
                    <input
                      value={nameTwo}
                      maxLength={18}
                      onChange={(event) => setNameTwo(event.target.value)}
                    />
                  </label>
                )}
                <label className="clm-label">
                  Choose language / script
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
                </label>
                <div className="clm-suggestion">
                  <div>
                    <span>Suggested Arabic spelling</span>
                    <strong dir="rtl">{arabicOne}</strong>
                  </div>
                  <button
                    type="button"
                    aria-label="Edit suggested Arabic spelling"
                    onClick={() =>
                      document.getElementById("arabic-name-one")?.focus()
                    }
                  >
                    <PencilSimple size={17} />
                  </button>
                </div>
                {language === "ar" && (
                  <div className="clm-arabic-edits">
                    <label className="clm-label">
                      Approved Arabic spelling 1
                      <input
                        id="arabic-name-one"
                        dir="rtl"
                        value={arabicOne}
                        onChange={(event) => setArabicOne(event.target.value)}
                      />
                    </label>
                    {nameCount === 2 && (
                      <label className="clm-label">
                        Approved Arabic spelling 2
                        <input
                          id="arabic-name-two"
                          dir="rtl"
                          value={arabicTwo}
                          onChange={(event) => setArabicTwo(event.target.value)}
                        />
                      </label>
                    )}
                  </div>
                )}
                {language === "ar" && (
                  <div>
                    <p className="clm-label-heading">
                      Choose your Arabic style
                    </p>
                    <div className="clm-style-grid">
                      {ARABIC_STYLE_OPTIONS.map((item) => (
                        <Option
                          key={item.id}
                          value={item.id}
                          selected={arabicStyle === item.id}
                          onSelect={(value) =>
                            setArabicStyle(value as ArabicStyle)
                          }
                        >
                          <strong dir="rtl">{item.sample}</strong>
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
                        ? operatorReviewReason
                        : "Classic and Minimal can proceed directly to generation."}
                    </p>
                  </div>
                )}
                {nameCount === 2 && (
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
                )}
              </>
            )}

            {stage === 1 && (
              <>
                <header>
                  <p className="clm-kicker">Find your direction</p>
                  <h1>Choose how to begin</h1>
                  <p>
                    Start fresh, find a mood, or bring a reference of your own.
                  </p>
                </header>
                <div className="clm-source-tabs">
                  <Option
                    value="fresh"
                    selected={source === "fresh"}
                    onSelect={(value) => setSource(value as typeof source)}
                  >
                    <Sparkle size={21} />
                    <span>Fresh</span>
                  </Option>
                  <Option
                    value="inspiration"
                    selected={source === "inspiration"}
                    onSelect={(value) => setSource(value as typeof source)}
                  >
                    <ImageSquare size={21} />
                    <span>Inspiration</span>
                  </Option>
                  <Option
                    value="upload"
                    selected={source === "upload"}
                    onSelect={(value) => setSource(value as typeof source)}
                  >
                    <Camera size={21} />
                    <span>Upload</span>
                  </Option>
                </div>
                {source === "fresh" && (
                  <div className="clm-inspire-card">
                    <MagicWand size={30} />
                    <div>
                      <strong>I know the details I want</strong>
                      <p>
                        Continue with your selected script, layout, and
                        material.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="clm-secondary"
                      onClick={() => {
                        setSource("inspiration");
                        setSelectedInspiration("studio");
                      }}
                    >
                      Inspire me
                    </button>
                  </div>
                )}
                {source === "inspiration" && (
                  <>
                    <div className="clm-search">
                      <MagnifyingGlass size={18} />
                      <input
                        aria-label="Search inspiration"
                        placeholder="Search styles"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                      />
                    </div>
                    <div className="clm-filters">
                      {["All", "Minimal", "Elegant", "Bold"].map((item) => (
                        <button
                          type="button"
                          key={item}
                          aria-pressed={filter === item}
                          onClick={() => setFilter(item)}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                    <div className="clm-template-grid">
                      {filtered.map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          aria-pressed={selectedInspiration === item.id}
                          onClick={() => setSelectedInspiration(item.id)}
                        >
                          <Image
                            src={item.src}
                            alt={`${item.label} pendant inspiration`}
                            width={190}
                            height={150}
                          />
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                    {selectedInspiration && (
                      <div className="clm-selected-ref">
                        <Image
                          src={
                            inspirations.find(
                              (item) => item.id === selectedInspiration,
                            )?.src ?? ""
                          }
                          alt="Selected reference"
                          width={60}
                          height={60}
                        />
                        <div>
                          <span>Selected reference</span>
                          <strong>
                            {
                              inspirations.find(
                                (item) => item.id === selectedInspiration,
                              )?.label
                            }
                          </strong>
                        </div>
                        <button
                          type="button"
                          aria-label="Remove selected reference"
                          onClick={() => setSelectedInspiration(undefined)}
                        >
                          <Trash size={18} />
                        </button>
                      </div>
                    )}
                  </>
                )}
                {source === "upload" && (
                  <div className="clm-upload" {...dropzone.getRootProps()}>
                    <input {...dropzone.getInputProps()} />
                    {referencePreview ? (
                      <Image
                        src={referencePreview}
                        alt="Uploaded reference preview"
                        width={120}
                        height={120}
                        unoptimized
                      />
                    ) : (
                      <UploadSimple size={30} />
                    )}
                    <strong>
                      {referenceName ??
                        (dropzone.isDragActive
                          ? "Drop your reference here"
                          : "Choose or drop a reference")}
                    </strong>
                    <span>PNG, JPEG or WebP · up to 5 MB</span>
                    {referenceName && (
                      <button
                        type="button"
                        className="clm-secondary"
                        onClick={(event) => {
                          event.stopPropagation();
                          void removeReference();
                        }}
                      >
                        Remove
                      </button>
                    )}
                    {uploadError && <p role="alert">{uploadError}</p>}
                  </div>
                )}
              </>
            )}

            {stage === 2 && (
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

            {stage === 3 && (
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
                      <span className="clm-stone-sample">
                        {item === "none"
                          ? "—"
                          : item === "accent"
                            ? "✦"
                            : item === "partial-pave"
                              ? "✦✦✦—"
                              : "✦✦✦✦✦"}
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
                          <i data-gem={item} />
                          <span>{item.replaceAll("-", " ")}</span>
                        </Option>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {stage === 4 && (
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

            {stage === 5 && (
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
                      {identity.inline}
                    </dd>
                  </div>
                  <div>
                    <dt>Script</dt>
                    <dd>
                      {arabicStyleLabel(
                        language === "ar" ? arabicStyle : "none",
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Layout</dt>
                    <dd>
                      {nameCount === 1
                        ? "Single name"
                        : layout.replaceAll("-", " ")}
                    </dd>
                  </div>
                  <div>
                    <dt>Metal</dt>
                    <dd>18K {metal} gold</dd>
                  </div>
                  <div>
                    <dt>Stones</dt>
                    <dd>
                      {coverage.replaceAll("-", " ")} ·{" "}
                      {coverage === "none"
                        ? "none"
                        : gemstone.replaceAll("-", " ")}
                    </dd>
                  </div>
                  <div>
                    <dt>Size &amp; chain</dt>
                    <dd>
                      {size} (
                      {size === "delicate" ? 22 : size === "classic" ? 30 : 36}{" "}
                      mm) · {chain} · {chainLength} cm
                    </dd>
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
                  <span>Indicative price</span>
                  <strong>{formatCaleumsPrice()}</strong>
                  <small>Final quote follows atelier review</small>
                </div>
                {needsOperatorReview && (
                  <p className="clm-review-notice" role="status">
                    This design will enter operator review. Generation stays
                    stopped until the atelier approves a supported production
                    path.
                  </p>
                )}
                {error && (
                  <p className="clm-error" role="alert">
                    {error}
                  </p>
                )}
              </>
            )}

            <div className="clm-config-actions">
              <button
                type="button"
                className="clm-back"
                onClick={() =>
                  stage === 0 ? router.push(`/${locale}`) : setStage(stage - 1)
                }
              >
                <ArrowLeft size={17} /> Back
              </button>
              {stage < 5 ? (
                <button
                  type="button"
                  className="clm-primary"
                  aria-label={stage === 4 ? "Review identity" : "Continue"}
                  disabled={!stageIsValid(stage)}
                  onClick={() => setStage(stage + 1)}
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
                      router.push(
                        `/${locale}/operator?review=${nameCount === 2 ? "arabic-two-name" : "arabic-style"}&style=${encodeURIComponent(arabicStyle)}`,
                      );
                      return;
                    }
                    void approve();
                  }}
                >
                  {saving
                    ? "Approving…"
                    : needsOperatorReview
                      ? "Send for atelier review"
                      : "See my pendant"}{" "}
                  <ArrowRight size={17} />
                </button>
              )}
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
