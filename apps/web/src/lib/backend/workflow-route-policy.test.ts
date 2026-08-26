import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const webhookRoute = readFileSync(
  new URL("../../app/api/webhooks/shopify/route.ts", import.meta.url),
  "utf8",
);
const operatorRoute = readFileSync(
  new URL("../../app/api/operator/commands/route.ts", import.meta.url),
  "utf8",
);

describe("commercial workflow route policy", () => {
  it("accepts only verified paid-order webhooks and atomically completes the order", () => {
    expect(webhookRoute).toContain("verifyShopifyHmac");
    expect(webhookRoute).toContain('topic !== "orders/paid"');
    expect(webhookRoute).toContain('payload.financial_status !== "paid"');
    expect(webhookRoute).toContain('"/rest/v1/rpc/complete_shopify_order"');
  });

  it("routes operator retries through the idempotent outbox RPC", () => {
    expect(operatorRoute).toContain(
      '"/rest/v1/rpc/operator_retry_generation_task"',
    );
    expect(operatorRoute).toContain("p_retry_key: input.idempotencyKey");
  });
});
