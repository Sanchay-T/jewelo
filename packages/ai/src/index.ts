import {
  foundationTaskInputSchema,
  foundationTaskResultSchema,
  type FoundationTaskInput,
  type FoundationTaskResult,
} from "@jewelo/contracts";

export interface FoundationProvider {
  execute(input: FoundationTaskInput): Promise<FoundationTaskResult>;
}

export class MockFoundationProvider implements FoundationProvider {
  #nextFailure: Error | undefined;

  failNext(error = new Error("injected provider failure")): void {
    this.#nextFailure = error;
  }

  async execute(input: FoundationTaskInput): Promise<FoundationTaskResult> {
    const parsed = foundationTaskInputSchema.parse(input);
    if (this.#nextFailure) {
      const failure = this.#nextFailure;
      this.#nextFailure = undefined;
      throw failure;
    }
    return foundationTaskResultSchema.parse({
      requestId: parsed.requestId,
      accepted: true,
      providerMode: "mock",
    });
  }
}
