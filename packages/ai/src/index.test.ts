import { describe, expect, it, vi } from "vitest";

import { OpenAIStillAdapter, OpenAIStudioVerifier } from "./index";

describe("OpenAI still HTTP contract", () => {
  it("sends independent silhouette and style inputs with size as a request parameter", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(new Uint8Array([1]), { status: 200 }))
      .mockResolvedValueOnce(new Response(new Uint8Array([2]), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "image-request",
            data: [{ b64_json: Buffer.from([3, 4]).toString("base64") }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    const adapter = new OpenAIStillAdapter(
      "test-key",
      "gpt-image-2-2026-04-21",
      20,
      fetcher,
    );
    const result = await adapter.generate({
      idempotencyKey: "attempt-1",
      prompt: "Pinned compiled task prompt",
      identityImageUrl: "https://signed.invalid/identity.png",
      styleAnchorUrl: "https://signed.invalid/style.png",
      identityFingerprint: "fingerprint",
      aspectRatio: "4:5",
      presentationView: "on_skin",
      specification: {},
    });
    expect(fetcher.mock.calls[2]?.[0]).toBe(
      "https://api.openai.com/v1/images/edits",
    );
    const request = fetcher.mock.calls[2]?.[1];
    expect(request?.headers).toMatchObject({
      "Idempotency-Key": "attempt-1",
    });
    const body = request?.body as FormData;
    expect(body.get("model")).toBe("gpt-image-2-2026-04-21");
    expect(body.get("size")).toBe("1024x1280");
    expect(body.getAll("image[]")).toHaveLength(2);
    expect(result).toMatchObject({
      provider: "openai",
      requestId: "image-request",
    });
  });

  it("parses nested Responses API output text", async () => {
    const decision = {
      passed: true,
      exactText: true,
      exactScript: true,
      identityScore: 1,
      correctMetalAndStones: true,
      coherentPendant: true,
      exactlyTwoConnectedRings: true,
      correctShot: true,
      noAddedIdentityElements: true,
      notes: "ok",
    };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          output: [
            {
              content: [
                { type: "output_text", text: JSON.stringify(decision) },
              ],
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const verifier = new OpenAIStudioVerifier("test-key", "verifier", fetcher);
    await expect(
      verifier.verify({
        approvedText: "ليلى",
        identityFingerprint: "fingerprint",
        identityImageUrl: "https://signed.invalid/identity.png",
        presentationView: "studio",
        specification: {},
        media: {
          provider: "openai",
          model: "gpt-image-2-2026-04-21",
          requestId: "request",
          bytes: new Uint8Array([1]),
          mimeType: "image/png",
          estimatedCostCents: 20,
        },
      }),
    ).resolves.toEqual(decision);
  });
});
