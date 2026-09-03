import { describe, expect, it } from "vitest";
import {
  ENABLED_PRESENTATION_VIEWS,
  PRESENTATION_VIEWS,
  resolvePresentationViewConfig,
} from "./domain";

describe("presentation view contract", () => {
  // Video/motion generation was removed on 2026-09-03: Jewelo is image only.
  it("offers exactly the four still views and no motion view", () => {
    expect(PRESENTATION_VIEWS).toEqual([
      "studio",
      "on_skin",
      "close_up",
      "dark",
    ]);
    expect(PRESENTATION_VIEWS).not.toContain("motion");
  });

  it("enables every declared view by default", () => {
    expect(resolvePresentationViewConfig().enabled).toEqual(
      ENABLED_PRESENTATION_VIEWS,
    );
    expect(ENABLED_PRESENTATION_VIEWS).toEqual(PRESENTATION_VIEWS);
  });

  it("honours an explicit narrower override", () => {
    expect(
      resolvePresentationViewConfig({ enabled: ["studio", "dark"] }).enabled,
    ).toEqual(["studio", "dark"]);
  });
});
