import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({
  createClient: vi.fn(() => ({ configured: true })),
}));

vi.mock("@supabase/supabase-js", () => ({ createClient }));

import { createSupabaseDataClient } from "./index";

describe("Supabase browser client boundary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persists and refreshes anonymous Auth for authenticated Realtime", () => {
    createSupabaseDataClient(
      "https://example.supabase.co",
      "publishable-test-key",
    );
    expect(createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "publishable-test-key",
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          storageKey: "jewelo:anonymous-session:v1",
        },
      },
    );
  });
});
