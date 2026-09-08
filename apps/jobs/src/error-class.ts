import { normalizeIdentityText } from "@jewelo/ai";

/**
 * The codes-only shape a category column is allowed to hold: a snake_case code,
 * optionally followed by `:` and a suffix spelled in `[a-z0-9_=,]`, and any
 * number of those joined by `|`.
 *
 * The suffix alphabet is the one the codes this job writes are spelled in:
 * `name_mismatch:len=4,script=latin`, `identity_ring_gate_failed:holes=1,expected=2`,
 * `style_anchor_missing:on_skin`. It has no space, no quote, no bracket and no
 * digit-and-letter free text, so a message that is prose or a PostgREST body
 * cannot match it. `|` is the job's own composition delimiter
 * (`blockPreSpendTerminally` records two classes at once) and can only appear
 * on a value that is already codes-only end to end.
 */
const CODE_SUFFIX = /^[a-z0-9_=,]+$/;
const COMPOSED_CLASS =
  /^[a-z0-9_]+(?::[a-z0-9_=,]+)?(?:\|[a-z0-9_]+(?::[a-z0-9_=,]+)?)*$/;

/**
 * The category of an error, and nothing a customer wrote.
 *
 * This is the only door into `terminal_error_code`,
 * `mark_task_pre_spend_blocked(p_reason)` and
 * `reconcile_provider_attempt(p_error_class)`. `/api/state` selects
 * `terminal_error_code` on every poll and the atelier surfaces it, so anything
 * that survives this function is published to the shopper's browser.
 *
 * An error raised inside this job is already a category string; an error raised
 * by PostgREST is `Supabase job request <status>: <body>`, and an error raised
 * by fal is the provider's own prose, which for a content-policy refusal can
 * quote the shopper's name back.
 *
 * Two paths, in this order:
 *
 * 1. A first line that is already codes-only is returned as it stands. This is
 *    what keeps the class idempotent: `fail` re-classifies the string
 *    `blockPreSpendTerminally` composed, and re-classifying must not shred it.
 * 2. Anything else is cut at the first `:` or newline. The head is lower-cased
 *    and reduced to `[a-z0-9_]`, so prose arrives as an unreadable run of
 *    letters. The part after the colon is kept only when it is codes-only on
 *    its own (fix-3 review minor 5: cutting unconditionally threw away
 *    `len=4,script=latin` and the view name, the detail an operator reads the
 *    column for), and dropped whole otherwise. A raw message can never
 *    introduce a `|`, so it can never compose.
 *
 * Fix-3 review minor 6: the cap is 120 characters of the whole returned value,
 * matching `terminal_error_code`'s own 120, not 60 per `|` part - which let a
 * composed class reach 180. The head a message that is not already a class is
 * reduced to keeps its own 60, so widening the total does not widen how much of
 * one provider sentence can survive as a run of letters.
 */
export function errorClass(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const line = (message.split("\n", 1)[0] ?? "").trim().toLowerCase();
  // A value longer than the column is not one of this job's classes, whatever
  // alphabet it is spelled in, so it takes the reducing path below rather than
  // being truncated as if it were.
  if (line.length <= 120 && COMPOSED_CLASS.test(line)) return line;
  const colon = line.indexOf(":");
  // A raw message keeps only its first four words: a provider or database
  // sentence names its subject early ("openai image edit failed", "supabase
  // job request 400") and anything it quotes, a prompt or a row value with a
  // customer's name in it, comes later. Sixty characters of squashed sentence
  // was enough to carry a short name through.
  const head = (colon === -1 ? line : line.slice(0, colon))
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .map((word) => word.replaceAll(/[^a-z0-9_]/g, ""))
    .filter(Boolean)
    .join("_")
    .slice(0, 60);
  if (!head) return "unknown";
  const suffix = colon === -1 ? "" : line.slice(colon + 1).trim();
  const code = CODE_SUFFIX.test(suffix) ? `${head}:${suffix}` : head;
  return code.slice(0, 120);
}

/**
 * What a name rejection is allowed to say: a code, a count and a script name.
 *
 * Pipeline fix review 1 finding 7. This used to be `name_mismatch:<read text>`,
 * and `terminal_error_code` is a customer-visible column (`/api/state` selects
 * it), so a wrong reading of somebody's name was published back to the browser.
 * An operator who needs the actual letters reads `verification_result.nameCheck`
 * on the attempt, which never leaves the server.
 *
 * The length is of the comparison form - the letters that decided the verdict,
 * after presentation forms are folded and marks and punctuation dropped - so it
 * describes the decision rather than the raw string. `script` is `none` when the
 * reader returned no letters at all, which is a different failure from a reading
 * in the wrong script and has to be told apart in the operator console.
 *
 * It lives next to `errorClass` because it is the reason the suffix survives:
 * this is the codes-only shape `errorClass` is required to preserve.
 */
export function nameMismatchCode(readText: string): string {
  const letters = normalizeIdentityText(readText.normalize("NFKC"));
  const arabic = /\p{Script=Arabic}/u.test(letters);
  const latin = /\p{Script=Latin}/u.test(letters);
  const script =
    arabic && latin ? "mixed" : arabic ? "arabic" : latin ? "latin" : "none";
  return `name_mismatch:len=${letters.length},script=${script}`;
}
