"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight,
  CheckCircle,
  Clock,
  SignOut,
  Tag,
} from "@phosphor-icons/react";
import { CaleumsWordmark } from "@/components/app-shell";
import { useJewelo } from "@/lib/jewelo-provider";

type Locale = "en" | "ar";

export function OperatorExperience({ locale }: { locale: Locale }) {
  const { client, state, refresh } = useJewelo();
  const [email, setEmail] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [filter, setFilter] = useState<"all" | "quotes" | "orders">("all");
  const [busy, setBusy] = useState<string>();
  const [message, setMessage] = useState("");
  const queue = useMemo(
    () =>
      state.designs.filter((design) => {
        if (!design.quote && !design.order) return false;
        if (filter === "quotes") return Boolean(design.quote && !design.order);
        if (filter === "orders") return Boolean(design.order);
        return true;
      }),
    [filter, state.designs],
  );
  async function action(
    key: string,
    work: () => Promise<unknown>,
    success: string,
  ) {
    setBusy(key);
    setMessage("");
    try {
      await work();
      refresh();
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action unavailable");
    } finally {
      setBusy(undefined);
    }
  }
  function login(event: FormEvent) {
    event.preventDefault();
    if (email && passphrase.length >= 4)
      void action(
        "login",
        () => client.setRole("operator"),
        "Operator fixture opened.",
      );
  }

  if (state.principal.role !== "operator")
    return (
      <main
        className="clm-operator-login"
        dir={locale === "ar" ? "rtl" : "ltr"}
      >
        <section>
          <Image
            src="/brand/caleums-monogram.jpg"
            alt="Caleums monogram"
            width={48}
            height={48}
          />
          <CaleumsWordmark />
          <p className="clm-kicker">Atelier operations</p>
          <h1>Operator queue</h1>
          <p>
            Review custom quotes and move approved pieces through the mock
            fulfillment flow.
          </p>
          <form onSubmit={login}>
            <label>
              Staff email
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="atelier@caleums.com"
              />
            </label>
            <label>
              Access phrase
              <input
                required
                type="password"
                minLength={4}
                value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)}
              />
            </label>
            <button className="clm-primary full" disabled={busy === "login"}>
              {busy === "login" ? "Opening…" : "Open operator queue"}
            </button>
          </form>
          <small>
            Development fixture only. No real authentication or commerce action.
          </small>
          <Link href={`/${locale}`}>← Return to customer experience</Link>
        </section>
      </main>
    );

  const quoteCount = state.designs.filter(
    (item) => item.quote?.status === "requested",
  ).length;
  const orderCount = state.designs.filter(
    (item) => item.order && item.order.status !== "ready",
  ).length;
  return (
    <main className="clm-operator" dir={locale === "ar" ? "rtl" : "ltr"}>
      <header>
        <Link href={`/${locale}`}>
          <CaleumsWordmark compact />
        </Link>
        <span>Atelier operations</span>
        <button
          type="button"
          onClick={() =>
            void action(
              "logout",
              () => client.setRole("customer"),
              "Operator fixture closed.",
            )
          }
        >
          <SignOut size={17} /> Close queue
        </button>
      </header>
      <div className="clm-operator-body">
        <section className="clm-operator-heading">
          <div>
            <p className="clm-kicker">Today’s work</p>
            <h1>Quotes, tasks and orders.</h1>
            <p>A restrained view of the actions that need an operator.</p>
          </div>
          <div className="clm-operator-stats">
            <div>
              <Tag size={19} />
              <strong>{quoteCount}</strong>
              <span>Quote requests</span>
            </div>
            <div>
              <Clock size={19} />
              <strong>{orderCount}</strong>
              <span>In progress</span>
            </div>
            <div>
              <CheckCircle size={19} />
              <strong>
                {
                  state.designs.filter((item) => item.order?.status === "ready")
                    .length
                }
              </strong>
              <span>Ready</span>
            </div>
          </div>
        </section>
        <div className="clm-queue-tabs">
          {(["all", "quotes", "orders"] as const).map((item) => (
            <button
              key={item}
              aria-pressed={filter === item}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>
        {message && (
          <p className="clm-status" role="status">
            {message}
          </p>
        )}
        <section className="clm-queue" aria-label="Operator work queue">
          {queue.length === 0 ? (
            <div className="clm-queue-empty">
              <CheckCircle size={28} />
              <h2>No work in this view</h2>
              <p>
                Customer quote requests and approved orders will appear here.
              </p>
            </div>
          ) : (
            queue.map((design) => {
              const revision = design.revisions.at(-1);
              const spec = revision?.specification;
              const image =
                design.runs.at(-1)?.directions[0]?.representations.product
                  .assetUrl;
              return (
                <article key={design.id}>
                  <div className="clm-queue-thumb">
                    {image && <Image src={image} alt="" fill sizes="96px" />}
                  </div>
                  <div className="clm-queue-main">
                    <div>
                      <span
                        className="clm-state"
                        data-state={
                          design.order?.status ?? design.quote?.status
                        }
                      >
                        {design.order
                          ? `Order · ${design.order.status.replaceAll("-", " ")}`
                          : `Quote · ${design.quote?.status}`}
                      </span>
                      <h2>{design.name}</h2>
                      <p>
                        {spec
                          ? `18K ${spec.metalColor} gold · ${spec.stoneCoverage.replaceAll("-", " ")} · ${spec.chain.lengthCm} cm`
                          : design.id}
                      </p>
                    </div>
                    <div className="clm-queue-actions">
                      {design.quote?.status === "requested" && (
                        <button
                          className="clm-primary"
                          disabled={Boolean(busy)}
                          onClick={() =>
                            void action(
                              `quote-${design.id}`,
                              () => client.issueQuote(design.id),
                              `Quote issued for ${design.name}.`,
                            )
                          }
                        >
                          Issue quote
                        </button>
                      )}
                      {design.order && design.order.status !== "ready" && (
                        <button
                          className="clm-primary"
                          disabled={Boolean(busy)}
                          onClick={() =>
                            void action(
                              `order-${design.id}`,
                              () => client.updateFulfillment(design.id),
                              `Fulfillment advanced for ${design.name}.`,
                            )
                          }
                        >
                          Advance task
                        </button>
                      )}
                      <Link
                        className="clm-secondary"
                        href={`/${locale}/commerce/${design.id}`}
                        onClick={() => void client.setRole("customer")}
                      >
                        Customer view <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
