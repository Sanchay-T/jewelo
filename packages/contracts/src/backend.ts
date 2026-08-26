import type {
  AuditEvent,
  DesignDraft,
  DesignRevision,
  Estimate,
  GenerationRun,
  JewelrySpecification,
  Order,
  PresentationAsset,
  PresentationTask,
  Quote,
  Locale,
} from "./domain";

export interface DesignRecord {
  id: string;
  customerId: string;
  ownerPrincipalId: string;
  locale: Locale;
  status: "draft" | "approved" | "generating" | "quoted" | "ordered";
  resumePath?: string;
  createdAt: string;
  updatedAt: string;
  activeRevisionId?: string;
}
export type CreateDesignInput = Omit<
  DesignRecord,
  "id" | "createdAt" | "updatedAt"
>;
export interface DesignRevisionRecord extends DesignRevision {
  designId: string;
  status: "approved";
}
export interface CreateDesignRevisionInput {
  designId: string;
  draftId: string;
  specification: JewelrySpecification;
  identityAnchor: DesignRevision["identityAnchor"];
}
export interface DesignDraftRecord extends DesignDraft {
  designId?: string;
  status: "draft";
  resumePath?: string;
}
export type CreateDesignDraftInput = Omit<
  DesignDraftRecord,
  "id" | "createdAt" | "updatedAt" | "status"
>;
export interface GenerationRunRecord extends GenerationRun {
  designId: string;
}
export type CreateGenerationRunInput = Pick<
  GenerationRunRecord,
  "designId" | "revisionId" | "label"
>;
export interface GenerationTaskRecord extends PresentationTask {
  runId: string;
}
export type CreateGenerationTaskInput = Omit<
  GenerationTaskRecord,
  "id" | "attempt" | "state"
>;
export interface AssetRecord extends PresentationAsset {
  immutable: true;
  createdAt: string;
}
export type CreateAssetInput = Omit<AssetRecord, "id" | "createdAt">;
export interface QuoteRecord extends Quote {
  createdAt: string;
  shopifyDraftOrderId?: string;
  checkoutState: "not-created" | "draft" | "ready" | "completed" | "expired";
}
export type CreateQuoteInput = Omit<QuoteRecord, "id" | "createdAt" | "status">;
export interface OrderRecord extends Order {
  createdAt: string;
  shopifyDraftOrderId?: string;
  shopifyOrderId?: string;
  checkoutState: "pending" | "completed" | "cancelled";
}
export type CreateOrderInput = Omit<OrderRecord, "id" | "createdAt" | "status">;
export interface AuditEventRecord extends AuditEvent {
  designId: string;
  principalId: string;
}
export type CreateAuditEventInput = Omit<AuditEventRecord, "id" | "at">;
export interface OutboxEventRecord {
  id: string;
  aggregateType:
    "design" | "revision" | "run" | "task" | "asset" | "quote" | "order";
  aggregateId: string;
  eventType: string;
  payload: Readonly<Record<string, unknown>>;
  createdAt: string;
  publishedAt?: string;
  attemptCount: number;
}
export type CreateOutboxEventInput = Omit<
  OutboxEventRecord,
  "id" | "createdAt" | "publishedAt" | "attemptCount"
>;
export type CommercialSnapshot = Estimate;
