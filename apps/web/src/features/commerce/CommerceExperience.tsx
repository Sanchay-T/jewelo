"use client";

import Link from "next/link";
import { useState } from "react";

import { useJewelo } from "@/lib/jewelo-provider";
import type { Design, Estimate, Order, Quote } from "@/lib/types";

import styles from "./CommerceExperience.module.css";

type Locale = "en" | "ar";
type ActionStatus = "idle" | "loading" | "success" | "error";

const fulfillmentStages: Array<{ id: Order["status"]; label: string; detail: string }> = [
  { id: "confirmed", label: "Order confirmed", detail: "Accepted quote and design snapshot recorded" },
  { id: "in-production", label: "In production", detail: "Atelier work has started" },
  { id: "quality-check", label: "Quality check", detail: "Final specification review" },
  { id: "ready", label: "Ready", detail: "Available for customer handoff" },
];

function formatMoney(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string, locale: Locale, includeTime = false) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-AE" : "en-AE", {
    dateStyle: "medium",
    ...(includeTime ? { timeStyle: "short" as const } : {}),
  }).format(new Date(value));
}

function StatusMessage({ status, message }: { status: ActionStatus; message: string }) {
  if (status === "idle" || status === "loading") return null;
  return (
    <p className={status === "error" ? styles.errorMessage : styles.successMessage} role={status === "error" ? "alert" : "status"}>
      {message}
    </p>
  );
}

