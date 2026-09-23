import {
  PREVIEW_REQUEST_CONSTRUCTIONS,
  PREVIEW_REQUEST_LETTERING,
} from "@jewelo/contracts";

/**
 * D-022. Which looks the shop may sell today.
 *
 * This set is deliberately code-owned. All four constructions and six
 * lettering styles already have a contract entry, prompt vocabulary, and an
 * identity-engine path, so the customer should not be blocked by a separate
 * deployment allowlist. The identity solver and verifier remain the authority
 * for whether a particular name can be made safely.
 *
 * The values are the customer-facing option labels the atelier and the captured
 * request both speak, not internal ids, because those labels are what
 * `preflightRefusal` compares and what the contracts publish.
 *
 * The set mirrors the contract exactly. This file deliberately does not import
 * `./load-env`: it is read from a client module through the
 * `@jewelo/config/sellable` subpath, and `load-env` imports `node:fs`.
 */

const DEFAULT_SELLABLE_CONSTRUCTIONS = PREVIEW_REQUEST_CONSTRUCTIONS;
const DEFAULT_SELLABLE_ENGLISH_LETTERING = PREVIEW_REQUEST_LETTERING;
const DEFAULT_SELLABLE_ARABIC_LETTERING = PREVIEW_REQUEST_LETTERING;

export interface SellableLooks {
  /** Pendant constructions the request contract permits. */
  readonly constructions: ReadonlySet<string>;
  /** Lettering styles the request contract permits on an English name. */
  readonly englishLettering: ReadonlySet<string>;
  /** Lettering styles the request contract permits on an Arabic name. */
  readonly arabicLettering: ReadonlySet<string>;
}

/**
 * Return the deterministic set of looks that may be submitted.
 *
 * Each call gets fresh sets so a consumer cannot accidentally mutate the
 * process-wide safety policy for another request or browser component.
 */
export function sellableLooks(): SellableLooks {
  return {
    constructions: new Set(DEFAULT_SELLABLE_CONSTRUCTIONS),
    englishLettering: new Set(DEFAULT_SELLABLE_ENGLISH_LETTERING),
    arabicLettering: new Set(DEFAULT_SELLABLE_ARABIC_LETTERING),
  };
}

/**
 * How long the atelier waits for one sample photograph before it gives up and
 * offers Retry.
 *
 * It lives here, not as a literal in the hook, because it is a tuned number
 * that has to move with the size of the shipped photographs: this is the
 * client-safe config subpath, the one a browser module may import without
 * pulling in `load-env` and `node:fs`.
 *
 * The samples are WebP at the same pixel size as the PNGs they replaced and
 * about a tenth of the bytes (~190 KB rather than ~2.1 MB), so 15 s was a
 * ceiling set for files that no longer exist. Ten seconds still clears a
 * single photograph on a slow mobile connection and fails honestly instead of
 * holding a spinner for a quarter of a minute.
 */
export const SAMPLE_PHOTO_TIMEOUT_MS = 10_000;
