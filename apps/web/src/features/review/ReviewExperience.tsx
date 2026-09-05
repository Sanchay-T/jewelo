"use client";

/**
 * Review chrome: picker + six landing skins.
 * Skins change only the first screen. After BEGIN they share ReviewFlow.
 * Not live /en.
 */

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import styles from "./review.module.css";
import { t } from "./copy";
import { useDraft } from "./draft";
import { ReviewFlow } from "./ReviewFlow";
import { StillSlot } from "./StillSlot";
import {
  LOOK_META,
  LOOKS,
  SKIN_META,
  SKINS,
  stillSrc,
  lengthFromName,
  type LookId,
  type SkinId,
} from "./still-board";
import { VITRINE } from "./vitrine";

export { isSkin, isStep } from "./still-board";
export { ReviewFlow };

function Shell({
  locale,
  skin,
  children,
}: {
  locale: "en" | "ar";
  skin?: SkinId;
  children: React.ReactNode;
}) {
  const atelierHref = skin ? `/${locale}/review/${skin}/atelier` : `/${locale}/review`;
  return (
    <div className={styles.root} data-skin={skin} lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <header className={styles.bar}>
        <Link href={`/${locale}/review`} className={styles.brand}>
          CALEUMS
        </Link>
        <nav>
          <Link href={atelierHref}>{t(locale, "atelier", "الأتيليه")}</Link>
          <a href="https://wa.me/?text=CALEUMS" target="_blank" rel="noreferrer">
            {t(locale, "the house", "الدار")}
          </a>
        </nav>
      </header>
      {children}
    </div>
  );
}

export function ReviewPicker({ locale }: { locale: "en" | "ar" }) {
  return (
    <Shell locale={locale}>
      <main className={styles.picker}>
        <p className={styles.kicker}>CALEUMS</p>
        <h1 className={styles.h1}>{t(locale, "Six ways in.", "ست مداخل.")}</h1>
        <p className={styles.tiny}>
          {t(
            locale,
            "Same gold. Same path. Pick how the door looks.",
            "نفس الذهب. نفس المسار. اختاري شكل الباب.",
          )}
        </p>
        <div className={styles.grid}>
          {SKINS.map((skin, i) => {
            const look = LOOKS[i % LOOKS.length] ?? "window";
            const still = stillSrc(look, "window", "medium");
            return (
              <Link key={skin} href={`/${locale}/review/${skin}`} className={styles.poster}>
                <div className={styles.still}>
                  <Image src={still.src} alt="" width={640} height={800} />
                </div>
                <span className={styles.caption}>
                  {skin.toUpperCase()} · {SKIN_META[skin][locale]}
                </span>
              </Link>
            );
          })}
        </div>
      </main>
    </Shell>
  );
}

function Begin({ locale, skin, disabled }: { locale: "en" | "ar"; skin: SkinId; disabled?: boolean }) {
  return (
    <Link
      className={styles.cta}
      href={`/${locale}/review/${skin}/compose`}
      aria-disabled={disabled ? true : undefined}
      onClick={(e) => {
        if (disabled) e.preventDefault();
      }}
    >
      {t(locale, "Begin with your name", "ابدأ باسمك")}
    </Link>
  );
}

function LandingV1({ locale, skin, look }: { locale: "en" | "ar"; skin: SkinId; look: LookId }) {
  return (
    <main className={styles.altar}>
      <div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            delay: VITRINE.landingStillDelayMs / 1000,
            duration: VITRINE.luxuryMs / 1000,
            ease: VITRINE.easeLuxury,
          }}
        >
          <StillSlot look={look} sit="window" length="medium" alt="" locale={locale} />
        </motion.div>
        <motion.p
          className={styles.identity}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: VITRINE.landingKickerDelayMs / 1000, duration: 0.5, ease: VITRINE.easeLuxury }}
        >
          أسماء
        </motion.p>
        <motion.p
          className={styles.kicker}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: VITRINE.landingKickerDelayMs / 1000, duration: 0.5, ease: VITRINE.easeLuxury }}
        >
          18K · made to order · Dubai
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: VITRINE.landingCtaDelayMs / 1000, duration: 0.5, ease: VITRINE.easeLuxury }}
        >
          <Begin locale={locale} skin={skin} />
        </motion.div>
      </div>
    </main>
  );
}

