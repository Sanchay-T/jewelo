"use client";

/**
 * One photograph slot.
 * Layer 2 is the catalog understudy; a veil + gold hairline means pending.
 * Placeholders are never selectable finished output.
 */

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import styles from "./review.module.css";
import { stillSrc, type LengthId, type LookId, type SitId, type SlotState } from "./still-board";
import { VITRINE } from "./vitrine";

const PENDING: SlotState[] = ["queued", "generating", "verifying", "retrying"];

export function statusWord(locale: "en" | "ar", state: SlotState): string | null {
  if (state === "queued") return locale === "ar" ? "في الانتظار" : "queued";
  if (state === "generating") return locale === "ar" ? "يُسبك" : "casting";
  if (state === "verifying") return locale === "ar" ? "نتحقق من الحروف" : "checking the letters";
  if (state === "retrying") return locale === "ar" ? "نحاول مرة أخرى" : "trying again";
  if (state === "failed") return locale === "ar" ? "تعذر السبك" : "could not cast";
  if (state === "cancelled") return locale === "ar" ? "توقف" : "stopped";
  return null;
}

export function StillSlot({
  look,
  sit,
  length,
  ratio = "1",
  state = "catalog",
  alt,
  locale,
  siblingNote,
  onRetry,
}: {
  look: LookId;
  sit: SitId;
  length: LengthId;
  ratio?: "1" | "4-5" | "9-16";
  state?: SlotState;
  alt: string;
  locale: "en" | "ar";
  siblingNote?: boolean;
  onRetry?: () => void;
}) {
  const still = stillSrc(look, sit, length);
  const pending = PENDING.includes(state);
  const word = statusWord(locale, state);
  const showHairline = state === "generating" || state === "verifying";
  return (
    <div
      className={styles.slot}
      data-ratio={ratio === "1" ? undefined : ratio}
      data-state={state}
    >
      <div className={styles.slotStage}>
        <AnimatePresence mode="sync">
          <motion.div
            key={still.src}
            className={styles.slotImg}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: VITRINE.crossfadeMs / 1000,
              ease: VITRINE.easeCrossfade,
            }}
          >
            <Image src={still.src} alt={alt} width={900} height={900} />
          </motion.div>
        </AnimatePresence>
        {pending ? (
          <div className={styles.veil} data-move={showHairline ? "yes" : "no"} aria-hidden>
            <span className={styles.hairline} />
          </div>
        ) : null}
      </div>
      {word ? (
        <div className={styles.slotStatus}>
          {word}
          {state === "failed" && onRetry ? (
            <button type="button" className={styles.retry} onClick={onRetry}>
              {locale === "ar" ? "إعادة" : "retry"}
            </button>
          ) : null}
          {(still.sibling || siblingNote) && state !== "ready" ? (
            <span className={styles.sibling}>
              {locale === "ar" ? "صورة شقيقة" : "sibling on screen"}
            </span>
          ) : null}
        </div>
      ) : still.sibling ? (
        <div className={styles.slotStatus}>
          <span className={styles.sibling}>
            {locale === "ar" ? "صورة شقيقة" : "sibling on screen"}
          </span>
        </div>
      ) : null}
    </div>
  );
}
