import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const checkout = readFileSync(
  new URL("../../app/api/checkout/route.ts", import.meta.url),
  "utf8",
);
const shopify = readFileSync(new URL("./shopify.ts", import.meta.url), "utf8");

describe("checkout policy", () => {
  it("requires an accepted live quote and persisted spelling confirmation", () => {
    expect(checkout).toContain("&status=eq.accepted&expires_at=gt.");
    expect(checkout).toContain(
      "revision?.specification.spellingConfirmed !== true",
    );
    expect(checkout).toContain("drafts[0]?.spelling_confirmed !== true");
  });

  it("uses Caleums copy and a routable development checkout", () => {
    expect(checkout).toContain("Custom Caleums name pendant");
    expect(shopify).toContain("Caleums quote");
    expect(shopify).toContain("commerce/${input.designId}?checkout=mock");
  });

  it("leases creation and reconciles stale provider-unknown drafts read-only", () => {
    expect(checkout).toContain('"/rest/v1/rpc/reserve_shopify_checkout"');
    expect(checkout).toContain("reconcileShopifyDraftOrder");
    expect(checkout).toContain('status: "provider_unknown"');
  });
});