function LandingV2({ locale, skin }: { locale: "en" | "ar"; skin: SkinId }) {
  const [index, setIndex] = useState(0);
  const active = LOOKS[index] ?? "window";
  return (
    <main className={styles.reel}>
      <div className={styles.reelViewport}>
        <div className={styles.reelTrack}>
          {LOOKS.map((look) => {
            const still = stillSrc(look, "window", "medium");
            return (
              <div className={styles.reelSlide} key={look}>
                <Image src={still.src} alt={LOOK_META[look][locale]} width={1200} height={1200} />
              </div>
            );
          })}
        </div>
      </div>
      <div className={styles.reelCopy}>
        <p className={styles.kicker}>{LOOK_META[active][locale]}</p>
        <div className={styles.dots}>
          {LOOKS.map((look, i) => (
            <button
              key={look}
              type="button"
              className={styles.dot}
              data-on={i === index}
              aria-label={LOOK_META[look][locale]}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
        <Begin locale={locale} skin={skin} />
      </div>
    </main>
  );
}

function LandingV3({ locale, skin, look }: { locale: "en" | "ar"; skin: SkinId; look: LookId }) {
  const still = stillSrc(look, "window", "medium");
  return (
    <main className={styles.inspect}>
      <div className={styles.inspectStage}>
        <TransformWrapper minScale={1} maxScale={4}>
          <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
            <Image src={still.src} alt="" width={1200} height={1200} />
          </TransformComponent>
        </TransformWrapper>
      </div>
      <div className={styles.inspectCopy}>
        <p className={styles.kicker}>{t(locale, "pinch to look", "قرّب للنظر")}</p>
        <p className={styles.tiny}>أسماء</p>
        <p className={styles.kicker}>18K · made to order · Dubai</p>
        <Begin locale={locale} skin={skin} />
      </div>
    </main>
  );
}

function LandingV4({
  locale,
  skin,
  look,
  name,
  onName,
}: {
  locale: "en" | "ar";
  skin: SkinId;
  look: LookId;
  name: string;
  onName: (value: string) => void;
}) {
  const length = lengthFromName(name);
  const still = stillSrc(look, "window", length);
  return (
    <main className={styles.live}>
      <div className={styles.liveCopy}>
        <p className={styles.kicker}>{t(locale, "the metal follows the name", "الذهب يتبع الاسم")}</p>
        <label className={styles.tiny} htmlFor="review-name">
          {t(locale, "name", "الاسم")}
        </label>
        <input
          id="review-name"
          className={styles.field}
          value={name}
          onChange={(e) => onName(e.target.value)}
          autoComplete="off"
        />
        <Begin locale={locale} skin={skin} disabled={!name.trim()} />
      </div>
      <div className={styles.stage}>
        <AnimatePresence mode="wait">
          <motion.div
            key={still.src}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: VITRINE.crossfadeMs / 1000, ease: VITRINE.easeCrossfade }}
          >
            <StillSlot look={look} sit="window" length={length} alt="" locale={locale} />
          </motion.div>
        </AnimatePresence>
        <p className={styles.caption}>{name.trim() || "أسماء"}</p>
      </div>
    </main>
  );
}

function LandingV5({ locale, skin }: { locale: "en" | "ar"; skin: SkinId }) {
  return (
    <main className={styles.altar}>
      <div>
        <StillSlot look="window" sit="drop" length="short" alt="" locale="ar" />
        <p className={styles.identity}>نور</p>
        <p className={styles.kicker}>١٨ قيراط · حسب الطلب · دبي</p>
        <Begin locale={locale} skin={skin} />
      </div>
    </main>
  );
}

function LandingV6({
  locale,
  skin,
  look,
  onLook,
}: {
  locale: "en" | "ar";
  skin: SkinId;
  look: LookId;
  onLook: (look: LookId) => void;
}) {
  return (
    <main className={styles.live}>
      <div className={styles.board}>
        {LOOKS.map((id) => (
          <button
            key={id}
            type="button"
            className={styles.tile}
            data-on={id === look}
            onClick={() => onLook(id)}
          >
            <StillSlot look={id} sit="window" length="medium" alt="" locale={locale} />
            <span>{LOOK_META[id][locale]}</span>
          </button>
        ))}
      </div>
      <div className={styles.boardCopy}>
        <p className={styles.kicker}>{t(locale, "four looks", "أربع إطلالات")}</p>
        <p className={styles.tiny}>{LOOK_META[look][locale]}</p>
        <Begin locale={locale} skin={skin} />
      </div>
    </main>
  );
}

export function ReviewLanding({ locale, skin }: { locale: "en" | "ar"; skin: SkinId }) {
  const [draft, update] = useDraft();
  const pageLocale = skin === "v5" ? "ar" : locale;
  return (
    <Shell locale={pageLocale} skin={skin}>
      {skin === "v1" && <LandingV1 locale={pageLocale} skin={skin} look={draft.look} />}
      {skin === "v2" && <LandingV2 locale={pageLocale} skin={skin} />}
      {skin === "v3" && <LandingV3 locale={pageLocale} skin={skin} look={draft.look} />}
      {skin === "v4" && (
        <LandingV4
          locale={pageLocale}
          skin={skin}
          look={draft.look}
          name={draft.name}
          onName={(name) => update({ name })}
        />
      )}
      {skin === "v5" && <LandingV5 locale={pageLocale} skin={skin} />}
      {skin === "v6" && (
        <LandingV6 locale={pageLocale} skin={skin} look={draft.look} onLook={(look) => update({ look })} />
      )}
    </Shell>
  );
}

export function ReviewFlowPage({
  locale,
  skin,
  step,
}: {
  locale: "en" | "ar";
  skin: SkinId;
  step: import("./still-board").FlowStep;
}) {
  const pageLocale = skin === "v5" ? "ar" : locale;
  return (
    <Shell locale={pageLocale} skin={skin}>
      <ReviewFlow locale={locale} skin={skin} step={step} />
    </Shell>
  );
}