function EstimateDetails({ estimate, locale }: { estimate: Estimate; locale: Locale }) {
  return (
    <div className={styles.detailStack}>
      <p className={styles.price}>{formatMoney(estimate.low, locale)}–{formatMoney(estimate.high, locale)}</p>
      <div className={styles.metaRow}>
        <span className={styles.confidence}>Medium confidence</span>
        <span>Gold snapshot {formatDate(estimate.goldPriceTimestamp, locale, true)}</span>
      </div>
      <div>
        <h3 className={styles.smallHeading}>What this estimate assumes</h3>
        <ul className={styles.assumptions}>
          {estimate.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
        </ul>
      </div>
      <p className={styles.validity}>Indicative until {formatDate(estimate.expiresAt, locale)}. Final price depends on confirmed weight, stones, and atelier review.</p>
    </div>
  );
}

function Snapshot({ design, estimate, quote, order, locale }: {
  design: Design;
  estimate?: Estimate;
  quote?: Quote;
  order?: Order;
  locale: Locale;
}) {
  const revisionId = order?.revisionId ?? quote?.snapshot.revisionId ?? estimate?.revisionId;
  const directionId = order?.directionId ?? quote?.snapshot.directionId ?? estimate?.directionId ?? design.selectedDirectionId;

  return (
    <section className={styles.snapshot} aria-labelledby="commercial-snapshot-heading">
      <div>
        <p className={styles.eyebrow}>Locked references</p>
        <h2 id="commercial-snapshot-heading">Commercial snapshot</h2>
      </div>
      <dl className={styles.snapshotGrid}>
        <div><dt>Design revision</dt><dd>{revisionId ?? "Not captured"}</dd></div>
        <div><dt>Selected direction</dt><dd>{directionId ?? "Not selected"}</dd></div>
        <div><dt>Estimate confidence</dt><dd>{estimate?.confidence ?? "Not calculated"}</dd></div>
        <div><dt>Quote state</dt><dd>{quote?.status ?? "Not requested"}</dd></div>
        {order ? <div><dt>Accepted total</dt><dd>{formatMoney(order.acceptedTotal, locale)}</dd></div> : null}
        {order ? <div><dt>Accepted on</dt><dd>{formatDate(order.acceptedAt, locale, true)}</dd></div> : null}
      </dl>
      <p className={styles.disclaimer}>Fixture values are fictional. This page is not an offer, payment request, or manufacturing promise.</p>
    </section>
  );
}

export function CommerceExperience({ locale, designId }: { locale: Locale; designId: string }) {
  const { client, state, refresh } = useJewelo();
  const design = state.designs.find((item) => item.id === designId);
  const [action, setAction] = useState<{ key?: string; status: ActionStatus; message: string }>({ status: "idle", message: "" });

  async function runAction(key: string, successMessage: string, command: () => unknown) {
    setAction({ key, status: "loading", message: "" });
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      command();
      refresh();
      setAction({ key, status: "success", message: successMessage });
    } catch (error) {
      setAction({
        key,
        status: "error",
        message: error instanceof Error ? error.message : "That action could not be completed. Please try again.",
      });
    }
  }

  if (!design) {
    return (
      <main className={styles.notFound} dir={locale === "ar" ? "rtl" : "ltr"}>
        <div className={styles.notFoundCard}>
          <p className={styles.eyebrow}>Commercial path</p>
          <h1>Design not found</h1>
          <p>The design may not be available in this resumed fixture.</p>
          <Link className={styles.primaryButton} href={`/${locale}`}>Return home</Link>
        </div>
      </main>
    );
  }

  const estimate = design.estimate;
  const quote = design.quote;
  const order = design.order;
  const activeKey = action.status === "loading" ? action.key : undefined;
  const currentStage = order ? fulfillmentStages.findIndex((stage) => stage.id === order.status) : -1;

  return (
    <main className={styles.page} dir={locale === "ar" ? "rtl" : "ltr"}>
      <nav className={styles.backNav} aria-label="Breadcrumb">
        <Link href={`/${locale}/studio/${design.id}`} className={styles.textLink}>← Back to studio</Link>
        <span aria-hidden="true">/</span>
        <span>Commercial path</span>
      </nav>

      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Estimate → quote → order → fulfillment</p>
          <h1>Move your selected design forward with clarity.</h1>
          <p>Each step is separate and auditable. Your accepted quote keeps the exact revision, direction, assumptions, and price snapshot it was based on.</p>
        </div>
        <div className={styles.designBadge}>
          <span>Selected design</span>
          <strong>{design.name}</strong>
        </div>
      </header>

      <div className={styles.progress} aria-label="Commercial progress">
        {[
          ["Estimate", Boolean(estimate)],
          ["Quote", Boolean(quote)],
          ["Order", Boolean(order)],
          ["Fulfillment", order?.status === "ready"],
        ].map(([label, complete], index) => (
          <div className={styles.progressStep} data-complete={complete} key={String(label)}>
            <span aria-hidden="true">{complete ? "✓" : index + 1}</span>
            <strong>{label}</strong>
          </div>
        ))}
      </div>

      <div className={styles.mainGrid}>
        <section className={styles.card} aria-labelledby="estimate-heading">
          <div className={styles.cardHeading}>
            <div><p className={styles.eyebrow}>Step 1</p><h2 id="estimate-heading">Estimate and quote</h2></div>
            <span className={styles.stateBadge}>{quote ? `Quote ${quote.status}` : estimate ? "Estimated" : "Not started"}</span>
          </div>

          {!estimate ? (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon} aria-hidden="true">◇</span>
              <h3>Start with an indicative range</h3>
              <p>The fixture uses the selected immutable revision and direction. It is not a final jeweler quote.</p>
              <button
                className={styles.primaryButton}
                disabled={!design.selectedDirectionId || Boolean(activeKey)}
                onClick={() => runAction("estimate", "Estimate calculated and assumptions captured.", () => client.calculateEstimate(design.id))}
                type="button"
              >
                {activeKey === "estimate" ? "Calculating…" : "Calculate estimate"}
              </button>
              {!design.selectedDirectionId ? <p className={styles.hint}>Select a ready direction in the studio first.</p> : null}
            </div>
          ) : (
            <EstimateDetails estimate={estimate} locale={locale} />
          )}

          {estimate && !quote ? (
            <button
              className={styles.primaryButton}
              disabled={Boolean(activeKey)}
              onClick={() => runAction("request", "Quote request sent for operator review.", () => client.requestQuote(design.id))}
              type="button"
            >
              {activeKey === "request" ? "Requesting…" : "Request a human quote"}
            </button>
          ) : null}

          {quote?.status === "requested" ? (
            <div className={styles.notice} role="status">
              <span aria-hidden="true">◷</span>
              <div><strong>Requested</strong><p>An operator must review the fixture assumptions before a quote is issued.</p></div>
            </div>
          ) : null}

          {quote?.status === "issued" ? (
            <div className={styles.quotePanel}>
              <p className={styles.eyebrow}>Issued quote</p>
              <p className={styles.price}>{formatMoney(quote.total, locale)}</p>
              <p>Valid until {formatDate(quote.expiresAt, locale)}. Acceptance records this quote and its estimate snapshot; no payment is collected.</p>
              <button
                className={styles.primaryButton}
                disabled={Boolean(activeKey)}
                onClick={() => runAction("accept", "Quote accepted. You can now create the order snapshot.", () => client.acceptQuote(design.id))}
                type="button"
              >
                {activeKey === "accept" ? "Accepting…" : "Accept quote"}
              </button>
            </div>
          ) : null}

          {quote?.status === "expired" ? (
            <div className={styles.expiredPanel} role="alert">
              <div><strong>Quote expired</strong><p>This quote can no longer be accepted. Request a fresh review using the same current estimate.</p></div>
              <button
                className={styles.secondaryButton}
                disabled={Boolean(activeKey)}
                onClick={() => runAction("request-again", "A fresh quote review was requested.", () => client.requestQuote(design.id))}
                type="button"
              >
                {activeKey === "request-again" ? "Requesting…" : "Request a new quote"}
              </button>
            </div>
          ) : null}

          {quote?.status === "accepted" && !order ? (
            <div className={styles.acceptedPanel}>
              <div><strong>Quote accepted</strong><p>Create an immutable order snapshot. This records intent only and does not collect payment.</p></div>
              <button
                className={styles.primaryButton}
                disabled={Boolean(activeKey)}
                onClick={() => runAction("order", "Order snapshot created and design references locked.", () => client.createOrder(design.id))}
                type="button"
              >
                {activeKey === "order" ? "Creating…" : "Create order snapshot"}
              </button>
            </div>
          ) : null}

          <StatusMessage status={action.status} message={action.message} />
        </section>

        <section className={styles.card} aria-labelledby="fulfillment-heading">
          <div className={styles.cardHeading}>
            <div><p className={styles.eyebrow}>Steps 3–4</p><h2 id="fulfillment-heading">Order and fulfillment</h2></div>
            <span className={styles.stateBadge}>{order?.status.replace("-", " ") ?? "Awaiting order"}</span>
          </div>

          {order ? (
            <div className={styles.orderSummary}>
              <div><span>Order</span><strong>{order.id}</strong></div>
              <div><span>Accepted total</span><strong>{formatMoney(order.acceptedTotal, locale)}</strong></div>
            </div>
          ) : (
            <p className={styles.muted}>Fulfillment begins only after an issued quote is accepted and an order snapshot is created.</p>
          )}

          <ol className={styles.timeline}>
            {fulfillmentStages.map((stage, index) => {
              const complete = index <= currentStage;
              const current = index === currentStage;
              return (
                <li className={styles.timelineItem} data-complete={complete} data-current={current} key={stage.id}>
                  <span className={styles.timelineMarker} aria-hidden="true">{complete ? "✓" : ""}</span>
                  <div><strong>{stage.label}</strong><p>{complete ? stage.detail : "Not started"}</p></div>
                  {current ? <span className={styles.currentLabel}>Current</span> : null}
                </li>
              );
            })}
          </ol>

          {order?.status === "ready" ? <p className={styles.readyMessage} role="status">✓ Ready for customer handoff.</p> : null}
          {order && order.status !== "ready" ? <p className={styles.hint}>Fulfillment updates are recorded by an authorized operator and will appear here.</p> : null}
        </section>
      </div>

      <Snapshot design={design} estimate={estimate} quote={quote} order={order} locale={locale} />
    </main>
  );
}
