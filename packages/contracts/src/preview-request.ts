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

/**
 * What is wrong with the one contact detail the shopper left. The names are
 * rules, not sentences, so the atelier can say them in Arabic while the server
 * says them in English about the very same value.
 */
export type ContactProblem = "empty" | "phone_format" | "email_format";

/**
 * The contact value exactly as this schema stores it: a phone number without the
 * separators people type, an address in lower case. Check the length of this,
 * never of the raw field.
 */
export function normalizeContact(
  channel: PreviewRequestContactChannel,
  value: string,
): string {
  const trimmed = value.trim();
  return channel === "email"
    ? trimmed.toLowerCase()
    : trimmed.replace(/[\s()./-]/g, "");
}

/**
 * The one implementation of the contact rules. The schema below and the
 * atelier's own check both call it, so the shop's screen and the server can
 * never disagree about whether a way to reach the shopper is usable. The
 * shopper is told the rule before the request is sent, not after it is refused.
 *
 * `value` may be raw; it is normalized here.
 */
export function contactProblem(
  channel: PreviewRequestContactChannel,
  value: string,
): ContactProblem | undefined {
  const normalized = normalizeContact(channel, value);
  if (!normalized) return "empty";
  if (channel === "email")
    return normalized.length <= 254 && z.email().safeParse(normalized).success
      ? undefined
      : "email_format";
  return E164.test(normalized) ? undefined : "phone_format";
}

/** The sentence the server returns for a rule; one per problem, never prose. */
export function contactProblemMessage(problem: ContactProblem): string {
  return {
    empty: "Leave one way to reach you.",
    phone_format:
      "Enter a number in international format, for example +971501234567.",
    email_format: "Enter a valid email address.",
  }[problem];
}

const CONTACT_PROBLEMS: readonly ContactProblem[] = [
  "empty",
  "phone_format",
  "email_format",
];

/**
 * The rule behind a refusal sentence the server sent back.
 *
 * `previewRequestIssueMessage` prefixes the offending path, so the prefix is
 * dropped before matching. A sentence that is not one of the contact rules
 * returns undefined and the caller falls back to its own generic line rather
 * than showing an English server string inside the Arabic journey.
 */
export function contactProblemFromMessage(
  message: string,
): ContactProblem | undefined {
  const sentence = message.includes(": ")
    ? message.slice(message.indexOf(": ") + 2)
    : message;
  return CONTACT_PROBLEMS.find(
    (problem) => contactProblemMessage(problem) === sentence,
  );
}

const contactValue = (channel: PreviewRequestContactChannel) =>
  z
    .string()
    // A bound before any work is done; the rules themselves are in
    // `contactProblem`, which is what actually decides the sentence.
    .max(320)
    .transform((value) => normalizeContact(channel, value))
    .superRefine((value, ctx) => {
      const problem = contactProblem(channel, value);
      if (problem)
        ctx.addIssue({ code: "custom", message: contactProblemMessage(problem) });
    });

const phoneValue = contactValue("phone");
const emailValue = contactValue("email");

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

/**
 * The operator commands the queue may send for one captured request.
 *
 * `preview_requests` accepts four statuses, but the command route only ever
 * knew how to write `contacted`, so a request the shop had actually made or
 * dropped stayed in the queue for ever. The three status commands and the note
 * command are listed here, once, with the stored statuses each may act on: the
 * route builds its PostgREST filter from this table instead of carrying its own
 * copy of the state machine.
 *
 * A command whose `from` list does not contain the stored status writes
 * nothing; the route answers with the current row, so a repeated click is a
 * no-op rather than a rewrite of `contacted_at`.
 */
export const PREVIEW_REQUEST_COMMANDS = [
  "preview_request.mark_contacted",
  "preview_request.mark_fulfilled",
  "preview_request.mark_cancelled",
  "preview_request.note",
] as const;
export type PreviewRequestCommand = (typeof PREVIEW_REQUEST_COMMANDS)[number];

/** The database check constraint on `preview_requests.operator_note`. */
export const PREVIEW_REQUEST_NOTE_MAX = 2000;

export const PREVIEW_REQUEST_COMMAND_TRANSITIONS: Readonly<
  Record<
    PreviewRequestCommand,
    { readonly from: readonly PreviewRequestStatus[]; readonly to?: PreviewRequestStatus }
  >
> = {
  "preview_request.mark_contacted": { from: ["new"], to: "contacted" },
  "preview_request.mark_fulfilled": {
    from: ["new", "contacted"],
    to: "fulfilled",
  },
  "preview_request.mark_cancelled": {
    from: ["new", "contacted"],
    to: "cancelled",
  },
  // A note is a note whatever the request's status is; it never moves the row.
  "preview_request.note": { from: PREVIEW_REQUEST_STATUSES },
};

export function isPreviewRequestCommand(
  value: string,
): value is PreviewRequestCommand {
  return (PREVIEW_REQUEST_COMMANDS as readonly string[]).includes(value);
}

/**
 * The envelope the operator command route validates a preview-request command
 * against, so a malformed body is a 422 with a path, not a PostgREST error.
 */
export const previewRequestCommandSchema = z.object({
  command: z.enum(PREVIEW_REQUEST_COMMANDS),
  targetId: z.uuid(),
  idempotencyKey: z.string().min(1).max(200),
  payload: z
    .object({ note: z.string().max(PREVIEW_REQUEST_NOTE_MAX).optional() })
    .optional(),
});
export type PreviewRequestCommandInput = z.infer<
  typeof previewRequestCommandSchema
>;
