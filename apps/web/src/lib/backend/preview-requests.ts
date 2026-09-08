import "server-only";

import {
  previewRequestInputSchema,
  previewRequestIssueMessage,
  previewRequestSpecificationSchema,
  summarizePreviewSpecification,
  PREVIEW_REQUEST_COMMAND_TRANSITIONS,
  PREVIEW_REQUEST_NOTE_MAX,
  PREVIEW_REQUEST_STATUSES,
  type OperatorPreviewRequestRecord,
  type PreviewRequestCommand,
  type PreviewRequestContact,
  type PreviewRequestInput,
  type PreviewRequestRecord,
  type PreviewRequestSampleReference,
  type PreviewRequestSpecification,
  type PreviewRequestStatus,
} from "@jewelo/contracts";
import { ApiError } from "./supabase-rest";

/**
 * Honest-degrade request capture.
 *
 * The customer sees their own request back (for a reload); the operator queue
 * additionally sees the contact and the operator note. `operator_note` never
 * reaches the customer response, so both shapes are built from explicit columns
 * rather than returning the raw row.
 */
const CUSTOMER_COLUMNS = [
  "id",
  "status",
  "locale",
  "specification",
  "sample_reference",
  "design_id",
  "design_revision_id",
  "generation_run_id",
  "created_at",
  "updated_at",
  "contacted_at",
] as const;

export const PREVIEW_REQUEST_COLUMNS = CUSTOMER_COLUMNS.join(",");
export const OPERATOR_PREVIEW_REQUEST_COLUMNS = [
  ...CUSTOMER_COLUMNS,
  "contact",
  "operator_note",
].join(",");

export interface PreviewRequestRow {
  id: string;
  status: string;
  locale: string;
  specification: unknown;
  sample_reference: unknown;
  design_id: string | null;
  design_revision_id: string | null;
  generation_run_id: string | null;
  created_at: string;
  updated_at: string;
  contacted_at: string | null;
  contact?: unknown;
  operator_note?: string | null;
}

export function isPreviewRequestStatus(
  value: string,
): value is PreviewRequestStatus {
  return (PREVIEW_REQUEST_STATUSES as readonly string[]).includes(value);
}

/** Validation failures answer the shared `{error, code}` contract with 422. */
export function parsePreviewRequestInput(body: unknown): PreviewRequestInput {
  const parsed = previewRequestInputSchema.safeParse(body);
  if (!parsed.success)
    throw new ApiError(
      previewRequestIssueMessage(parsed.error),
      422,
      "invalid_input",
    );
  return parsed.data;
}

/** Column payload for the owner-scoped insert. Status is the database default. */
export function previewRequestInsert(
  principalId: string,
  input: PreviewRequestInput,
) {
  return {
    principal_id: principalId,
    design_id: input.designId,
    design_revision_id: input.designRevisionId,
    generation_run_id: input.generationRunId,
    locale: input.locale,
    specification: input.specification,
    sample_reference: input.sampleReference,
    contact: input.contact,
    request_key: input.requestKey,
  };
}

const optional = (value: string | null | undefined) => value ?? undefined;

export function customerPreviewRequest(
  row: PreviewRequestRow,
): PreviewRequestRecord {
  return {
    id: row.id,
    // Written under a database check constraint, so the stored value is one of
    // the contract's states.
    status: row.status as PreviewRequestStatus,
    locale: row.locale as "en" | "ar",
    specification: row.specification as PreviewRequestSpecification,
    sampleReference:
      (row.sample_reference as PreviewRequestSampleReference | null) ??
      undefined,
    designId: optional(row.design_id),
    designRevisionId: optional(row.design_revision_id),
    generationRunId: optional(row.generation_run_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    contactedAt: optional(row.contacted_at),
  };
}

export function operatorPreviewRequest(
  row: PreviewRequestRow,
): OperatorPreviewRequestRecord {
  // A row written by an earlier contract version must not break the queue, so
  // the readable summary degrades instead of throwing.
  const parsed = previewRequestSpecificationSchema.safeParse(row.specification);
  return {
    ...customerPreviewRequest(row),
    contact: row.contact as PreviewRequestContact,
    summary: parsed.success
      ? summarizePreviewSpecification(parsed.data)
      : "Specification needs review",
    operatorNote: optional(row.operator_note),
  };
}

/**
 * The PostgREST filter and column patch one operator command writes.
 *
 * The status list comes from the contract's transition table, so the route
 * never carries its own copy of the state machine, and a command whose stored
 * status is not in that list matches no row and writes nothing.
 */
export function previewRequestCommandWrite(
  command: PreviewRequestCommand,
  note: string | undefined,
): { statusFilter: string; patch: Record<string, unknown> } {
  const transition = PREVIEW_REQUEST_COMMAND_TRANSITIONS[command];
  const patch: Record<string, unknown> = {};
  if (transition.to) {
    patch.status = transition.to;
    // Only the first contact is timestamped; the later statuses keep it.
    if (transition.to === "contacted")
      patch.contacted_at = new Date().toISOString();
  }
  if (typeof note === "string")
    patch.operator_note = note.slice(0, PREVIEW_REQUEST_NOTE_MAX);
  return {
    statusFilter: `status=in.(${transition.from.join(",")})`,
    patch,
  };
}
