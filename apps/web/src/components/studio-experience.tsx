"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { ArrowLeft, ArrowsOut, Check, ClockCounterClockwise, Eye, FileImage, Pause, Play, ShieldCheck, Sparkle, WarningCircle, X } from "@phosphor-icons/react";
import { useJewelo } from "@/lib/jewelo-provider";
import type { Direction, Locale, Representation, RepresentationKind, TaskState } from "@/lib/types";

function StateChip({ state, label }: { state: TaskState; label: string }) {
  return <span className={`state-chip ${state}`}>{label} {state}</span>;
}

export function StudioExperience({ locale, designId }: { locale: Locale; designId: string }) {
  const router = useRouter();
  const { client, state } = useJewelo();
  const design = state.designs.find((item) => item.id === designId);
  const run = design?.runs.at(-1);
  const [selectedDirectionId, setSelectedDirectionId] = useState(run?.directions[0]?.id);
  const [kind, setKind] = useState<RepresentationKind>("product");
  const [compare, setCompare] = useState(false);
  const [paused, setPaused] = useState(true);
  const [announcement, setAnnouncement] = useState("");

  const direction = run?.directions.find((item) => item.id === selectedDirectionId) ?? run?.directions[0];
  const representation = direction?.representations[kind];
  const comparison = run?.directions.find((item) => item.id !== direction?.id && item.representations[kind].state === "ready");
  const revision = design?.revisions.at(-1);

  if (!design || !revision) {
    return <main className="not-found"><div><h1 className="display">Design not found</h1><p className="muted">This local fixture may have been reset.</p><Link className="primary-button" href={`/${locale}`}>Return home</Link></div></main>;
  }

  function act(label: string, action: () => unknown) {
    try { action(); setAnnouncement(label); } catch (error) { setAnnouncement(error instanceof Error ? error.message : "Action unavailable"); }
  }

  function startRun() {
    act("Generation run created. Four directions are now available.", () => {
      const next = client.startRun(designId);
      setSelectedDirectionId(next.runs.at(-1)?.directions[0].id);
    });
  }

  function selectCurrent() {
    if (!direction) return;
    act(`${direction.label} selected.`, () => client.selectDirection(designId, direction.id));
  }

  function refine() {
    act("A new immutable revision and generation run were created.", () => {
      client.refineDesign(designId, `Refinement from ${direction?.label ?? "selected direction"}`);
      const next = client.startRun(designId);
      setSelectedDirectionId(next.runs.at(-1)?.directions[0].id);
    });
  }

  return (
    <div className="studio-page">
      <header className="studio-header">
        <div className="studio-title"><Link className="icon-button" href={`/${locale}`} aria-label="Back to home"><ArrowLeft size={18} /></Link><div><h1>{design.name}</h1><span className="saved-state">Saved locally · Revision {revision.number}</span></div></div>
        <div style={{ display: "flex", gap: 8 }}><button className="secondary-button" onClick={() => setCompare((value) => !value)} disabled={!comparison}><Eye size={18} />{compare ? "Exit compare" : "Compare"}</button><button className="icon-button" aria-label="Open identity proof" onClick={() => document.getElementById("identity-proof")?.scrollIntoView()}><ShieldCheck size={20} /></button></div>
      </header>

      {!run ? (
        <main className="not-found"><div><Sparkle size={48} weight="duotone" color="var(--gold)" /><h1 className="display">Your approved revision is ready.</h1><p className="muted">Create four fixture directions. Each task remains independently retryable and traceable.</p><button className="primary-button" onClick={startRun}>Create four directions<Sparkle size={18} /></button></div></main>
      ) : (
        <>
          <div className="studio-layout">
            <aside className="studio-panel left" id="identity-proof">
              <div className="panel-heading"><h2>Configure</h2><span className="tiny muted">Locked</span></div>
              <div className="identity-proof"><p className="eyebrow">Canonical identity</p><div className="canonical-name" dir={revision.identity.language === "ar" ? "rtl" : "ltr"}>{revision.identity.approvedText}</div><p className="fingerprint">{revision.identity.fingerprint}</p><p className="tiny muted"><ShieldCheck size={14} weight="fill" color="var(--success)" /> Approved geometry proof</p></div>
              <ul className="spec-list"><li><span>Metal</span><strong>{revision.specification.metal}</strong></li><li><span>Finish</span><strong>{revision.specification.finish}</strong></li><li><span>Stones</span><strong>{revision.specification.stones}</strong></li><li><span>Width</span><strong>{revision.specification.widthMm} mm</strong></li><li><span>Complexity</span><strong>{revision.specification.complexity}/10</strong></li></ul>
              <button className="secondary-button" style={{ width: "100%", marginTop: 18 }} onClick={refine}>Refine as new revision</button>
            </aside>

            <main className="inspect">
              <div className="mobile-identity mobile-only">
                <span><ShieldCheck size={16} weight="fill" /> Canonical identity</span>
                <strong dir={revision.identity.language === "ar" ? "rtl" : "ltr"}>{revision.identity.approvedText}</strong>
                <code>{revision.identity.fingerprint}</code>
              </div>
              <div className="view-tabs" aria-label="Representation">
                {(["product", "worn", "motion"] as const).map((tab) => <button className="view-tab" key={tab} aria-pressed={kind === tab} onClick={() => { setKind(tab); setCompare(false); }}>{tab[0].toUpperCase() + tab.slice(1)}</button>)}
              </div>
              <button className="secondary-button mobile-only mobile-compare" onClick={() => setCompare((value) => !value)} disabled={!comparison}><Eye size={18} />{compare ? "Exit compare" : "Compare directions"}</button>
              {compare && comparison && direction ? (
                <div className="media-stage product" style={{ width: "100%", maxWidth: 900 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", width: "100%", height: "100%" }}>
                    <ComparePane direction={direction} kind={kind} />
                    <ComparePane direction={comparison} kind={kind} />
                  </div>
                </div>
              ) : (
                <MediaStage representation={representation} kind={kind} paused={paused} onPausedChange={setPaused} />
              )}
              <div>
                <div className="lineage-bar"><span><strong>{direction?.label}</strong> · {direction?.brief}</span><span>{revision.identity.fingerprint} · attempt {representation?.lineage.attempt ?? 1}</span></div>
                <div className="mobile-directions mobile-only" style={{ marginTop: 10 }}><DirectionList directions={run.directions} selected={direction?.id} onSelect={setSelectedDirectionId} client={client} designId={designId} announce={setAnnouncement} /></div>
                <details className="mobile-studio-tools mobile-only">
                  <summary>Configuration & run history</summary>
                  <div className="mobile-tools-body">
                    <ul className="spec-list"><li><span>Metal</span><strong>{revision.specification.metal}</strong></li><li><span>Finish</span><strong>{revision.specification.finish}</strong></li><li><span>Stones</span><strong>{revision.specification.stones}</strong></li><li><span>Width</span><strong>{revision.specification.widthMm} mm</strong></li><li><span>Complexity</span><strong>{revision.specification.complexity}/10</strong></li></ul>
                    <button className="secondary-button" onClick={refine}>Refine as new revision</button>
                    <div className="run-history"><div className="panel-heading"><h2>Run history</h2><ClockCounterClockwise size={18} /></div>{design.runs.map((item) => <div className="run-item" key={item.id}><strong>{item.label}</strong><br /><span className="muted">Revision {design.revisions.find((candidate) => candidate.id === item.revisionId)?.number} · {item.status}</span></div>)}</div>
                    <button className="secondary-button" onClick={startRun}>Create fresh run</button>
                  </div>
                </details>
              </div>
            </main>

            <aside className="studio-panel right">
              <div className="panel-heading"><h2>Directions / run</h2><span className="state-chip">{run.status}</span></div>
              <div className="directions"><DirectionList directions={run.directions} selected={direction?.id} onSelect={setSelectedDirectionId} client={client} designId={designId} announce={setAnnouncement} /></div>
              <div className="run-history"><div className="panel-heading"><h2>Run history</h2><ClockCounterClockwise size={18} /></div>{design.runs.map((item) => <div className="run-item" key={item.id}><strong>{item.label}</strong><br /><span className="muted">Revision {design.revisions.find((candidate) => candidate.id === item.revisionId)?.number} · {item.status}</span></div>)}</div>
              <button className="secondary-button" style={{ width: "100%", marginTop: 14 }} onClick={startRun}>Create fresh run</button>
            </aside>
          </div>

          <footer className="studio-actionbar">
            <div className="action-summary"><strong>{design.selectedDirectionId ? "Direction selected" : direction?.label}</strong><span>{representation?.state === "ready" ? "Ready to inspect and select" : `Current view is ${representation?.state}`}</span></div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="secondary-button" onClick={selectCurrent} disabled={!direction || direction.representations.product.state !== "ready"}><Check size={18} />Select</button>
              <button className="primary-button" disabled={!design.selectedDirectionId} onClick={() => router.push(`/${locale}/commerce/${designId}`)}>Estimate & quote</button>
            </div>
          </footer>
        </>
      )}
      <p className="sr-live" aria-live="polite">{announcement}</p>
    </div>
  );
}

function MediaStage({ representation, kind, paused, onPausedChange }: { representation?: Representation; kind: RepresentationKind; paused: boolean; onPausedChange(value: boolean): void }) {
  if (!representation || representation.state !== "ready" || !representation.assetUrl) {
    return <div className={`media-stage ${kind}`}><div className="stage-placeholder">{representation?.state === "failed" ? <WarningCircle size={40} /> : <FileImage size={40} />}<strong>{representation?.state ?? "unavailable"}</strong><p>This representation is not selectable. Retry only the failed unit from the run rail.</p></div></div>;
  }
  if (kind === "motion") {
    return <div className="media-stage motion"><video src={representation.assetUrl} poster={representation.posterUrl} controls loop muted playsInline aria-label={representation.alt} onPlay={() => onPausedChange(false)} onPause={() => onPausedChange(true)} /><button className="icon-button" style={{ position: "absolute", insetInlineEnd: 14, top: 14 }} aria-label={paused ? "Play motion" : "Pause motion"} onClick={(event) => { const video = event.currentTarget.parentElement?.querySelector("video"); if (paused) void video?.play(); else video?.pause(); }}>{paused ? <Play size={18} /> : <Pause size={18} />}</button></div>;
  }
  const assetUrl = representation.assetUrl;
  return (
    <div className={`media-stage ${kind}`}>
      <TransformWrapper minScale={1} maxScale={4} centerOnInit wheel={{ step: .12 }}>
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%" }}>
              <Image src={assetUrl} alt={representation.alt} width={1024} height={kind === "worn" ? 1280 : 1024} priority sizes="(max-width: 1023px) 92vw, 50vw" style={{ width: "100%", height: "100%", objectFit: kind === "worn" ? "cover" : "contain" }} />
            </TransformComponent>
            <div className="stage-controls">
              <span className="state-chip ready">Verified</span>
              <button className="icon-button" aria-label="Zoom in" onClick={() => zoomIn()}>+</button>
              <button className="icon-button" aria-label="Zoom out" onClick={() => zoomOut()}>−</button>
              <button className="icon-button" aria-label="Reset zoom" onClick={() => resetTransform()}><ArrowsOut size={18} /></button>
            </div>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}

function ComparePane({ direction, kind }: { direction: Direction; kind: RepresentationKind }) {
  const rep = direction.representations[kind];
  return <figure style={{ margin: 0, position: "relative", display: "grid", placeItems: "center", borderInlineEnd: "1px solid var(--warm)" }}>{rep.assetUrl && rep.state === "ready" ? (kind === "motion" ? <video src={rep.assetUrl} poster={rep.posterUrl} controls muted /> : <Image src={rep.assetUrl} alt={rep.alt} fill style={{ objectFit: "contain" }} sizes="45vw" />) : <div className="stage-placeholder">{rep.state}</div>}<figcaption className="hero-label">{direction.label}</figcaption></figure>;
}

function DirectionList({ directions, selected, onSelect, client, designId, announce }: { directions: Direction[]; selected?: string; onSelect(id: string): void; client: ReturnType<typeof useJewelo>["client"]; designId: string; announce(message: string): void }) {
  return directions.map((direction) => {
    const product = direction.representations.product;
    const retryable = Object.values(direction.representations).find((rep) => rep.state === "failed");
    const cancellable = Object.values(direction.representations).find((rep) => rep.state === "generating" || rep.state === "queued");
    return <div key={direction.id}><button className="direction-card" aria-current={selected === direction.id ? "true" : undefined} onClick={() => onSelect(direction.id)}><span className="direction-thumb">{product.assetUrl && product.state === "ready" ? <Image src={product.assetUrl} alt="" width={64} height={64} /> : <FileImage size={22} />}</span><span><strong>{direction.label}</strong><small>{direction.brief}</small><span className="state-row"><StateChip label="P" state={product.state} /><StateChip label="W" state={direction.representations.worn.state} /><StateChip label="M" state={direction.representations.motion.state} /></span></span></button>{(retryable || cancellable) && <div className="task-actions">{retryable && <button onClick={() => { client.retryTask(designId, retryable.lineage.taskId); announce(`${retryable.kind} retry completed without changing sibling tasks.`); }}>Retry {retryable.kind}</button>}{cancellable && <button onClick={() => { client.cancelTask(designId, cancellable.lineage.taskId); announce(`${cancellable.kind} cancelled.`); }}><X size={12} />Cancel</button>}</div>}</div>;
  });
}
