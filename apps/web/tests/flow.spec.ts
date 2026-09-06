import { expect, test } from "@playwright/test";

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
