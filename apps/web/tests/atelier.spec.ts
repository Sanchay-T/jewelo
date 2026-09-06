import { samples } from "../src/features/atelier/catalogue";
import { initialState, STORAGE_KEY } from "../src/features/atelier/model";
import { test, expect, type Page } from "@playwright/test";
const path = "/en/design/new";
async function section(page: Page, id: string) {
  const head = page.locator(`#section-${id} > button`);
  if ((await head.getAttribute("aria-expanded")) === "false")
    await head.click();
}
async function preview(page: Page) {
  await page
    .getByRole("button", { name: "Preview my piece", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your piece, in every light." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Studio", exact: true }),
  ).toHaveAttribute("data-preview-status", "ready");
}
async function add(page: Page) {
  await page.getByRole("checkbox", { name: "I confirm the spelling" }).check();
  await page.getByRole("button", { name: "Add to bag", exact: true }).click();
  await expect(page.getByRole("dialog", { name: /Your bag/ })).toBeVisible();
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}
test("design, conditional controls, review, immutable bag editing and reload", async ({
  page,
}, testInfo) => {
  const requests: string[] = [];
  page.on("request", (req) => {
    if (
      (!req.url().startsWith("http://localhost:3001") &&
        !req.url().startsWith("data:")) ||
      /\/api\//.test(req.url())
    )
      requests.push(req.url());
  });
  await page.goto(path);
  await page.getByLabel("Name on your pendant").fill("Asma");
  await page.getByLabel("Name on your pendant").blur();
  await noOverflow(page);
  await expect(
    page.getByRole("button", { name: "Preview my piece", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "CALEUMS design" })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `test-results/atelier/design-${testInfo.project.name}.png`,
    fullPage: false,
  });
  await page.getByRole("button", { name: "Two names", exact: true }).click();
  await page.getByLabel("Second name", { exact: true }).fill("Fatima");
  await section(page, "style");
  await expect(
    page.getByRole("group", { name: "Connection layout" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Infinity", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Origami ribbon/ }),
  ).toBeEnabled();
  await section(page, "gold");
  await page.getByRole("button", { name: "Accent", exact: true }).click();
  await page.getByRole("button", { name: "Ruby", exact: true }).click();
  await section(page, "size");
  await page.getByRole("button", { name: "22" }).click();
  await page.getByRole("button", { name: "Box", exact: true }).click();
  await section(page, "personal");
  await page.getByRole("textbox", { name: "Engraving" }).fill("Forever");
  await page.getByRole("textbox", { name: "Engraving" }).blur();
  await noOverflow(page);
  await preview(page);
  await expect(
    page.getByRole("button", { name: "Add to bag", exact: true }),
  ).toBeDisabled();
  await add(page);
  await expect(
    page.getByRole("button", { name: "Checkout unavailable" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: /Increase quantity/ }).click();
  await expect(page.getByLabel("Quantity", { exact: true })).toHaveText("2");
  await page.reload();
  await page.getByRole("button", { name: "Your bag (2)" }).click();
  await expect(page.getByLabel("Quantity", { exact: true })).toHaveText("2");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await page.getByLabel("Name on your pendant").fill("Sara");
  await page.getByLabel("Name on your pendant").blur();
  await page.getByRole("button", { name: "Cancel editing" }).click();
  await page.getByRole("button", { name: "Your bag (2)" }).click();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "Asma & Fatima" }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await page.getByLabel("Name on your pendant").fill("Sara");
  await page.getByLabel("Name on your pendant").blur();
  await preview(page);
  await page.getByRole("checkbox", { name: "I confirm the spelling" }).check();
  await page.getByRole("button", { name: "Update piece" }).click();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "Sara & Fatima" }),
  ).toBeVisible();
  await expect(page.getByLabel("Quantity", { exact: true })).toHaveText("2");
  await page.getByRole("button", { name: "New piece", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your name, made precious." }),
  ).toBeFocused();
  await page.getByLabel("Name on your pendant").fill("Noor");
  await page.getByLabel("Name on your pendant").blur();
  await preview(page);
  await add(page);
  await expect(page.locator("dialog[open] article")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Remove", exact: true })
    .last()
    .click();
  await expect(page.locator("dialog[open] article")).toHaveCount(1);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await noOverflow(page);
  expect(requests).toEqual([]);
  await page.screenshot({
    path: `test-results/atelier/review-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
test("partial failure, retry, stale edits, interrupted reload and zoom keyboard", async ({
  page,
}) => {
  await page.goto(path + "?preview-test=1");
  await page
    .getByRole("button", { name: "Preview my piece", exact: true })
    .click();
  await expect(page.locator("#name-error")).toBeVisible();
  await page.getByLabel("Name on your pendant").fill("Asma");
  await page.getByLabel("Name on your pendant").blur();
  await page.getByText("Local preview controls", { exact: true }).click();
  await page
    .getByRole("checkbox", { name: "Simulate a failed Dark view" })
    .check();
  await page
    .getByRole("button", { name: "Preview my piece", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Dark", exact: true }),
  ).toHaveAttribute("data-preview-status", "failed");
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await page.getByRole("button", { name: "Retry Dark", exact: true }).click();
  await page.getByRole("button", { name: "Edit Name", exact: true }).click();
  await page.getByLabel("Name on your pendant").fill("Fatima");
  await page.getByLabel("Name on your pendant").blur();
  await page.getByRole("button", { name: "02 Review" }).click();
  await expect(
    page.getByText("Outdated previews", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Preview my piece", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Studio", exact: true }).click();
  await page.getByRole("button", { name: "Zoom image" }).click();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Zoom image" })).toBeFocused();
  await noOverflow(page);
});
test("RTL, touch targets, resizing, reduced motion and unavailable image", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/ar/design/new");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.getByRole("button", { name: "العربية", exact: true }).click();
  await page.getByLabel("الاسم على القلادة").fill("أسماء");
  await page.getByLabel("الاسم على القلادة").blur();
  await noOverflow(page);
  await page.setViewportSize({ width: 390, height: 500 });
  await expect(page.getByLabel("الاسم على القلادة")).toHaveValue("أسماء");
  await noOverflow(page);
  await page.screenshot({
    path: `test-results/atelier/rtl-${testInfo.project.name}.png`,
    fullPage: true,
  });
  const small = await page
    .getByTestId("atelier")
    .locator("button:visible")
    .evaluateAll((els) =>
      els
        .filter(
          (el) =>
            el.getBoundingClientRect().height < 43 ||
            el.getBoundingClientRect().width < 43,
        )
        .map((el) => el.textContent),
    );
  expect(small).toEqual([]);
  await page.route("**/atelier/v1/asma-arabic.png", (route) => route.abort());
  await page.getByRole("button", { name: "معاينة قطعتي" }).click();
  await expect(page.getByText("Sample image could not load.")).toBeVisible();
  await page.unroute("**/atelier/v1/asma-arabic.png");
  await page
    .getByRole("button", { name: "إعادة المحاولة", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "تكبير الصورة" }),
  ).toBeVisible();
});

test("storage denial, corrupt recovery, short viewport input clearance and bag focus trap", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("caleums.atelier.v1", "{broken");
  });
  await page.goto(path);
  await expect(
    page.getByRole("status").filter({ hasText: "could not be read" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 320, height: 420 });
  await section(page, "personal");
  const input = page.getByRole("textbox", { name: "Special requests" });
  await input.fill("Please check the backplate engraving.");
  await expect(input).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Preview my piece", exact: true }),
  ).toBeHidden();
  const rect = await input.boundingBox();
  expect(rect!.y).toBeGreaterThanOrEqual(0);
  expect(rect!.y + rect!.height).toBeLessThanOrEqual(420);
  await input.blur();
  await expect(
    page.getByRole("button", { name: "Preview my piece", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Your bag (0)" }).click();
  for (let i = 0; i < 9; i++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(
        () => !!document.activeElement?.closest("dialog[open]"),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Your bag (0)" }),
  ).toBeFocused();
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Unavailable", "QuotaExceededError");
    };
  });
  await page.reload();
  await expect(
    page.getByRole("status").filter({ hasText: "Storage is unavailable" }),
  ).toBeVisible();
  await page.getByLabel("Name on your pendant").fill("Asma");
  await page.getByLabel("Name on your pendant").blur();
  await preview(page);
});

test("preview remains sticky and camera choices are prominent", async ({
  page,
}) => {
  await page.goto(path);
  await expect(
    page.getByRole("button", { name: "Preview my piece", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByText(
      /manufacturing support|manufacturing compatibility|Outdated previews/,
    ),
  ).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Chain length" })).toHaveCount(
    0,
  );
  for (const view of ["Studio", "On skin", "Close-up", "Dark"]) {
    const button = page.getByRole("button", { name: view, exact: true });
    await expect(button.locator("img")).toBeVisible();
    expect((await button.boundingBox())!.height).toBeGreaterThan(75);
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
  }
  if (page.viewportSize()!.width >= 768) {
    await page.locator("#section-size").scrollIntoViewIfNeeded();
    const panel = page
      .getByRole("complementary", { name: "Jewelry preview" })
      .locator(":scope > div");
    await expect
      .poll(async () => (await panel.boundingBox())!.y)
      .toBeGreaterThanOrEqual(15);
    expect((await panel.boundingBox())!.y).toBeLessThan(25);
    expect(
      await page.evaluate(() => getComputedStyle(document.body).overflowY),
    ).not.toBe("auto");
  }
  await noOverflow(page);
});

test("selection examples change immediately and survive reload", async ({
  page,
}) => {
  await page.goto(path);
  await section(page, "style");
  await page
    .getByRole("button", { name: "Origami ribbon", exact: true })
    .click();
  const photo = page.locator("img[data-sample-id]");
  await expect(photo).toHaveAttribute("data-sample-id", "origami");
  await section(page, "gold");
  await page.getByRole("button", { name: "White gold", exact: true }).click();
  await expect(photo).toHaveAttribute("data-sample-id", "origami-white");
  await expect(photo).toHaveAttribute("data-sample-exact", "true");
  await page.reload();
  await expect(photo).toHaveAttribute("data-sample-id", "origami-white");
  await expect(
    page.getByRole("button", { name: "Studio", exact: true }),
  ).toHaveAccessibleDescription("Preview ready");
  await page.getByText("About this photo", { exact: false }).click();
  await expect(
    page.getByText("Pre-generated with a sample name.", { exact: false }),
  ).toBeVisible();
  await noOverflow(page);
});

test("all catalogued images render with their declared configuration", async ({
  page,
}, testInfo) => {
  test.skip(
    page.viewportSize()!.width !== 1440,
    "Asset sweep runs once; responsive interactions run at every width.",
  );
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(path);
  for (const sample of samples) {
    const fixture = {
      ...initialState(),
      draft: {
        ...sample.draft,
        name: sample.draft.script === "Arabic" ? "أسماء" : "Asma",
        secondName: "Fatima",
      },
    };
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: STORAGE_KEY,
      value: JSON.stringify(fixture),
    });
    await page.reload();
    await page.getByRole("button", { name: sample.view, exact: true }).click();
    const image = page.locator("img[data-sample-id]");
    await expect(image).toHaveAttribute("data-sample-id", sample.id);
    await expect
      .poll(() =>
        image.evaluate(
          (el: HTMLImageElement) => el.complete && el.naturalWidth > 0,
        ),
      )
      .toBe(true);
    await expect(image).toHaveAttribute("data-sample-exact", "true");
    await page.locator("#section-style").scrollIntoViewIfNeeded();
    await noOverflow(page);
    await page
      .getByRole("complementary", { name: "Jewelry preview" })
      .locator(":scope > div")
      .screenshot({
        path: testInfo.outputPath(
          "sample-" + sample.id.replace(/[^a-z0-9-]/gi, "-") + ".png",
        ),
      });
  }
  expect(errors).toEqual([]);
});

test("short desktop keeps every preview control reachable", async ({
  page,
}) => {
  test.skip(
    page.viewportSize()!.width < 768,
    "Short mobile is exercised in the input-clearance test.",
  );
  await page.setViewportSize({
    width: page.viewportSize()!.width,
    height: 600,
  });
  await page.goto(path);
  for (const view of ["Studio", "On skin", "Close-up", "Dark"]) {
    const button = page.getByRole("button", { name: view, exact: true });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
  }
  await page.getByText("About this photo", { exact: false }).click();
  await noOverflow(page);
});

test("carousel advances one piece, pauses on manual input and hides missing angles", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto(path);
  await page.locator("#section-style").scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  const photo = page.locator("img[data-sample-id]");
  await expect(photo).toHaveAttribute("data-sample-id", "classic-Studio");
  await expect
    .poll(() => photo.evaluate((el: HTMLImageElement) => el.complete))
    .toBe(true);
  await expect(page.locator("[data-playing]")).toHaveAttribute(
    "data-playing",
    "true",
  );
  await page.clock.runFor(5100);
  await expect(photo).toHaveAttribute("data-sample-id", "classic-On skin");
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await page.clock.runFor(11000);
  await expect(photo).toHaveAttribute("data-sample-id", "classic-Dark");
  await expect(
    page.getByRole("button", { name: "Play slideshow" }),
  ).toBeVisible();
  await section(page, "gold");
  await page.getByRole("button", { name: "Accent", exact: true }).click();
  await page.getByRole("button", { name: "Ruby", exact: true }).click();
  await expect(photo).toHaveAttribute("data-sample-id", "ruby");
  await expect(
    page.getByRole("button", { name: "On skin", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Play slideshow" }),
  ).toHaveCount(0);
  await noOverflow(page);
});

test("each option click displays its corresponding sample and maintains the family", async ({
  page,
}) => {
  test.setTimeout(90_000); // 24 independent reloads and every available camera angle.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(path);
  const photo = page.locator("img[data-sample-id]");
  const checks: [string, string, string][] = [
    ["style", "Classical", "classic-Studio"],
    ["style", "Origami ribbon", "origami"],
    ["style", "Framed minimal", "framed"],
    ["style", "Diamond rails", "rails"],
    ["style", "Classic", "classic-Studio"],
    ["style", "Minimal", "minimal"],
    ["style", "Diwani", "diwani"],
    ["style", "Kufi", "kufi"],
    ["style", "Signature", "signature"],
    ["style", "Thuluth inspired", "thuluth"],
    ["gold", "White gold", "white"],
    ["gold", "Rose gold", "rose"],
    ["gold", "Accent", "accent"],
    ["gold", "Partial pavé", "partial"],
    ["gold", "Full pavé", "full"],
    ["gold", "Natural diamond", "natural"],
    ["gold", "Ruby", "ruby"],
    ["gold", "Emerald", "emerald"],
    ["gold", "Blue sapphire", "blue"],
    ["gold", "Pink sapphire", "pink"],
    ["size", "22", "small"],
    ["size", "Rolo", "rolo"],
    ["size", "Box", "box"],
    ["size", "Curb", "curb-v2"],
  ];
  for (const [group, label, id] of checks) {
    // Independent option catalogue check; cumulative preservation is tested separately.
    const fixture = initialState();
    if (["natural", "ruby", "emerald", "blue", "pink"].includes(id))
      fixture.draft.coverage = "Accent";
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: STORAGE_KEY,
      value: JSON.stringify(fixture),
    });
    await page.reload();
    await expect(page.getByRole("button", { name: "Preview my piece", exact: true })).toBeEnabled();
    await section(page, group);
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(photo).toHaveAttribute("data-sample-id", id);
    const asset = samples.find((sample) => sample.id === id)!;
    for (const view of ["On skin", "Close-up", "Dark"] as const) {
      const button = page.getByRole("button", { name: view, exact: true });
      if (await button.isEnabled()) {
        await button.click();
        const actualId = await photo.getAttribute("data-sample-id");
        const visible = samples.find((sample) => sample.id === actualId)!;
        for (const key of [
          "construction",
          "lettering",
          "metal",
          "coverage",
          "gem",
          "size",
          "chain",
          "twoNames",
          "layout",
          "script",
        ] as const)
          expect(visible.draft[key]).toBe(asset.draft[key]);
      }
    }
    await noOverflow(page);
  }
});

test("rotation respects focus, hover, reduced motion and failed images", async ({
  page,
}) => {
  await page.clock.install();
  await page.route("**/atelier/v1/asma-dark.png", (route) => route.abort());
  await page.goto(path);
  await page.locator("#section-style").scrollIntoViewIfNeeded();
  await expect(page.locator("[data-playing]")).toHaveAttribute(
    "data-playing",
    "true",
  );
  await page.getByRole("button", { name: "Studio", exact: true }).hover();
  await page.clock.runFor(6000);
  await expect(page.locator("img[data-sample-id]")).toHaveAttribute(
    "data-sample-id",
    "classic-Studio",
  );
  await page.mouse.move(0, 0);
  await page.getByRole("button", { name: "Next view" }).focus();
  await page.clock.runFor(6000);
  await expect(page.locator("img[data-sample-id]")).toHaveAttribute(
    "data-sample-id",
    "classic-Studio",
  );
  await page.getByRole("button", { name: "Next view" }).blur();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(
    page.getByRole("button", { name: "Play slideshow" }),
  ).toBeVisible();
  await page.clock.runFor(6000);
  await expect(page.locator("img[data-sample-id]")).toHaveAttribute(
    "data-sample-id",
    "classic-Studio",
  );
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(page.getByText("Sample image could not load.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Dark", exact: true }),
  ).toHaveAttribute("data-preview-status", "failed");
  await page.getByRole("button", { name: "Studio", exact: true }).click();
  await expect(page.locator("img[data-sample-id]")).toHaveAttribute(
    "data-sample-id",
    "classic-Studio",
  );
});

test("keyboard Play starts rotation and bag editing resets to a valid angle", async ({
  page,
}) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(path);
  await page.locator("#section-style").scrollIntoViewIfNeeded();
  const play = page.getByRole("button", { name: "Play slideshow" });
  await play.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-playing]")).toHaveAttribute(
    "data-playing",
    "true",
  );
  await page.clock.runFor(5100);
  await expect(page.locator("img[data-sample-id]")).toHaveAttribute(
    "data-sample-id",
    "classic-On skin",
  );
  await page.getByRole("button", { name: "Studio", exact: true }).click();
  await section(page, "name");
  await page.getByLabel("Name on your pendant").fill("Asma");
  await page.getByLabel("Name on your pendant").blur();
  await section(page, "gold");
  await page.getByRole("button", { name: "Accent", exact: true }).click();
  await page.getByRole("button", { name: "Ruby", exact: true }).click();
  await page
    .getByRole("button", { name: "Preview my piece", exact: true })
    .click();
  await page.clock.runFor(3000);
  await add(page);
  await page.getByRole("button", { name: "New piece", exact: true }).click();
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await page.getByRole("button", { name: "Your bag (1)" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await expect(page.locator("img[data-sample-id]")).toHaveAttribute(
    "data-sample-id",
    "ruby",
  );
  await expect(
    page.getByRole("button", { name: "Studio", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Dark", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Your bag (1)" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Remove", exact: true }).click();
  await expect.poll(async () => page.evaluate((key) => {
    const saved = JSON.parse(localStorage.getItem(key)!);
    return { editing: saved.editing, hasReturnDraft: !!saved.editReturn, pieces: saved.bag.length };
  }, STORAGE_KEY)).toEqual({ editing: null, hasReturnDraft: false, pieces: 0 });
});

test("customization builds cumulatively, re-clicks preserve the camera, and undo restores the piece", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(path);
  await section(page, "style");
  await page
    .getByRole("button", { name: "Origami ribbon", exact: true })
    .click();
  await section(page, "gold");
  const photo = page.locator("img[data-sample-id]");
  for (const [label, id] of [
    ["White gold", "origami-white"],
    ["Accent", "origami-white-accent"],
    ["Ruby", "origami-white-ruby"],
  ]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(photo).toHaveAttribute("data-sample-id", id!);
    await expect(photo).toHaveAttribute("data-sample-exact", "true");
    await expect(
      page.getByRole("button", { name: "Origami ribbon", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("button", { name: "White gold", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  }
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await section(page, "gold");
  await page.getByRole("button", { name: "Ruby", exact: true }).click();
  await expect(photo).toHaveAttribute(
    "data-sample-id",
    "origami-white-ruby-dark",
  );
  await page.getByRole("button", { name: "No stones", exact: true }).click();
  await expect(photo).toHaveAttribute("data-sample-id", "origami-white");
  await expect(photo).toHaveAttribute("data-sample-exact", "true");
  await page.reload();
  await expect(photo).toHaveAttribute("data-sample-id", "origami-white");
});

test("old failed runs do not mask a newly selected configuration", async ({
  page,
}) => {
  await page.goto(path + "?preview-test=1");
  await page.getByLabel("Name on your pendant").fill("Asma");
  await page.getByLabel("Name on your pendant").blur();
  await page.getByText("Local preview controls", { exact: true }).click();
  await page
    .getByLabel("Simulate a failed Dark view on the next preview")
    .check();
  await page
    .getByRole("button", { name: "Preview my piece", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Dark", exact: true }),
  ).toHaveAttribute("data-preview-status", "failed");
  await page.getByRole("button", { name: "01 Design" }).click();
  await section(page, "gold");
  await page.getByRole("button", { name: "White gold", exact: true }).click();
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(page.locator("img[data-sample-id]")).toHaveAttribute(
    "data-sample-id",
    "white-dark",
  );
});
