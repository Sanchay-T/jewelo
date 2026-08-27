import { describe, expect, it } from "vitest";
import { createJeweloClient } from "./jewelo-client-factory";
import { MockJeweloClient } from "./mock-client";
import { SupabaseJeweloClient } from "./supabase-jewelo-client";

describe("Jewelo client facade", () => {
  it("defaults to mock and selects remote only explicitly", () => {
    expect(createJeweloClient()).toBeInstanceOf(MockJeweloClient);
    expect(createJeweloClient("mock")).toBeInstanceOf(MockJeweloClient);
    expect(createJeweloClient("remote")).toBeInstanceOf(SupabaseJeweloClient);
  });
});
