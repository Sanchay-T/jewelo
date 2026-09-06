"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import {
  ArrowRight,
  Check,
  CaretDown,
  Diamond,
  ShoppingBag,
  X,
  MagnifyingGlassPlus,
  Minus,
  Plus,
  ArrowLeft,
} from "@phosphor-icons/react";
import {
  STORAGE_KEY,
  initialState,
  restore,
  signature,
  validate,
  nameLabel,
  sampleSource,
  canAdd,
  putInBag,
  beginBagEdit,
  cancelBagEdit,
  constructions,
  letters,
  layouts,
  metals,
  coverages,
  gems,
  chains,
  views,
  type Draft,
  type State,
  type View,
} from "./model";
import s from "./atelier.module.css";

const arabic: Record<string, string> = {
  Design: "التصميم",
  Review: "المراجعة",
  "Your bag": "حقيبتك",
  "Your name, made precious.": "اسمك، قطعة ثمينة.",
  "A piece of you. Designed by you.": "قطعة تعبّر عنك. من تصميمك.",
  "Create your piece": "صمّم قطعتك",
  Name: "الاسم",
  "Style & Arrangement": "الأسلوب والتنسيق",
  "Gold & Stones": "الذهب والأحجار",
  "Size & Chain": "المقاس والسلسلة",
  "Personal touches": "لمسات شخصية",
  "Preview my piece": "معاينة قطعتي",
  "Back to design": "العودة للتصميم",
  "Your piece, in every light.": "قطعتك في كل ضوء.",
  "Add to bag": "أضف إلى الحقيبة",
  "Update piece": "تحديث القطعة",
  "Your design": "تصميمك",
  "Price unconfirmed": "السعر غير مؤكد",
  English: "الإنجليزية",
  Arabic: "العربية",
  "One name": "اسم واحد",
  "Two names": "اسمان",
  "Name on your pendant": "الاسم على القلادة",
  "Second name": "الاسم الثاني",
  "Language / script": "اللغة / الكتابة",
  "Pendant construction": "بنية القلادة",
  "Lettering style": "أسلوب الخط",
  "Connection layout": "تنسيق الربط",
  "18K gold": "ذهب عيار ١٨",
  "Stone setting": "ترصيع الأحجار",
  "Choose your stones": "اختر أحجارك",
  "Pendant width": "عرض القلادة",
  "Chain style": "نوع السلسلة",
  "Chain length": "طول السلسلة",
  Engraving: "النقش",
  "Special requests": "طلبات خاصة",
  Optional: "اختياري",
  Studio: "الاستوديو",
  "On skin": "على الجسم",
  "Close-up": "عن قرب",
  Dark: "خلفية داكنة",
  Edit: "تعديل",
  Remove: "إزالة",
  Close: "إغلاق",
  Retry: "إعادة المحاولة",
  "Preparing sample": "جارٍ إعداد المثال",
  "Preview failed": "فشلت المعاينة",
  "Outdated previews": "معاينات قديمة",
  "No stones": "بدون أحجار",
  "Yellow gold": "ذهب أصفر",
  "White gold": "ذهب أبيض",
  "Rose gold": "ذهب وردي",
  Accent: "لمسة",
  "Partial pavé": "ترصيع جزئي",
  "Full pavé": "ترصيع كامل",
  "Lab diamond": "ألماس مختبري",
  "Natural diamond": "ألماس طبيعي",
  Ruby: "ياقوت أحمر",
  Emerald: "زمرد",
  "Blue sapphire": "ياقوت أزرق",
  "Pink sapphire": "ياقوت وردي",
  Classical: "كلاسيكي",
  "Origami ribbon": "شريط أوريغامي",
  "Framed minimal": "إطار بسيط",
  "Diamond rails": "قضبان ألماس",
  Classic: "كلاسيكي",
  Minimal: "بسيط",
  Diwani: "ديواني",
  Kufi: "كوفي",
  Signature: "توقيع",
  "Thuluth inspired": "مستوحى من الثلث",
  "Side by side": "جنبًا إلى جنب",
  "Connected heart": "قلب متصل",
  Stacked: "متراص",
  Infinity: "اللانهاية",
  Interlocked: "متشابك",
  Cable: "كابل",
  Rolo: "رولو",
  Box: "مربعة",
  Curb: "كبح",
  "New piece": "قطعة جديدة",
  "Cancel editing": "إلغاء التعديل",
  "Continue designing": "متابعة التصميم",
  "Checkout unavailable": "الدفع غير متاح",
  "Local sample preview": "معاينة تجريبية محلية",
  "Sample image · Asma": "صورة تجريبية · أسماء",
  "Saved on this device": "محفوظ على هذا الجهاز",
  "Local draft": "مسودة محلية",
  "Zoom image": "تكبير الصورة",
};
import { samples, visualFields, type VisualField } from "./catalogue";
import { SnapshotImage } from "./renderer/usePiece";
import { usePhotographicPiece } from "./usePhotographicPiece";
import { assemblyKey } from "./renderer/assembly";
import type { Run } from "./model";
import { buildPersonalizedPreviewRequest, runMockPersonalizedPreview } from "./previewHandoff";

const icons = ["Aa", "◇", "▱", "≋"];
const gemColors = [
  "#e5e1d9",
  "#fafafa",
  "#aa153c",
  "#1b7655",
  "#244c9d",
  "#dd8da7",
];

