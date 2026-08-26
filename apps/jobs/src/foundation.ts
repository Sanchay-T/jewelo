import {
  foundationTaskInputSchema,
  foundationTaskResultSchema,
  type FoundationTaskResult,
} from "@jewelo/contracts";

export async function runFoundationContract(
  payload: unknown,
): Promise<FoundationTaskResult> {
  const input = foundationTaskInputSchema.parse(payload);
  return foundationTaskResultSchema.parse({
    requestId: input.requestId,
    accepted: true,
    providerMode: "mock",
  });
}
