import { expect, test, type Page } from "@playwright/test";

const V1_DRAFT_KEY = "caleums:configurator-draft:v1";
const V2_DRAFT_KEY = "caleums:configurator-draft:v2";

test.beforeEach(async ({ page }) => {
  await page.goto("/en");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
});

/**
 * Records every request to the paid transliteration model and answers it
 * locally. Interception still reports the request, so "zero calls" assertions
 * stay honest while the suite can never spend provider budget.
 */
async function trackTransliteration(page: Page) {
  const calls: string[] = [];
  await page.route("**/api/transliterate", async (route) => {
    calls.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ arabicText: "أسماء", model: "test-stub" }),
    });
  });
  return calls;
}

test("guest names, approves and generates from a single configurator page", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  const transliterations = await trackTransliteration(page);

  await page.getByRole("link", { name: /begin designing/i }).click();

  // One page: no wizard chrome and no separate review route.
  await expect(page).toHaveURL(/\/en\/design\/new$/);
  await expect(page.getByText(/step \d of \d/i)).toHaveCount(0);

  // Nothing is prefilled, so nobody sees a stranger's name or pendant.
  const nameField = page.getByLabel("Name", { exact: true });
  await expect(nameField).toHaveValue("");
  await expect(page.getByText("Your name appears here")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /approve revision/i }),
  ).toBeDisabled();

  await nameField.fill("Asma");
  await expect(
    page.getByRole("heading", { name: "Approve your design" }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", { name: /confirm the spelling/i })
    .check();

  const approve = page.getByRole("button", { name: /approve revision/i });
  await expect(approve).toBeEnabled();
  await approve.click();

  await expect(
    page.getByRole("heading", { name: /bringing your piece to life|presentation set is ready/i }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/en\/design\/crafting\?designId=design-1/);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("jewelo-ui-spike:v1") ?? "{}").designs
          ?.length,
    ),
  ).toBe(1);
  // The approved design owns the name now; the draft must not linger.
  expect(await page.evaluate((key) => localStorage.getItem(key), V2_DRAFT_KEY)).toBeNull();

  // An English design never needs an Arabic spelling proposed.
  expect(transliterations).toEqual([]);
  expect(errors).toEqual([]);
});

test("no transliteration model call happens before a name is typed in Arabic", async ({
  page,
}) => {
  const transliterations = await trackTransliteration(page);

  await page.goto("/en/design/new");
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("");
  await page.waitForTimeout(1_200);
  expect(transliterations).toEqual([]);

  // Choosing Arabic alone is not a name.
  await page.getByRole("button", { name: "العربية" }).click();
  await page.waitForTimeout(1_200);
  expect(transliterations).toEqual([]);

  // One character is below the floor.
  await page.getByLabel("Name", { exact: true }).fill("A");
  await page.waitForTimeout(1_200);
  expect(transliterations).toEqual([]);
});

test("adding a second name is an affordance and warns Arabic pairs go to the atelier", async ({
  page,
}) => {
  await trackTransliteration(page);
  await page.goto("/en/design/new");
  await page.getByLabel("Name", { exact: true }).fill("Asma");

  // No "One name / Two names" mode switch.
  await expect(page.getByRole("button", { name: /^two names$/i })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /layout/i })).toHaveCount(0);

  await page.getByRole("button", { name: /add a second name/i }).click();
  await page.getByLabel("Second name").fill("Noor");

  // Three layouts by default, the rest behind a disclosure.
  const layoutOptions = page
    .locator(".clm-layout-grid .clm-option")
    .filter({ visible: true });
  await expect(layoutOptions).toHaveCount(3);
  await page.getByRole("button", { name: /more layouts/i }).click();
  await expect(layoutOptions).toHaveCount(6);

  await page.getByRole("button", { name: "العربية" }).click();
  await expect(page.getByText(/enter atelier review/i)).toBeVisible();

  await page.getByRole("button", { name: /remove the second name/i }).click();
  await expect(page.getByLabel("Second name")).toHaveCount(0);
});

test("stones, size and chain are defaulted and folded away", async ({
  page,
}) => {
  await page.goto("/en/design/new");

  const details = page.locator(".clm-details-block");
  expect(
    await details.evaluate((element) => (element as HTMLDetailsElement).open),
  ).toBe(false);
  await expect(
    details.getByText("No stones · classic (30 mm) · cable · 45 cm"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /lab.diamond/i })).toBeHidden();

  // Keyboard-operable disclosure.
  await details.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Stone setting")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Stone setting")).toBeHidden();
});

test("the price estimate stays visible at the moment of approval on desktop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/en/design/new");
  await page.getByLabel("Name", { exact: true }).fill("Asma");

  // The failure this replaces was the action bar covering the estimate once the
  // customer scrolled down to approve, so scroll all the way first.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.getByRole("checkbox", { name: /confirm the spelling/i }).check();

  const estimate = page.locator(".clm-actions-estimate strong");
  await expect(estimate).toBeInViewport({ ratio: 1 });
  await expect(
    page.getByRole("button", { name: /approve revision/i }),
  ).toBeInViewport({ ratio: 1 });
});

