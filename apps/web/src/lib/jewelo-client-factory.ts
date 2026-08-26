import type { LegacyJeweloClient } from "./legacy-direction-compat";
import { MockJeweloClient } from "./mock-client";
import { SupabaseJeweloClient } from "./supabase-jewelo-client";

export function createJeweloClient(
  mode = process.env.NEXT_PUBLIC_JEWELO_DATA_MODE,
): LegacyJeweloClient {
  return mode === "remote"
    ? new SupabaseJeweloClient()
    : new MockJeweloClient(undefined, false);
}
