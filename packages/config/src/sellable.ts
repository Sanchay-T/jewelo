import {
  PREVIEW_REQUEST_CONSTRUCTIONS,
  PREVIEW_REQUEST_LETTERING,
} from "@jewelo/contracts";
import { z } from "zod";

/**
 * M1 / D-022. Which looks the shop may sell today.
 *
 * The atelier used to decide this with two literals in browser code
 * (`RENDERABLE_CONSTRUCTION = "Classical"`, `RENDERABLE_ENGLISH_LETTERING =
 * "Classic"`), reasoned from what the deterministic stencil can draw. That is a
 * measurement, not a constant: phase 3 is what decides which constructions and
 * which lettering the pipeline photographs well enough to sell, and P3-5's
 * result has to be able to change the shop without a code change. So it is
 * configuration, validated here against the contract's own option lists.
 *
 * The values are the customer-facing option labels the atelier and the captured
 * request both speak (`Classical`, `Framed minimal`, `Classic`, `Kufi`), not the
 * internal ids, because those labels are what `preflightRefusal` compares and
 * what `PREVIEW_REQUEST_CONSTRUCTIONS` / `PREVIEW_REQUEST_LETTERING` publish.
 * Matching is case-insensitive and whitespace-tolerant so a deployment console
 * entry cannot fail on capitalisation, and every entry is normalised back to its
 * canonical label; a name outside the contract's list is a configuration error
 * rather than a silently ignored word.
 *
 * The defaults are exactly today's behaviour - one construction, one English
 * lettering, every Arabic lettering - so nothing on the page moves until P3-5
 * says it may. This file deliberately does not import `./load-env`: it is read
 * from a client module through the `@jewelo/config/sellable` subpath, and
 * `load-env` imports `node:fs`.
 */

/** The one construction and the one English lettering phase 1 could render. */
const DEFAULT_SELLABLE_CONSTRUCTIONS = "Classical";
const DEFAULT_SELLABLE_ENGLISH_LETTERING = "Classic";
/**
 * Arabic lettering is not restricted. `arabicStyle` IS threaded through the
 * specification into both the prompt and the identity engine, which fails closed
 * on its own for a style it has not certified, so a second refusal here would
 * only take options away from the shopper without adding a guarantee.
 */
const DEFAULT_SELLABLE_ARABIC_LETTERING = PREVIEW_REQUEST_LETTERING.join(",");

function optionListSchema(
  variable: string,
  options: readonly string[],
  fallback: string,
) {
  const canonical = new Map(
    options.map((option) => [option.trim().toLowerCase(), option]),
  );
  return z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z
      .string()
      .default(fallback)
      .transform((value, context) => {
        const chosen: string[] = [];
        for (const entry of value.split(",")) {
          const trimmed = entry.trim();
          if (trimmed.length === 0) continue;
          const match = canonical.get(trimmed.toLowerCase());
          if (!match) {
            context.addIssue({
              code: "custom",
              message: `${variable}: "${trimmed}" is not one of ${options.join(", ")}`,
            });
            continue;
          }
          chosen.push(match);
        }
        if (chosen.length === 0)
          context.addIssue({
            code: "custom",
            message: `${variable} must name at least one of ${options.join(", ")}`,
          });
        return new Set(chosen) as ReadonlySet<string>;
      }),
  );
}

export const sellableConstructionsSchema = optionListSchema(
  "NEXT_PUBLIC_SELLABLE_CONSTRUCTIONS",
  PREVIEW_REQUEST_CONSTRUCTIONS,
  DEFAULT_SELLABLE_CONSTRUCTIONS,
);
export const sellableEnglishLetteringSchema = optionListSchema(
  "NEXT_PUBLIC_SELLABLE_ENGLISH_LETTERING",
  PREVIEW_REQUEST_LETTERING,
  DEFAULT_SELLABLE_ENGLISH_LETTERING,
);
export const sellableArabicLetteringSchema = optionListSchema(
  "NEXT_PUBLIC_SELLABLE_ARABIC_LETTERING",
  PREVIEW_REQUEST_LETTERING,
  DEFAULT_SELLABLE_ARABIC_LETTERING,
);

export const sellableLooksSchema = z.object({
  NEXT_PUBLIC_SELLABLE_CONSTRUCTIONS: sellableConstructionsSchema,
  NEXT_PUBLIC_SELLABLE_ENGLISH_LETTERING: sellableEnglishLetteringSchema,
  NEXT_PUBLIC_SELLABLE_ARABIC_LETTERING: sellableArabicLetteringSchema,
});

export interface SellableLooks {
  /** Pendant constructions the shop photographs today. */
  readonly constructions: ReadonlySet<string>;
  /** Lettering styles the shop photographs on an English name. */
  readonly englishLettering: ReadonlySet<string>;
  /** Lettering styles the shop photographs on an Arabic name. */
  readonly arabicLettering: ReadonlySet<string>;
}

/**
 * The sellable sets, from three `NEXT_PUBLIC_` variables.
 *
 * The caller passes the values rather than the process environment on the
 * browser side, because Next inlines `process.env.NEXT_PUBLIC_*` only where the
 * full member expression is written out in application code.
 */
export function sellableLooks(
  env: Record<string, string | undefined> = process.env,
): SellableLooks {
  const parsed = sellableLooksSchema.parse({
    NEXT_PUBLIC_SELLABLE_CONSTRUCTIONS: env.NEXT_PUBLIC_SELLABLE_CONSTRUCTIONS,
    NEXT_PUBLIC_SELLABLE_ENGLISH_LETTERING:
      env.NEXT_PUBLIC_SELLABLE_ENGLISH_LETTERING,
    NEXT_PUBLIC_SELLABLE_ARABIC_LETTERING:
      env.NEXT_PUBLIC_SELLABLE_ARABIC_LETTERING,
  });
  return {
    constructions: parsed.NEXT_PUBLIC_SELLABLE_CONSTRUCTIONS,
    englishLettering: parsed.NEXT_PUBLIC_SELLABLE_ENGLISH_LETTERING,
    arabicLettering: parsed.NEXT_PUBLIC_SELLABLE_ARABIC_LETTERING,
  };
}
