"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle, Sparkle } from "@phosphor-icons/react";
import { AppShell } from "@/components/app-shell";
import { useJewelo } from "@/lib/jewelo-provider";

const copy = {
  en: {
    eyebrow: "Made personal, made visible",
    lead: "Craft Your",
    title: "Dream Jewelry",
    body: "Approve the exact name and details, explore four coherent directions, and carry one trusted choice into a quote.",
    create: "Begin designing",
    resume: "Resume design",
    label: "Approved fixture",
  },
  ar: {
    eyebrow: "مصممة لك، وواضحة قبل التنفيذ",
    lead: "صمّمي",
    title: "قطعتك الخاصة",
    body: "اعتمدي الاسم والمواصفات، قارني أربعة اتجاهات مترابطة، ثم انتقلي باختيار موثوق إلى عرض السعر.",
    create: "ابدئي التصميم",
    resume: "استئناف التصميم",
    label: "نموذج معتمد",
  },
};

export function LandingExperience({ locale }: { locale: "en" | "ar" }) {
  const { state } = useJewelo();
  const text = copy[locale];
  const active = state.activeDesignId
    ? state.designs.find((item) => item.id === state.activeDesignId)
    : undefined;
  const resumeHref =
    state.resumePath && state.resumePath !== `/${locale}`
      ? state.resumePath
      : active
        ? `/${locale}/design/new`
        : undefined;
  return (
    <AppShell locale={locale}>
      <main className="landing">
        <section className="hero-copy">
          <p className="eyebrow">
            <Sparkle size={15} weight="fill" /> {text.eyebrow}
          </p>
          <h1 className="display">
            <em>{text.lead}</em>
            {text.title}
          </h1>
          <p>{text.body}</p>
          <div className="hero-actions">
            <Link className="primary-button" href={`/${locale}/design/new`}>
              {text.create}
              <ArrowRight size={18} />
            </Link>
            {active && resumeHref && (
              <Link className="secondary-button" href={resumeHref}>
                {text.resume}
              </Link>
            )}
          </div>
          {active && (
            <Link
              className="resume-card"
              href={resumeHref ?? `/${locale}/design/new`}
            >
              <CheckCircle size={25} weight="fill" color="var(--success)" />
              <span>
                <strong>{active.name}</strong>
                <span className="tiny muted">
                  Saved locally · {active.runs.length} run
                  {active.runs.length === 1 ? "" : "s"}
                </span>
              </span>
              <ArrowRight size={17} style={{ marginInlineStart: "auto" }} />
            </Link>
          )}
        </section>
        <figure className="hero-art">
          <Image
            src="/fixtures/layla-direction-1-product.png"
            alt="Approved Layla yellow-gold name pendant fixture"
            fill
            priority
            sizes="(max-width: 1023px) 90vw, 55vw"
          />
          <figcaption className="hero-label">{text.label}</figcaption>
        </figure>
      </main>
    </AppShell>
  );
}
