import { z } from "zod";

export const foundationTaskInputSchema = z.object({
  requestId: z.string().min(1),
  message: z.string().min(1).max(200),
});

export const foundationTaskResultSchema = z.object({
  requestId: z.string().min(1),
  accepted: z.literal(true),
  providerMode: z.literal("mock"),
});

export type FoundationTaskInput = z.infer<typeof foundationTaskInputSchema>;
export type FoundationTaskResult = z.infer<typeof foundationTaskResultSchema>;
