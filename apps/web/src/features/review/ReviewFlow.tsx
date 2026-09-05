"use client";

/**
 * Shared path after every landing skin: compose → sit → atelier → request.
 * CAST starts a simulated run (timer), not a paid GPT Image 2 call.
 * Request enables when one camera is ready.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { motion } from "motion/react";
import styles from "./review.module.css";
import { t } from "./copy";
import { readRun, startRun, useDraft } from "./draft";
import { StillSlot } from "./StillSlot";
import {
  CAMERAS,
  CAMERA_META,
  LOOK_META,
  LOOKS,
  SIT_META,
  SITS,
  SIZES,
  cameraRatio,
  lengthFromName,
  type CameraId,
  type FlowStep,
  type SkinId,
  type SlotState,
} from "./still-board";
import { VITRINE, cameraStateAt } from "./vitrine";

function pieceLine(
  locale: "en" | "ar",
  name: string,
  look: keyof typeof LOOK_META,
  sit: keyof typeof SIT_META,
  size: 22 | 32,
) {
  const n = name.trim() || "أسماء";
  return `${n}  ·  ${LOOK_META[look][locale]}  ·  ${SIT_META[sit][locale]}  ·  ${size} mm`;
}

function whatsappHref(name: string, look: string, sit: string, size: number) {
  const text = `CALEUMS\n${name}\n${look} / ${sit} / ${size} mm\n18K yellow`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function ReviewFlow({
  locale,
  skin,
  step,
}: {
  locale: "en" | "ar";
  skin: SkinId;
  step: FlowStep;
}) {
  const router = useRouter();
  const [draft, update] = useDraft();
  const pageLocale = skin === "v5" ? "ar" : locale;
  const length = lengthFromName(draft.name);
  const displayName = draft.name.trim() || "أسماء";
  const [casting, setCasting] = useState(false);
  const [nameError, setNameError] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [spelling, setSpelling] = useState(draft.name);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (step !== "atelier") return;
    const existing = readRun();
    const run = existing ?? startRun();
    setStartedAt(run.startedAt);
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 120);
    return () => window.clearInterval(id);
  }, [step]);

  useEffect(() => {
    setSpelling(draft.name);
  }, [draft.name]);

  const elapsed = startedAt ? Math.max(0, now - startedAt) : 0;
  const cameraStates = useMemo(() => {
    const map = {} as Record<CameraId, SlotState>;
    for (const camera of CAMERAS) {
      map[camera] = step === "atelier" ? cameraStateAt(camera, elapsed) : "catalog";
    }
    return map;
  }, [elapsed, step]);
  const readyCount = CAMERAS.filter((c) => cameraStates[c] === "ready").length;
  const heroState = cameraStates[draft.camera];
  const canRequest = readyCount >= 1;
  const go = (target: FlowStep | "landing") => {
    if (target === "landing") {
      router.push(`/${locale}/review/${skin}`);
      return;
    }
    router.push(`/${locale}/review/${skin}/${target}`);
  };

  const onCast = () => {
    if (!draft.name.trim()) {
      setNameError(t(pageLocale, "the pendant needs a name", "القلادة تحتاج اسما"));
      return;
    }
    setNameError("");
    setCasting(true);
    startRun();
    window.setTimeout(() => {
      router.push(`/${locale}/review/${skin}/atelier`);
    }, VITRINE.castHoldMs);
  };

  const crumb = (
    <p className={styles.crumb}>
      {t(pageLocale, "compose", "تأليف")}
      {`  /  ${LOOK_META[draft.look][pageLocale]}`}
      {step !== "compose" ? `  /  sit ${SIT_META[draft.sit][pageLocale]}` : ""}
    </p>
  );

  return (
    <main className={styles.flow} data-step={step}>
      <section className={styles.stage}>
        {crumb}
        <p className={styles.identity} dir={draft.script === "ar" ? "rtl" : "ltr"}>
          {displayName}
        </p>
        {step === "atelier" && heroState === "ready" ? (
          <div className={styles.inspectStage}>
            <TransformWrapper minScale={1} maxScale={4}>
              <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
                <StillSlot
                  look={draft.look}
                  sit={draft.sit}
                  length={length}
                  ratio={cameraRatio(draft.camera)}
                  state="ready"
                  alt={CAMERA_META[draft.camera][pageLocale]}
                  locale={pageLocale}
                />
              </TransformComponent>
            </TransformWrapper>
          </div>
        ) : (
          <StillSlot
            look={draft.look}
            sit={draft.sit}
            length={length}
            ratio={step === "atelier" ? cameraRatio(draft.camera) : "1"}
            state={step === "atelier" ? heroState : "catalog"}
            alt={displayName}
            locale={pageLocale}
          />
        )}
        <p className={styles.caption}>
          {pieceLine(pageLocale, displayName, draft.look, draft.sit, draft.size)}
        </p>
        {step === "atelier" ? (
          <p className={styles.note} aria-live="polite">
            {canRequest
              ? t(pageLocale, "a view is ready.", "أصبحت صورة جاهزة.")
              : t(
                  pageLocale,
                  "you can close this. we will keep casting.",
                  "يمكنك الإغلاق. سنكمل السبك.",
                )}
          </p>
        ) : null}
      </section>

      <section className={styles.choices}>
        {step === "compose" ? (
          <>
            <div className={styles.nameRow}>
              <label className={styles.tiny} htmlFor="flow-name">
                {t(pageLocale, "name", "الاسم")}
              </label>
              <div className={styles.scriptToggle} role="group" aria-label={t(pageLocale, "script", "الخط")}>
                <button
                  type="button"
                  className={styles.chip}
                  data-on={draft.script === "en"}
                  onClick={() => update({ script: "en" })}
                >
                  EN
                </button>
                <button
                  type="button"
                  className={styles.chip}
                  data-on={draft.script === "ar"}
                  onClick={() => update({ script: "ar" })}
                >
                  AR
                </button>
              </div>
            </div>
            <input
              id="flow-name"
              className={styles.field}
              value={draft.name}
              dir={draft.script === "ar" ? "rtl" : "ltr"}
              onChange={(e) => {
                update({ name: e.target.value });
                if (nameError) setNameError("");
              }}
              autoComplete="off"
            />
            {nameError ? (
              <p className={styles.error} role="alert">
                {nameError}
              </p>
            ) : null}
            <div className={styles.looks}>
              {LOOKS.map((look) => (
                <button
                  key={look}
                  type="button"
                  className={styles.tile}
                  data-on={draft.look === look}
                  onClick={() => update({ look })}
                >
                  <StillSlot
                    look={look}
                    sit="window"
                    length={length}
                    state="catalog"
                    alt={LOOK_META[look][pageLocale]}
                    locale={pageLocale}
                  />
                  <span>
                    {LOOK_META[look][pageLocale]}
                    <em>{pageLocale === "ar" ? LOOK_META[look].captionAr : LOOK_META[look].captionEn}</em>
                  </span>
                </button>
              ))}
            </div>
            <div className={styles.actions}>
              <button type="button" className={`${styles.cta} ${styles.ghost}`} onClick={() => go("landing")}>
                {t(pageLocale, "Back", "رجوع")}
              </button>
              <button
                type="button"
                className={styles.cta}
                disabled={!draft.name.trim()}
                onClick={() => go("sit")}
              >
                {t(pageLocale, "Next", "التالي")}
              </button>
            </div>
          </>
        ) : null}

        {step === "sit" ? (
          <>
            <div className={styles.sitGrid}>
              {SITS.map((sit) => (
                <button
                  key={sit}
                  type="button"
                  className={styles.tile}
                  data-on={draft.sit === sit}
                  onClick={() => update({ sit })}
                >
                  <StillSlot
                    look={draft.look}
                    sit={sit}
                    length={length}
                    state="catalog"
                    alt={SIT_META[sit][pageLocale]}
                    locale={pageLocale}
                  />
                  <span>
                    {SIT_META[sit][pageLocale]}
                    <em>{pageLocale === "ar" ? SIT_META[sit].captionAr : SIT_META[sit].captionEn}</em>
                  </span>
                </button>
              ))}
            </div>
            <div className={styles.dock}>
              <div className={styles.row}>
                {SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className={styles.chip}
                    data-on={draft.size === size}
                    onClick={() => update({ size })}
                  >
                    {size} mm
                  </button>
                ))}
              </div>
              <div className={styles.actions}>
                <button type="button" className={`${styles.cta} ${styles.ghost}`} onClick={() => go("compose")}>
                  {t(pageLocale, "Back", "رجوع")}
                </button>
                <button type="button" className={styles.cta} onClick={onCast} disabled={casting}>
                  {casting
                    ? t(pageLocale, "casting", "يُسبك")
                    : t(pageLocale, "Cast this name", "اسبك هذا الاسم")}
                </button>
              </div>
            </div>
          </>
        ) : null}

        {step === "atelier" ? (
          <>
            <div className={styles.film}>
              {CAMERAS.map((camera, i) => (
                <motion.button
                  key={camera}
                  type="button"
                  className={styles.filmItem}
                  data-on={draft.camera === camera}
                  data-ready={cameraStates[camera] === "ready"}
                  onClick={() => {
                    if (cameraStates[camera] === "ready") update({ camera });
                  }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: VITRINE.luxuryMs / 1000,
                    delay: (i * VITRINE.slotStaggerMs) / 1000,
                    ease: VITRINE.easeLuxury,
                  }}
                >
                  <StillSlot
                    look={draft.look}
                    sit={draft.sit}
                    length={length}
                    ratio={cameraRatio(camera)}
                    state={cameraStates[camera]}
                    alt={CAMERA_META[camera][pageLocale]}
                    locale={pageLocale}
                  />
                  <span>{CAMERA_META[camera][pageLocale]}</span>
                </motion.button>
              ))}
            </div>
            <div className={styles.buyBar}>
              <p className={styles.tiny}>{pieceLine(pageLocale, displayName, draft.look, draft.sit, draft.size)}</p>
              <button
                type="button"
                className={styles.cta}
                disabled={!canRequest}
                onClick={() => setRequestOpen(true)}
              >
                {canRequest
                  ? t(pageLocale, "Request this piece", "اطلب هذه القطعة")
                  : t(pageLocale, "once a view is ready", "عند جاهزية صورة")}
              </button>
            </div>
          </>
        ) : null}
      </section>

      {requestOpen ? (
        <div className={styles.requestScrim} onClick={() => setRequestOpen(false)}>
          <div
            className={styles.requestSheet}
            role="dialog"
            aria-labelledby="request-title"
            onClick={(e) => e.stopPropagation()}
          >
            {sent ? (
              <p className={styles.h1} id="request-title">
                {t(pageLocale, "sent. the house has this piece.", "أُرسل. الدار لديها هذه القطعة.")}
              </p>
            ) : (
              <>
                <p className={styles.kicker} id="request-title">
                  {t(pageLocale, "Request this piece", "اطلب هذه القطعة")}
                </p>
                <p className={styles.identity}>{displayName}</p>
                <p className={styles.tiny}>
                  {LOOK_META[draft.look][pageLocale]} / {SIT_META[draft.sit][pageLocale]} / {draft.size} mm
                  <br />
                  18K yellow
                </p>
                <label className={styles.tiny} htmlFor="spelling">
                  {t(pageLocale, "spelling", "الإملاء")}
                </label>
                <input
                  id="spelling"
                  className={styles.field}
                  value={spelling}
                  onChange={(e) => setSpelling(e.target.value)}
                />
                {spelling.trim() !== draft.name.trim() ? (
                  <p className={styles.error} role="alert">
                    {t(
                      pageLocale,
                      "this will recast. send only if the new spelling is the piece.",
                      "هذا سيعيد السبك. أرسل فقط إذا كان الإملاء الجديد هو القطعة.",
                    )}
                  </p>
                ) : null}
                <div className={styles.actions}>
                  <a
                    className={styles.cta}
                    href={whatsappHref(
                      spelling.trim() || displayName,
                      LOOK_META[draft.look].en,
                      SIT_META[draft.sit].en,
                      draft.size,
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t(pageLocale, "WhatsApp the house", "واتساب الدار")}
                  </a>
                  <button type="button" className={`${styles.cta} ${styles.ghost}`} onClick={() => setSent(true)}>
                    {t(pageLocale, "Send", "إرسال")}
                  </button>
                </div>
              </>
            )}
            <button type="button" className={`${styles.cta} ${styles.ghost}`} onClick={() => setRequestOpen(false)}>
              {t(pageLocale, "Close", "إغلاق")}
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
