import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/en");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("customer and operator complete the mocked order path and resume it", async ({ page }) => {
  const runtimeErrors: string[] = [];
  const forbiddenRequests: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") runtimeErrors.push(message.text()); });
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("request", (request) => {
    if (/convex|openai|anthropic|replicate|stripe|cloudinary|s3|production/i.test(request.url())) forbiddenRequests.push(request.url());
  });
  await page.getByRole("link", { name: /begin designing/i }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByRole("button", { name: /review identity/i }).click();
  await page.getByRole("button", { name: /approve revision/i }).click();
  await expect(page).toHaveURL(/\/studio\/design-1/);
  await page.getByRole("button", { name: /create four directions/i }).click();
  await expect(page.getByText("Canonical identity").filter({ visible: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
  await page.getByRole("button", { name: "Select" }).click();
  await page.getByRole("button", { name: /estimate & quote/i }).click();
  await page.getByRole("button", { name: /calculate estimate/i }).click();
  await expect(page.getByText(/AED 1,950–2,450/)).toBeVisible();
  await page.getByRole("button", { name: /request human quote/i }).click();
  await page.goto("/en/operator");
  await page.getByRole("button", { name: "Switch to operator", exact: true }).click();
  await page.getByRole("button", { name: /issue quote/i }).click();
  await page.getByRole("link", { name: "Open" }).click();
  await page.getByRole("button", { name: /switch to customer view/i }).click();
  await page.getByRole("button", { name: /accept quote/i }).click();
  await page.getByRole("button", { name: /create order/i }).click();
  await expect(page.getByText(/Order design-1-order-1/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/revision and direction locked/i)).toBeVisible();
  await page.goto("/en");
  await expect(page.getByRole("link", { name: /resume design/i })).toHaveAttribute("href", "/en/commerce/design-1");
  expect(runtimeErrors).toEqual([]);
  expect(forbiddenRequests).toEqual([]);
});

test("partial scenario supports one-unit retry", async ({ page }) => {
  await page.getByRole("button", { name: /toggle fixture scenarios/i }).click();
  await page.getByRole("button", { name: "retry-success" }).click();
  await page.getByRole("link", { name: /begin designing/i }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByRole("button", { name: /review identity/i }).click();
  await page.getByRole("button", { name: /approve revision/i }).click();
  await page.getByRole("button", { name: /create four directions/i }).click();
  const retry = page.getByRole("button", { name: /retry product/i }).first();
  await expect(retry).toBeVisible();
  await retry.click();
  await expect(page.getByText(/retry completed without changing sibling tasks/i)).toBeAttached();
});

test("every development scenario stays local and error-free", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "One browser is enough for the deterministic scenario matrix");
  const scenarios = ["happy", "partial", "retry-success", "retry-exhausted", "cancelled", "resume", "quote-expired", "operator-review"];
  const runtimeErrors: string[] = [];
  const forbiddenRequests: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") runtimeErrors.push(message.text()); });
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("request", (request) => {
    if (/convex|openai|anthropic|replicate|stripe|cloudinary|s3|production/i.test(request.url())) forbiddenRequests.push(request.url());
  });
  for (const scenario of scenarios) {
    await page.goto("/en");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole("button", { name: /toggle fixture scenarios/i }).click();
    await page.getByRole("button", { name: scenario, exact: true }).click();
    await page.getByRole("link", { name: /begin designing/i }).click();
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByRole("button", { name: /review identity/i }).click();
    await page.getByRole("button", { name: /approve revision/i }).click();
    await page.getByRole("button", { name: /create four directions/i }).click();
    await expect(page.getByText("Canonical identity").filter({ visible: true })).toBeVisible();
  }
  expect(runtimeErrors).toEqual([]);
  expect(forbiddenRequests).toEqual([]);
});

test("studio exposes keyboard, reduced-motion, zoom, live-region, and motion controls", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Interaction semantics are viewport-independent");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("link", { name: /begin designing/i }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByRole("button", { name: /review identity/i }).click();
  await page.getByRole("button", { name: /approve revision/i }).click();
  await page.getByRole("button", { name: /create four directions/i }).click();
  await expect(page.locator('[aria-live="polite"]')).toContainText(/generation run created/i);
  await expect(page.getByRole("button", { name: "Zoom in" })).toBeVisible();
  await page.getByRole("button", { name: "Zoom in" }).focus();
  await expect(page.getByRole("button", { name: "Zoom in" })).toBeFocused();
  await page.getByRole("button", { name: "Zoom in" }).press("Enter");
  await page.getByRole("button", { name: "Motion" }).click();
  await expect(page.getByRole("button", { name: "Play motion" })).toBeVisible();
  expect(await page.getByRole("button", { name: "Play motion" }).evaluate((element) => Number.parseFloat(getComputedStyle(element).transitionDuration))).toBeLessThanOrEqual(0.001);
});

test("responsive pages have no horizontal document overflow and touch targets are large", async ({ page }) => {
  await page.goto("/en/design/new");
  const metrics = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width);
  const undersized = await page.locator("button:visible, a:visible, input:visible").evaluateAll((elements) => elements.filter((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width < 44 || rect.height < 44;
  }).map((element) => (element.textContent || element.getAttribute("aria-label") || "").trim()));
  expect(undersized).toEqual([]);
});

test("Arabic locale sets structural direction", async ({ page }) => {
  const response = await page.request.get("/ar/design/new");
  expect(await response.text()).toMatch(/<html[^>]*lang="ar"[^>]*dir="rtl"/);
  await page.goto("/ar/design/new");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});

test("invalid design id fails closed", async ({ page }) => {
  await page.goto("/en/studio/unknown");
  await expect(page.getByRole("heading", { name: /design not found/i })).toBeVisible();
});
