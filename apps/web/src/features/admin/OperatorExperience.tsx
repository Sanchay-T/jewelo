"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";

import { useJewelo } from "@/lib/jewelo-provider";
import type { AuditEvent } from "@/lib/types";
import type { LegacyDesign as Design } from "@/lib/legacy-direction-compat";

import styles from "./OperatorExperience.module.css";

type Locale = "en" | "ar";
type ActionStatus = "idle" | "loading" | "success" | "error";

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-AE" : "en-AE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function queueLabel(design: Design) {
  if (design.order?.status === "ready") return "Ready";
  if (design.order) return design.order.status.replace("-", " ");
  if (design.quote) return `Quote ${design.quote.status}`;
  return "No commercial activity";
}

function OperatorLogin({
  locale,
  onLogin,
  busy,
  error,
}: {
  locale: Locale;
  onLogin(email: string, passphrase: string): void;
  busy: boolean;
  error?: string;
}) {
  const [email, setEmail] = useState("");
  const [passphrase, setPassphrase] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onLogin(email, passphrase);
  }

  return (
    <main className={styles.loginPage} dir={locale === "ar" ? "rtl" : "ltr"}>
      <section
        className={styles.loginCard}
        aria-labelledby="operator-login-heading"
      >
        <div className={styles.brandMark} aria-hidden="true">
          J
        </div>
        <p className={styles.eyebrow}>Jewelo operations</p>
        <h1 id="operator-login-heading">Operator console</h1>
        <p className={styles.loginIntro}>
          Review quote requests and move confirmed fixture orders through
          fulfillment.
        </p>

        <div className={styles.fixtureNotice} role="note">
          <strong>Local fixture access</strong>
          <p>
            This form only switches the typed mock role. It does not validate a
            real credential or create a server session.
          </p>
        </div>

        <form className={styles.loginForm} onSubmit={submit}>
          <label>
            <span>Staff email</span>
            <input
              autoComplete="username"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="operator@example.com"
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            <span>Access phrase</span>
            <input
              autoComplete="current-password"
              minLength={4}
              onChange={(event) => setPassphrase(event.target.value)}
              required
              type="password"
              value={passphrase}
            />
          </label>
          <button
            className={styles.primaryButton}
            disabled={busy || !email.trim() || passphrase.length < 4}
            type="submit"
          >
            {busy ? "Opening console…" : "Open fixture console"}
          </button>
          {error ? (
            <p className={styles.errorMessage} role="alert">
              {error}
            </p>
          ) : null}
        </form>
        <Link className={styles.textLink} href={`/${locale}`}>
          ← Return to customer experience
        </Link>
      </section>
    </main>
  );
}

function QueueCard({
  design,
  locale,
  busyKey,
  onIssue,
  onAdvance,
  onOpenCustomer,
}: {
  design: Design;
  locale: Locale;
  busyKey?: string;
  onIssue(): void;
  onAdvance(): void;
  onOpenCustomer(): void;
}) {
  const issueKey = `issue:${design.id}`;
  const fulfillmentKey = `fulfillment:${design.id}`;
  return (
    <article className={styles.queueCard}>
      <div className={styles.queueHeading}>
        <div>
          <h3>{design.name}</h3>
          <p>{design.id}</p>
        </div>
        <span className={styles.stateBadge}>{queueLabel(design)}</span>
      </div>
      <dl className={styles.queueMeta}>
        <div>
          <dt>Quote</dt>
          <dd>{design.quote?.status ?? "Not requested"}</dd>
        </div>
        <div>
          <dt>Order</dt>
          <dd>{design.order?.status.replace("-", " ") ?? "Not created"}</dd>
        </div>
        <div>
          <dt>Revision</dt>
          <dd>
            {design.order?.revisionId ??
              design.quote?.snapshot.revisionId ??
              design.estimate?.revisionId ??
              "—"}
          </dd>
        </div>
      </dl>
      <div className={styles.actions}>
        {design.quote?.status === "requested" ? (
          <button
            className={styles.primaryButton}
            disabled={Boolean(busyKey)}
            onClick={onIssue}
            type="button"
          >
            {busyKey === issueKey ? "Issuing…" : "Issue quote"}
          </button>
        ) : null}
        {design.order && design.order.status !== "ready" ? (
          <button
            className={styles.secondaryButton}
            disabled={Boolean(busyKey)}
            onClick={onAdvance}
            type="button"
          >
            {busyKey === fulfillmentKey ? "Updating…" : "Advance fulfillment"}
          </button>
        ) : null}
        <Link
          className={styles.secondaryButton}
          href={`/${locale}/commerce/${design.id}`}
          onClick={onOpenCustomer}
        >
          Open customer view →
        </Link>
      </div>
    </article>
  );
}

