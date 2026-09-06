import { test, expect } from "@playwright/test";
test("original photos have correct views and preserve selections", async ({ page }, info) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/en/design/new");
  const image = page.locator("img[data-sample-id]");
  const files = { Studio: "studio", "On skin": "worn", "Close-up": "close", Dark: "dark" };
  for (const [view, file] of Object.entries(files)) {
    await page.getByRole("button", { name: view, exact: true }).click();
    await expect(image).toHaveAttribute("src", `/atelier/v1/asma-${file}.png`);
    await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
    await expect(image).toHaveAttribute("data-sample-exact", "true");
    if (info.project.name === "photo-1440") await page.screenshot({ path: `/tmp/caleums-restored-${file}.png` });
  }
  await page.getByLabel("Name on your pendant").fill("Maya");
  await page.getByLabel("Name on your pendant").blur();
  await page.getByRole("button", { name: "Preview my piece", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your piece, in every light." })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "01 Design" }).click();
  await expect(page.getByLabel("Name on your pendant")).toHaveValue("Maya");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(requests.filter((url) => /\/api\/|geometry|renderer_scene/.test(url))).toEqual([]);
});
