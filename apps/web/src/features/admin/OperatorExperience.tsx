"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { SignOut } from "@phosphor-icons/react";
import { CaleumsWordmark } from "@/components/app-shell";
import { useJewelo } from "@/lib/jewelo-provider";
import { PromptLibrary } from "./PromptLibrary";
import { PreviewRequestQueue } from "./PreviewRequestQueue";
import {
  arabicStyleLabel,
  isProviderSupportedArabicStyle,
} from "@/lib/ui-presentation";
import type { ArabicStyle } from "@/lib/types";

type Locale = "en" | "ar";

export function OperatorExperience({ locale }: { locale: Locale }) {
  const copy =
    locale === "ar"
      ? {
          operations: "عمليات المشغل",
          queue: "قائمة عمل المشغل",
          intro: "تابع طلبات العملاء من الأستوديو حتى تسليم القطعة.",
          email: "البريد الإلكتروني للموظف",
          phrase: "عبارة الدخول",
          opening: "جارٍ الفتح…",
          open: "فتح قائمة العمل",
          authorized: "للموظفين المخولين فقط.",
          customer: "العودة إلى تجربة العميل",
          signed: "تم تسجيل الدخول كمشغل",
          close: "إغلاق القائمة",
          workQueue: "قائمة العمل",
          prompts: "وصفات التصوير",
        }
      : {
          operations: "Atelier operations",
          queue: "Operator queue",
          intro: "Follow customer requests from the studio through to the shop.",
          email: "Staff email",
          phrase: "Access phrase",
          opening: "Opening…",
          open: "Open operator queue",
          authorized: "Authorized atelier access only.",
          customer: "Return to customer experience",
          signed: "Signed in as operator",
          close: "Close queue",
          workQueue: "Work queue",
          prompts: "Photograph recipes",
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
  const [busy, setBusy] = useState<string>();
  const [message, setMessage] = useState("");
  const reviewDrafts = client.listDrafts().filter((draft) => {
    const spec = draft.specification;
    if (spec.arabicStyle === "none") return false;
    return (
      spec.nameCount === 2 || !isProviderSupportedArabicStyle(spec.arabicStyle)
    );
  });
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
            <PreviewRequestQueue />
            {reviewDrafts.length > 0 && (
              <section
                className="clm-review-handoff"
                aria-label="Atelier review"
              >
                <div>
                  <p className="clm-kicker">Atelier review</p>
                  <h2>{reviewDrafts.length} awaiting the atelier</h2>
                </div>
                <ul>
                  {reviewDrafts.map((draft) => (
                    <li key={draft.id}>
                      {draft.specification.names
                        .map(
                          (name) =>
                            name.approvedArabicText ?? name.approvedEnglishText,
                        )
                        .join(" · ")}{" "}
                      — {arabicStyleLabel(draft.specification.arabicStyle)} ·{" "}
                      {new Date(draft.createdAt).toLocaleString(locale)}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {message && (
              <p className="clm-status" role="status">
                {message}
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
