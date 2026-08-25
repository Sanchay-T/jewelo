"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Camera, ImageSquare, PenNib, ShieldCheck, Sparkle } from "@phosphor-icons/react";
import { AppShell } from "./app-shell";
import { useJewelo } from "@/lib/jewelo-provider";
import { saveReference, validateReference } from "@/lib/reference-store";
import type { JewelrySpecification, Locale } from "@/lib/types";

const sources: Array<{ id: JewelrySpecification["source"]; title: string; detail: string; icon: typeof Camera }> = [
  { id: "inspiration", title: "Start with inspiration", detail: "Choose a visual mood while keeping your approved identity authoritative.", icon: ImageSquare },
  { id: "upload", title: "Upload a reference", detail: "Use a photo or sketch as context. It never overrides the approved name.", icon: Camera },
  { id: "fresh", title: "Begin from scratch", detail: "Define the exact name, material, scale, and style directly.", icon: PenNib },
];

export function NewDesignExperience({ locale }: { locale: Locale }) {
  const router = useRouter();
  const { createDesign } = useJewelo();
  const [step, setStep] = useState(0);
  const [source, setSource] = useState<JewelrySpecification["source"]>("fresh");
  const [name, setName] = useState(locale === "ar" ? "ليلى" : "Layla");
  const [language, setLanguage] = useState<Locale>(locale);
  const [complexity, setComplexity] = useState(5);
  const [stones, setStones] = useState<JewelrySpecification["stones"]>("diamond accents");
  const [referenceName, setReferenceName] = useState<string>();
  const [error, setError] = useState<string>();
  const hasLocalFixture = language === "en" && name.trim().toLocaleLowerCase() === "layla";

  async function chooseReference(file?: File) {
    if (!file) return;
    try {
      validateReference(file);
      await saveReference("draft-reference", file);
      setReferenceName(file.name);
      setError(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Reference could not be saved.");
    }
  }

  function approve() {
    const design = createDesign({ approvedText: name, language, source, referenceName, complexity, stones });
    router.push(`/${locale}/studio/${design.id}`);
  }

  return (
    <AppShell locale={locale}>
      <main className="page-wrap">
        <button className="ghost-button" onClick={() => step ? setStep(step - 1) : router.push(`/${locale}`)}><ArrowLeft size={18} />Back</button>
        <div className="stepper" aria-label={`Step ${step + 1} of 3`}>
          {["Source", "Specification", "Approve"].map((label, index) => <div className={`step ${index <= step ? "active" : ""}`} aria-current={index === step ? "step" : undefined} data-complete={index < step || undefined} key={label}><span>{label}</span></div>)}
        </div>
        {step === 0 && (
          <>
            <header className="page-heading"><p className="eyebrow">Create a design</p><h1 className="display">Where should we begin?</h1><p>Choose the context for the design. You will approve the exact identity and specification before anything is generated.</p></header>
            <div className="choice-grid">
              {sources.map((item) => <button className="choice-card" key={item.id} aria-pressed={source === item.id} onClick={() => setSource(item.id)}><item.icon size={30} weight="duotone" /><strong>{item.title}</strong><small>{item.detail}</small></button>)}
            </div>
            {source === "upload" && <div className="form-card" style={{ marginTop: 16 }}><label className="secondary-button" style={{ cursor: "pointer" }}><Camera size={18} />{referenceName ?? "Choose PNG, JPEG, or WebP"}<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => chooseReference(event.target.files?.[0])} /></label>{error && <p role="alert" style={{ color: "var(--danger)" }}>{error}</p>}</div>}
            <div className="form-actions"><button className="primary-button" disabled={source === "upload" && !referenceName} onClick={() => setStep(1)}>Continue<ArrowRight size={18} /></button></div>
          </>
        )}
        {step === 1 && (
          <>
            <header className="page-heading"><p className="eyebrow">Approved specification</p><h1 className="display">Make the intent explicit.</h1><p>This information becomes an immutable revision. Generated imagery may interpret it, but may not rewrite it.</p></header>
            <section className="form-card">
              <div className="form-grid">
                <div className="field full"><label htmlFor="approved-name">Exact approved name</label><input id="approved-name" className="input" value={name} maxLength={18} dir={language === "ar" ? "rtl" : "ltr"} onChange={(event) => setName(event.target.value)} /></div>
                <p className="tiny muted field full">This disposable spike includes verified media only for the English identity “Layla.” Other approved identities remain valid revisions, but their representation tasks are honestly marked unavailable.</p>
                <div className="field"><label>Language</label><div className="segmented"><button aria-pressed={language === "en"} onClick={() => { setLanguage("en"); setName("Layla"); }}>English</button><button aria-pressed={language === "ar"} onClick={() => { setLanguage("ar"); setName("ليلى"); }}>العربية</button></div></div>
                <div className="field"><label>Stone direction</label><div className="segmented"><button aria-pressed={stones === "diamond accents"} onClick={() => setStones("diamond accents")}>Diamond accents</button><button aria-pressed={stones === "none"} onClick={() => setStones("none")}>No stones</button></div></div>
                <div className="field full"><label htmlFor="complexity">Complexity · {complexity}/10</label><input id="complexity" type="range" min="1" max="10" value={complexity} onChange={(event) => setComplexity(Number(event.target.value))} /></div>
              </div>
            </section>
            <div className="form-actions"><button className="primary-button" disabled={!name.trim()} onClick={() => setStep(2)}>Review identity<ArrowRight size={18} /></button></div>
          </>
        )}
        {step === 2 && (
          <>
            <header className="page-heading"><p className="eyebrow">Final approval</p><h1 className="display">Approve what must not drift.</h1><p>Once approved, this revision will never change underneath a generation run.</p></header>
            <section className="form-card">
              <div className="approval"><div><p className="eyebrow">Canonical identity</p><div className="canonical-name" dir={language === "ar" ? "rtl" : "ltr"}>{name}</div><p className="muted tiny">{language === "ar" ? "Arabic · Noto Naskh" : "English · connected script"}</p></div><ShieldCheck size={46} weight="duotone" color="var(--success)" /></div>
              <ul className="spec-list"><li><span>Piece</span><strong>Name pendant</strong></li><li><span>Metal</span><strong>21K yellow gold</strong></li><li><span>Finish</span><strong>High polish</strong></li><li><span>Stones</span><strong>{stones}</strong></li><li><span>Target width</span><strong>20 mm</strong></li><li><span>Source</span><strong>{source}</strong></li></ul>
              <p className="tiny muted" style={{ marginTop: 18 }}><Sparkle size={14} /> Visual fixtures are exploratory and are not manufacturing-ready geometry.</p>
              {!hasLocalFixture && <p role="status" style={{ color: "var(--warning)" }}>No identity-matched local media fixture exists for this spelling and language. The studio will preserve the revision and show unavailable representations.</p>}
            </section>
            <div className="form-actions"><button className="primary-button" onClick={approve}><ShieldCheck size={19} />Approve revision</button></div>
          </>
        )}
      </main>
    </AppShell>
  );
}
