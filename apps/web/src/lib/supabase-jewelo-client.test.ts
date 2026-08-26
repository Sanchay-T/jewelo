import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { channel, createSupabaseDataClient, supabase } = vi.hoisted(() => {
  const channel = {
    on: vi.fn(),
    subscribe: vi.fn(),
  };
  channel.on.mockReturnValue(channel);
  channel.subscribe.mockReturnValue(channel);
  const session = {
    access_token: "anonymous-access-token",
    refresh_token: "anonymous-refresh-token",
    user: { id: "anonymous-user", is_anonymous: true },
  };
  const supabase = {
    auth: {
      getSession: vi.fn(async () => ({ data: { session } })),
      signInAnonymously: vi.fn(async () => ({ data: { session } })),
    },
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(async () => "ok"),
  };
  return {
    channel,
    createSupabaseDataClient: vi.fn(() => supabase),
    session,
    supabase,
  };
});

vi.mock("@jewelo/data", () => ({ createSupabaseDataClient }));

import { SupabaseJeweloClient } from "./supabase-jewelo-client";

describe("SupabaseJeweloClient auth and status delivery", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-test-key");
    vi.stubGlobal("window", {
      setInterval: globalThis.setInterval,
      clearInterval: globalThis.clearInterval,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ run: { status: "running" }, tasks: [], assets: [] }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    channel.on.mockReturnValue(channel);
    channel.subscribe.mockReturnValue(channel);
  });

  it("uses persisted auto-refresh Auth and authenticated Realtime with polling fallback", async () => {
    const client = new SupabaseJeweloClient();
    await expect(client.hydrate()).resolves.toMatchObject({
      principal: { id: "anonymous-user", role: "customer" },
    });
    expect(createSupabaseDataClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "publishable-test-key",
    );
    const unsubscribe = client.subscribeToRun("run-1", vi.fn());
    await vi.waitFor(() => expect(channel.subscribe).toHaveBeenCalled());
    expect(channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({
        table: "generation_tasks",
        filter: "run_id=eq.run-1",
      }),
      expect.any(Function),
    );
    expect(channel.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({ table: "assets", filter: "run_id=eq.run-1" }),
      expect.any(Function),
    );
    unsubscribe();
    expect(supabase.removeChannel).toHaveBeenCalledWith(channel);
  });
});
