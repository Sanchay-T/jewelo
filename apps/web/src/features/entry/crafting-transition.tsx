"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { Sparkle } from "@phosphor-icons/react";
import { AppShell } from "@/components/app-shell";
import { useJewelo } from "@/lib/jewelo-provider";
import type { Locale } from "@/lib/types";

const fixtures = [
  "/fixtures/layla-direction-1-product.png",
  "/fixtures/layla-direction-2-worn.png",
  "/fixtures/layla-direction-3-product.png",
  "/fixtures/layla-direction-4-worn.png",
  "/fixtures/layla-direction-2-product.png",
  "/fixtures/layla-direction-1-worn.png",
  "/fixtures/layla-direction-4-product.png",
  "/fixtures/layla-direction-3-worn.png",
];

export function CraftingTransition({
  locale,
  designId,
}: {
  locale: Locale;
  designId: string;
}) {
  const { client, state, refresh } = useJewelo();
  const design = state.designs.find((item) => item.id === designId);
  const run = design?.runs.at(-1);

  useEffect(() => {
    if (design && design.runs.length === 0) client.startRun(design.id);
  }, [client, design]);

  useEffect(
    () => (run ? client.subscribeToRun(run.id, refresh) : undefined),
    [client, refresh, run],
  );

  if (!design)
    return (
      <AppShell locale={locale}>
        <main className="not-found">
          <div>
            <h1 className="display">Design not found</h1>
            <Link className="primary-button" href={`/${locale}/design/new`}>
              Start a design
            </Link>
          </div>
        </main>
      </AppShell>
    );

  const readyProducts =
    run?.directions.filter(
      (direction) => direction.representations.product.state === "ready",
    ).length ?? 0;
  const verifying = run?.tasks.some((task) => task.state === "verifying");
  const row = [...fixtures, ...fixtures];

  return (
    <AppShell locale={locale}>
      <main className="crafting-transition">
        <section className="crafting-message" aria-live="polite">
          <div className="crafting-spinner" aria-hidden="true">
            <Sparkle size={32} weight="fill" />
          </div>
          <p className="eyebrow">Revision approved</p>
          <h1 className="display">
            Crafting directions for{" "}
            {design.revisions.at(-1)?.identity.approvedText}
          </h1>
          <p>
            {readyProducts > 0
              ? `${readyProducts} of 4 product directions ready. You can enter the studio while siblings continue.`
              : verifying
                ? "Verifying the first pendant against your exact identity…"
                : "Building four independent jewelry directions…"}
          </p>
          <div
            className="task-dots"
            aria-label={`${readyProducts} of 4 product directions ready`}
          >
            {[0, 1, 2, 3].map((index) => (
              <span
                key={index}
                data-ready={index < readyProducts || undefined}
              />
            ))}
          </div>
          {readyProducts > 0 ? (
            <Link
              className="primary-button"
              href={`/${locale}/studio/${design.id}`}
            >
              Enter the studio
            </Link>
          ) : (
            <button className="primary-button" disabled>
              Studio opens with the first verified direction
            </button>
          )}
          <p className="tiny muted">
            This local transition makes no provider calls. Fixture tasks
            continue progressively and remain resumable.
          </p>
        </section>
        <section
          className="fixture-marquee"
          aria-label="Jewelry direction inspiration"
        >
          <p className="eyebrow">Your directions are taking shape</p>
          <div className="marquee-window">
            <div className="marquee-row left">
              {row.map((src, index) => (
                <div className="marquee-tile" key={`left-${index}`}>
                  <Image
                    src={src}
                    alt="Jewelo pendant direction fixture"
                    width={144}
                    height={144}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="marquee-window">
            <div className="marquee-row right">
              {row.toReversed().map((src, index) => (
                <div className="marquee-tile" key={`right-${index}`}>
                  <Image
                    src={src}
                    alt="Jewelo worn jewelry fixture"
                    width={144}
                    height={144}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