export function Atelier({ locale }: { locale: "en" | "ar" }) {
  const t = (text: string) => (locale === "ar" ? (arabic[text] ?? text) : text);
  const [state, setState] = useState<State>(initialState);
  const [desktop, setDesktop] = useState(false);
  const [editingText, setEditingText] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState("");
  const [errors, setErrors] = useState<ReturnType<typeof validate>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [expanded, setExpanded] = useState<string[]>(["name"]);
  const [view, setView] = useState<View>("Studio");
  const [autoplay, setAutoplay] = useState(false);
  const [playRequested, setPlayRequested] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [previewFocused, setPreviewFocused] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);
  const [loadedSource, setLoadedSource] = useState("");
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const draftRef = useRef(state.draft);
  draftRef.current = state.draft;
  const [debug, setDebug] = useState(false);
  const [failView, setFailView] = useState(false);
  const [imageErrors, setImageErrors] = useState<string[]>([]);
  const [imageAttempt, setImageAttempt] = useState(0);
  const photoElement = useRef<HTMLImageElement>(null);
  const viewRail = useRef<HTMLDivElement>(null);
  const bag = useRef<HTMLDialogElement>(null);
  const zoom = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const d = state.draft;
  const latestRun = state.runs.at(-1);
  const stale = !!latestRun && latestRun.signature !== signature(d);
  const run = stale ? undefined : latestRun;
  const slot = run?.slots.find((slot) => slot.view === view);
  const pending = run?.slots.some((slot) => slot.status === "pending") ?? false;
  const piece = usePhotographicPiece(d, loaded, state.sampleFocus, view);
  const source = piece.views[view] ?? "";
  const shown = piece.missing ? d : piece.family.anchor.asset.draft;
  const exampleLabel = piece.missing
    ? (locale === "ar" ? "تصميمك المحدد" : "Your selected design")
    : (locale === "ar" ? "مثال أسماء" : "Asma example");
  const imageFailed = !!piece.errors[view] || imageErrors.includes(source);
  const currentReady = !piece.missing && piece.key === assemblyKey(d) && !!source && !imageFailed;
  const eligible = canAdd(d, run, confirmed) && currentReady && !saving;
  const rotatingViews = views.filter(
    (v) =>
      piece.views[v] &&
      !piece.errors[v] &&
      (!run ||
        run.slots.some((slot) => slot.view === v && slot.status === "ready")),
  );
  const rotationKey = rotatingViews.join("|");
  useEffect(() => {
    if (!piece.availableViews.includes(view)) setView("Studio");
  }, [piece.availableViews.join("|"), view]);
  const playing =
    autoplay &&
    (playRequested || (!hovering && !previewFocused)) &&
    !pageHidden &&
    !editingText &&
    !pending &&
    piece.status !== "pending" &&
    !imageFailed &&
    loadedSource === source &&
    rotatingViews.length > 1;
  useEffect(() => {
    if (photoElement.current?.complete && photoElement.current.naturalWidth > 0)
      setLoadedSource(source);
  }, [source, imageAttempt]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setAutoplay(!media.matches);
    const reduce = () => {
      if (media.matches) setAutoplay(false);
    };
    const visibility = () => setPageHidden(document.hidden);
    visibility();
    media.addEventListener("change", reduce);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      media.removeEventListener("change", reduce);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      if (document.hidden || bag.current?.open || zoom.current?.open) return;
      const available = rotationKey.split("|") as View[];
      setView(
        (current) =>
          available[(available.indexOf(current) + 1) % available.length] ??
          current,
      );
    }, 5000);
    return () => window.clearInterval(timer);
  }, [playing, rotationKey, source]);
  useEffect(() => {
    const rail = viewRail.current;
    const selected = rail?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!rail || !selected) return;
    const bounds = rail.getBoundingClientRect();
    const card = selected.getBoundingClientRect();
    if (card.left < bounds.left || card.right > bounds.right) {
      rail.scrollBy({
        left:
          locale === "ar" ? card.right - bounds.right : card.left - bounds.left,
        behavior: "instant",
      });
    }
  }, [view, locale]);
  function chooseView(next: View) {
    setAutoplay(false);
    setPlayRequested(false);
    setView(next);
  }
  function stepView(delta: number) {
    const available = [...views];
    chooseView(
      available[
        (available.indexOf(view) + delta + available.length) % available.length
      ] ?? "Studio",
    );
  }

  useEffect(
    () => () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    },
    [],
  );
  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    setDebug(
      process.env.NODE_ENV === "development" &&
        new URLSearchParams(window.location.search).has("preview-test"),
    );
    try {
      const saved = restore(localStorage.getItem(STORAGE_KEY));
      setState({
        ...saved,
        runs: saved.runs.map((r) => ({
          ...r,
          slots: r.slots.map((slot) =>
            slot.status === "pending" ? { ...slot, status: "failed" } : slot,
          ),
        })),
      });
    } catch {
      setNotice("Your saved draft could not be read. A fresh draft is ready.");
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      setNotice(
        "Storage is unavailable. Keep this tab open; changes cannot be recovered after reload.",
      );
    }
  }, [state, loaded]);
  useEffect(() => {
    const update = () => {
      const vv = window.visualViewport;
      document.documentElement.style.setProperty(
        "--atelier-keyboard",
        vv && window.innerHeight - vv.height > 140 ? "none" : "flex",
      );
      const el = document.activeElement;
      if (el instanceof HTMLElement && el.matches("input,textarea"))
        el.scrollIntoView({ block: "nearest" });
    };
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      document.documentElement.style.removeProperty("--atelier-keyboard");
    };
  }, []);

  function change<K extends keyof Draft>(key: K, value: Draft[K]) {
    if (d[key] === value) return;
    setAutoplay(false);
    setPlayRequested(false);
    setConfirmed(false);
    setErrors({});
    setState((old) => ({
      ...old,
      draft: { ...old.draft, [key]: value },
      sampleFocus: (visualFields as readonly string[]).includes(key) ? key as VisualField : old.sampleFocus,
    }));
  }
  function go(stage: "design" | "review", section?: string) {
    setState((old) => ({ ...old, stage }));
    if (section) setExpanded((old) => Array.from(new Set([...old, section])));
    requestAnimationFrame(() => {
      const el = section
        ? document.getElementById(`section-${section}`)
        : title.current;
      el?.scrollIntoView({ block: "start" });
      el?.focus();
    });
  }
  async function generate() {
    if (piece.missing) return;
    const nextErrors = validate(d);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setExpanded((old) => Array.from(new Set([...old, "name"])));
      requestAnimationFrame(() =>
        document
          .getElementById(nextErrors.name ? "pendant-name" : "second-name")
          ?.focus(),
      );
      return;
    }
    setConfirmed(false);
    setAutoplay(false);
    setImageErrors([]);
    const capturedDraft = structuredClone(d);
    const id = crypto.randomUUID();
    const nextRun: Run = {
      version: 1,
      id,
      signature: signature(capturedDraft),
      draft: capturedDraft,
      slots: views.map((v) => ({
        view: v,
        status: "pending",
        due: 0,
        attempt: 1,
        fail: false,
      })),
    };
    setState((old) => ({
      ...old,
      stage: "review",
      runs: [...old.runs, nextRun].slice(-8),
    }));
    requestAnimationFrame(() => {
      title.current?.scrollIntoView({ block: "start" });
      title.current?.focus();
    });
    try {
      const request = buildPersonalizedPreviewRequest(capturedDraft, piece.family.anchor.asset, { id, locale });
      const handoff = await runMockPersonalizedPreview(request, () => piece.captureReview(failView));
      const result = handoff.referenceCapture;
      if (
        signature(draftRef.current) !== nextRun.signature ||
        result.key !== assemblyKey(capturedDraft)
      )
        return;
      setState((old) => ({
        ...old,
        runs: old.runs.map((r) =>
          r.id !== id
            ? r
            : {
                ...r,
                slots: r.slots.map((slot) => ({
                  ...slot,
                  status:
                    !result.errors[slot.view] && result.views[slot.view]
                      ? "ready"
                      : "failed",
                })),
              },
        ),
      }));
    } catch {
      setState((old) => ({
        ...old,
        runs: old.runs.map((r) =>
          r.id !== id
            ? r
            : {
                ...r,
                slots: r.slots.map((slot) => ({ ...slot, status: "failed" })),
              },
        ),
      }));
    }
  }
  async function retry(v: View) {
    const runId = run?.id;
    const targetSignature = signature(d);
    setState((old) => ({
      ...old,
      runs: old.runs.map((r) =>
        r.id !== runId
          ? r
          : {
              ...r,
              slots: r.slots.map((slot) =>
                slot.view !== v
                  ? slot
                  : { ...slot, status: "pending", attempt: slot.attempt + 1 },
              ),
            },
      ),
    }));
    try {
      const result = await piece.retry(v);
      if (signature(draftRef.current) !== targetSignature) return;
      setState((old) => ({
        ...old,
        runs: old.runs.map((r) =>
          r.id !== runId
            ? r
            : {
                ...r,
                slots: r.slots.map((slot) =>
                  slot.view !== v
                    ? slot
                    : {
                        ...slot,
                        status:
                          !result.errors[v] && result.views[v]
                            ? "ready"
                            : "failed",
                      },
                ),
              },
        ),
      }));
    } catch {
      setState((old) => ({
        ...old,
        runs: old.runs.map((r) =>
          r.id !== runId
            ? r
            : {
                ...r,
                slots: r.slots.map((slot) =>
                  slot.view !== v ? slot : { ...slot, status: "failed" },
                ),
              },
        ),
      }));
    }
  }
  function retryImage() {
    setImageErrors((old) => old.filter((x) => x !== source));
    setImageAttempt((old) => old + 1);
    void retry(view);
  }
  function trapFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const targets = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
      ),
    ).filter((el) => el.getClientRects().length > 0);
    const first = targets[0],
      last = targets.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
  function focusDesign() {
    requestAnimationFrame(() => {
      title.current?.focus();
      title.current?.scrollIntoView({ block: "start" });
    });
  }
  function openBag() {
    bag.current?.showModal();
  }
  async function add() {
    if (!eligible || saving) return;
    const draftSignature = signature(d);
    setSaving(true);
    try {
      const snapshot = await piece.saveSnapshot(crypto.randomUUID());
      if (
        signature(draftRef.current) !== draftSignature ||
        snapshot.key !== assemblyKey(draftRef.current)
      )
        return;
      setState((old) => {
        if (signature(old.draft) !== draftSignature) return old;
        const id = old.editing ?? crypto.randomUUID();
        const updated = putInBag(old, confirmed, id, piece.family.anchor.asset.id);
        return {
          ...updated,
          bag: updated.bag.map((item) =>
            item.id === id ? { ...item, snapshot } : item,
          ),
        };
      });
      if (!snapshot.persistent)
        setNotice(
          "Your piece is in this bag for this session. Image storage is unavailable; keep this tab open.",
        );
      setConfirmed(false);
      openBag();
    } catch {
      setNotice(
        "The preview could not be saved. Please retry before adding this piece.",
      );
    } finally {
      setSaving(false);
    }
  }
  function newPiece() {
    bag.current?.close();
    setState((old) => ({ ...initialState(), bag: old.bag }));
    setConfirmed(false);
    setView("Studio");
    setExpanded(["name"]);
    focusDesign();
  }
  function editItem(id: string) {
    const item = state.bag.find((b) => b.id === id);
    if (!item) return;
    bag.current?.close();
    setView("Studio");
    setState((old) => beginBagEdit(old, id));
    setConfirmed(false);
    setExpanded(["name"]);
    focusDesign();
  }
  function section(
    id: string,
    n: string,
    label: string,
    summary: string,
    children: ReactNode,
  ) {
    const open = (desktop && id !== "personal") || expanded.includes(id);
    return (
      <section
        id={`section-${id}`}
        tabIndex={-1}
        className={s.section}
        data-expanded={open}
      >
        <button
          className={s.sectionHeading}
          aria-disabled={desktop && id !== "personal"}
          tabIndex={desktop && id !== "personal" ? -1 : 0}
          aria-expanded={open}
          aria-controls={`body-${id}`}
          onClick={() =>
            !(desktop && id !== "personal") &&
            setExpanded((old) =>
              open ? old.filter((x) => x !== id) : [...old, id],
            )
          }
        >
          <span className={s.number}>{n}</span>
          <span>
            <strong>{t(label)}</strong>
            <small>{summary}</small>
          </span>
          <CaretDown size={16} />
        </button>
        <div id={`body-${id}`} className={s.sectionBody}>
          {children}
        </div>
      </section>
    );
  }
  function choices<T extends string | number>(
    label: string,
    options: readonly T[],
    value: T,
    onChange: (value: T) => void,
    visual?: (value: T, index: number) => ReactNode,
    disabled?: readonly T[],
  ) {
    return (
      <fieldset className={s.field}>
        <legend>{t(label)}</legend>
        <div className={visual ? s.visualChoices : s.choices}>
          {options.map((option, i) => (
            <button
              key={option}
              type="button"
              aria-label={t(String(option))}
              aria-pressed={option === value}
              disabled={disabled?.includes(option)}
              onClick={() => onChange(option)}
              className={s.choice}
            >
              {visual?.(option, i)}
              <span>{t(String(option))}</span>
              {option === value && (
                <Check className={s.selectedTick} size={12} />
              )}
              {disabled?.includes(option) && (
                <small>{locale === "ar" ? "جار التحضير" : "Unavailable"}</small>
              )}
            </button>
          ))}
        </div>
      </fieldset>
    );
  }
  const summaries = [
    { id: "name", label: "Name", value: `${nameLabel(d)} · ${t(d.script)}` },
    {
      id: "style",
      label: "Style & Arrangement",
      value: `${t(d.construction)} · ${t(d.lettering)}${d.twoNames ? " · " + t(d.layout) : ""}`,
    },
    {
      id: "gold",
      label: "Gold & Stones",
      value: `18K ${t(d.metal)} · ${t(d.coverage)}${d.coverage !== "No stones" ? " · " + t(d.gem) : ""}`,
    },
    {
      id: "size",
      label: "Size & Chain",
      value: `${d.size} mm · ${t(d.chain)}`,
    },
    {
      id: "personal",
      label: "Personal touches",
      value:
        [d.engraving, d.requests].filter(Boolean).join(" · ") || t("Optional"),
    },
  ];
  return (
    <div
      className={s.app}
      data-testid="atelier"
      data-text-entry={editingText}
      onBlurCapture={() => {
        if (blurTimer.current) clearTimeout(blurTimer.current);
        // Let the pointer-up finish before restoring a bar under the tapped control.
        blurTimer.current = setTimeout(() => {
          if (
            !document.activeElement?.matches(
              'input:not([type="checkbox"]), textarea',
            )
          )
            setEditingText(false);
        }, 180);
      }}
      onFocusCapture={(event) => {
        const element = event.target;
        if (
          element instanceof HTMLElement &&
          element.matches('input:not([type="checkbox"]), textarea') &&
          window.innerWidth < 768
        ) {
          if (blurTimer.current) clearTimeout(blurTimer.current);
          setEditingText(true);
          requestAnimationFrame(() => {
            if (document.activeElement === element)
              element.scrollIntoView({ block: "center", behavior: "instant" });
          });
        }
      }}
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <header className={s.header}>
        <a
          className={s.wordmark}
          href={`/${locale}/design/new`}
          aria-label="CALEUMS design"
        >
          CALEUMS
        </a>
        <span className={s.headerNote}>THE NAME ATELIER</span>
        <div className={s.headerActions}>
          <a
            href={`/${locale === "ar" ? "en" : "ar"}/design/new`}
            lang={locale === "ar" ? "en" : "ar"}
          >
            {locale === "ar" ? "EN" : "العربية"}
          </a>
          <button
            onClick={openBag}
            aria-label={`${t("Your bag")} (${state.bag.reduce((sum, b) => sum + b.quantity, 0)})`}
          >
            <ShoppingBag size={21} />
            <span>{state.bag.reduce((sum, b) => sum + b.quantity, 0)}</span>
          </button>
        </div>
      </header>
      <nav
        className={s.steps}
        aria-label={locale === "ar" ? "خطوات التصميم" : "Design steps"}
      >
        <button
          aria-current={state.stage === "design" ? "step" : undefined}
          onClick={() => go("design")}
        >
          <span>01</span>
          {t("Design")}
        </button>
        <span className={s.stepLine} />
        <button
          disabled={!latestRun}
          aria-current={state.stage === "review" ? "step" : undefined}
          onClick={() => go("review")}
        >
          <span>02</span>
          {t("Review")}
        </button>
        <span className={s.saved}>
          {t(
            loaded && !notice.includes("Storage is unavailable")
              ? "Saved on this device"
              : "Local draft",
          )}
        </span>
      </nav>
      {notice && (
        <div role="status" className={s.notice}>
          {notice}
        </div>
      )}
      {state.editing && (
        <div className={s.notice}>
          Editing a saved piece.{" "}
          <button
            onClick={() => {
              setState(cancelBagEdit);
              setConfirmed(false);
              setView("Studio");
              focusDesign();
            }}
          >
            {t("Cancel editing")}
          </button>
        </div>
      )}
      <main className={s.main}>
        <div className={s.intro}>
          <p className={s.eyebrow}>
            {t(state.stage === "design" ? "Create your piece" : "Your design")}
          </p>
          <h1 ref={title} tabIndex={-1}>
            {t(
              state.stage === "design"
                ? "Your name, made precious."
                : "Your piece, in every light.",
            )}
          </h1>
          <p>
            {state.stage === "design"
              ? t("A piece of you. Designed by you.")
              : locale === "ar"
                ? "راجع التفاصيل واحفظ قطعتك في الحقيبة."
                : "Take a closer look. Make sure every detail feels like you."}
          </p>
        </div>
        <div className={s.workspace}>
          <div className={s.controls}>
            {state.stage === "design" ? (
              <>
                {section(
                  "name",
                  "01",
                  "Name",
                  summaries[0]!.value,
                  <>
                    {choices(
                      "Language / script",
                      ["English", "Arabic"] as const,
                      d.script,
                      (x) => change("script", x),
                    )}
                    {choices(
                      "Name",
                      ["One name", "Two names"],
                      d.twoNames ? "Two names" : "One name",
                      (x) => change("twoNames", x === "Two names"),
                    )}
                    <label className={s.inputLabel} htmlFor="pendant-name">
                      {t("Name on your pendant")}
                      <input
                        id="pendant-name"
                        value={d.name}
                        dir={d.script === "Arabic" ? "rtl" : "auto"}
                        placeholder={
                          d.script === "Arabic" ? "أسماء" : "e.g. Asma"
                        }
                        maxLength={30}
                        onChange={(e) => change("name", e.target.value)}
                        aria-invalid={!!errors.name}
                        aria-describedby={
                          errors.name ? "name-error" : "spelling-help"
                        }
                        autoComplete="off"
                      />
                    </label>
                    {errors.name && (
                      <p id="name-error" role="alert" className={s.error}>
                        {errors.name}
                      </p>
                    )}
                    {d.twoNames && (
                      <>
                        <label className={s.inputLabel} htmlFor="second-name">
                          {t("Second name")}
                          <input
                            id="second-name"
                            value={d.secondName}
                            dir={d.script === "Arabic" ? "rtl" : "auto"}
                            placeholder={
                              d.script === "Arabic" ? "فاطمة" : "e.g. Fatima"
                            }
                            maxLength={30}
                            onChange={(e) =>
                              change("secondName", e.target.value)
                            }
                            aria-invalid={!!errors.secondName}
                            aria-describedby={
                              errors.secondName
                                ? "second-error"
                                : "spelling-help"
                            }
                          />
                        </label>
                        {errors.secondName && (
                          <p role="alert" id="second-error" className={s.error}>
                            {errors.secondName}
                          </p>
                        )}
                      </>
                    )}
                    <p className={s.help} id="spelling-help">
                      {locale === "ar"
                        ? "اكتب الاسم كما تريده تمامًا. يمكنك تصحيح الإملاء هنا."
                        : "Enter the exact spelling you want. You can correct it here at any time."}
                    </p>
                    {d.name && (
                      <div className={s.spelling}>
                        <small>
                          {locale === "ar"
                            ? "النص المطلوب · ليس معاينة للقطعة"
                            : "YOUR SPELLING · TEXT ONLY"}
                        </small>
                        <b dir="auto">{nameLabel(d)}</b>
                      </div>
                    )}
                  </>,
                )}
                {section(
                  "style",
                  "02",
                  "Style & Arrangement",
                  summaries[1]!.value,
                  <>
                    {choices(
                      "Pendant construction",
                      constructions,
                      d.construction,
                      (x) => change("construction", x),
                      (x, i) => (
                        <span className={s.construction}>{icons[i]}</span>
                      ),
                    )}

                    {choices(
                      "Lettering style",
                      letters,
                      d.lettering,
                      (x) => change("lettering", x),
                      (x, i) => (
                        <span
                          className={s.letterSample}
                          style={{
                            fontStyle: i % 2 ? "normal" : "italic",
                            fontWeight: i === 3 ? 700 : 400,
                          }}
                        >
                          {d.script === "Arabic" ? "أسماء" : "Asma"}
                        </span>
                      ),
                    )}

                    {d.twoNames && (
                      <>
                        {choices(
                          "Connection layout",
                          layouts,
                          d.layout,
                          (x) => change("layout", x),
                          (x, i) => (
                            <span className={s.layoutSample}>
                              {["Aa Aa", "Aa ♡ Aa", "Aa / Aa", "∞", "♧"][i]}
                            </span>
                          ),
                        )}
                      </>
                    )}
                  </>,
                )}
                {section(
                  "gold",
                  "03",
                  "Gold & Stones",
                  summaries[2]!.value,
                  <>
                    {choices(
                      "18K gold",
                      metals,
                      d.metal,
                      (x) => change("metal", x),
                      (x, i) => (
                        <span
                          className={s.metal}
                          style={{
                            background: [
                              "linear-gradient(110deg,#997130,#f9e4a0,#ba8a36)",
                              "linear-gradient(110deg,#91918d,#fff,#bbbcb9)",
                              "linear-gradient(110deg,#a96046,#f2c4aa,#bd7960)",
                            ][i],
                          }}
                        />
                      ),
                    )}
                    {choices(
                      "Stone setting",
                      coverages,
                      d.coverage,
                      (x) => change("coverage", x),
                      (x, i) => (
                        <span className={s.stones}>
                          {["—", "· ◇ ·", "◇ ◇", "◇◇◇"][i]}
                        </span>
                      ),
                    )}
                    {d.coverage !== "No stones" &&
                      choices(
                        "Choose your stones",
                        gems,
                        d.gem,
                        (x) => change("gem", x),
                        (x, i) => (
                          <span
                            className={s.gem}
                            style={{ background: gemColors[i] }}
                          />
                        ),
                      )}
                  </>,
                )}
                {section(
                  "size",
                  "04",
                  "Size & Chain",
                  summaries[3]!.value,
                  <>
                    {choices(
                      "Size",
                      [22, 32] as const,
                      d.size,
                      (x) => change("size", x),
                      (x) => (
                        <span className={s.measure}>
                          {x === 22 ? "Delicate" : "Statement"}
                          <small>mm</small>
                        </span>
                      ),
                    )}
                    {choices(
                      "Chain style",
                      chains,
                      d.chain,
                      (x) => change("chain", x),
                      (x, i) => (
                        <span className={s.chain}>
                          {["∽∽∽", "○○○", "□□□□", "≋≋≋"][i]}
                        </span>
                      ),
                    )}
                  </>,
                )}
                {section(
                  "personal",
                  "+",
                  "Personal touches",
                  summaries[4]!.value,
                  <>
                    <label className={s.inputLabel}>
                      {t("Engraving")} · {t("Optional")}
                      <input
                        value={d.engraving}
                        maxLength={80}
                        onChange={(e) => change("engraving", e.target.value)}
                        placeholder="A date, initials, a little meaning"
                      />
                    </label>
                    <label className={s.inputLabel}>
                      {t("Special requests")} · {t("Optional")}
                      <textarea
                        value={d.requests}
                        maxLength={1000}
                        rows={3}
                        onChange={(e) => change("requests", e.target.value)}
                        placeholder="Tell us what would make it yours"
                      />
                    </label>
                  </>,
                )}
              </>
            ) : (
              <div className={s.reviewDetails}>
                <button className={s.textButton} onClick={() => go("design")}>
                  <ArrowLeft />
                  {t("Back to design")}
                </button>
                <h2>{t("Your design")}</h2>
                {summaries.map((row) => (
                  <div className={s.specRow} key={row.id}>
                    <div>
                      <small>{t(row.label)}</small>
                      <p dir="auto">{row.value}</p>
                    </div>
                    <button
                      onClick={() => go("design", row.id)}
                      aria-label={`${t("Edit")} ${t(row.label)}`}
                    >
                      {t("Edit")}
                    </button>
                  </div>
                ))}
                <div className={s.price}>
                  <small>{t("Price unconfirmed")}</small>
                  <p>
                    {locale === "ar"
                      ? "قطعة شخصية. تفاصيل مدروسة."
                      : "Personal by design."}
                  </p>
                  <span>Checkout is coming soon.</span>
                </div>

                <label className={s.confirm}>
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  <span>
                    {locale === "ar"
                      ? "أؤكد صحة كتابة الاسم والتفاصيل المحددة."
                      : "I confirm the spelling and selected details are correct."}
                    <b dir="auto">{nameLabel(d)}</b>
                  </span>
                </label>
              </div>
            )}
            {debug && (
              <details className={s.demo}>
                <summary>Local preview controls</summary>
                <p>Local rendering only. No provider or checkout requests.</p>
                <label className={s.confirm}>
                  <input
                    type="checkbox"
                    checked={failView}
                    onChange={(e) => setFailView(e.target.checked)}
                  />
                  Simulate a failed Dark view on the next preview
                </label>
              </details>
            )}
          </div>
          <aside
            className={s.preview}
            aria-label="Jewelry preview"
            aria-roledescription="carousel"
            onMouseEnter={() => {
              setHovering(true);
              setPlayRequested(false);
            }}
            onMouseLeave={() => setHovering(false)}
            onFocusCapture={() => {
              setPreviewFocused(true);
              setPlayRequested(false);
            }}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                setPreviewFocused(false);
            }}
          >
            <div className={s.previewSticky}>
              <div
                className={s.photo}
                data-carousel-view={view}
                data-selected-configuration={piece.family.configurationKey}
                data-preview-match={piece.missing ? "missing" : "exact"}
                data-assembly-key={piece.key}
                data-render-status={piece.status}
                onTouchStart={(event) => {
                  const touch = event.touches[0];
                  if (!touch) return;
                  swipeStart.current = { x: touch.clientX, y: touch.clientY };
                }}
                onTouchEnd={(event) => {
                  const start = swipeStart.current;
                  swipeStart.current = null;
                  const touch = event.changedTouches[0];
                  if (!start || !touch) return;
                  const dx = touch.clientX - start.x;
                  const dy = touch.clientY - start.y;
                  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5)
                    stepView((dx < 0 ? 1 : -1) * (locale === "ar" ? -1 : 1));
                }}
              >
                <span className={s.photoLabel}>
                  {exampleLabel}
                </span>
                {(!run || slot?.status === "ready") &&
                !imageFailed &&
                !!source &&
                piece.status !== "pending" ? (
                  <img
                    ref={photoElement}
                    key={`${source}-${imageAttempt}`}
                    src={source}
                    alt={`Photographic ${shown.twoNames ? "Asma and Fatima" : shown.script === "Arabic" ? "أسماء" : "Asma"} example, ${shown.construction}, ${shown.lettering}, ${shown.metal}, ${shown.coverage}${shown.coverage === "No stones" ? "" : `, ${shown.gem}`}, ${shown.size} mm, ${shown.chain} chain`}
                    data-sample-id={piece.family.assets.find(asset => asset.view === view)?.id}
                    data-sample-exact={piece.family.anchor.exact}
                    data-render-key={piece.key}
                    onLoad={() => setLoadedSource(source)}
                    onError={() =>
                      setImageErrors((old) =>
                        Array.from(new Set([...old, source])),
                      )
                    }
                  />
                ) : (
                  <div className={s.previewState} role="status" data-preview-missing={piece.missing}>
                    {!piece.missing && piece.status === "pending" && piece.previousImage && (
                      <img className={s.previousPhoto} src={piece.previousImage.src} alt={piece.previousImage.alt} />
                    )}
                    {piece.missing ? (
                      <>
                        <Diamond size={36} />
                        <h2>{locale === "ar" ? "صورة هذا التصميم غير متاحة بعد" : "No matching photo for this combination yet"}</h2>
                        <p>{locale === "ar" ? "تم حفظ جميع اختياراتك. لا توجد صورة مطابقة لهذه المجموعة بعد." : "Your selections are saved. A matching Asma photo for this complete combination is not available yet."}</p>
                      </>
                    ) : imageFailed || piece.status === "failed" ? (
                      <>
                        <p>This example photo could not load.</p>
                        <button onClick={retryImage}>{t("Retry")}</button>
                      </>
                    ) : slot?.status === "failed" ? (
                      <>
                        <Diamond size={36} />
                        <h2>{t("Preview failed")}</h2>
                        <p>Other successful views are still available.</p>
                        <button onClick={() => retry(view)}>
                          {t("Retry")} {t(view)}
                        </button>
                      </>
                    ) : (
                      <>
                        <span className={s.spinner} />
                        <h2>{t("Updating preview")}</h2>
                        <p>Loading the {t(view)} sample photo.</p>
                      </>
                    )}
                  </div>
                )}
                {(!run || slot?.status === "ready") &&
                  !imageFailed &&
                  !!source &&
                  piece.status !== "pending" && (
                    <button
                      className={s.zoomButton}
                      onClick={() => zoom.current?.showModal()}
                      aria-label={t("Zoom image")}
                    >
                      <MagnifyingGlassPlus size={21} />
                    </button>
                  )}
                <div className={s.photoCaption}>
                  <span>CALEUMS — THE NAME COLLECTION</span>
                  <span>
                    {shown.twoNames
                      ? "Asma & Fatima"
                      : shown.script === "Arabic"
                        ? "أسماء"
                        : "Asma"}{" "}
                    · Asma example
                  </span>
                </div>
              </div>
              <div className={s.previewDock}>
                <div className={s.dockHeading}>
                  <div>
                    <small>
                      {locale === "ar"
                        ? "قطعة واحدة · زوايا مختلفة"
                        : "ONE PIECE · EVERY PERSPECTIVE"}
                    </small>
                    <h2>{t(view)}</h2>
                  </div>
                  <div className={s.carouselControls}>
                    <button
                      aria-label={
                        locale === "ar" ? "الزاوية السابقة" : "Previous view"
                      }
                      onClick={() => stepView(-1)}
                      disabled={rotatingViews.length < 2}
                    >
                      <ArrowLeft size={18} />
                    </button>
                    {rotatingViews.length > 1 && (
                      <button
                        aria-label={
                          autoplay ? "Pause slideshow" : "Play slideshow"
                        }
                        aria-pressed={autoplay}
                        onClick={() => {
                          setPlayRequested(!autoplay);
                          setAutoplay((old) => !old);
                        }}
                      >
                        {autoplay ? "Ⅱ" : "▷"}
                      </button>
                    )}
                    <button
                      aria-label={
                        locale === "ar" ? "الزاوية التالية" : "Next view"
                      }
                      onClick={() => stepView(1)}
                      disabled={rotatingViews.length < 2}
                    >
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
                <div
                  className={s.carouselProgress}
                  aria-hidden="true"
                  data-playing={playing}
                  key={source}
                >
                  <span />
                </div>
                <div
                  ref={viewRail}
                  className={s.views}
                  aria-label="Preview views"
                >
                  {views.map((v, index) => {
                    const status = !piece.availableViews.includes(v) ? "unavailable" : piece.errors[v]
                      ? "failed"
                      : piece.status === "pending" || !piece.views[v]
                        ? "pending"
                        : (run?.slots.find((x) => x.view === v)?.status ??
                          "ready");
                    const photo = { asset: { src: piece.views[v] ?? "" } };
                    const missing = !piece.views[v];
                    return (
                      <button
                        key={v}
                        aria-label={t(v)}
                        data-preview-status={
                          imageErrors.includes(photo.asset.src)
                            ? "failed"
                            : (status ?? "ready")
                        }
                        disabled={!piece.availableViews.includes(v)}
                        aria-describedby={`view-status-${index}`}
                        aria-pressed={v === view}
                        onClick={() => chooseView(v)}
                      >
                        <span id={`view-status-${index}`} className={s.srOnly}>
                          {status === "unavailable"
                            ? locale === "ar" ? "الصورة غير متاحة" : "Photo not available"
                            : missing
                            ? locale === "ar"
                              ? "جار التحضير"
                              : "Preparing preview"
                            : status === "failed" ||
                                imageErrors.includes(photo.asset.src)
                              ? locale === "ar"
                                ? "فشلت المعاينة"
                                : "Preview failed"
                              : status === "pending"
                                ? locale === "ar"
                                  ? "جار التحضير"
                                  : "Preparing preview"
                                : locale === "ar"
                                  ? "جاهز"
                                  : "Preview ready"}
                        </span>
                        {!missing ? (
                          <img
                            src={photo.asset.src}
                            alt=""
                            aria-hidden="true"
                          />
                        ) : (
                          <div className={s.missingAngle}>—</div>
                        )}
                        <span>{t(v)}</span>
                        <em aria-hidden="true">
                          {status === "unavailable"
                            ? locale === "ar" ? "الصورة غير متاحة" : "Photo not available"
                            : missing
                            ? locale === "ar"
                              ? "جار التحضير"
                              : "Preparing"
                            : locale === "ar"
                              ? ["التصميم", "المقاس", "التفاصيل", "الإضاءة"][
                                  index
                                ]
                              : [
                                  "The design",
                                  "On you",
                                  "The details",
                                  "After hours",
                                ][index]}
                        </em>
                        {(v === view ||
                          status === "pending" ||
                          status === "failed") && (
                          <small aria-hidden="true">
                            {status === "pending"
                              ? "◌"
                              : status === "failed"
                                ? "!"
                                : "✓"}
                          </small>
                        )}
                      </button>
                    );
                  })}
                </div>
                <details className={s.sampleDetails}>
                  <summary>
                    {locale === "ar" ? "عن هذا المثال" : "About this example"}
                    <span>
                      {exampleLabel}
                    </span>
                  </summary>
                  <p>
                    {locale === "ar"
                      ? "صور مرجعية أصلية لقلادة أسماء. نحفظ الاسم والخيارات التي تحددها مع تصميمك."
                      : piece.missing ? "All selected options are preserved. This combination needs a matching photograph before it can be previewed." : `This example shows ${shown.script}, ${shown.construction}, ${shown.lettering}, ${shown.metal}, ${shown.coverage}${shown.coverage === "No stones" ? "" : ` · ${shown.gem}`}, ${shown.size} mm and ${shown.chain}. Your selections are saved separately.`}
                  </p>
                  <p>
                    {locale === "ar"
                      ? "النقش والطلبات الخاصة محفوظة في ملخص التصميم."
                      : "Engraving and special requests are saved in your design summary; they do not alter this front view."}
                  </p>
                </details>
                {piece.warning && <p role="status">{piece.warning}</p>}
                <div
                  className={s.selectionSummary}
                  aria-label={locale === "ar" ? "اختياراتك" : "Your selections"}
                >
                  <div className={s.selectionName}>
                    <small>
                      {locale === "ar" ? "اختياراتك" : "YOUR SELECTIONS"}
                    </small>
                    <b dir="auto">{nameLabel(d)}</b>
                  </div>
                  <div className={s.specChips}>
                    <span>
                      {t(d.construction)} · {t(d.lettering)}
                    </span>
                    {d.twoNames && <span>{t(d.layout)}</span>}
                    <span>
                      <i
                        style={{
                          background:
                            d.metal === "White gold"
                              ? "#d5d5d3"
                              : d.metal === "Rose gold"
                                ? "#c58f75"
                                : "#b59b5b",
                        }}
                      />
                      18K {t(d.metal)}
                    </span>
                    <span>
                      {t(d.coverage)}
                      {d.coverage !== "No stones" ? " · " + t(d.gem) : ""}
                    </span>
                    <span>
                      {d.size} mm · {t(d.chain)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <div className={s.actionBar}>
        <div>
          <small>{t("Price unconfirmed")}</small>
          <span>{locale === "ar" ? "مثال التصميم" : "Design example"}</span>
        </div>
        {state.stage === "design" || stale ? (
          <button
            className={s.primary}
            disabled={!loaded || piece.missing || piece.status === "pending" || saving}
            onClick={generate}
          >
            {t("Preview my piece")}
            <ArrowRight size={19} />
          </button>
        ) : (
          <button className={s.primary} disabled={!eligible} onClick={add}>
            {t(state.editing ? "Update piece" : "Add to bag")}
            <ShoppingBag size={19} />
          </button>
        )}
      </div>
      <footer className={s.footer}>
        <span>◇ 18K GOLD</span>
        <span>✧ PERSONAL BY DESIGN</span>
        <span>CALEUMS · DUBAI</span>
      </footer>
      <dialog
        ref={bag}
        onKeyDown={trapFocus}
        className={s.bag}
        aria-labelledby="bag-title"
      >
        <div className={s.dialogHeader}>
          <h2 id="bag-title">
            {t("Your bag")} <small>({state.bag.length})</small>
          </h2>
          <button aria-label={t("Close")} onClick={() => bag.current?.close()}>
            <X size={22} />
          </button>
        </div>
        <div className={s.bagBody}>
          {!state.bag.length ? (
            <div className={s.emptyBag}>
              <ShoppingBag size={40} />
              <h3>A little space for something personal.</h3>
              <button onClick={() => bag.current?.close()}>
                {t("Continue designing")}
              </button>
            </div>
          ) : (
            state.bag.map((item) => (
              <article className={s.bagItem} key={item.id}>
                {item.snapshot ? (
                  <SnapshotImage
                    snapshotId={item.snapshot.id}
                    alt="Saved pendant configuration"
                  />
                ) : item.sampleId &&
                  !samples.some((asset) => asset.id === item.sampleId) ? (
                  <div role="img" aria-label="Previously saved example pendant">
                    This saved example is unavailable.
                  </div>
                ) : (
                  <img
                    src={
                      samples.find((asset) => asset.id === item.sampleId)
                        ?.src ?? sampleSource("Studio", item.draft)
                    }
                    alt="Previously saved example pendant"
                  />
                )}
                <div>
                  <small>NAME PENDANT · YOUR DESIGN</small>
                  <h3 dir="auto">{nameLabel(item.draft)}</h3>
                  <p>
                    18K {t(item.draft.metal)} · {item.draft.size} mm
                    <br />
                    {t(item.draft.chain)}
                    <br />
                    {t(item.draft.coverage)}
                    {item.draft.coverage !== "No stones"
                      ? " · " + t(item.draft.gem)
                      : ""}
                  </p>
                  <span>{t("Price unconfirmed")}</span>
                  <div className={s.quantity}>
                    <button
                      aria-label={`Decrease quantity for ${nameLabel(item.draft)}`}
                      disabled={item.quantity === 1}
                      onClick={() =>
                        setState((old) => ({
                          ...old,
                          bag: old.bag.map((b) =>
                            b.id === item.id
                              ? { ...b, quantity: b.quantity - 1 }
                              : b,
                          ),
                        }))
                      }
                    >
                      <Minus />
                    </button>
                    <output aria-label="Quantity">{item.quantity}</output>
                    <button
                      aria-label={`Increase quantity for ${nameLabel(item.draft)}`}
                      disabled={item.quantity === 99}
                      onClick={() =>
                        setState((old) => ({
                          ...old,
                          bag: old.bag.map((b) =>
                            b.id === item.id
                              ? { ...b, quantity: b.quantity + 1 }
                              : b,
                          ),
                        }))
                      }
                    >
                      <Plus />
                    </button>
                  </div>
                  <div className={s.itemActions}>
                    <button onClick={() => editItem(item.id)}>
                      {t("Edit")}
                    </button>
                    <button
                      onClick={() =>
                        setState((old) => ({
                          ...old,
                          editing: old.editing === item.id ? null : old.editing,
                          editReturn:
                            old.editing === item.id
                              ? undefined
                              : old.editReturn,
                          bag: old.bag.filter((b) => b.id !== item.id),
                        }))
                      }
                    >
                      {t("Remove")}
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
        <div className={s.bagFooter}>
          <button className={s.outline} onClick={newPiece}>
            {t("New piece")}
            <Plus />
          </button>
          <p>
            Saved locally on this device. Prices are unconfirmed; no order has
            been placed.
          </p>
          <button className={s.primary} disabled>
            {t("Checkout unavailable")}
          </button>
        </div>
      </dialog>
      <dialog
        ref={zoom}
        onKeyDown={trapFocus}
        className={s.zoomDialog}
        aria-label="Inspect sample jewelry"
      >
        <div className={s.dialogHeader}>
          <span>{t(view)} · Asma example</span>
          <button aria-label={t("Close")} onClick={() => zoom.current?.close()}>
            <X size={22} />
          </button>
        </div>
        <TransformWrapper key={source}>
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              <div className={s.zoomTools}>
                <button aria-label="Zoom in" onClick={() => zoomIn()}>
                  <Plus />
                </button>
                <button aria-label="Zoom out" onClick={() => zoomOut()}>
                  <Minus />
                </button>
                <button onClick={() => resetTransform()}>Reset</button>
              </div>
              <TransformComponent wrapperClass={s.zoomCanvas}>
                {source && (
                  <img src={source} alt="Enlarged configured sample pendant" />
                )}
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </dialog>
    </div>
  );
}
