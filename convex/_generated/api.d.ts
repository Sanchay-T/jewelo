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
import type * as lib_adminAuth from "../lib/adminAuth.js";
import type * as lib_designMedia from "../lib/designMedia.js";
import type * as lib_designValidation from "../lib/designValidation.js";
import type * as lib_promptControl from "../lib/promptControl.js";
import type * as lib_promptEngine from "../lib/promptEngine.js";
import type * as lib_promptSeedData from "../lib/promptSeedData.js";
import type * as orders from "../orders.js";
import type * as playground from "../playground.js";
import type * as playgroundPreview from "../playgroundPreview.js";
import type * as prices from "../prices.js";
import type * as pricesActions from "../pricesActions.js";
import type * as promptValidation from "../promptValidation.js";
import type * as prompts from "../prompts.js";
import type * as quotes from "../quotes.js";
import type * as search from "../search.js";
import type * as seedHelpers from "../seedHelpers.js";
import type * as seedPrompts from "../seedPrompts.js";
import type * as showcase from "../showcase.js";
import type * as stylePreview from "../stylePreview.js";
import type * as stylePreviewActions from "../stylePreviewActions.js";
import type * as templates from "../templates.js";
import type * as transliterate from "../transliterate.js";
import type * as uploads from "../uploads.js";
import type * as video from "../video.js";

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
  "lib/adminAuth": typeof lib_adminAuth;
  "lib/designMedia": typeof lib_designMedia;
  "lib/designValidation": typeof lib_designValidation;
  "lib/promptControl": typeof lib_promptControl;
  "lib/promptEngine": typeof lib_promptEngine;
  "lib/promptSeedData": typeof lib_promptSeedData;
  orders: typeof orders;
  playground: typeof playground;
  playgroundPreview: typeof playgroundPreview;
  prices: typeof prices;
  pricesActions: typeof pricesActions;
  promptValidation: typeof promptValidation;
  prompts: typeof prompts;
  quotes: typeof quotes;
  search: typeof search;
  seedHelpers: typeof seedHelpers;
  seedPrompts: typeof seedPrompts;
  showcase: typeof showcase;
  stylePreview: typeof stylePreview;
  stylePreviewActions: typeof stylePreviewActions;
  templates: typeof templates;
  transliterate: typeof transliterate;
  uploads: typeof uploads;
  video: typeof video;
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
