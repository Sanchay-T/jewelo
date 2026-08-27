"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bag,
  Check,
  DownloadSimple,
  Heart,
  ShareNetwork,
} from "@phosphor-icons/react";
import { AppShell, CaleumsFooter } from "@/components/app-shell";
import { useJewelo } from "@/lib/jewelo-provider";
import {
  arabicStyleLabel,
  formatCaleumsPrice,
  identityFromSpecification,
} from "@/lib/ui-presentation";
import {
  adaptPresentationCards,
  isPrimaryReady,
} from "@/features/studio/presentation-cards";
import { deriveCommerceReadiness } from "./commerce-readiness";

type Locale = "en" | "ar";

export function CommerceExperience({
  locale,
  designId,
}: {
  locale: Locale;
  designId: string;
}) {
  const { client, state, refresh } = useJewelo();
  const design = state.designs.find((item) => item.id === designId);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState<string>();
  const [message, setMessage] = useState("");
  const estimateAttempted = useRef(false);
  const run = design?.runs.at(-1);
  const direction = run?.directions[0];
  const cards = useMemo(() => adaptPresentationCards(run), [run]);
  const primaryReady = isPrimaryReady(cards);

  useEffect(() => {
    if (
      !design ||
      !direction ||
      !primaryReady ||
      design.estimate ||
      design.quote ||
      estimateAttempted.current
    )
      return;
    estimateAttempted.current = true;
    setBusy("estimate");
    void (async () => {
      try {
        if (design.selectedDirectionId !== direction.id)
          await client.selectDirection(design.id, direction.id);
        await client.calculateEstimate(design.id);
        refresh();
        setMessage("Your estimate is ready.");
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Return to Studio to prepare this design.",
        );
      } finally {
        setBusy(undefined);
      }
    })();
  }, [client, design, direction, primaryReady, refresh]);

  if (!design)
    return (
      <AppShell locale={locale}>
        <main className="clm-empty">
          <h1>Design not found</h1>
          <Link className="clm-primary" href={`/${locale}`}>
            Return home
          </Link>
        </main>
      </AppShell>
    );
  const product = direction?.representations.product;
  const studioTask = run?.tasks.find(
    (task) =>
      task.view === "studio" &&
      (!direction || task.directionId === direction.id),
  );
  const studioAsset = run?.assets.find(
    (candidate) =>
      candidate.view === "studio" &&
      (!studioTask || candidate.lineage.taskId === studioTask.id),
  );
  const revision = design.revisions.at(-1);
  const spec = revision?.specification;
  const estimate = design.estimate;
  const quote = design.quote;
  const order = design.order;
  const asset = cards.find((card) => card.id === "studio")?.assetUrl;
  const scenarios =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_JEWELO_SCENARIOS === "1";

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
  if (!revision || !spec) return null;
  const identity = identityFromSpecification(spec);
  const price =
    estimate || quote || order ? formatCaleumsPrice(design) : "Not available";
  const { spellingLocked, spellingConfirmed, quoteReady } =
    deriveCommerceReadiness({
      hasAsset: Boolean(asset),
      hasEstimate: Boolean(estimate),
      confirmed,
      quoteAccepted: quote?.status === "accepted",
      ordered: Boolean(order),
    });
  return (
    <AppShell locale={locale}>
      <main className="clm-commerce">
        <header className="clm-piece-heading">
          <Link href={`/${locale}/studio/${designId}`}>
            <ArrowLeft size={16} /> Back to Studio
          </Link>
          <div>
            <p className="clm-kicker">Your piece · final step</p>
            <h1>Made for you, exactly as approved.</h1>
          </div>
        </header>
        <div className="clm-piece-layout">
          <aside className="clm-piece-summary">
            <p className="clm-kicker">Your piece</p>
            <h2 dir={spec.arabicStyle === "none" ? "ltr" : "rtl"}>
              {identity.inline}
            </h2>
            <p>Please review and confirm every design detail.</p>
            <dl className="clm-summary compact">
              <div>
                <dt>Names</dt>
                <dd dir={spec.arabicStyle === "none" ? "ltr" : "rtl"}>
                  {identity.inline}
                </dd>
              </div>
              <div>
                <dt>Script</dt>
                <dd>{arabicStyleLabel(spec.arabicStyle)}</dd>
              </div>
              <div>
                <dt>Metal</dt>
                <dd>18K {spec.metalColor} gold</dd>
              </div>
              <div>
                <dt>Stones</dt>
                <dd>
                  {spec.stoneCoverage.replaceAll("-", " ")} ·{" "}
                  {spec.gemstone.replaceAll("-", " ")}
                </dd>
              </div>
              <div>
                <dt>Chain</dt>
                <dd>
                  {spec.chain.style} · {spec.chain.lengthCm} cm
                </dd>
              </div>
              <div>
                <dt>Size</dt>
                <dd>
                  {spec.sizeProfile} ({spec.dimensions.widthMm} mm)
                </dd>
              </div>
            </dl>
          </aside>
          <section className="clm-piece-image">
            {asset ? (
              <Image
                src={asset}
                alt={
                  studioAsset?.alt ?? product?.alt ?? "Final Caleums pendant"
                }
                fill
                priority
                sizes="(max-width: 799px) 100vw, 52vw"
              />
            ) : (
              <div>
                <span>Final presentation unavailable</span>
              </div>
            )}
          </section>
          <aside className="clm-buy-panel">
            <div className="clm-atelier-mark">
              <Image
                src="/brand/caleums-monogram.jpg"
                alt=""
                width={32}
                height={32}
              />
              <span>
                Handcrafted in our
                <br />
                Dubai atelier
              </span>
            </div>
            <p className="clm-quote-state">
              {order
                ? `Order · ${order.status.replaceAll("-", " ")}`
                : quote
                  ? `Quote · ${quote.status}`
                  : estimate
                    ? "Estimate ready"
                    : "Awaiting estimate"}
            </p>
            <strong className="clm-piece-price">{price}</strong>
            <label
              className="clm-confirm compact"
              data-locked={spellingLocked || undefined}
            >
              <input
                type="checkbox"
                checked={spellingConfirmed}
                disabled={spellingLocked}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              <span>
                <strong>
                  {spellingLocked
                    ? "Spelling and details confirmed and locked."
                    : "I confirm the spelling and details above are correct."}
                </strong>
              </span>
            </label>
            {(!asset || !estimate) && !quote && (
              <div className="clm-commerce-recovery" role="status">
                <strong>
                  {!asset
                    ? "A verified Studio presentation is required."
                    : "Preparing your estimate…"}
                </strong>
                <span>
                  Quote actions stay locked until the pendant and price are both
                  ready.
                </span>
                <Link href={`/${locale}/studio/${designId}`}>
                  Return to Studio
                </Link>
              </div>
            )}
            {!quote && (
              <button
                className="clm-primary full"
                disabled={!quoteReady || Boolean(busy)}
                onClick={() =>
                  void action(
                    "request",
                    () => client.requestQuote(designId),
                    "Quote requested from the atelier.",
                  )
                }
              >
                {busy === "request" ? "Requesting…" : "Request final quote"}
              </button>
            )}
            {quote?.status === "requested" && (
              <button className="clm-primary full" disabled>
                Atelier reviewing your quote
              </button>
            )}
            {quote?.status === "issued" && (
              <button
                className="clm-primary full"
                disabled={!spellingConfirmed || Boolean(busy)}
                onClick={() =>
                  void action(
                    "accept",
                    () => client.acceptQuote(designId),
                    "Quote accepted. Your piece is ready to add.",
                  )
                }
              >
                {busy === "accept"
                  ? "Accepting…"
                  : "Accept AED " + quote.total.toLocaleString()}
              </button>
            )}
            {quote?.status === "accepted" && !order && (
              <button
                className="clm-primary full"
                disabled={!spellingConfirmed || Boolean(busy)}
                onClick={() =>
                  void action(
                    "bag",
                    () => client.createOrder(designId),
                    "Your custom piece was added to the mock bag.",
                  )
                }
              >
                <Bag size={17} /> {busy === "bag" ? "Adding…" : "Add to bag"}
              </button>
            )}
            {order && (
              <div className="clm-order-ready">
                <Check size={20} weight="bold" />
                <div>
                  <strong>Order confirmed</strong>
                  <span>Fixture order {order.id}</span>
                </div>
              </div>
            )}
            <button
              className="clm-secondary full"
              type="button"
              onClick={() => setMessage("Design saved in this mock workspace.")}
            >
              <Heart size={17} /> Save design
            </button>
            <button
              className="clm-secondary full"
              type="button"
              onClick={() =>
                void navigator.clipboard
                  ?.writeText(window.location.href)
                  .then(() => setMessage("Design link copied."))
              }
            >
              <ShareNetwork size={17} /> Share design
            </button>
            {asset && (
              <a className="clm-secondary full" href={asset} download>
                <DownloadSimple size={17} /> Download preview
              </a>
            )}
            {scenarios && quote?.status === "requested" && (
              <Link
                className="clm-operator-handoff"
                href={`/${locale}/operator`}
              >
                Development handoff → Open operator quote queue
              </Link>
            )}
            {message && (
              <p className="clm-status" role="status">
                {message}
              </p>
            )}
          </aside>
        </div>
      </main>
      <CaleumsFooter />
    </AppShell>
  );
}
