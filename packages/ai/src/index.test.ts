import { describe, expect, it, vi } from "vitest";

import {
  FalStudioAdapter,
  MockFoundationProvider,
  STUDIO_PROMPT_FIXTURE,
} from "./index";

describe("mock provider adapter", () => {
  it("recovers after an injected one-shot failure", async () => {
    const provider = new MockFoundationProvider();
    const input = { requestId: "req-recovery", message: "probe" };
    provider.failNext();
    await expect(provider.execute(input)).rejects.toThrow(
      "injected provider failure",
    );
    await expect(provider.execute(input)).resolves.toEqual({
      requestId: "req-recovery",
      accepted: true,
      providerMode: "mock",
    });
  });
});

describe("studio provider policy", () => {
  it("selects the fal model and versioned prompt on the server", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            request_id: "fal-request",
            response_url: "https://fal.invalid/result",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            images: [
              { url: "https://fal.invalid/media", content_type: "image/png" },
            ],
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { "content-type": "image/png" },
        }),
      );
    const adapter = new FalStudioAdapter(
      "test-key",
      "openai/gpt-image-2/edit",
      fetcher,
    );
    await adapter.generate({
      idempotencyKey: "attempt-1",
      identityImageUrl: "https://signed.invalid/identity.png",
      identityFingerprint: "fingerprint",
      specification: {},
    });
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      "https://queue.fal.run/openai/gpt-image-2/edit",
    );
    const request = fetcher.mock.calls[0]?.[1];
    expect(request?.headers).toMatchObject({
      "x-idempotency-key": "attempt-1",
    });
    expect(JSON.parse(String(request?.body))).toMatchObject({
      prompt: STUDIO_PROMPT_FIXTURE.text,
      image_url: "https://signed.invalid/identity.png",
      num_images: 1,
    });
  });
});
