"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { PromptLibrary } from "./PromptLibrary";
import { arabicStyleLabel } from "@/lib/ui-presentation";
import type { ArabicStyle } from "@/lib/types";

type Locale = "en" | "ar";

export function OperatorExperience({ locale }: { locale: Locale }) {
  const copy =
    locale === "ar"
      ? {
          operations: "عمليات المشغل",
          queue: "قائمة عمل المشغل",
          intro: "راجع عروض القطع المخصصة وتابع الطلبات المعتمدة حتى التسليم.",
          email: "البريد الإلكتروني للموظف",
          phrase: "عبارة الدخول",
          opening: "جارٍ الفتح…",
          open: "فتح قائمة العمل",
          authorized: "للموظفين المخولين فقط.",
          customer: "العودة إلى تجربة العميل",
          signed: "تم تسجيل الدخول كمشغل",
          close: "إغلاق القائمة",
          workQueue: "قائمة العمل",
          prompts: "مكتبة التعليمات",
          today: "عمل اليوم",
          heading: "عروض الأسعار والمهام والطلبات.",
          subheading: "عرض واضح للإجراءات التي تحتاج إلى تدخل المشغل.",
          quoteRequests: "طلبات التسعير",
          progress: "قيد التنفيذ",
          ready: "جاهز",
          all: "الكل",
          quotes: "عروض الأسعار",
          orders: "الطلبات",
          empty: "لا توجد مهام في هذا العرض",
          emptyBody: "ستظهر هنا طلبات التسعير والطلبات المعتمدة.",
          issue: "إصدار السعر",
          advance: "تحديث المهمة",
          customerView: "عرض العميل",
        }
      : {
          operations: "Atelier operations",
          queue: "Operator queue",
          intro:
            "Review custom quotes and move approved pieces through fulfillment.",
          email: "Staff email",
          phrase: "Access phrase",
          opening: "Opening…",
          open: "Open operator queue",
          authorized: "Authorized atelier access only.",
          customer: "Return to customer experience",
          signed: "Signed in as operator",
          close: "Close queue",
          workQueue: "Work queue",
          prompts: "Prompt Library",
          today: "Today’s work",
          heading: "Quotes, tasks and orders.",
          subheading: "A restrained view of the actions that need an operator.",
          quoteRequests: "Quote requests",
          progress: "In progress",
          ready: "Ready",
          all: "All",
          quotes: "Quotes",
          orders: "Orders",
          empty: "No work in this view",
          emptyBody:
            "Customer quote requests and approved orders will appear here.",
          issue: "Issue quote",
          advance: "Advance task",
          customerView: "Customer view",
        };
  const { client, state, refresh } = useJewelo();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "prompts" ? "prompts" : "queue";
  const reviewStyle =
    searchParams.get("review") === "arabic-style"
      ? (searchParams.get("style") as ArabicStyle | null)
      : null;
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
    if (!email || passphrase.length < 4) return;
    setBusy("login");
    setMessage("");
    void client
      .loginOperator(email, passphrase)
      .then(() => {
        const target = new URL(window.location.href);
        target.searchParams.set("session", "opened");
        window.location.assign(target.toString());
      })
      .catch((error: unknown) => {
        setMessage(
          error instanceof Error ? error.message : "Action unavailable",
        );
        setBusy(undefined);
      });
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
          <p className="clm-kicker">{copy.operations}</p>
          <h1>{copy.queue}</h1>
          <p>
            {reviewStyle
              ? `${arabicStyleLabel(reviewStyle)} requires atelier review. No generation or provider spend has started.`
              : copy.intro}
          </p>
          <form onSubmit={login}>
            <label>
              {copy.email}
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="atelier@caleums.com"
              />
            </label>
            <label>
              {copy.phrase}
              <input
                required
                type="password"
                minLength={4}
                value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)}
              />
            </label>
            <button className="clm-primary full" disabled={busy === "login"}>
              {busy === "login" ? copy.opening : copy.open}
            </button>
          </form>
          <small>{copy.authorized}</small>
          <Link href={`/${locale}`}>← {copy.customer}</Link>
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
        <span>
          {copy.signed} · {state.principal.name}
        </span>
        <button
          type="button"
          onClick={() =>
            void action(
              "logout",
              () => client.setRole("customer"),
              "Operator session closed.",
            )
          }
        >
          <SignOut size={17} /> {copy.close}
        </button>
      </header>
      <nav className="clm-operator-nav" aria-label="Operator sections">
        <Link
          aria-current={tab === "queue" ? "page" : undefined}
          href={`/${locale}/operator`}
        >
          {copy.workQueue}
        </Link>
        <Link
          aria-current={tab === "prompts" ? "page" : undefined}
          href={`/${locale}/operator?tab=prompts`}
        >
          {copy.prompts}
        </Link>
      </nav>
      <div className="clm-operator-body">
        {tab === "prompts" ? (
          <PromptLibrary />
        ) : (
          <>
            {reviewStyle && (
              <section className="clm-review-handoff" role="status">
                <div>
                  <p className="clm-kicker">Arabic style review</p>
                  <h2>{arabicStyleLabel(reviewStyle)}</h2>
                </div>
                <p>
                  This request stopped before generation. Confirm a supported
                  Classic or Minimal production path with the customer before
                  releasing provider work.
                </p>
                <span className="clm-state" data-state="blocked">
                  Provider spend blocked
                </span>
              </section>
            )}
            <section className="clm-operator-heading">
              <div>
                <p className="clm-kicker">{copy.today}</p>
                <h1>{copy.heading}</h1>
                <p>{copy.subheading}</p>
              </div>
              <div className="clm-operator-stats">
                <div>
                  <Tag size={19} />
                  <strong>{quoteCount}</strong>
                  <span>{copy.quoteRequests}</span>
                </div>
                <div>
                  <Clock size={19} />
                  <strong>{orderCount}</strong>
                  <span>{copy.progress}</span>
                </div>
                <div>
                  <CheckCircle size={19} />
                  <strong>
                    {
                      state.designs.filter(
                        (item) => item.order?.status === "ready",
                      ).length
                    }
                  </strong>
                  <span>{copy.ready}</span>
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
                  {copy[item]}
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
                  <h2>{copy.empty}</h2>
                  <p>{copy.emptyBody}</p>
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
                        {image && (
                          <Image src={image} alt="" fill sizes="96px" />
                        )}
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
                              {copy.issue}
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
                              {copy.advance}
                            </button>
                          )}
                          <Link
                            className="clm-secondary"
                            href={`/${locale}/commerce/${design.id}`}
                            onClick={() => void client.setRole("customer")}
                          >
                            {copy.customerView} <ArrowRight size={16} />
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
