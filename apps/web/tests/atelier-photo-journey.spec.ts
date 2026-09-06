import { test, expect, type Page } from "@playwright/test";
import { resolveOptionFamily } from "../src/features/atelier/catalogue";
import { emptyDraft, STORAGE_KEY } from "../src/features/atelier/model";
const path = "/en/design/new";
async function ready(page: Page, view = "Studio") {
  await expect(page.getByRole("button", { name: view, exact: true })).toHaveAttribute("data-preview-status", "ready");
}
async function allReady(page: Page) { for (const view of ["Studio", "On skin", "Close-up", "Dark"]) await ready(page, view); }
async function snapshot(page: Page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY); }
async function preview(page: Page) {
  await page.getByRole("button", { name: "Preview my piece", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your piece, in every light." })).toBeVisible();
  await allReady(page);
}

test("photo review confirms customer spelling and persists immutable bag edits across reload", async ({ page }) => {
  const badRequests: string[] = [];
  page.on("request", request => { if (/\/api\/|geometry\/|renderer_scene/.test(request.url())) badRequests.push(request.url()); });
  await page.goto(path);
  await page.getByLabel("Name on your pendant").fill("Noor");
  await page.getByLabel("Name on your pendant").blur();
  await allReady(page);
  await preview(page);
  await expect(page.getByRole("button", { name: "Add to bag", exact: true })).toBeDisabled();
  await page.getByRole("checkbox", { name: "I confirm the spelling" }).check();
  await page.getByRole("button", { name: "Add to bag", exact: true }).click();
  const bag = page.getByRole("dialog", { name: /Your bag/ });
  await expect(bag).toBeVisible();
  await expect(bag.getByAltText("Saved pendant configuration")).toBeVisible();
  const original = (await snapshot(page)).bag[0];
  expect(original.draft.name).toBe("Noor");
  expect(original.snapshot.persistent).toBe(true);
  expect(original.snapshot.rendererVersion).toBe("photographic-v1");
  await page.reload();
  await page.getByRole("button", { name: "Your bag (1)" }).click();
  await expect(bag.getByAltText("Saved pendant configuration")).toBeVisible();
  expect((await snapshot(page)).bag[0].snapshot).toEqual(original.snapshot);
  await bag.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Name on your pendant").fill("Maya");
  await page.getByLabel("Name on your pendant").blur();
  await page.getByRole("button", { name: "Cancel editing" }).click();
  expect((await snapshot(page)).bag[0].draft.name).toBe("Noor");
  await page.getByRole("button", { name: "Your bag (1)" }).click();
  await bag.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Name on your pendant").fill("Maya");
  await page.getByLabel("Name on your pendant").blur();
  await preview(page);
  await page.getByRole("checkbox", { name: "I confirm the spelling" }).check();
  await page.getByRole("button", { name: "Update piece", exact: true }).click();
  await expect(bag).toBeVisible();
  const updated = (await snapshot(page)).bag[0];
  expect(updated.id).toBe(original.id);
  expect(updated.draft.name).toBe("Maya");
  expect(updated.snapshot.id).not.toBe(original.snapshot.id);
  await expect(bag.getByRole("button", { name: "Checkout unavailable" })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(badRequests).toEqual([]);
});

test("individual retry does not cancel a different angle still loading", async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let failDark = true;
  await page.route("**/atelier/v1/asma-worn.png", async route => { await held; await route.continue(); });
  await page.route("**/atelier/v1/asma-dark.png", async route => { if (failDark) { failDark = false; await route.abort(); } else await route.continue(); });
  try {
    await page.goto(path);
    await ready(page);
    await expect(page.locator("img[data-sample-id]")).toHaveAttribute("src", "/atelier/v1/asma-studio.png");
    const dark = page.getByRole("button", { name: "Dark", exact: true });
    await expect(dark).toHaveAttribute("data-preview-status", "failed");
    await dark.click();
    await page.getByRole("button", { name: /^Retry( Dark)?$/ }).click();
    await ready(page, "Dark");
    release();
    await allReady(page);
    await page.getByRole("button", { name: "On skin", exact: true }).click();
    await expect(page.locator("img[data-sample-id]")).toHaveAttribute("src", "/atelier/v1/asma-worn.png");
  } finally { release(); }
});

test("failed review angle preserves siblings and one retry restores the bag flow", async ({ page }) => {
  await page.goto(path + "?preview-test=1");
  await page.getByLabel("Name on your pendant").fill("Sara");
  await page.getByLabel("Name on your pendant").blur();
  await allReady(page);
  await page.getByText("Local preview controls", { exact: true }).click();
  await page.getByRole("checkbox", { name: "Simulate a failed Dark view" }).check();
  await page.getByRole("button", { name: "Preview my piece", exact: true }).click();
  await expect(page.getByRole("button", { name: "Dark", exact: true })).toHaveAttribute("data-preview-status", "failed");
  await ready(page);
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await page.getByRole("button", { name: /^Retry( Dark)?$/ }).click();
  await allReady(page);
  await page.getByRole("checkbox", { name: "I confirm the spelling" }).check();
  await page.getByRole("button", { name: "Add to bag", exact: true }).click();
  await expect(page.getByRole("dialog", { name: /Your bag/ })).toBeVisible();
  expect((await snapshot(page)).bag[0].snapshot.availableViews).toHaveLength(4);
});

test("a previous photo remains visible while the newly selected family loads", async ({ page }) => {
  await page.goto(path);
  await allReady(page);
  const newFamily = resolveOptionFamily({ ...emptyDraft, construction: "Framed minimal" }, "construction");
  const paths = new Set(newFamily.assets.map(asset => asset.src));
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/atelier/**", async route => {
    if (paths.has(new URL(route.request().url()).pathname)) await held;
    await route.continue();
  });
  try {
    const style = page.locator("#section-style > button");
    if (await style.getAttribute("aria-expanded") === "false") await style.click();
    await page.getByRole("button", { name: "Framed minimal", exact: true }).click();
    await expect(page.getByAltText(/Previous illustrative Studio photo/)).toBeVisible();
    await expect(page.getByAltText(/Previous illustrative Studio photo/)).toHaveAttribute("src", "/atelier/v1/asma-studio.png");
    await expect(page.locator("[data-render-status]")).toHaveAttribute("data-render-status", "pending");
    release();
    await ready(page);
    await expect(page.locator("img[data-sample-id]")).toHaveAttribute("src", newFamily.anchor.asset.src);
    await expect(page.getByAltText(/Previous illustrative Studio photo/)).toHaveCount(0);
  } finally { release(); }
});

test("photo navigation supports keyboard, RTL, reduced motion and short viewport inputs", async ({ page }) => {
  await page.goto(path);
  await allReady(page);
  const dark = page.getByRole("button", { name: "Dark", exact: true });
  await dark.focus();
  await page.keyboard.press("Enter");
  await expect(dark).toBeFocused();
  await expect(dark).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-playing]")).toHaveAttribute("data-playing", "false");
  await page.setViewportSize({ width: 390, height: 500 });
  await page.getByLabel("Name on your pendant").fill("Noor");
  await expect(page.getByLabel("Name on your pendant")).toBeFocused();
  await expect(page.getByLabel("Name on your pendant")).toHaveCSS("font-size", "16px");
  const bounds = await page.getByLabel("Name on your pendant").boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(500);
  await page.getByLabel("Name on your pendant").blur();
  await page.goto("/ar/design/new");
  await expect(page.getByTestId("atelier")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("#pendant-name")).toHaveValue("Noor");
  await page.getByRole("button", { name: "خلفية داكنة", exact: true }).click();
  await expect(page.locator("img[data-sample-id]")).toHaveAttribute("src", "/atelier/v1/asma-dark.png");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
