"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Diamond,
  HandHeart,
  ShieldCheck,
} from "@phosphor-icons/react";
import { AppShell, CaleumsFooter } from "@/components/app-shell";
import { useJewelo } from "@/lib/jewelo-provider";

const images = [
  "/fixtures/layla-direction-1-product.png",
  "/fixtures/layla-direction-1-worn.png",
  "/fixtures/layla-direction-2-product.png",
  "/fixtures/layla-direction-2-worn.png",
  "/fixtures/layla-direction-3-product.png",
  "/fixtures/layla-direction-3-worn.png",
  "/fixtures/layla-direction-4-product.png",
  "/fixtures/layla-direction-4-worn.png",
];

function MarqueeRow({ reverse = false }: { reverse?: boolean }) {
  const items = [...images, ...images];
  if (reverse) items.reverse();
  return (
    <div className="clm-marquee-window" aria-hidden="true">
      <div className={`clm-marquee-row ${reverse ? "reverse" : ""}`}>
        {items.map((src, index) => (
          <figure key={`${src}-${index}`}>
            <Image src={src} alt="" width={240} height={240} sizes="240px" />
          </figure>
        ))}
      </div>
    </div>
  );
}

export function LandingExperience({ locale }: { locale: "en" | "ar" }) {
  const { state } = useJewelo();
  const active = state.activeDesignId
    ? state.designs.find((item) => item.id === state.activeDesignId)
    : undefined;
  return (
    <AppShell locale={locale}>
      <main className="clm-landing">
        <section className="clm-hero-copy">
          <p className="clm-kicker">
            Design a custom name pendant that’s as unique as your story.
          </p>
          <h1>
            Your name.
            <br />
            Made precious.
          </h1>
          <p className="clm-hero-body">
            Created in 18K gold and finished by hand in our Dubai atelier.
            Approve every detail before your piece is made.
          </p>
          <Link
            className="clm-primary"
            href={`/${locale}/design/new`}
            aria-label="Begin designing"
          >
            Start designing <ArrowRight size={17} />
          </Link>
          {active && (
            <Link className="clm-resume" href={`/${locale}/design/new`}>
              Resume {active.name} <ArrowRight size={15} />
            </Link>
          )}
          <div className="clm-hero-promises">
            <span>
              <HandHeart size={17} /> Handcrafted in Dubai
            </span>
            <span>
              <Diamond size={17} /> Solid 18K gold
            </span>
            <span>
              <ShieldCheck size={17} /> Spelling approved by you
            </span>
          </div>
        </section>
        <section
          className="clm-hero-media"
          aria-label="Caleums personalized jewelry collection"
        >
          <MarqueeRow />
          <MarqueeRow reverse />
        </section>
      </main>
      <CaleumsFooter />
    </AppShell>
  );
}
