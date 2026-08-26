import { describe, expect, it } from "vitest";

import {
  assertBrowserSafeEnv,
  jobsEnvSchema,
  parseBrowserEnv,
  parseTriggerConfigEnv,
} from "./index";

describe("environment boundaries", () => {
  it("builds with a safe local browser default", () => {
    expect(parseBrowserEnv({}).NEXT_PUBLIC_APP_URL).toBe(
      "http://localhost:3000",
    );
  });

  it("rejects partial Supabase browser configuration", () => {
    expect(() =>
      parseBrowserEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      }),
    ).toThrow(/must be set together/);
  });

  it("rejects server credentials in browser input", () => {
    expect(() =>
      assertBrowserSafeEnv({ SUPABASE_SERVICE_ROLE_KEY: "not-a-real-secret" }),
    ).toThrow(/Server-only environment keys/);
  });

  it("fails jobs configuration with actionable missing fields", () => {
    const result = jobsEnvSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining([
          "SUPABASE_URL",
          "SUPABASE_SERVICE_ROLE_KEY",
          "TRIGGER_PROJECT_REF",
          "TRIGGER_SECRET_KEY",
        ]),
      );
    }
  });

  it("requires a Trigger project before loading its config", () => {
    expect(() => parseTriggerConfigEnv({})).toThrow(/TRIGGER_PROJECT_REF/);
    expect(
      parseTriggerConfigEnv({ TRIGGER_PROJECT_REF: "proj_development" }),
    ).toEqual({
      TRIGGER_PROJECT_REF: "proj_development",
    });
  });
});
