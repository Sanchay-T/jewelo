import {
  foundationTaskInputSchema,
  foundationTaskResultSchema,
  type FoundationTaskResult,
} from "@jewelo/contracts";
import { parseJobsEnv } from "@jewelo/config";

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

export async function runValidatedFoundationContract(
  payload: unknown,
  environment: Record<string, string | undefined> = process.env,
): Promise<FoundationTaskResult> {
  parseJobsEnv(environment);
  return runFoundationContract(payload);
}
