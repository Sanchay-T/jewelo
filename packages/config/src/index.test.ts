import { describe, expect, it } from "vitest";

import {
  assertBrowserSafeEnv,
  jobsEnvSchema,
  parseBrowserEnv,
} from "./index";

describe("environment boundaries", () => {
  it("treats an empty optional URL or key as unset", () => {
    const parsed = parseBrowserEnv({
      NEXT_PUBLIC_SENTRY_DSN: "",
      NEXT_PUBLIC_POSTHOG_KEY: "   ",
      NEXT_PUBLIC_POSTHOG_HOST: "",
    });
    expect(parsed.NEXT_PUBLIC_SENTRY_DSN).toBeUndefined();
    expect(parsed.NEXT_PUBLIC_POSTHOG_KEY).toBeUndefined();
    expect(parsed.NEXT_PUBLIC_POSTHOG_HOST).toBeUndefined();
    const jobs = jobsEnvSchema.safeParse({
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
      OPENAI_API_KEY: "",
    });
    expect(jobs.success).toBe(true);
    if (jobs.success) expect(jobs.data.OPENAI_API_KEY).toBeUndefined();
  });

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
        ]),
      );
    }
  });

  it("keeps the Inngest keys optional but blank-safe", () => {
    const parsed = jobsEnvSchema.safeParse({
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
      INNGEST_EVENT_KEY: "",
      INNGEST_BASE_URL: "",
      INNGEST_CRON_ENABLED: "",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.INNGEST_EVENT_KEY).toBeUndefined();
      expect(parsed.data.INNGEST_BASE_URL).toBeUndefined();
      expect(parsed.data.INNGEST_CRON_ENABLED).toBeUndefined();
    }
    const selfHosted = jobsEnvSchema.safeParse({
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role",
      INNGEST_EVENT_KEY: "event-key",
      // `inngest start` requires bare hex; Inngest Cloud adds a signkey- prefix.
      INNGEST_SIGNING_KEY: "deadbeefdeadbeef",
      INNGEST_BASE_URL: "http://inngest:8288",
      INNGEST_CRON_ENABLED: "1",
    });
    expect(selfHosted.success).toBe(true);
  });

  it("accepts real mode only when provider credentials are server-side", () => {
    const result = jobsEnvSchema.safeParse({
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-test",
      PROVIDER_MODE: "real",
      FAL_KEY: "fal-test",
      OPENAI_API_KEY: "openai-test",
    });
    expect(result.success).toBe(true);
  });
});
