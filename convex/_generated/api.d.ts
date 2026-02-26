/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as designs from "../designs.js";
import type * as gallery from "../gallery.js";
import type * as generation from "../generation.js";
import type * as http from "../http.js";
import type * as orders from "../orders.js";
import type * as prices from "../prices.js";
import type * as pricesActions from "../pricesActions.js";
import type * as search from "../search.js";
import type * as transliterate from "../transliterate.js";
import type * as uploads from "../uploads.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  designs: typeof designs;
  gallery: typeof gallery;
  generation: typeof generation;
  http: typeof http;
  orders: typeof orders;
  prices: typeof prices;
  pricesActions: typeof pricesActions;
  search: typeof search;
  transliterate: typeof transliterate;
  uploads: typeof uploads;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
