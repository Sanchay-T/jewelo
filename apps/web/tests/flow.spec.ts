import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/en");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("guest completes inspiration, customization, review, and approval", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.getByRole("link", { name: /begin designing/i }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByRole("button", { name: /review identity/i }).click();
  await expect(page.getByText("Layla", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /approve revision/i }).click();
  await expect(
    page.getByRole("heading", { name: /crafting directions/i }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/en\/design\/crafting\?designId=design-1/);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("jewelo-ui-spike:v1") ?? "{}").designs
          ?.length,
    ),
  ).toBe(1);
  expect(errors).toEqual([]);
});

test("reference upload is a real local file selection", async ({ page }) => {
  await page.getByRole("link", { name: /begin designing/i }).click();
  await page.getByRole("button", { name: /upload a reference/i }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "reference.png",
    mimeType: "image/png",
    buffer: Buffer.from("fixture"),
  });
  await expect(page.getByText("reference.png")).toBeVisible();
  await expect(page.getByRole("button", { name: /continue/i })).toBeEnabled();
});

test("Arabic locale renders structurally RTL", async ({ page }) => {
  await page.goto("/ar/design/new");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
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
  const undersized = await page
    .locator("button:visible, a:visible, input:visible")
    .evaluateAll((elements) =>
      elements
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width < 44 || rect.height < 44;
        })
        .map((element) => element.textContent?.trim()),
    );
  expect(undersized).toEqual([]);
});
