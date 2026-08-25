"use client";

import Link from "next/link";
import { ArrowRight, Briefcase, SealCheck } from "@phosphor-icons/react";
import { AppShell } from "./app-shell";
import { useJewelo } from "@/lib/jewelo-provider";
import type { Locale } from "@/lib/types";

export function OperatorExperience({ locale }: { locale: Locale }) {
  const { client, state, setRole } = useJewelo();
  const queue = state.designs.filter((design) => design.quote || design.order);
  return (
    <AppShell locale={locale}>
      <main className="page-wrap">
        <header className="page-heading"><p className="eyebrow">Exploratory operator fixture</p><h1 className="display">Quote and fulfillment review.</h1><p>This shallow mock explores state visibility only. It is not an authoritative Phase 7 operating workflow.</p></header>
        {state.principal.role !== "operator" && <div className="commerce-card" style={{ marginBottom: 20 }}><Briefcase size={34} weight="duotone" /><p>Switch to the mock operator role to issue quotes or advance fulfillment.</p><button className="primary-button" onClick={() => setRole("operator")}>Switch to operator</button></div>}
        <div className="operator-grid">
          <section><p className="eyebrow">Queue</p>{queue.length ? queue.map((design) => <article className="queue-card" key={design.id}><h3>{design.name}</h3><p className="tiny muted">Quote: {design.quote?.status ?? "none"} · Order: {design.order?.status ?? "none"}</p><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{design.quote?.status === "requested" && <button className="primary-button" disabled={state.principal.role !== "operator"} onClick={() => client.issueQuote(design.id)}><SealCheck size={18} />Issue quote</button>}{design.order && design.order.status !== "ready" && <button className="secondary-button" disabled={state.principal.role !== "operator"} onClick={() => client.updateFulfillment(design.id)}>Advance status</button>}<Link className="secondary-button" href={`/${locale}/commerce/${design.id}`}>Open<ArrowRight size={16} /></Link></div></article>) : <div className="queue-card"><p className="muted">No quote requests yet. Complete a customer selection first.</p></div>}</section>
          <section className="commerce-card"><p className="eyebrow">Audit trail</p><div className="audit-list">{state.designs.flatMap((design) => design.audit.map((event) => ({ ...event, design: design.name }))).map((event) => <div className="audit-event" key={`${event.design}-${event.id}`}><strong>{event.action}</strong><span>{event.design} · {event.actor}</span><p className="tiny muted">{event.detail}</p></div>)}</div></section>
        </div>
      </main>
    </AppShell>
  );
}
