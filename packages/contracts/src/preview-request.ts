import { z } from "zod";

/**
 * Honest-degrade capture contract.
 *
 * When personalized generation cannot be delivered, the shopper keeps seeing the
 * clearly labelled illustrated sample and leaves a way to be contacted. What is
 * captured here is the customer-facing vocabulary the shopper actually chose and
 * saw, deliberately not the provider-side `JewelrySpecification`: the operator
 * has to read back the exact request and the exact labelled sample that was on
 * screen, without a lossy enum translation in between.
 *
 * No provider call, no price and no promise is implied by a captured request.
 */

export const PREVIEW_REQUEST_STATUSES = [
  "new",
  "contacted",
  "fulfilled",
  "cancelled",
] as const;
export type PreviewRequestStatus = (typeof PREVIEW_REQUEST_STATUSES)[number];

export const PREVIEW_REQUEST_CONTACT_CHANNELS = [
  "whatsapp",
  "phone",
  "email",
] as const;
export type PreviewRequestContactChannel =
  (typeof PREVIEW_REQUEST_CONTACT_CHANNELS)[number];

export const PREVIEW_REQUEST_SCRIPTS = ["English", "Arabic"] as const;
export const PREVIEW_REQUEST_CONSTRUCTIONS = [
  "Classical",
  "Origami ribbon",
  "Framed minimal",
  "Diamond rails",
] as const;
export const PREVIEW_REQUEST_LETTERING = [
  "Classic",
  "Minimal",
  "Diwani",
  "Kufi",
  "Signature",
  "Thuluth inspired",
] as const;
export const PREVIEW_REQUEST_LAYOUTS = [
  "Side by side",
  "Connected heart",
  "Stacked",
  "Infinity",
  "Interlocked",
] as const;
export const PREVIEW_REQUEST_METALS = [
  "Yellow gold",
  "White gold",
  "Rose gold",
] as const;
export const PREVIEW_REQUEST_COVERAGES = [
  "No stones",
  "Accent",
  "Partial pavé",
  "Full pavé",
] as const;
export const PREVIEW_REQUEST_GEMS = [
  "Lab diamond",
  "Natural diamond",
  "Ruby",
  "Emerald",
  "Blue sapphire",
  "Pink sapphire",
] as const;
export const PREVIEW_REQUEST_CHAINS = ["Cable", "Rolo", "Box", "Curb"] as const;
export const PREVIEW_REQUEST_VIEWS = [
  "Studio",
  "On skin",
  "Close-up",
  "Dark",
] as const;

// The atelier caps the same lengths: name 30, engraving 80, requests 1000.
const NAME_MAX = 30;
const ENGRAVING_MAX = 80;
const REQUESTS_MAX = 1000;
// E.164 allows 15 digits total; 7 is the shortest national number worth dialling.
const E164 = /^\+?[1-9]\d{6,14}$/;
const SAMPLE_ASSET_PATH = /^\/atelier\/[a-zA-Z0-9_./ -]+$/;

const optionalText = (max: number) => z.string().trim().max(max).optional();

const phoneValue = z
  .string()
  .trim()
  .max(32)
  .transform((value) => value.replace(/[\s()./-]/g, ""))
  .refine(
    (value) => E164.test(value),
    "Enter a number in international format, for example +971501234567.",
  );

const emailValue = z
  .string()
  .trim()
  .max(254)
  .transform((value) => value.toLowerCase())
  .pipe(z.email("Enter a valid email address."));

const contactName = z.string().trim().min(1).max(80).optional();

export const previewRequestContactSchema = z.discriminatedUnion("channel", [
  z.strictObject({
    channel: z.literal("whatsapp"),
    value: phoneValue,
    name: contactName,
  }),
  z.strictObject({
    channel: z.literal("phone"),
    value: phoneValue,
    name: contactName,
  }),
  z.strictObject({
    channel: z.literal("email"),
    value: emailValue,
    name: contactName,
  }),
]);
export type PreviewRequestContact = z.infer<typeof previewRequestContactSchema>;

