import { initialState, restore, STORAGE_KEY, type State } from "./model";
import { clearSubmission } from "./previewPipeline";

/**
 * Everything the shop tablet keeps in the browser between page loads.
 *
 * One tablet serves many shoppers under one anonymous principal, so this state
 * belongs to whoever is standing at the counter now and to nobody else. Two
 * functions own it: `loadDeviceState` reads it, `clearDeviceState` removes it
 * when the tablet is handed on. Nothing else in the atelier touches
 * `localStorage`.
 *
 * `jewelo:anonymous-session:v1`, the Supabase anonymous session, is deliberately
 * never cleared here. Removing it would sign the tablet out and the next page
 * load would buy a fresh anonymous sign-in, and the shop gets 30 of those an
 * hour for its whole Wi-Fi address.
 */

/** One key per entity, written by the client's idempotency guard. */
const IDEMPOTENCY_PREFIX = "caleums:idempotency:v1:";

/**
 * The saved record is stamped with the journey that wrote it. A record from
 * another journey is never read back into the fields: the 8 September dogfood
 * found an English name still sitting in the Arabic name box, joined to what
 * the next shopper typed.
 */
const scopeOf = (locale: "en" | "ar") => `atelier.v1.${locale}`;

type ScopedRecord = { scope: string; state: unknown };

function isScoped(value: unknown): value is ScopedRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ScopedRecord).scope === "string" &&
    "state" in value
  );
}

function storage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    // Storage disabled by the browser: this tab keeps its state in memory only.
    return undefined;
  }
}

export type DeviceState = {
  state: State;
  /**
   * `full` is this journey's own saved draft. `bag` is a record written by the
   * other language: the pieces the shopper already kept are theirs and follow
   * them, the working draft and the name do not. `none` is a first visitor.
   */
  restored: "full" | "bag" | "none";
  /** A record this build cannot read; the caller tells the shopper once. */
  unreadable: boolean;
};

export function loadDeviceState(locale: "en" | "ar"): DeviceState {
  const fresh: DeviceState = {
    state: initialState(),
    restored: "none",
    unreadable: false,
  };
  const store = storage();
  if (!store) return fresh;
  const raw = store.getItem(STORAGE_KEY);
  if (!raw) return fresh;
  try {
    const parsed: unknown = JSON.parse(raw);
    // A record written before this layout existed carries no scope, so it
    // cannot be attributed to a journey and is not read back into the fields.
    if (!isScoped(parsed)) {
      store.removeItem(STORAGE_KEY);
      return fresh;
    }
    const state = restore(JSON.stringify(parsed.state));
    if (parsed.scope !== scopeOf(locale))
      return { state: { ...initialState(), bag: state.bag }, restored: "bag", unreadable: false };
    return { state, restored: "full", unreadable: false };
  } catch {
    store.removeItem(STORAGE_KEY);
    return { ...fresh, unreadable: true };
  }
}

/** Returns false when the browser refused to keep it; the caller says so. */
export function saveDeviceState(locale: "en" | "ar", state: State): boolean {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(
      STORAGE_KEY,
      JSON.stringify({ scope: scopeOf(locale), state } satisfies ScopedRecord),
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Everything the previous shopper left behind, and nothing else. The session
 * key is untouched on purpose; see the note at the top of this file.
 */
export function clearDeviceState(): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
    // The submission (`caleums.atelier.preview.v1`) is the pipeline's own key,
    // so the pipeline's own function removes it.
    clearSubmission();
    const stale: string[] = [];
    for (let index = 0; index < store.length; index++) {
      const key = store.key(index);
      if (key?.startsWith(IDEMPOTENCY_PREFIX)) stale.push(key);
    }
    for (const key of stale) store.removeItem(key);
  } catch {
    // Nothing durable depends on the clear succeeding: the caller reloads the
    // page, and a browser that refuses removeItem also refused setItem.
  }
}
