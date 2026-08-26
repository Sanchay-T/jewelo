"use client";

import React from "react";
import Link from "next/link";
import { House, Sparkle } from "@phosphor-icons/react";
import { useJewelo } from "@/lib/jewelo-provider";

export function AppShell({
  locale,
  children,
}: {
  locale: "en" | "ar";
  children: React.ReactNode;
}) {
  return (
    <div className="site-shell">
      <header className="topbar">
        <Link className="brand" href={`/${locale}`} aria-label="Jewelo home">
          <span className="brand-mark">J</span>
          <span className="display">Jewelo</span>
        </Link>
        <nav className="nav-links" aria-label="Primary navigation">
          <Link className="nav-link" href={`/${locale}`}>
            <House size={17} />
            Home
          </Link>
          <Link className="nav-link" href={`/${locale}/design/new`}>
            <Sparkle size={17} />
            Create
          </Link>
        </nav>
        <span className="tiny muted">No account needed</span>
      </header>
      {children}
      <ScenarioDrawer />
    </div>
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
    <aside className="scenario-drawer" aria-label="Development scenarios">
      {open && (
        <div className="scenario-panel">
          <h2>Fixture scenarios</h2>
          <p>Development-only. These states never call a backend.</p>
          <div className="scenario-list">
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
          </div>
          <button
            className="danger-button"
            style={{ width: "100%", marginTop: 10 }}
            onClick={() => void client.reset()}
          >
            Reset fixture state
          </button>
        </div>
      )}
      <button
        className="scenario-trigger"
        aria-label="Toggle fixture scenarios"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Sparkle size={22} weight="fill" />
      </button>
    </aside>
  );
}
