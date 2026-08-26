"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bag,
  Diamond,
  Gift,
  Hammer,
  Heart,
  Leaf,
  ShieldCheck,
  Sparkle,
  UserCircle,
} from "@phosphor-icons/react";
import { useJewelo } from "@/lib/jewelo-provider";

export function CaleumsWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="clm-wordmark" data-compact={compact || undefined}>
      CALEUMS
    </span>
  );
}

export function AppShell({
  locale,
  children,
}: {
  locale: "en" | "ar";
  children: React.ReactNode;
}) {
  return (
    <div className="clm-site-shell">
      <header className="clm-topbar">
        <Link href={`/${locale}`} aria-label="Caleums home">
          <CaleumsWordmark />
        </Link>
        <nav className="clm-nav" aria-label="Primary navigation">
          <Link href={`/${locale}/design/new`}>Create yours</Link>
          <Link href={`/${locale}/operator`}>Atelier</Link>
        </nav>
        <div className="clm-header-tools">
          <button
            type="button"
            aria-label="Saved designs"
            title="Saved designs"
          >
            <Heart size={19} />
          </button>
          <button type="button" aria-label="Account" title="Account">
            <UserCircle size={20} />
          </button>
          <button type="button" aria-label="Shopping bag" title="Shopping bag">
            <Bag size={19} />
          </button>
        </div>
      </header>
      {children}
      <ScenarioDrawer />
    </div>
  );
}

export function CaleumsFooter() {
  return (
    <footer className="clm-trust-strip">
      <div className="clm-trust-item">
        <Gift size={20} />
        <div>
          <strong>Made to order</strong>
          <span>Just for you</span>
        </div>
      </div>
      <div className="clm-trust-item">
        <Hammer size={20} />
        <div>
          <strong>Handcrafted</strong>
          <span>By expert artisans</span>
        </div>
      </div>
      <div className="clm-trust-item">
        <Diamond size={20} />
        <div>
          <strong>Solid 18K gold</strong>
          <span>Never plated</span>
        </div>
      </div>
      <div className="clm-trust-item">
        <Leaf size={20} />
        <div>
          <strong>Lab grown diamonds</strong>
          <span>Ethical &amp; sustainable</span>
        </div>
      </div>
      <div className="clm-trust-item">
        <ShieldCheck size={20} />
        <div>
          <strong>Secure checkout</strong>
          <span>Worldwide shipping</span>
        </div>
      </div>
      <div className="clm-footer-brand">
        <div>
          <Image
            src="/brand/caleums-monogram.jpg"
            alt="Caleums monogram"
            width={30}
            height={30}
          />
          <span>Handcrafted in Dubai</span>
        </div>
      </div>
    </footer>
  );
}

function ScenarioDrawer() {
  const enabled =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_JEWELO_SCENARIOS === "1";
  const { state, setScenario, client } = useJewelo();
  const [open, setOpen] = React.useState(false);
  if (!enabled) return null;
  const scenarios = [
    "fast-all",
    "slow-sibling",
    "partial",
    "quota-2",
    "retry",
    "resume",
    "cancel",
  ] as const;
  return (
    <aside className="clm-scenario" aria-label="Development scenarios">
      {open && (
        <div className="clm-scenario-panel">
          <strong>Mock scenario</strong>
          <p>Development only · no provider calls</p>
          {scenarios.map((scenario) => (
            <button
              key={scenario}
              aria-pressed={state.scenario === scenario}
              onClick={() => {
                void setScenario(scenario);
                setOpen(false);
              }}
            >
              {scenario}
            </button>
          ))}
          <button className="danger" onClick={() => void client.reset()}>
            Reset fixture
          </button>
        </div>
      )}
      <button
        className="clm-scenario-trigger"
        aria-label="Toggle fixture scenarios"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Sparkle size={20} weight="fill" />
      </button>
    </aside>
  );
}