export const previewRequestSpecificationSchema = z
  .strictObject({
    script: z.enum(PREVIEW_REQUEST_SCRIPTS),
    names: z
      .array(z.string().trim().min(1).max(NAME_MAX))
      .min(1)
      .max(2),
    layout: z.enum(PREVIEW_REQUEST_LAYOUTS).optional(),
    construction: z.enum(PREVIEW_REQUEST_CONSTRUCTIONS),
    lettering: z.enum(PREVIEW_REQUEST_LETTERING),
    gold: z.strictObject({
      karat: z.literal("18K"),
      color: z.enum(PREVIEW_REQUEST_METALS),
    }),
    stones: z.strictObject({
      coverage: z.enum(PREVIEW_REQUEST_COVERAGES),
      gemstone: z.enum(PREVIEW_REQUEST_GEMS).optional(),
    }),
    pendantWidthMm: z.number().int().positive().max(200),
    chainStyle: z.enum(PREVIEW_REQUEST_CHAINS),
    engraving: optionalText(ENGRAVING_MAX),
    specialRequests: optionalText(REQUESTS_MAX),
  })
  .refine(
    (value) => value.names.length === 1 || value.layout !== undefined,
    "A two-name pendant needs a layout.",
  )
  .refine(
    (value) =>
      value.stones.coverage === "No stones"
        ? value.stones.gemstone === undefined
        : value.stones.gemstone !== undefined,
    "Stone coverage and gemstone must agree.",
  );
export type PreviewRequestSpecification = z.infer<
  typeof previewRequestSpecificationSchema
>;

/**
 * Which labelled illustrated sample the shopper was looking at. It is recorded
 * so the operator can see the customer was shown a sample, never a photograph
 * of their own piece.
 */
export const previewRequestSampleReferenceSchema = z.strictObject({
  role: z
    .literal("illustrative-reference-only")
    .default("illustrative-reference-only"),
  manifestId: z.string().trim().min(1).max(80),
  sampleId: z.string().trim().min(1).max(120),
  view: z.enum(PREVIEW_REQUEST_VIEWS),
  assetPath: z
    .string()
    .trim()
    .max(300)
    .refine(
      (value) => SAMPLE_ASSET_PATH.test(value) && !value.includes(".."),
      "Sample references must be local catalogue assets.",
    ),
  // Present only once the manifest carries one; never invented here.
  checksum: z
    .string()
    .trim()
    .regex(/^[a-f0-9]{64}$/, "Checksum must be a lowercase sha256 hex digest.")
    .optional(),
});
export type PreviewRequestSampleReference = z.infer<
  typeof previewRequestSampleReferenceSchema
>;

export const previewRequestInputSchema = z.strictObject({
  locale: z.enum(["en", "ar"]),
  specification: previewRequestSpecificationSchema,
  contact: previewRequestContactSchema,
  sampleReference: previewRequestSampleReferenceSchema.optional(),
  designId: z.uuid().optional(),
  designRevisionId: z.uuid().optional(),
  generationRunId: z.uuid().optional(),
  /** Client-generated, unique per principal, so a double submit is one row. */
  requestKey: z.uuid().optional(),
});
export type PreviewRequestInput = z.infer<typeof previewRequestInputSchema>;

export interface PreviewRequestRecord {
  id: string;
  status: PreviewRequestStatus;
  locale: "en" | "ar";
  specification: PreviewRequestSpecification;
  sampleReference?: PreviewRequestSampleReference;
  designId?: string;
  designRevisionId?: string;
  generationRunId?: string;
  createdAt: string;
  updatedAt: string;
  contactedAt?: string;
}

/** The operator queue additionally sees the contact and the operator note. */
export interface OperatorPreviewRequestRecord extends PreviewRequestRecord {
  contact: PreviewRequestContact;
  summary: string;
  operatorNote?: string;
}

/** One readable line for the operator queue. Customer names are intentional. */
export function summarizePreviewSpecification(
  specification: PreviewRequestSpecification,
): string {
  const stones =
    specification.stones.coverage === "No stones"
      ? "no stones"
      : `${specification.stones.coverage.toLowerCase()} ${specification.stones.gemstone?.toLowerCase() ?? ""}`.trim();
  return [
    specification.names.join(" + "),
    specification.script,
    specification.construction,
    specification.lettering,
    ...(specification.layout ? [specification.layout] : []),
    `${specification.gold.karat} ${specification.gold.color.toLowerCase()}`,
    stones,
    `${specification.pendantWidthMm} mm`,
    `${specification.chainStyle.toLowerCase()} chain`,
  ].join(" · ");
}

/**
 * A single caller-safe sentence for the `{error, code}` contract. Zod messages
 * quote the offending path only, never the submitted value.
 */
export function previewRequestIssueMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Preview request is invalid";
  const path = issue.path.join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}