function AuditHistory({
  events,
  locale,
}: {
  events: Array<AuditEvent & { designId: string; designName: string }>;
  locale: Locale;
}) {
  return (
    <section className={styles.auditPanel} aria-labelledby="audit-heading">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>Accountability</p>
          <h2 id="audit-heading">Audit history</h2>
        </div>
        <span>{events.length} events</span>
      </div>
      {events.length ? (
        <ol className={styles.auditList}>
          {events.map((event) => (
            <li key={`${event.designId}:${event.id}`}>
              <span className={styles.auditMarker} aria-hidden="true" />
              <div className={styles.auditBody}>
                <div>
                  <strong>{event.action}</strong>
                  <time dateTime={event.at}>
                    {formatDate(event.at, locale)}
                  </time>
                </div>
                <p>
                  {event.designName} · {event.actor}
                </p>
                <small>{event.detail}</small>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.emptyCopy}>
          No commercial audit events have been recorded yet.
        </p>
      )}
    </section>
  );
}

export function OperatorExperience({ locale }: { locale: Locale }) {
  const { client, state, refresh } = useJewelo();
  const [action, setAction] = useState<{
    key?: string;
    status: ActionStatus;
    message: string;
  }>({ status: "idle", message: "" });
  const [filter, setFilter] = useState<"active" | "all" | "ready">("active");

  const queue = useMemo(
    () =>
      state.designs.filter((design) => {
        if (!design.quote && !design.order) return false;
        if (filter === "all") return true;
        if (filter === "ready") return design.order?.status === "ready";
        return (
          design.quote?.status === "requested" ||
          design.quote?.status === "issued" ||
          (Boolean(design.order) && design.order?.status !== "ready")
        );
      }),
    [filter, state.designs],
  );

  const audit = useMemo(
    () =>
      state.designs
        .flatMap((design) =>
          client.getAudit(design.id).map((event) => ({
            ...event,
            designId: design.id,
            designName: design.name,
          })),
        )
        .sort((a, b) => b.at.localeCompare(a.at)),
    [client, state.designs],
  );

  async function runAction(
    key: string,
    successMessage: string,
    command: () => Promise<unknown>,
  ) {
    setAction({ key, status: "loading", message: "" });
    try {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      await command();
      refresh();
      setAction({ key, status: "success", message: successMessage });
    } catch (error) {
      setAction({
        key,
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "That action could not be completed. Please try again.",
      });
    }
  }

  function login(email: string, passphrase: string) {
    if (!email.trim() || passphrase.length < 4) {
      setAction({
        status: "error",
        message:
          "Enter a valid fixture email and an access phrase of at least four characters.",
      });
      return;
    }
    void runAction("login", "Operator session opened.", () =>
      client.loginOperator(email, passphrase),
    );
  }

  if (state.principal.role !== "operator") {
    return (
      <OperatorLogin
        locale={locale}
        onLogin={login}
        busy={action.key === "login" && action.status === "loading"}
        error={action.status === "error" ? action.message : undefined}
      />
    );
  }

  const activeCount = state.designs.filter(
    (design) =>
      design.quote?.status === "requested" ||
      design.quote?.status === "issued" ||
      (design.order && design.order.status !== "ready"),
  ).length;
  const requestedCount = state.designs.filter(
    (design) => design.quote?.status === "requested",
  ).length;
  const fulfillmentCount = state.designs.filter(
    (design) => design.order && design.order.status !== "ready",
  ).length;

  return (
    <main className={styles.page} dir={locale === "ar" ? "rtl" : "ltr"}>
      <header className={styles.topbar}>
        <Link className={styles.wordmark} href={`/${locale}`}>
          Jewelo <span>Operations</span>
        </Link>
        <div className={styles.operatorIdentity}>
          <div>
            <span>Signed in as operator</span>
            <strong>{state.principal.name}</strong>
          </div>
          <button
            className={styles.compactButton}
            disabled={action.status === "loading"}
            onClick={() =>
              runAction("logout", "Fixture operator role closed.", () =>
                client.setRole("customer"),
              )
            }
            type="button"
          >
            {action.key === "logout" && action.status === "loading"
              ? "Closing…"
              : "Close console"}
          </button>
        </div>
      </header>

      <div className={styles.content}>
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Lean operations console</p>
            <h1>Quotes and fulfillment, in one calm queue.</h1>
          </div>
          <p>
            Fixture actions are recorded in the design audit trail. No payment,
            notification, or manufacturing side effect is triggered.
          </p>
        </header>

        <section className={styles.stats} aria-label="Queue summary">
          <div>
            <span>Active work</span>
            <strong>{activeCount}</strong>
          </div>
          <div>
            <span>Quote requests</span>
            <strong>{requestedCount}</strong>
          </div>
          <div>
            <span>In fulfillment</span>
            <strong>{fulfillmentCount}</strong>
          </div>
        </section>

        {action.status === "success" || action.status === "error" ? (
          <p
            className={
              action.status === "error"
                ? styles.errorMessage
                : styles.successMessage
            }
            role={action.status === "error" ? "alert" : "status"}
          >
            {action.message}
          </p>
        ) : null}

        <div className={styles.consoleGrid}>
          <section
            className={styles.queuePanel}
            aria-labelledby="queue-heading"
          >
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>Work queue</p>
                <h2 id="queue-heading">Commercial cases</h2>
              </div>
              <div className={styles.filters} aria-label="Filter cases">
                {(["active", "all", "ready"] as const).map((value) => (
                  <button
                    aria-pressed={filter === value}
                    key={value}
                    onClick={() => setFilter(value)}
                    type="button"
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.queueList}>
              {queue.length ? (
                queue.map((design) => (
                  <QueueCard
                    busyKey={
                      action.status === "loading" ? action.key : undefined
                    }
                    design={design}
                    key={design.id}
                    locale={locale}
                    onAdvance={() =>
                      runAction(
                        `fulfillment:${design.id}`,
                        `Fulfillment advanced for ${design.name}.`,
                        () => client.updateFulfillment(design.id),
                      )
                    }
                    onIssue={() =>
                      runAction(
                        `issue:${design.id}`,
                        `Quote issued for ${design.name}.`,
                        () => client.issueQuote(design.id),
                      )
                    }
                    onOpenCustomer={() => client.setRole("customer")}
                  />
                ))
              ) : (
                <div className={styles.emptyState}>
                  <span aria-hidden="true">✓</span>
                  <h3>No cases in this view</h3>
                  <p>
                    {filter === "active"
                      ? "There are no quote requests or active fulfillment steps."
                      : "Create commercial fixture activity from a customer design."}
                  </p>
                </div>
              )}
            </div>
          </section>

          <AuditHistory events={audit} locale={locale} />
        </div>
      </div>
    </main>
  );
}