test("a v1 wizard draft migrates into the single page without losing a hidden layout", async ({
  page,
}) => {
  await page.evaluate(
    ([key, payload]) => sessionStorage.setItem(key!, payload!),
    [
      V1_DRAFT_KEY,
      JSON.stringify({
        version: 1,
        stage: "size-chain",
        nameCount: 2,
        nameOne: "Layla",
        nameTwo: "Mariam",
        language: "en",
        arabicOne: "",
        arabicTwo: "",
        arabicStyle: "kufi",
        layout: "infinity",
        metal: "rose",
        coverage: "accent",
        gemstone: "ruby",
        size: "statement",
        chain: "box",
        chainLength: 55,
      }),
    ],
  );

  await page.goto("/en/design/new");

  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Layla");
  await expect(page.getByLabel("Second name")).toHaveValue("Mariam");
  // The restored layout must not be hidden behind the disclosure.
  await expect(
    page.getByRole("button", { name: /joined with an infinity/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /joined with an infinity/i }),
  ).toHaveAttribute("aria-pressed", "true");

  const stored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "null"),
    V2_DRAFT_KEY,
  );
  expect(stored).toMatchObject({ version: 2, layout: "infinity", metal: "rose" });
});

test("a draft survives closing and reopening the page", async ({ page }) => {
  await page.goto("/en/design/new");
  await page.getByLabel("Name", { exact: true }).fill("Asma");
  await page.reload();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Asma");
});

test("Arabic locale renders structurally RTL while untranslated copy stays LTR", async ({
  page,
}) => {
  await trackTransliteration(page);
  await page.goto("/ar/design/new");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("main.clm-config-page")).toHaveAttribute(
    "dir",
    "rtl",
  );
  // English sentences are isolated so trailing punctuation does not flip.
  await expect(page.locator(".clm-controls")).toHaveAttribute("dir", "ltr");

  await page.goto("/ar");
  await expect(page.locator(".clm-hero-copy")).toHaveAttribute("dir", "ltr");
});

test("mobile controls meet the 44px target and avoid horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/design/new");
  const metrics = await page.evaluate(() => ({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);

  // Scoped to our own shell so the Next.js dev-tools overlay button is not
  // measured. The spelling checkbox is excluded because its target is the
  // surrounding label row, asserted separately below.
  const undersized = await page
    .locator(
      '.clm-site-shell button:visible, .clm-site-shell a:visible, .clm-site-shell input:visible:not([type="checkbox"]), .clm-site-shell summary:visible',
    )
    .evaluateAll((elements) =>
      elements
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width < 44 || rect.height < 44;
        })
        .map((element) => element.textContent?.trim()),
    );
  expect(undersized).toEqual([]);

  const confirmRow = await page
    .locator("label.clm-confirm")
    .evaluate((element) => element.getBoundingClientRect().height);
  expect(confirmRow).toBeGreaterThanOrEqual(44);
});

test("operator versions, publishes, rolls back, and validates prompts without customer-state leakage", async ({
  page,
}, testInfo) => {
  await page.goto("/en/operator");
  await page.getByLabel("Staff email").fill("operator@caleums.test");
  await page.getByLabel("Access phrase").fill("mock-passphrase");
  await page.getByRole("button", { name: /open operator queue/i }).click();
  await page.getByRole("link", { name: "Prompt Library" }).click();
  await expect(page).toHaveURL(/tab=prompts/);
  await expect(
    page.getByRole("heading", { name: "Prompt Library" }),
  ).toBeVisible();
  await expect(page.getByText(/Template variables are valid/)).toBeVisible();

  const editor = page.getByLabel("Template");
  const baseline = await editor.inputValue();
  const layout = await page.evaluate(() => ({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width);
  const undersized = await page
    .locator(
      ".clm-prompt-library button:visible, .clm-prompt-library input:visible, .clm-prompt-library select:visible",
    )
    .evaluateAll((elements) =>
      elements
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width < 44 || rect.height < 44;
        })
        .map((element) => element.textContent?.trim()),
    );
  expect(undersized).toEqual([]);
  await editor.fill(`${baseline} Keep the background warm ivory.`);
  await page.getByLabel("Change note").fill("Warm ivory art direction");
  await page.getByRole("button", { name: "Save as new version" }).click();
  await expect(page.getByText(/Version 2 saved/)).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Publish selected version" }).click();
  await expect(page.getByText("Version 2 is live.")).toBeVisible();

  await editor.fill(`${await editor.inputValue()} Use a centered crop.`);
  await page.getByLabel("Change note").fill("Centered crop direction");
  await page.getByRole("button", { name: "Save as new version" }).click();
  await expect(page.getByText(/Version 3 saved/)).toBeVisible();

  await page.getByRole("button", { name: /v1 Safe initial profile/ }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /Publish v1 as rollback/ }).click();
  await expect(page.getByText(/rollback complete/)).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("prompt-library-rollback.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: "{{approved_name}}" }).click();
  await expect(editor).toBeFocused();

  await page.emulateMedia({ reducedMotion: "reduce" });
  const reducedDuration = await page
    .locator(".clm-prompt-library")
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).transitionDuration),
    );
  expect(reducedDuration).toBeLessThanOrEqual(0.001);

  await editor.fill("{{customer_notes}}");
  await expect(
    page.getByText("Unknown variable: customer_notes."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save as new version" }),
  ).toBeDisabled();

  const promptRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/operator/prompts"))
      promptRequests.push(request.url());
  });
  await page.getByRole("button", { name: /close queue/i }).click();
  await expect(
    page.getByRole("heading", { name: "Operator queue" }),
  ).toBeVisible();
  await page.waitForTimeout(100);
  expect(promptRequests).toEqual([]);
  expect(
    await page.evaluate(() => localStorage.getItem("jewelo-ui-spike:v1")),
  ).not.toContain("prompt_releases");

  await page.goto("/ar/operator");
  await page.getByLabel("Staff email").fill("operator@caleums.test");
  await page.getByLabel("Access phrase").fill("mock-passphrase");
  await page.getByRole("button", { name: /open operator queue/i }).click();
  await page.getByRole("link", { name: "Prompt Library" }).click();
  await expect(page.locator("main.clm-operator")).toHaveAttribute("dir", "rtl");
});
