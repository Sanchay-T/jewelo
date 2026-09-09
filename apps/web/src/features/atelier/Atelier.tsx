"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type KeyboardEvent,
} from "react";
import { sellableLooks } from "@jewelo/config/sellable";
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
  initialState,
  signature,
  validate,
  savedExampleSource,
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
import {
  clearDeviceState,
  loadDeviceState,
  saveDeviceState,
} from "./deviceState";
import { NAME_MAX } from "@jewelo/contracts";
// P7-5 / DS-9. The three moments the shop wants counted, through the port:
// a step was reached, the spelling was confirmed, the request arrived. Ids and
// enumerated values only, and with `NEXT_PUBLIC_POSTHOG_KEY` empty - which is
// every deployment today - this loads no vendor code at all.
import { captureJourneyEvent } from "@jewelo/observability/client";
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
  // The step-01 button carries the shopper to the review, where confirming the
  // spelling is what buys the run. It is named for what it does; the key had to
  // change with it or the Arabic journey would silently read the English one.
  "Review my piece": "مراجعة قطعتي",
  "Start with your name": "ابدأ باسمك",
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
  // Storyline review 1, minor: the Arabic two-name refusal used to arrive only
  // after the shopper had confirmed the spelling. It is said on the option now.
  "One name in Arabic": "اسم واحد بالعربية",
  "Arabic pendants are cast with one name; the shop makes a two-name piece by hand":
    "القلادات العربية تُصاغ باسم واحد؛ ويصنع المتجر قطعة الاسمين يدويًا.",
  "Name on your pendant": "الاسم على القلادة",
  "Second name": "الاسم الثاني",
  "Your photograph is being made. About two minutes.": "جارٍ تصوير قطعتك. نحو دقيقتين.",
  "The shop will photograph it and send it to you.": "سيصوّرها المتجر ويرسلها إليك.",
  "Language": "اللغة",
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
  Classical: "كلاسيكية",
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
  "This clears the bag, the design and the name so the next customer starts fresh.":
    "سيؤدي هذا إلى مسح الحقيبة والتصميم والاسم ليبدأ العميل التالي من جديد.",
  "Clear and start fresh": "امسح وابدأ من جديد",
  "Keep this bag": "احتفظ بالحقيبة",
  "Cancel editing": "إلغاء التعديل",
  "Continue designing": "متابعة التصميم",
  "Local sample preview": "معاينة تجريبية محلية",
  "Sample image · Asma": "صورة تجريبية · أسماء",
  "Saved on this device": "محفوظ على هذا الجهاز",
  "Local draft": "مسودة محلية",
  "Zoom image": "تكبير الصورة",
  "Your name": "اسمك",
  "Shop sample · Asma": "عينة من المتجر · أسماء",
  "Your selected design": "تصميمك المحدد",
  "Sample coming": "العينة قريبًا",
  "Not yet photographed": "لم تُصوَّر بعد",
  "A shop sample. Yours is photographed after you confirm the spelling.":
    "عينة من المتجر. تُصوَّر قطعتك بعد تأكيد التهجئة.",
  Size: "المقاس",
  Delicate: "رقيق",
  Statement: "بارز",
  "Updating preview": "جارٍ تحديث المعاينة",
  "e.g. Asma": "مثال: أسماء",
  "A date, initials, a little meaning": "تاريخ أو أحرف أولى أو معنى صغير",
  "Tell us what would make it yours": "أخبرنا بما يجعلها لك",
  "A little space for something personal.": "مساحة صغيرة لشيء شخصي.",
  "Jewelry preview": "معاينة المجوهرات",
  "Preview views": "زوايا المعاينة",
  "Inspect sample jewelry": "تفحّص المجوهرات التجريبية",
  "Zoom in": "تكبير",
  "Zoom out": "تصغير",
  Reset: "إعادة الضبط",
  "Saved locally on this device. Prices are unconfirmed; no order has been placed.":
    "محفوظ محليًا على هذا الجهاز. الأسعار غير مؤكدة ولم يتم تنفيذ أي طلب.",
  // The name rules, worded exactly as `packages/contracts/src/domain.ts`
  // returns them, so the Arabic journey never falls back to an English
  // sentence at the one field the whole piece depends on.
  "Enter a name.": "اكتب الاسم.",
  "Use at most 30 characters.": "استخدم ٣٠ حرفًا كحد أقصى.",
  "Remove invisible formatting characters.": "احذف رموز التنسيق غير المرئية.",
  "Use Latin letters, spaces, apostrophes or hyphens.":
    "استخدم حروفًا لاتينية ومسافات وفواصل عليا أو شرطات.",
  "Use Arabic letters and spaces.": "استخدم حروفًا عربية ومسافات.",
  "Enter a name containing Latin letters.": "اكتب اسمًا بحروف لاتينية.",
  "Enter a name containing Arabic letters.": "اكتب اسمًا بحروف عربية.",
  "Enter the exact Arabic spelling, or choose English.": "اكتب الاسم بالعربية كما تريده تمامًا، أو اختر الإنجليزية.",
  "Your keyboard is in English; switch it to Arabic or choose English above.": "لوحة مفاتيحك بالإنجليزية؛ بدّلها إلى العربية أو اختر الإنجليزية أعلاه.",
  "Together these two names are longer than we can make as one pendant. Shorten one of them.":
    "الاسمان معًا أطول مما يمكننا صنعه في قلادة واحدة. اختصر أحدهما.",
  "This is the longest name we can make: 30 characters.":
    "هذا أطول اسم يمكننا صنعه: ٣٠ حرفًا.",
  "Edit the name": "تعديل الاسم",
  // The five notices. They are stored in state as their English text and
  // translated where they are rendered, so the check that reads one of them
  // (`notice.includes("Storage is unavailable")`) still reads one fixed string.
  "Your saved draft could not be read. A fresh draft is ready.":
    "تعذّرت قراءة مسودتك المحفوظة. جهّزنا مسودة جديدة.",
  "Storage is unavailable. Keep this tab open; changes cannot be recovered after reload.":
    "التخزين غير متاح. أبقِ هذه الصفحة مفتوحة؛ لا يمكن استرجاع التغييرات بعد إعادة التحميل.",
  "The preview could not be saved. Please retry before adding this piece.":
    "تعذّر حفظ المعاينة. أعد المحاولة قبل إضافة هذه القطعة.",
  "Your piece is in this bag for this session. Image storage is unavailable; keep this tab open.":
    "قطعتك في الحقيبة لهذه الجلسة فقط. تخزين الصور غير متاح؛ أبقِ هذه الصفحة مفتوحة.",
  "Editing a saved piece.": "تعديل قطعة محفوظة.",
  "This sample photo could not load.": "تعذّر تحميل صورة العينة.",
  // The bag and the zoom dialog: every label an assistive technology reads.
  "CALEUMS design": "تصميم CALEUMS",
  "Photograph of your pendant": "صورة قلادتك",
  "Saved pendant configuration": "إعدادات قلادة محفوظة",
  "Previously saved example pendant": "قلادة مثال محفوظة سابقًا",
  "This saved example is unavailable.": "هذا المثال المحفوظ غير متاح.",
  "NAME PENDANT · YOUR DESIGN": "قلادة اسم · تصميمك",
  Quantity: "الكمية",
  "Decrease quantity": "إنقاص الكمية",
  "Increase quantity": "زيادة الكمية",
  "Enlarged photograph of your pendant": "صورة مكبّرة لقلادتك",
  "Enlarged configured sample pendant": "صورة مكبّرة لقلادة المثال",
  "Not photographed for this look": "لم تُصوَّر لهذا الأسلوب",
  "This angle was not photographed for this look. Your own preview still covers it.":
    "لم تُصوَّر هذه الزاوية لهذا الأسلوب. معاينتك الشخصية تغطيها.",
  "Other successful views are still available.":
    "الزوايا الأخرى الناجحة لا تزال متاحة.",
  // A look the shop cannot cast at all. The label used to be written inline at
  // the choice tile, which is how the Arabic journey kept two spellings of the
  // same word; it is one key now.
  Unavailable: "جار التحضير",
  // The lettering the page carries outside a sentence: the house line beside
  // the wordmark, the caption over the photograph, the footer. CALEUMS is the
  // brand and stays Latin in both journeys.
  "◇ 18K GOLD": "◇ ذهب عيار ١٨",
  "✧ PERSONAL BY DESIGN": "✧ قطعة شخصية بتصميمك",
  "CALEUMS · DUBAI": "CALEUMS · دبي",
  "e.g. Fatima": "مثال: فاطمة",
  // The millimetre unit and the carousel's role, both read aloud in English
  // until now.
  mm: "مم",
  carousel: "دوّار",
  "Image storage is unavailable. Saved photos are available only while this tab stays open.":
    "تخزين الصور غير متاح. الصور المحفوظة تبقى متاحة ما دامت هذه الصفحة مفتوحة.",
};
import { hasExactSample, samples, visualFields, type VisualField } from "./catalogue";
import { letteringFont } from "./letteringFonts";
import { SnapshotImage } from "./SnapshotImage";
import { usePhotographicPiece } from "./usePhotographicPiece";
import { assemblyKey } from "./assembly";
import type { Run } from "./model";
import { buildPersonalizedPreviewRequest, runMockPersonalizedPreview } from "./previewHandoff";
import { fixturePipelineDeps } from "./previewPipeline";
import { usePersonalizedPreview } from "./usePersonalizedPreview";
import type { CustomerViewStatus } from "./personalizedRun";

