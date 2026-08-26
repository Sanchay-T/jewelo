import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  authenticateOperator,
  hasOperatorSession,
  operatorSessionCookie,
} from "./operator-session";

describe("operator session", () => {
  beforeEach(() => {
    vi.stubEnv("OPERATOR_EMAIL", "operator@caleums.test");
    vi.stubEnv("OPERATOR_PASSPHRASE", "test-passphrase");
    vi.stubEnv("OPERATOR_SESSION_SECRET", "test-session-secret");
  });

  it("requires credentials and rejects a tampered HTTP-only session", () => {
    expect(
      authenticateOperator("operator@caleums.test", "test-passphrase"),
    ).toBe(true);
    expect(authenticateOperator("operator@caleums.test", "wrong")).toBe(false);
    const cookie = operatorSessionCookie();
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
    expect(
      hasOperatorSession(
        new Request("https://caleums.test/api/state", {
          headers: { cookie: cookie.split(";")[0]! },
        }),
      ),
    ).toBe(true);
    expect(
      hasOperatorSession(
        new Request("https://caleums.test/api/state", {
          headers: { cookie: `${cookie.split(";")[0]}tampered` },
        }),
      ),
    ).toBe(false);
  });
});
