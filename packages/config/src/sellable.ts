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
