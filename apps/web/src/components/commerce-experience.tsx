"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle, Clock, CurrencyCircleDollar, Package, SealCheck, Warning } from "@phosphor-icons/react";
import { AppShell } from "./app-shell";
import { useJewelo } from "@/lib/jewelo-provider";
import type { Locale } from "@/lib/types";

export function CommerceExperience({ locale, designId }: { locale: Locale; designId: string }) {
  const { client, state } = useJewelo();
  const design = state.designs.find((item) => item.id === designId);
  if (!design) return <main className="not-found"><div><h1 className="display">Design not found</h1><Link className="primary-button" href={`/${locale}`}>Return home</Link></div></main>;

  const estimate = design.estimate;
  const quote = design.quote;
  const order = design.order;
  const stages = ["confirmed", "in-production", "quality-check", "ready"] as const;
  const currentIndex = order ? stages.indexOf(order.status) : -1;

  return (
    <AppShell locale={locale}>
      <main className="page-wrap">
        <Link className="ghost-button" href={`/${locale}/studio/${designId}`}><ArrowLeft size={18} />Back to studio</Link>
        <header className="page-heading"><p className="eyebrow">Commercial path</p><h1 className="display">From visual direction to a trusted order.</h1><p>Estimate, quote, and order remain distinct. Every accepted value keeps the assumptions and timestamp it was based on.</p></header>
        <div className="commerce-grid">
          <section className="commerce-card">
            <p className="eyebrow">Estimate</p>
            <h2>Indicative range</h2>
            {estimate ? <><p className="price-range">AED {estimate.low.toLocaleString()}–{estimate.high.toLocaleString()}</p><p className="tiny muted">Medium confidence · gold snapshot {new Date(estimate.goldPriceTimestamp).toLocaleString()}</p><ul className="assumptions">{estimate.assumptions.map((item) => <li key={item}>{item}</li>)}</ul></> : <><CurrencyCircleDollar size={42} weight="duotone" color="var(--gold)" /><p className="muted">Create a fixture estimate for the selected revision and direction.</p></>}
            {!estimate && <button className="primary-button" onClick={() => client.calculateEstimate(designId)}>Calculate estimate</button>}
            {estimate && !quote && <button className="primary-button" onClick={() => client.requestQuote(designId)}>Request human quote</button>}
            {quote?.status === "requested" && <div><p className="muted"><Clock size={17} /> Awaiting operator review.</p><Link className="secondary-button" href={`/${locale}/operator`}>Open mock operator queue</Link></div>}
            {quote?.status === "issued" && <div><p className="price-range">AED {quote.total.toLocaleString()}</p><p className="tiny muted">Final fixture quote · expires {new Date(quote.expiresAt).toLocaleDateString()}</p><button className="primary-button" onClick={() => client.acceptQuote(designId)}>Accept quote</button></div>}
            {quote?.status === "expired" && <p role="alert" style={{ color: "var(--danger)" }}><Warning size={18} /> This quote expired and cannot be accepted.</p>}
            {quote?.status === "accepted" && !order && <button className="primary-button" onClick={() => client.createOrder(designId)}>Create order snapshot</button>}
            {order && <div><SealCheck size={34} weight="fill" color="var(--success)" /><p><strong>Order {order.id}</strong></p><p className="tiny muted">Accepted AED {order.acceptedTotal.toLocaleString()} · revision and direction locked</p></div>}
          </section>
          <section className="commerce-card">
            <p className="eyebrow">Fulfillment</p><h2>Visible, auditable progress</h2>
            <div className="status-timeline">
              {stages.map((stage, index) => <div className={`timeline-step ${index <= currentIndex ? "complete" : ""}`} key={stage}><span className="timeline-dot" /><div><strong>{stage.replace("-", " ")}</strong><p className="tiny muted">{index <= currentIndex ? "Recorded in the fixture audit trail" : "Not started"}</p></div></div>)}
            </div>
            {order && order.status !== "ready" && state.principal.role === "operator" && <button className="secondary-button" onClick={() => client.updateFulfillment(designId)}><Package size={18} />Advance fulfillment</button>}
            {order?.status === "ready" && <p style={{ color: "var(--success)" }}><CheckCircle size={18} weight="fill" /> Ready for customer handoff.</p>}
          </section>
        </div>
        <section className="commerce-card" style={{ marginTop: 24 }}><p className="eyebrow">Commercial snapshot</p><ul className="spec-list"><li><span>Revision</span><strong>{order?.revisionId ?? estimate?.revisionId ?? "—"}</strong></li><li><span>Direction</span><strong>{order?.directionId ?? estimate?.directionId ?? "—"}</strong></li><li><span>Estimate confidence</span><strong>{estimate?.confidence ?? "—"}</strong></li><li><span>Quote status</span><strong>{quote?.status ?? "not requested"}</strong></li></ul><p className="tiny muted">Prototype values are fictional and are not an offer, payment request, or manufacturing promise.</p></section>
      </main>
    </AppShell>
  );
}