/**
 * The longest name the shop can cast, and the sentence that says so. The number
 * is the server's own cap (`NAME_MAX` in `packages/contracts/src/domain.ts`);
 * the input stops there, so the shopper is told rather than quietly trimmed.
 */
const NAME_LIMIT_NOTICE = `This is the longest name we can make: ${NAME_MAX} characters.`;
/** True once the field is holding all the characters it will accept. */
const atLimit = (value: string) => value.length >= NAME_MAX;

const sellable = sellableLooks({
  NEXT_PUBLIC_SELLABLE_CONSTRUCTIONS: process.env.NEXT_PUBLIC_SELLABLE_CONSTRUCTIONS,
  NEXT_PUBLIC_SELLABLE_ENGLISH_LETTERING: process.env.NEXT_PUBLIC_SELLABLE_ENGLISH_LETTERING,
  NEXT_PUBLIC_SELLABLE_ARABIC_LETTERING: process.env.NEXT_PUBLIC_SELLABLE_ARABIC_LETTERING,
});
const offeredConstructions = constructions.filter((option) => sellable.constructions.has(option));
const offeredLetters = (script: Draft["script"]) => letters.filter((option) =>
  (script === "Arabic" ? sellable.arabicLettering : sellable.englishLettering).has(option),
);
function sellableDraft(draft: Draft): Draft {
  const construction = offeredConstructions.includes(draft.construction)
    ? draft.construction : offeredConstructions[0]!;
  const options = offeredLetters(draft.script);
  const lettering = options.includes(draft.lettering) ? draft.lettering : options[0]!;
  return construction === draft.construction && lettering === draft.lettering
    ? draft : { ...draft, construction, lettering };
}

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
  /** The customer's name as displayed: joined in its own script, localized when empty. */
  const pendantName = (draft: Draft) => {
    const parts = [draft.name, ...(draft.twoNames ? [draft.secondName] : [])].filter(Boolean);
    if (!parts.length) return t("Your name");
    return parts.join(draft.script === "Arabic" ? " و" : " & ");
  };
  /**
   * The gold, said the way each language says it: "18K yellow gold" in English,
   * "ذهب أصفر عيار ١٨" in Arabic. Written inline in three places before, which
   * left a Latin "18K" standing in the middle of every Arabic summary.
   */
  const goldLabel = (metal: string) =>
    locale === "ar" ? `${t(metal)} عيار ١٨` : `18K ${t(metal)}`;
  const [state, setState] = useState<State>(initialState);
  const [desktop, setDesktop] = useState(false);
  const [editingText, setEditingText] = useState(false);
  const [compactPreview, setCompactPreview] = useState(false);
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
  /**
   * Dev-only: drive the customer's own run from a fixture that ends without a
   * photograph, so the terminal-failure screens can be looked at locally. Gated
   * twice - the panel that sets it is development plus `?preview-test`, and the
   * fixture transport is only built in a development build - so it can never
   * front a shopper's real run. It is not gated on the data mode: the laptop
   * `.env` is the remote mode (a copy of staging's), and the lead's browser pass
   * has to reach these screens without editing that file.
   */
  const [fixtureTerminalRun, setFixtureTerminalRun] = useState(false);
  const fixtureRun =
    fixtureTerminalRun && process.env.NODE_ENV === "development";
  const fixtureDeps = useMemo(
    () =>
      fixtureRun
        ? fixturePipelineDeps({ run: "operator_review", studio: "failed" })
        : undefined,
    [fixtureRun],
  );
  const [imageErrors, setImageErrors] = useState<string[]>([]);
  // Once the customer's own photograph exists it is the piece; the illustrated
  // sample moves to the small tile row and is only shown when asked for.
  const [imageAttempt, setImageAttempt] = useState(0);
  /** Handing the tablet on drops kept pieces, so it is asked for once. */
  const [clearing, setClearing] = useState(false);
  const photoElement = useRef<HTMLImageElement>(null);
  const viewRail = useRef<HTMLDivElement>(null);
  const bag = useRef<HTMLDialogElement>(null);
  const zoom = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const previewPanel = useRef<HTMLElement>(null);
  const actionBar = useRef<HTMLDivElement>(null);
  const d = sellableDraft(state.draft);
  useEffect(() => {
    if (d === state.draft) return;
    setConfirmed(false);
    setState((old) => ({ ...old, draft: sellableDraft(old.draft) }));
  }, [d, state.draft]);
  /**
   * The draft checked on every render, not only when "Review my piece" was
   * pressed. Step 02 stays reachable - a shopper can switch to two names from
   * the review stage and leave the second one empty - so the confirmation must
   * read the draft as it is now, or it hands an unmakeable specification to the
   * run and the page dies on the throw.
   */
  const draftErrors = validate(d);
  const arabicKeyboardMismatch = d.script === "Arabic" && /\p{Script=Latin}/u.test(d.name);
  const nameError = arabicKeyboardMismatch
    ? "Enter the exact Arabic spelling, or choose English."
    : errors.name;
  /** The one sentence that says why the confirmation cannot be ticked yet. */
  const confirmBlockedBy =
    draftErrors.name ?? draftErrors.secondName ?? draftErrors.fit;
  const latestRun = state.runs.at(-1);
  const stale = !!latestRun && latestRun.signature !== signature(d);
  const run = stale ? undefined : latestRun;
  const slot = run?.slots.find((slot) => slot.view === view);
  const pending = run?.slots.some((slot) => slot.status === "pending") ?? false;
  const piece = usePhotographicPiece(d, loaded, state.sampleFocus, view);
  const source = piece.views[view] ?? "";
  const noSample = piece.status === "missing";
  /** The customer's own run: started at confirmation, read from durable state. */
  const own = usePersonalizedPreview({
    draft: d,
    locale,
    loaded,
    stage: state.stage,
    // A confirmation left over from a valid draft never survives an edit that
    // breaks it: the run may only be started for a specification the shop can
    // actually make.
    confirmed: confirmed && !confirmBlockedBy,
    sample: piece.family.anchor.asset,
    ...(fixtureDeps ? { deps: fixtureDeps, enabled: true } : {}),
  });
  /** Kept out of the shared dictionary so two workstreams do not collide on it. */
  const ownPhotoLabel = locale === "ar" ? "قطعتك" : "Your piece";
  /**
   * The whole customer vocabulary for a view: a terminal error code never shows.
   * `unavailable` is a view this run will not produce, so it says what the shop
   * does about that - photograph it and send it - and never "being prepared",
   * which promised work that had already stopped.
   */
  const ownStatusText = (status: CustomerViewStatus) =>
    locale === "ar"
      ? {
          waiting: "في الانتظار",
          working: "جارٍ التصوير",
          checking: "جارٍ التحقق من الكتابة",
          ready: "جاهزة",
          unavailable: "سنصوّرها في المتجر ونرسلها إليك",
        }[status]
      : {
          waiting: "Waiting to start",
          working: "Photographing",
          checking: "Checking the spelling",
          ready: "Ready",
          unavailable: "We will photograph it in the shop and send it",
        }[status];
  const ownPhoto = own.imageFor(view);
  const showingOwnPhoto = !!ownPhoto;
  // An attempted approval stays the shopper's piece after back, untick or reload.
  // A failed start has no run id, so run existence alone cannot guard samples.
  const ownDesignInProgress = own.attempted && !own.personalized;
  const ownRunOver = own.unavailable;
  const ownPlaceholderFor = (camera: View) => t(
    ownRunOver || (own.personalized && own.statusFor(camera) === "unavailable")
      ? "The shop will photograph it and send it to you."
      : "Your photograph is being made. About two minutes.",
  );
  const ownPlaceholderText = ownPlaceholderFor(view);
  /**
   * The shop received a request. Counted where the capture actually lands
   * rather than on the button, so a submission that the server refused is not
   * counted as one that arrived, and counted once per reference: the effect
   * keys on the request id the server minted, which does not change while the
   * shopper stays on the page. The channel is which door the shopper chose to
   * be reached through, never the address they left.
   */
  const capturedForEvent = useRef<string | null>(null);
  useEffect(() => {
    if (own.captureStatus !== "captured") return;
    const reference = own.capturedRequestId ?? "captured";
    if (capturedForEvent.current === reference) return;
    capturedForEvent.current = reference;
    captureJourneyEvent("journey_request_captured", {
      locale,
      channel: own.contact.channel,
    });
  }, [own.captureStatus, own.capturedRequestId, own.contact.channel, locale]);
  const heroSource = showingOwnPhoto ? ownPhoto! : own.attempted ? "" : source;
  /** Only the cameras this family was photographed in; Studio is always one. */
  const shownViews = views.filter((v) => piece.availableViews.includes(v));
  /** The customer's own run covers all four cameras even when the sample does not. */
  const railViews = own.attempted ? views : shownViews;
  const shown = piece.family.anchor.asset?.draft ?? d;
  /** What this photograph is, when it is not a photograph of this exact design. */
  const sampleNote = !piece.sampleComing
    ? ""
    : piece.family.basis === "script"
      ? locale === "ar"
        ? `عينة معروضة بـ${t(shown.script)}. صورة هذا التصميم قيد التحضير.`
        : `Sample shown in ${shown.script}. A photograph of this design is coming.`
      : locale === "ar"
        ? `عينة ${t(shown.construction)} ${shown.twoNames === d.twoNames ? `بخط ${t(shown.lettering)}` : shown.twoNames ? "باسمين" : "باسم واحد"}. صورة هذا التصميم قيد التحضير.`
        : `Sample of this ${shown.construction.toLowerCase()} look, ${shown.twoNames === d.twoNames ? `shown in ${shown.lettering} lettering` : shown.twoNames ? "shown with two names" : "shown with one name"}. A photograph of this design is coming.`;
  /** The exemplar names in the script the photograph actually shows. */
  const sampleNames = (join: string) =>
    shown.script === "Arabic"
      ? shown.twoNames ? `أسماء${join}فاطمة` : "أسماء"
      : shown.twoNames ? `Asma${join}Fatima` : "Asma";
  const imageFailed = !!piece.errors[view] || imageErrors.includes(source);
  const sampleVisible =
    !own.attempted &&
    (!run || slot?.status === "ready") &&
    !imageFailed &&
    !!source &&
    piece.status !== "pending";
  const currentReady = !noSample && piece.key === assemblyKey(d) && !!source && !imageFailed;
  const ownKept = own.personalized || own.captureStatus === "captured";
  const eligible =
    canAdd(d, run, confirmed, ownKept) &&
    (currentReady || ownKept) &&
    !saving;
  /**
   * The bottom action is one of exactly two things, and which one depends only
   * on whether a run exists for the specification on screen - never on which
   * step chip was pressed last. `run` is already the current run or nothing:
   * an edit makes the old one stale and leaves this true again.
   */
  const needsPreview = !run;
  const needsFirstName = state.stage === "design" && !d.name.trim();
  const rotatingViews = views.filter(
    (v) =>
      piece.views[v] &&
      !piece.errors[v] &&
      (!run ||
        run.slots.some((slot) => slot.view === v && slot.status === "ready")),
  );
  const rotationKey = rotatingViews.join("|");
  useEffect(() => {
    if (!piece.availableViews.includes(view) && !own.statusFor(view))
      setView("Studio");
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
  // While the shopper is designing, the preview must hold still on the view they
  // are looking at; the slideshow is part of reviewing a finished piece. The play
  // control stays available in both stages.
  useEffect(() => {
    if (state.stage !== "review") {
      setAutoplay(false);
      setPlayRequested(false);
      return;
    }
    setAutoplay(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setPlayRequested(false);
  }, [state.stage]);
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
    const available = shownViews.length ? shownViews : ["Studio" as View];
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
    // `deviceState` owns every read of this tablet's storage; a record written
    // by the other language hands over the kept pieces and nothing else, so a
    // previous shopper's name can never appear in the name box.
    const device = loadDeviceState(locale);
    const saved = device.state;
    const runs = saved.runs.map((r) => ({
      ...r,
      slots: r.slots.map((slot) =>
        slot.status === "pending" ? { ...slot, status: "failed" as const } : slot,
      ),
    }));
    setState({ ...saved, runs });
    // The spelling confirmation belongs to the approved revision, not to this
    // tab. Without it, a reload on the review stage says "we have your
    // request" and "you have not confirmed your name" at the same time, and
    // Add to bag stays disabled. Re-ticking is still idempotent: the stored
    // submission already marks this specification as started.
    const restoredRun = runs.at(-1);
    setConfirmed(
      !!restoredRun?.confirmed &&
        restoredRun.signature === signature(saved.draft),
    );
    if (device.unreadable)
      setNotice("Your saved draft could not be read. A fresh draft is ready.");
    setLoaded(true);
    // `locale` is fixed for the life of this page: the language link is a full
    // navigation, so this reads the tablet exactly once.
  }, [locale]);
  useEffect(() => {
    if (!loaded) return;
    if (!saveDeviceState(locale, state))
      setNotice(
        "Storage is unavailable. Keep this tab open; changes cannot be recovered after reload.",
      );
  }, [state, loaded, locale]);
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

  // Keep the desktop rail inside the currently visible space. Mobile gets a
  // full photograph in the page and a small reminder only after it scrolls away.
  useEffect(() => {
    const root = workspace.current;
    const panel = previewPanel.current;
    const actions = actionBar.current;
    if (!root || !panel || !actions) return;
    let frame = 0;
    const update = () => {
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      if (mobile) {
        setCompactPreview(panel.getBoundingClientRect().bottom <= 8);
        root.style.setProperty("--preview-scroll-clearance", "108px");
        return;
      }
      setCompactPreview(false);
      const gap = 16;
      const top = Math.max(gap, panel.getBoundingClientRect().top);
      const budget = Math.max(0, window.innerHeight - top
        - actions.getBoundingClientRect().height - gap * 2);
      panel.style.setProperty("--preview-budget", `${budget}px`);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    const observer = new ResizeObserver(schedule);
    observer.observe(actions);
    observer.observe(root);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
    };
  }, [locale, state.stage]);

  function change<K extends keyof Draft>(key: K, value: Draft[K]) {
    if (d[key] === value) return;
    setAutoplay(false);
    setPlayRequested(false);
    confirmSpelling(false);
    setErrors({});
    setState((old) => ({
      ...old,
      draft: sellableDraft({ ...old.draft, [key]: value }),
      sampleFocus: (visualFields as readonly string[]).includes(key) ? key as VisualField : old.sampleFocus,
    }));
  }
  /** Local for this render, durable on the run it approves. */
  function confirmSpelling(next: boolean) {
    // Only the tick itself is a journey moment; clearing it is bookkeeping the
    // shopper never performed (an edit calls this with `false`). The script is
    // the alphabet the piece is made in, not the name in it.
    if (next)
      captureJourneyEvent("journey_spelling_confirmed", {
        locale,
        script: d.script === "Arabic" ? "arabic" : "latin",
      });
    setConfirmed(next);
    setState((old) => {
      const last = old.runs.at(-1);
      if (!last || last.signature !== signature(old.draft)) return old;
      return {
        ...old,
        runs: old.runs.map((run) =>
          run.id === last.id ? { ...run, confirmed: next } : run,
        ),
      };
    });
  }
  function go(stage: "design" | "review", section?: string) {
    // The step chips and every in-page jump land here, so this is the one place
    // that knows a shopper reached a step. The stage id is the shop's own word
    // for the step; nothing the shopper typed goes with it.
    captureJourneyEvent("journey_step_reached", { stage, locale });
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
    // A missing sample photograph never blocks the customer's own preview.
    const nextErrors = validate(d);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setExpanded((old) => Array.from(new Set([...old, "name"])));
      requestAnimationFrame(() =>
        document
          .getElementById(
            nextErrors.secondName && !nextErrors.name
              ? "second-name"
              : "pendant-name",
          )
          ?.focus(),
      );
      return;
    }
    confirmSpelling(false);
    setAutoplay(false);
    setImageErrors([]);
    const capturedDraft = structuredClone(d);
    const id = crypto.randomUUID();
    // Only the cameras this look was actually photographed in are started. The
    // review used to mark all four and then capture the family's views alone,
    // so a camera the sample lacks reported "Photographing" and "Preview
    // failed / Retry" at the same time, and the retry could only fail again.
    const photographed = piece.availableViews;
    const nextRun: Run = {
      version: 1,
      id,
      signature: signature(capturedDraft),
      draft: capturedDraft,
      slots: views.map((v) => ({
        view: v,
        status: photographed.includes(v) ? "pending" : "unavailable",
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
      // The illustrated sample is styling reference only. When this look has no
      // photograph yet the review still runs on the customer's specification.
      const reference = piece.family.anchor.asset;
      const result = reference
        ? (
            await runMockPersonalizedPreview(
              buildPersonalizedPreviewRequest(capturedDraft, reference, { id, locale }),
              () => piece.captureReview(failView),
            )
          ).referenceCapture
        : await piece.captureReview(failView);
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
                slots: r.slots.map((slot) =>
                  slot.status === "unavailable"
                    ? slot
                    : {
                        ...slot,
                        status:
                          !result.errors[slot.view] && result.views[slot.view]
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
          r.id !== id
            ? r
            : {
                ...r,
                slots: r.slots.map((slot) =>
                  slot.status === "unavailable"
                    ? slot
                    : { ...slot, status: "failed" },
                ),
              },
        ),
      }));
    }
  }
  async function retry(v: View) {
    // Nothing was ever photographed for this camera in this look, so there is
    // nothing to retry. The button that used to offer it is gone; this refuses
    // the call as well.
    if (!piece.availableViews.includes(v)) return;
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
    setClearing(false);
    bag.current?.showModal();
  }
  async function add() {
    if (!eligible || saving) return;
    const draftSignature = signature(d);
    setSaving(true);
    // Durable identifiers only: a signed media URL lives five minutes, so the bag
    // keeps the run and asset ids and re-reads the photograph from /api/state.
    // The reference of the request the shop is holding for this shopper. An
    // edit starts a new specification and clears the live capture, but the
    // operator still has to be able to reconcile the two.
    const requestReference = own.capturedRequestId ?? own.previousRequestId;
    const personalized = own.runId
      ? {
          runId: own.runId,
          ...(own.designId ? { designId: own.designId } : {}),
          ...(own.readyAssets.length ? { assets: own.readyAssets } : {}),
          ...(requestReference
            ? { previewRequestId: requestReference }
            : {}),
        }
      : requestReference
        ? { runId: "", previewRequestId: requestReference }
        : undefined;
    try {
      // The illustrated sample is a nicety here; a shopper whose combination has
      // no sample photograph must still be able to keep their piece.
      const snapshot = await piece
        .saveSnapshot(crypto.randomUUID())
        .catch(() => undefined);
      if (
        signature(draftRef.current) !== draftSignature ||
        (snapshot && snapshot.key !== assemblyKey(draftRef.current))
      )
        return;
      if (!snapshot && !ownKept) {
        setNotice(
          "The preview could not be saved. Please retry before adding this piece.",
        );
        return;
      }
      setState((old) => {
        if (signature(old.draft) !== draftSignature) return old;
        const id = old.editing ?? crypto.randomUUID();
        const updated = putInBag(
          old,
          confirmed,
          id,
          piece.family.anchor.asset?.id,
          personalized,
        );
        return {
          ...updated,
          bag: updated.bag.map((item) =>
            item.id === id && snapshot ? { ...item, snapshot } : item,
          ),
        };
      });
      if (snapshot && !snapshot.persistent)
        setNotice(
          "Your piece is in this bag for this session. Image storage is unavailable; keep this tab open.",
        );
      confirmSpelling(false);
      openBag();
    } catch {
      setNotice(
        "The preview could not be saved. Please retry before adding this piece.",
      );
    } finally {
      setSaving(false);
    }
  }
  /**
   * The tablet is handed to the next shopper.
   *
   * The bag, the saved draft, the name, the reference of the request the shop
   * is holding and the run this tab is watching all belong to the person who
   * just left, so all of them go. The anonymous session stays: signing out
   * would buy one of the shop's 30 sign-ins an hour on the next page load.
   */
  function newPiece() {
    bag.current?.close();
    setClearing(false);
    clearDeviceState();
    setState(initialState());
    setConfirmed(false);
    setErrors({});
    setImageErrors([]);
    setNotice("");
    setAutoplay(false);
    setPlayRequested(false);
    setView("Studio");
    setExpanded(["name"]);
    // A reload is the only honest way to drop the request reference and the run
    // this tab is watching: both outlive a specification change on purpose, so
    // the shopper who edits a piece keeps the reference the shop is holding.
    // Storage is already empty, so the page comes back exactly as it does for a
    // first visitor, on the same principal.
    window.location.assign(`/${locale}/design/new`);
  }
  function editItem(id: string) {
    const item = state.bag.find((b) => b.id === id);
    if (!item) return;
    bag.current?.close();
    setView("Studio");
    setState((old) => beginBagEdit(old, id));
    confirmSpelling(false);
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
  /** A design option with no photograph yet is offered, and says so. */
  function comingNote(patch: Partial<Draft>) {
    return hasExactSample({ ...d, ...patch }) ? undefined : t("Sample coming");
  }
  /** Sellable choices without a matching shop photograph stay honestly marked. */
  function notPhotographed(patch: Partial<Draft>) {
    return !hasExactSample({ ...d, ...patch });
  }
  /**
   * Two Arabic names are refused before anything is reserved
   * (`preflightRefusal`, `arabic_two_name`): the Arabic identity engine solves
   * exactly one name. Until now the shopper only met that fact after ticking
   * the spelling confirmation on the review, having chosen "Two names" and
   * typed both (storyline review 1, minor). It is said here instead, on the
   * control that causes it, and only while the pendant is Arabic - it is not a
   * fact about the option, it is a fact about the option in this script.
   *
   * Deliberately not routed through `unphotographed`: that marks a look the shop
   * cannot photograph at all, and this is a piece the shop makes by hand.
   */
  function twoArabicNamesNote(option: string | number) {
    return d.script === "Arabic" && option === "Two names"
      ? {
          tile: t("One name in Arabic"),
          note: t(
            "Arabic pendants are cast with one name; the shop makes a two-name piece by hand",
          ),
        }
      : undefined;
  }
  function choices<T extends string | number>(
    label: string,
    options: readonly T[],
    value: T,
    onChange: (value: T) => void,
    visual?: (value: T, index: number) => ReactNode,
    disabled?: readonly T[],
    note?: (value: T) => string | undefined,
    /** Options the shop cannot photograph today. Wins over the sample note. */
    unphotographed?: (value: T) => boolean,
    /**
     * A fact about this option that is neither "unavailable" nor "no sample
     * yet": a choice the shop can make, but not the way this journey shows the
     * others. Orthogonal to `unphotographed` on purpose, so the two are never
     * confused in the DOM or in what the shopper is told. `tile` is the line
     * under the option, `note` the sentence under the field once it is chosen.
     */
    advisory?: (value: T) => { tile: string; note: string } | undefined,
  ) {
    return (
      <fieldset className={s.field}>
        <legend>{t(label)}</legend>
        <div className={visual ? s.visualChoices : s.choices}>
          {options.map((option, i) => {
            const refused = !!unphotographed?.(option);
            const advice = refused ? undefined : advisory?.(option);
            // One note per option: a look with no photograph at all does not
            // also get told that its sample is on its way, and an option the
            // shop makes differently says that rather than "sample coming".
            const coming = refused || advice ? undefined : note?.(option);
            return (
              <button
                key={option}
                type="button"
                aria-label={
                  refused
                    ? `${t(String(option))} - ${t("Not yet photographed")}`
                    : advice
                      ? `${t(String(option))} - ${advice.tile}`
                      : t(String(option))
                }
                aria-pressed={option === value}
                disabled={disabled?.includes(option)}
                data-not-photographed={refused ? true : undefined}
                data-advisory={advice ? true : undefined}
                data-sample-coming={coming ? true : undefined}
                onClick={() => onChange(option)}
                className={s.choice}
              >
                {visual?.(option, i)}
                <span>{t(String(option))}</span>
                {option === value && (
                  <Check className={s.selectedTick} size={12} />
                )}
                {disabled?.includes(option) ? (
                  <small>{t("Unavailable")}</small>
                ) : refused ? (
                  <small>{t("Not yet photographed")}</small>
                ) : advice ? (
                  <small>{advice.tile}</small>
                ) : (
                  coming && <small>{coming}</small>
                )}
              </button>
            );
          })}
        </div>
        {!unphotographed?.(value) && advisory?.(value) && (
          <p className={s.fieldNote} data-advisory="selected">
            {advisory(value)!.note}
          </p>
        )}
      </fieldset>
    );
  }
  const summaries = [
    { id: "name", label: "Name", value: t(d.script) },
    {
      id: "style",
      label: "Style & Arrangement",
      value: `${t(d.construction)} · ${t(d.lettering)}${d.twoNames ? " · " + t(d.layout) : ""}`,
    },
    {
      id: "gold",
      label: "Gold & Stones",
      value: `${goldLabel(d.metal)} · ${t(d.coverage)}${d.coverage !== "No stones" ? " · " + t(d.gem) : ""}`,
    },
    {
      id: "size",
      label: "Size & Chain",
      // The unit is translated here for the same reason it is on the size tile:
      // a Latin "mm" standing in the middle of an Arabic summary line was the
      // one word of the step 04 heading that stayed English (storyline review 1).
      value: `${d.size} ${t("mm")} · ${t(d.chain)}`,
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
          aria-label={t("CALEUMS design")}
        >
          CALEUMS
        </a>
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
          {t(notice)}
        </div>
      )}
      {state.editing && (
        <div className={s.notice}>
          {t("Editing a saved piece.")}{" "}
          <button
            onClick={() => {
              setState(cancelBagEdit);
              confirmSpelling(false);
              setView("Studio");
              focusDesign();
            }}
          >
            {t("Cancel editing")}
          </button>
        </div>
      )}
      <main className={s.main}>
        <div ref={workspace} className={s.workspace}>
          <div className={s.controls}>
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

            {state.stage === "design" ? (
              <>
                {section(
                  "name",
                  "01",
                  "Name",
                  summaries[0]!.value,
                  <>
                    {choices(
                      "Language",
                      ["English", "Arabic"] as const,
                      d.script,
                      (x) => change("script", x),
                      undefined,
                      undefined,
                      (x) => comingNote({ script: x }),
                    )}
                    {choices(
                      "Name",
                      ["One name", "Two names"],
                      d.twoNames ? "Two names" : "One name",
                      (x) => change("twoNames", x === "Two names"),
                      undefined,
                      undefined,
                      (x) => comingNote({ twoNames: x === "Two names" }),
                      undefined,
                      twoArabicNamesNote,
                    )}
                    <label className={s.inputLabel} htmlFor="pendant-name">
                      {t("Name on your pendant")}
                      <input
                        id="pendant-name"
                        lang={d.script === "Arabic" ? "ar" : "en"}
                        value={d.name}
                        dir={d.script === "Arabic" ? "rtl" : "auto"}
                        placeholder={
                          d.script === "Arabic" ? "أسماء" : t("e.g. Asma")
                        }
                        maxLength={NAME_MAX}
                        onChange={(e) => change("name", e.target.value)}
                        aria-invalid={!!nameError}
                        aria-describedby={
                          [
                            nameError ? "name-error" : "spelling-help",
                            arabicKeyboardMismatch ? "arabic-keyboard-hint" : "",
                            atLimit(d.name) ? "name-limit" : "",
                          ]
                            .filter(Boolean)
                            .join(" ") || undefined
                        }
                        autoComplete="off"
                      />
                    </label>
                    {nameError && (
                      <p id="name-error" role="alert" className={s.error}>
                        {t(nameError)}
                      </p>
                    )}
                    {arabicKeyboardMismatch && (
                      <p id="arabic-keyboard-hint" className={s.help}>
                        {t("Your keyboard is in English; switch it to Arabic or choose English above.")}
                      </p>
                    )}
                    {/* The field stops accepting characters at the cap. Saying
                        so is the difference between a shopper who shortened
                        their own name and one whose name was quietly cut. */}
                    {atLimit(d.name) && (
                      <p id="name-limit" role="status" className={s.help}>
                        {t(NAME_LIMIT_NOTICE)}
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
                              d.script === "Arabic" ? "فاطمة" : t("e.g. Fatima")
                            }
                            maxLength={NAME_MAX}
                            onChange={(e) =>
                              change("secondName", e.target.value)
                            }
                            aria-invalid={!!errors.secondName}
                            aria-describedby={
                              [
                                errors.secondName
                                  ? "second-error"
                                  : "spelling-help",
                                atLimit(d.secondName) ? "second-limit" : "",
                              ]
                                .filter(Boolean)
                                .join(" ") || undefined
                            }
                          />
                        </label>
                        {errors.secondName && (
                          <p role="alert" id="second-error" className={s.error}>
                            {t(errors.secondName)}
                          </p>
                        )}
                        {atLimit(d.secondName) && (
                          <p id="second-limit" role="status" className={s.help}>
                            {t(NAME_LIMIT_NOTICE)}
                          </p>
                        )}
                      </>
                    )}
                    {/* Two names that each fit can still be too long joined:
                        the pendant is cast as one connected piece. Refused
                        here, in words, before anything is confirmed. */}
                    {draftErrors.fit && (
                      <p id="fit-error" role="alert" className={s.error}>
                        {t(draftErrors.fit)}
                      </p>
                    )}
                    <p className={s.help} id="spelling-help">
                      {locale === "ar"
                        ? "اكتب الاسم كما تريده تمامًا. يمكنك تصحيح الإملاء هنا."
                        : "Enter the exact spelling you want. You can correct it here at any time."}
                    </p>
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
                      offeredConstructions,
                      d.construction,
                      (x) => change("construction", x),
                      (x) => (
                        <span className={s.construction}>{icons[constructions.indexOf(x)]}</span>
                      ),
                      undefined,
                      (x) => comingNote({ construction: x }),
                      (x) =>
                        notPhotographed({ construction: x }),
                    )}

                    {choices(
                      "Lettering style",
                      offeredLetters(d.script),
                      d.lettering,
                      (x) => change("lettering", x),
                      (lettering) => {
                        const name = d.name.trim() || (d.script === "Arabic" ? "أسماء" : "Asma");
                        const font = letteringFont(d.script, lettering);
                        return (
                          <svg
                            className={s.letterSample}
                            viewBox="0 0 240 80"
                            role="img"
                            aria-label={name}
                            data-lettering-face={lettering}
                          >
                            <text
                              x="120"
                              y="51"
                              textAnchor="middle"
                              direction={d.script === "Arabic" ? "rtl" : "ltr"}
                              lang={d.script === "Arabic" ? "ar" : "en"}
                              style={{
                                fontFamily: font.style.fontFamily,
                                fontSize: Math.min(38, 210 / (Array.from(name).length * 0.8)),
                              }}
                            >
                              {name}
                            </text>
                          </svg>
                        );
                      },
                      undefined,
                      undefined,
                      (x) => notPhotographed({ lettering: x }),
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
                          undefined,
                          (x) => comingNote({ layout: x }),
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
                          {t(x === 22 ? "Delicate" : "Statement")}
                          <small>{t("mm")}</small>
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
                        placeholder={t("A date, initials, a little meaning")}
                      />
                    </label>
                    <label className={s.inputLabel}>
                      {t("Special requests")} · {t("Optional")}
                      <textarea
                        value={d.requests}
                        maxLength={1000}
                        rows={3}
                        onChange={(e) => change("requests", e.target.value)}
                        placeholder={t("Tell us what would make it yours")}
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
                      <p dir="auto">{row.id === "name" ? `${pendantName(d)} · ${t(d.script)}` : row.value}</p>
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
                  <span>
                    {locale === "ar"
                      ? "الدفع الإلكتروني قريبًا."
                      : "Checkout is coming soon."}
                  </span>
                </div>

                <label className={s.confirm} htmlFor="confirm-spelling">
                  <input
                    id="confirm-spelling"
                    type="checkbox"
                    checked={confirmed && !confirmBlockedBy}
                    disabled={!!confirmBlockedBy}
                    aria-describedby={
                      confirmBlockedBy ? "confirm-blocked" : undefined
                    }
                    onChange={(e) => confirmSpelling(e.target.checked)}
                  />
                  <span id="confirm-spelling-label">
                    {locale === "ar"
                      ? own.enabled
                        ? "أؤكد صحة كتابة الاسم والتفاصيل المحددة، وابدأوا معاينتي الشخصية."
                        : "أؤكد صحة كتابة الاسم والتفاصيل المحددة."
                      : own.enabled
                        ? "I confirm the spelling and selected details are correct, and start my personalized preview."
                        : "I confirm the spelling and selected details are correct."}
                    <b dir="auto">{pendantName(d)}</b>
                  </span>
                </label>
                {/* The reason is visible text, not a disabled control with no
                    explanation, and it names the step that fixes it. */}
                {confirmBlockedBy && (
                  <p id="confirm-blocked" role="alert" className={s.error}>
                    {t(confirmBlockedBy)}{" "}
                    <button
                      type="button"
                      className={s.textButton}
                      onClick={() => go("design", "name")}
                    >
                      {t("Edit the name")}
                    </button>
                  </p>
                )}
                {own.enabled && (
                  <section
                    className={s.ownPreview}
                    aria-live="polite"
                    data-own-phase={own.phase}
                    data-own-outcome={own.run?.outcome ?? "none"}
                  >
                    <small>
                      {locale === "ar"
                        ? "معاينتك الشخصية"
                        : "YOUR PERSONALIZED PREVIEW"}
                    </small>
                    {own.phase === "idle" && !confirmed && (
                      <p>
                        {locale === "ar"
                          ? "أكّد كتابة الاسم أعلاه لنبدأ تصوير قطعتك باسمك."
                          : "Confirm the spelling above and we photograph this piece with your name."}
                      </p>
                    )}
                    {/* Editing starts a new specification and clears the
                        capture, but the shop still holds the earlier request:
                        the shopper keeps its reference. */}
                    {own.captureStatus !== "captured" &&
                      !!own.previousRequestId && (
                        <p data-earlier-request-id={own.previousRequestId}>
                          {locale === "ar" ? "طلبك السابق" : "Your earlier request"}{" "}
                          <b dir="ltr">{own.previousRequestId}</b>
                        </p>
                      )}
                    {own.phase === "starting" && (
                      <p className={s.ownStatusRow}>
                        <span className={s.spinner} />
                        {locale === "ar"
                          ? "جارٍ بدء معاينتك الشخصية."
                          : "Starting your personalized preview."}
                      </p>
                    )}
                    {own.run &&
                      railViews.map((v) => {
                        const status = own.statusFor(v);
                        return status ? (
                          <p
                            key={v}
                            className={s.ownStatusRow}
                            data-view={v}
                            data-status={status}
                          >
                            <b>{t(v)}</b>
                            <span>{ownStatusText(status)}</span>
                          </p>
                        ) : null;
                      })}
                    {own.heroReady && (
                      <p>
                        {locale === "ar"
                          ? "صورة قطعتك جاهزة. الزوايا الأخرى تظهر عند اكتمالها."
                          : "Your photograph is ready. Other views appear as they finish."}
                      </p>
                    )}
                    {own.capturing && own.captureStatus !== "captured" && (
                      <>
                        {/* Before a contact is captured nothing is being
                            prepared yet, so the headline says what actually
                            happened and asks for the one thing that changes it.
                            The daily allowance is per anonymous principal, and
                            one shop tablet is one principal, so it is the
                            device's limit and not this shopper's. */}
                        <p className={s.ownHeadline}>
                          {own.reason === "daily_limit"
                            ? locale === "ar"
                              ? "وصل هذا الجهاز إلى حدّ المعاينات اليوم. من فضلك حاول مرة أخرى غدًا."
                              : "This device has reached today's preview limit. Please try again tomorrow."
                            : own.personalized
                              ? locale === "ar"
                                ? "أين نرسل قطعتك؟"
                                : "Where should we send it?"
                              : locale === "ar"
                                ? "لم نتمكن من تصوير قطعتك هنا. اترك طريقة للتواصل معك وسنرسلها إليك."
                                : "We could not photograph your piece here. Leave one way to reach you and we will send it."}
                        </p>
                        <div
                          className={s.channelPicker}
                          role="group"
                          aria-label={
                            locale === "ar" ? "طريقة التواصل" : "How to reach you"
                          }
                        >
                          {(["whatsapp", "phone", "email"] as const).map(
                            (channel) => (
                              <button
                                key={channel}
                                type="button"
                                aria-pressed={own.contact.channel === channel}
                                onClick={() =>
                                  own.setContact({
                                    ...own.contact,
                                    channel,
                                  })
                                }
                              >
                                {locale === "ar"
                                  ? {
                                      whatsapp: "واتساب",
                                      phone: "هاتف",
                                      email: "بريد إلكتروني",
                                    }[channel]
                                  : {
                                      whatsapp: "WhatsApp",
                                      phone: "Phone",
                                      email: "Email",
                                    }[channel]}
                              </button>
                            ),
                          )}
                        </div>
                        <label className={s.inputLabel} htmlFor="preview-contact">
                          {own.contact.channel === "email"
                            ? locale === "ar"
                              ? "البريد الإلكتروني"
                              : "Email address"
                            : locale === "ar"
                              ? "رقم الهاتف مع رمز الدولة"
                              : "Number with country code"}
                          <input
                            id="preview-contact"
                            name="preview-contact"
                            dir="ltr"
                            inputMode={
                              own.contact.channel === "email" ? "email" : "tel"
                            }
                            type={
                              own.contact.channel === "email" ? "email" : "tel"
                            }
                            autoComplete={
                              own.contact.channel === "email" ? "email" : "tel"
                            }
                            value={own.contact.value}
                            aria-invalid={own.captureStatus === "error"}
                            aria-describedby={
                              own.captureStatus === "error"
                                ? "preview-contact-error"
                                : undefined
                            }
                            onChange={(e) =>
                              own.setContact({
                                ...own.contact,
                                value: e.target.value,
                              })
                            }
                            placeholder={
                              own.contact.channel === "email"
                                ? "name@example.com"
                                : "+971 50 123 4567"
                            }
                          />
                        </label>
                        {own.captureStatus === "error" && (
                          /* The server's own contact rules, said inline and in
                             the shopper's language: the format guidance a 422
                             carries used to be thrown away. `contactProblem`
                             decides these before anything is sent, so the same
                             sentence would have come back from the server. */
                          <p className={s.error} id="preview-contact-error">
                            {
                              {
                                empty:
                                  locale === "ar"
                                    ? "اترك وسيلة تواصل واحدة."
                                    : "Leave one way to reach you.",
                                phone_format:
                                  locale === "ar"
                                    ? "اكتب الرقم بالصيغة الدولية، مثال ‎+971501234567."
                                    : "Enter a number in international format, for example +971501234567.",
                                email_format:
                                  locale === "ar"
                                    ? "اكتب بريدًا إلكترونيًا صحيحًا."
                                    : "Enter a valid email address.",
                                invalid:
                                  locale === "ar"
                                    ? "تحقق من طريقة التواصل ثم أعد المحاولة."
                                    : "Check that contact detail and try again.",
                                failed:
                                  locale === "ar"
                                    ? "تعذّر الحفظ. حاول مرة أخرى."
                                    : "That could not be saved. Please try again.",
                              }[own.captureError ?? "failed"]
                            }
                          </p>
                        )}
                        <button
                          className={s.outline}
                          type="button"
                          disabled={own.captureStatus === "sending"}
                          onClick={() => void own.submitContact()}
                        >
                          {own.captureStatus === "sending"
                            ? locale === "ar"
                              ? "جارٍ الحفظ…"
                              : "Saving…"
                            : locale === "ar"
                              ? "أرسلوها لي"
                              : "Send this to me"}
                        </button>
                      </>
                    )}
                    {own.captureStatus === "captured" && (
                      <>
                        <p className={s.ownHeadline}>
                          {locale === "ar"
                            ? "تم الحفظ. فريقنا لديه طلبك."
                            : "Saved. Our team has your request."}
                        </p>
                        {!own.personalized && (
                          <p>
                            {/* A run that is over is not being prepared. The
                                shop photographs the piece by hand from this
                                request and sends it; that is the whole promise,
                                with no technical reason attached. */}
                            {ownRunOver
                              ? locale === "ar"
                                ? "سنصوّر قطعتك في المتجر ونرسلها إليك."
                                : "We will photograph your piece in the shop and send it to you."
                              : locale === "ar"
                                ? "جارٍ تحضير معاينتك الشخصية. سنرسلها إليك."
                                : "Your personalized preview is being prepared. We will send it to you."}
                          </p>
                        )}
                        <p data-preview-request-id={own.capturedRequestId}>
                          {locale === "ar" ? "الرقم المرجعي" : "Reference"}{" "}
                          <b dir="ltr">{own.capturedRequestId}</b>
                        </p>
                      </>
                    )}
                  </section>
                )}
              </div>
            )}
            <div
              className={s.selectionSummary}
              aria-label={locale === "ar" ? "اختياراتك" : "Your selections"}
            >
              <div className={s.selectionName}>
                <small>
                  {locale === "ar" ? "اختياراتك" : "YOUR SELECTIONS"}
                </small>
                <b dir="auto">{pendantName(d)}</b>
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
                  {goldLabel(d.metal)}
                </span>
                <span>
                  {t(d.coverage)}
                  {d.coverage !== "No stones" ? " · " + t(d.gem) : ""}
                </span>
                <span>
                  {d.size} {t("mm")} · {t(d.chain)}
                </span>
              </div>
            </div>
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
                <label className={s.confirm}>
                  <input
                    type="checkbox"
                    checked={fixtureTerminalRun}
                    onChange={(e) => setFixtureTerminalRun(e.target.checked)}
                  />
                  Simulate a personalized run that ends without a photograph
                </label>
              </details>
            )}
          </div>
          <aside
            ref={previewPanel}
            className={s.preview}
            data-has-photograph={showingOwnPhoto || sampleVisible}
            aria-label={t("Jewelry preview")}
            aria-roledescription={t("carousel")}
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
                data-design-key={piece.family.tier1Key}
                data-sample-basis={piece.family.basis}
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
                {(!own.attempted || showingOwnPhoto) && (
                  <span className={s.photoLabel}>
                    {showingOwnPhoto ? ownPhotoLabel : t("Shop sample · Asma")}
                  </span>
                )}
                {showingOwnPhoto ? (
                  <img
                    key={heroSource}
                    src={heroSource}
                    /* No construction here: the compiled prompt and the
                       identity stencil do not carry one, so naming it would
                       describe the photograph as a look it was never asked to
                       be. */
                    alt={
                      locale === "ar"
                        ? `صورة قلادتك باسم ${pendantName(d)}، ذهب عيار ١٨ ${t(d.metal)}، ${d.size} مم، ${t(view)}`
                        : `Photograph of your name pendant reading ${pendantName(d)}, 18K ${d.metal.toLowerCase()}, ${d.size} mm, ${view} view`
                    }
                    data-personalized-view={view}
                    data-caleums-photo="personalized"
                  />
                ) : own.attempted ? (
                  <div className={s.previewState} role="status" data-own-placeholder="true">
                    <Diamond size={36} aria-hidden="true" />
                    <h2>{ownPlaceholderText}</h2>
                  </div>
                ) : sampleVisible ? (
                  <img
                    ref={photoElement}
                    key={`${source}-${imageAttempt}`}
                    src={source}
                    alt={
                      locale === "ar"
                        ? `صورة تجريبية لـ${sampleNames(" و")}، ${t(shown.construction)}، ${t(shown.lettering)}، ${t(shown.metal)}، ${t(shown.coverage)}${shown.coverage === "No stones" ? "" : `، ${t(shown.gem)}`}، ${shown.size} مم، سلسلة ${t(shown.chain)}`
                        : `Photographic ${sampleNames(" and ")} sample, ${shown.construction}, ${shown.lettering}, ${shown.metal}, ${shown.coverage}${shown.coverage === "No stones" ? "" : `, ${shown.gem}`}, ${shown.size} mm, ${shown.chain} chain`
                    }
                    data-sample-id={piece.family.assets.find(asset => asset.view === view)?.id}
                    data-sample-exact={piece.family.anchor.exact}
                    data-render-key={piece.key}
                    data-caleums-photo="sample"
                    onLoad={() => setLoadedSource(source)}
                    onError={() =>
                      setImageErrors((old) =>
                        Array.from(new Set([...old, source])),
                      )
                    }
                  />
                ) : (
                  <div className={s.previewState} role="status" data-preview-missing={noSample}>
                    {!noSample && piece.status === "pending" && piece.previousImage && (
                      <img className={s.previousPhoto} src={piece.previousImage.src} alt={piece.previousImage.alt} />
                    )}
                    {noSample ? (
                      <>
                        <Diamond size={36} />
                        <h2>{locale === "ar" ? "عينة هذا الأسلوب قيد التحضير" : "The sample photo for this look is coming"}</h2>
                        <p>{locale === "ar" ? "تم حفظ جميع اختياراتك. يمكنك المتابعة إلى مراجعة قطعتك بمواصفاتك." : "Your selections are saved. Review my piece still works and uses your own specification."}</p>
                      </>
                    ) : imageFailed || piece.status === "failed" ? (
                      <>
                        <p>{t("This sample photo could not load.")}</p>
                        <button onClick={retryImage}>{t("Retry")}</button>
                      </>
                    ) : slot?.status === "unavailable" ? (
                      /* This look was never photographed in this camera. It is
                         not failing and it is not on its way, so it says so and
                         offers no retry. The shopper's own piece is a separate
                         run and covers every camera; when it is working on this
                         one, that is what the line says. */
                      <>
                        <Diamond size={36} />
                        <h2>
                          {own.statusFor(view)
                            ? ownStatusText(own.statusFor(view)!)
                            : t("Not photographed for this look")}
                        </h2>
                        <p>
                          {t(
                            "This angle was not photographed for this look. Your own preview still covers it.",
                          )}
                        </p>
                      </>
                    ) : slot?.status === "failed" ? (
                      <>
                        <Diamond size={36} />
                        <h2>{t("Preview failed")}</h2>
                        <p>{t("Other successful views are still available.")}</p>
                        <button onClick={() => retry(view)}>
                          {t("Retry")} {t(view)}
                        </button>
                      </>
                    ) : (
                      <>
                        <span className={s.spinner} />
                        <h2>{t("Updating preview")}</h2>
                        <p>
                          {locale === "ar"
                            ? `جارٍ تحميل صورة ${t(view)} التجريبية.`
                            : `Loading the ${view} sample photo.`}
                        </p>
                      </>
                    )}
                  </div>
                )}
                {(showingOwnPhoto || sampleVisible) && (
                    <button
                      className={s.zoomButton}
                      onClick={() => zoom.current?.showModal()}
                      aria-label={t("Zoom image")}
                    >
                      <MagnifyingGlassPlus size={21} />
                    </button>
                  )}

              </div>
              <div className={s.previewDock}>
                {!showingOwnPhoto && sampleVisible && (
                  <p
                    className={s.previewNote}
                    data-sample-note="ownership"
                    data-sample-ownership="panel"
                  >
                    {t(
                      "A shop sample. Yours is photographed after you confirm the spelling.",
                    )}
                  </p>
                )}
                {!own.attempted && piece.sampleComing && (
                  <p className={s.previewNote} data-sample-note="look">
                    {sampleNote}
                  </p>
                )}
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
                          locale === "ar"
                            ? autoplay
                              ? "إيقاف العرض التلقائي"
                              : "تشغيل العرض التلقائي"
                            : autoplay
                              ? "Pause slideshow"
                              : "Play slideshow"
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
                {ownDesignInProgress && (
                  <p className={s.previewNote} role="status" data-own-preview-status="true">
                    {ownPlaceholderText}
                  </p>
                )}
                <div
                  ref={viewRail}
                  className={s.views}
                  aria-label={t("Preview views")}
                  style={{
                    gridTemplateColumns: `repeat(${Math.max(railViews.length, 1)}, minmax(0, 1fr))`,
                  }}
                >
                  {/* A camera this family was never photographed in is hidden,
                      never a grey placeholder. Studio is always photographed. */}
                  {railViews.map((v) => {
                    const index = views.indexOf(v);
                    /* A camera this look was never photographed in is not
                       pending: nothing is on its way for it. Saying "Preparing"
                       there was the false half of the contradiction. */
                    const notPhotographed = !piece.availableViews.includes(v);
                    const status = notPhotographed
                      ? "unavailable"
                      : piece.errors[v]
                        ? "failed"
                        : piece.status === "pending" || !piece.views[v]
                          ? "pending"
                          : (run?.slots.find((x) => x.view === v)?.status ??
                            "ready");
                    const photo = { asset: { src: piece.views[v] ?? "" } };
                    // The customer's own photograph of this camera, when it exists.
                    const ownView = own.imageFor(v);
                    const ownStatus = own.statusFor(v);
                    const placeholder = own.attempted && !ownView;
                    const placeholderText = ownPlaceholderFor(v);
                    const thumbnail = ownView ?? (own.attempted ? "" : photo.asset.src);
                    const missing = !thumbnail;
                    /* Once the shopper's own photographs exist, the rail is
                       read as "my four views". Any tile still showing the
                       illustrated catalogue must say so, in words. */
                    const sampleTile = own.personalized && !ownView && !missing;
                    return (
                      <button
                        key={v}
                        aria-label={t(v)}
                        data-preview-status={
                          placeholder ? "placeholder" : imageErrors.includes(photo.asset.src)
                            ? "failed"
                            : (status ?? "ready")
                        }
                        data-personalized-status={ownStatus}
                        aria-describedby={`view-status-${index}`}
                        aria-pressed={v === view}
                        onClick={() => chooseView(v)}
                      >
                        <span id={`view-status-${index}`} className={s.srOnly}>
                          {/* The button's own aria-label is the view name, so
                              the sample marker has to travel with the status
                              this describes it by. */}
                          {sampleTile
                            ? (locale === "ar" ? "عينة. " : "Sample. ")
                            : ""}
                          {placeholder
                            ? placeholderText
                            : ownStatus
                            ? ownStatusText(ownStatus)
                            : status === "unavailable"
                              ? t("Not photographed for this look")
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
                        {placeholder ? (
                          <div className={s.missingAngle} data-own-placeholder="true">
                            <Diamond size={22} aria-hidden="true" />
                          </div>
                        ) : !own.attempted ? (
                          <div className={s.missingAngle}>
                            <Diamond size={22} aria-hidden="true" />
                          </div>
                        ) : !missing ? (
                          <img
                            src={thumbnail}
                            alt={
                              sampleTile
                                ? locale === "ar"
                                  ? `صورة عينة لزاوية ${t(v)}، وليست قطعتك`
                                  : `Sample photograph of the ${v} view, not your piece`
                                : ""
                            }
                            aria-hidden={sampleTile ? undefined : "true"}
                            data-caleums-photo={ownView ? "personalized" : "sample"}
                          />
                        ) : (
                          <div className={s.missingAngle}>—</div>
                        )}
                        <span>{t(v)}</span>
                        <em aria-hidden="true" data-sample-tile={sampleTile || undefined}>
                          {placeholder
                            ? placeholderText
                            : sampleTile
                            ? locale === "ar"
                              ? "عينة"
                              : "Sample"
                            : status === "unavailable" && !ownStatus
                              ? locale === "ar"
                                ? "غير مصوَّرة"
                                : "Not photographed"
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
                        {!placeholder && status !== "unavailable" &&
                          (v === view ||
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
                {piece.warning && <p role="status">{t(piece.warning)}</p>}
              </div>
            </div>
          </aside>
        </div>
      </main>
      <div ref={actionBar} className={s.actionBar}>
        <div>
          <small>{t("Price unconfirmed")}</small>
          {/* Once the shopper's own run exists, this is their design, whether
              the photograph has arrived or the shop is preparing it. */}
          <span>
            {own.personalized
              ? ownPhotoLabel
              : ownDesignInProgress
                ? ownRunOver
                  ? locale === "ar"
                    ? "تصميمك · سنرسل الصورة"
                    : "Your design · we will send the photograph"
                  : locale === "ar"
                    ? "تصميمك · قيد التحضير"
                    : "Your design · being prepared"
                : locale === "ar"
                  ? "عينة من المتجر"
                  : "Shop sample"}
          </span>
        </div>
        {needsPreview ? (
          <button
            className={s.primary}
            /* A sample photograph that does not exist yet never blocks the
               customer's own preview: only real work in flight does. */
            disabled={!loaded || (!needsFirstName && ((!noSample && piece.status === "pending") || saving))}
            onClick={() => {
              if (!needsFirstName) {
                void generate();
                return;
              }
              go("design", "name");
              requestAnimationFrame(() => {
                document.getElementById("pendant-name")?.focus();
              });
            }}
          >
            {t(needsFirstName ? "Start with your name" : "Review my piece")}
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
        <span>{t("◇ 18K GOLD")}</span>
        <span>{t("✧ PERSONAL BY DESIGN")}</span>
        <span>{t("CALEUMS · DUBAI")}</span>
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
              <h3>{t("A little space for something personal.")}</h3>
              <button onClick={() => bag.current?.close()}>
                {t("Continue designing")}
              </button>
            </div>
          ) : (
            state.bag.map((item) => {
              /* The stored sample, or a v1 example only when that example
                 really is this design. `sampleSource` alone can cross script
                 and construction, which would show a saved piece as a design
                 it is not. */
              const savedExample = item.sampleId
                ? samples.find((asset) => asset.id === item.sampleId)?.src
                : savedExampleSource("Studio", item.draft);
              return (
              <article className={s.bagItem} key={item.id}>
                {/* Only an asset the current state read still returns is shown as
                    the customer's piece; otherwise the labelled sample. */}
                {!!own.runId &&
                item.personalized?.runId === own.runId &&
                item.personalized?.assets?.[0] &&
                own.imageFor(item.personalized.assets[0].view) ? (
                  <img
                    src={own.imageFor(item.personalized.assets[0].view)}
                    alt={t("Photograph of your pendant")}
                    data-caleums-photo="personalized"
                  />
                ) : item.snapshot ? (
                  <SnapshotImage
                    snapshotId={item.snapshot.id}
                    alt={t("Saved pendant configuration")}
                  />
                ) : savedExample ? (
                  <img
                    src={savedExample}
                    alt={t("Previously saved example pendant")}
                  />
                ) : (
                  <div
                    role="img"
                    aria-label={t("Previously saved example pendant")}
                  >
                    {t("This saved example is unavailable.")}
                  </div>
                )}
                <div>
                  <small>{t("NAME PENDANT · YOUR DESIGN")}</small>
                  <h3 dir="auto">{pendantName(item.draft)}</h3>
                  <p>
                    {goldLabel(item.draft.metal)} · {item.draft.size} {t("mm")}
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
                      aria-label={`${t("Decrease quantity")} · ${pendantName(item.draft)}`}
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
                    <output aria-label={t("Quantity")}>{item.quantity}</output>
                    <button
                      aria-label={`${t("Increase quantity")} · ${pendantName(item.draft)}`}
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
              );
            })
          )}
        </div>
        <div className={s.bagFooter}>
          {/* One tablet, many shoppers: this is the control that hands it on. */}
          <button
            className={s.outline}
            onClick={() => (state.bag.length ? setClearing(true) : newPiece())}
          >
            {t("New piece")}
            <Plus />
          </button>
          {clearing ? (
            <div className={s.clearConfirm} role="alert">
              <p>
                {t(
                  "This clears the bag, the design and the name so the next customer starts fresh.",
                )}
              </p>
              <div>
                <button onClick={newPiece}>{t("Clear and start fresh")}</button>
                <button onClick={() => setClearing(false)}>
                  {t("Keep this bag")}
                </button>
              </div>
            </div>
          ) : (
            <p>{t("Saved locally on this device. Prices are unconfirmed; no order has been placed.")}</p>
          )}
        </div>
      </dialog>
      {compactPreview && !editingText && (
        <div className={s.compactPreview} data-compact-preview="true">
          {(showingOwnPhoto || sampleVisible) && heroSource ? (
            <button onClick={() => zoom.current?.showModal()} aria-label={t("Zoom image")}>
              <img src={heroSource} alt="" />
              <span><strong>{showingOwnPhoto ? ownPhotoLabel : t("Shop sample · Asma")}</strong><small>{t(view)}</small></span>
              <MagnifyingGlassPlus size={22} aria-hidden="true" />
            </button>
          ) : (
            <div role="status"><Diamond size={24} aria-hidden="true" /><span>{own.attempted ? ownPlaceholderText : t("Updating preview")}</span></div>
          )}
        </div>
      )}
      <dialog
        ref={zoom}
        onKeyDown={trapFocus}
        className={s.zoomDialog}
        aria-label={showingOwnPhoto ? t("Enlarged photograph of your pendant") : t("Inspect sample jewelry")}
      >
        <div className={s.dialogHeader}>
          <span dir="auto">
            {showingOwnPhoto ? `${t(view)} · ${ownPhotoLabel}` : own.attempted ? ownPlaceholderText : `${t(view)} · ${t("Shop sample · Asma")}`}
          </span>
          <button aria-label={t("Close")} onClick={() => zoom.current?.close()}>
            <X size={22} />
          </button>
        </div>
        <TransformWrapper key={heroSource}>
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              <div className={s.zoomTools}>
                <button aria-label={t("Zoom in")} onClick={() => zoomIn()}>
                  <Plus />
                </button>
                <button aria-label={t("Zoom out")} onClick={() => zoomOut()}>
                  <Minus />
                </button>
                <button onClick={() => resetTransform()}>{t("Reset")}</button>
              </div>
              <TransformComponent wrapperClass={s.zoomCanvas}>
                {(showingOwnPhoto || sampleVisible) && heroSource && (
                  <img
                    src={heroSource}
                    alt={
                      showingOwnPhoto
                        ? t("Enlarged photograph of your pendant")
                        : t("Enlarged configured sample pendant")
                    }
                  />
                )}
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </dialog>
    </div>
  );
}
