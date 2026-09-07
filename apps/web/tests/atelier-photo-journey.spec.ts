import { test, expect, type Page } from "@playwright/test";
import { resolveOptionFamily } from "../src/features/atelier/catalogue";
import { emptyDraft, STORAGE_KEY } from "../src/features/atelier/model";
const path = "/en/design/new";

/**
 * The dev server this suite drives runs in the remote data mode, so confirming
 * the spelling starts a real personalized run. Every test therefore owns its own
 * backend: an anonymous session seeded into the storage key the Supabase client
 * already uses, and stubbed routes for the four endpoints the pipeline touches.
 * Nothing here reaches Supabase, and no test spends anything.
 */
const RUN_ID = "11111111-1111-4111-8111-111111111111";
const DESIGN_ID = "22222222-2222-4222-8222-222222222222";
const OWN_PHOTO = "/atelier/v1/asma-studio.png";

type RunOptions = {
  approve?: { status: number; body: Record<string, unknown> };
  tasks?: Record<string, string>;
  assets?: { view: string; provider?: string }[];
  runStatus?: string;
};

async function stubPipeline(page: Page, options: RunOptions = {}) {
  await page.addInitScript(() => {
    const hour = 60 * 60;
    localStorage.setItem(
      "jewelo:anonymous-session:v1",
      JSON.stringify({
        access_token: "test-anon-token",
        token_type: "bearer",
        expires_in: hour,
        expires_at: Math.floor(Date.now() / 1000) + hour,
        refresh_token: "test-refresh",
        user: { id: "00000000-0000-4000-8000-000000000000", is_anonymous: true },
      }),
    );
  });
  await page.route(/\/auth\/v1\//, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: "test-anon-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "test-refresh",
        user: { id: "00000000-0000-4000-8000-000000000000", is_anonymous: true },
      }),
    }),
  );
  await page.route("**/realtime/v1/**", (route) => route.abort());
  await page.route("**/api/designs/drafts", (route) =>
    route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ id: "draft-1" }) }),
  );
  await page.route("**/api/revisions/approve", (route) =>
    route.fulfill({
      status: options.approve?.status ?? 201,
      contentType: "application/json",
      body: JSON.stringify(
        options.approve?.body ?? {
          approved_design_id: DESIGN_ID,
          revision_id: "33333333-3333-4333-8333-333333333333",
          run_id: RUN_ID,
          dispatchState: "accepted",
          acceptedCount: 4,
          pendingCount: 0,
        },
      ),
    }),
  );
  await page.route("**/api/state**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        role: "customer",
        principalId: "00000000-0000-4000-8000-000000000000",
        generation_runs: [
          { id: RUN_ID, design_id: DESIGN_ID, revision_id: "33333333-3333-4333-8333-333333333333", status: options.runStatus ?? "running" },
        ],
        generation_tasks: Object.entries(
          options.tasks ?? { studio: "queued", on_skin: "queued", close_up: "queued", dark: "queued" },
        ).map(([view, status]) => ({ id: `task-${view}`, run_id: RUN_ID, presentation_view: view, status, attempt: 1 })),
        assets: (options.assets ?? []).map((asset) => ({
          id: `asset-${asset.view}`,
          run_id: RUN_ID,
          presentation_view: asset.view,
          provider: asset.provider ?? "openai",
          signed_url: OWN_PHOTO,
        })),
      }),
    }),
  );
  await page.route("**/api/preview-requests", (route) =>
    route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ id: "44444444-4444-4444-8444-444444444444", status: "new" }),
    }),
  );
}

test.beforeEach(async ({ page }) => {
  await stubPipeline(page);
});
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
  // The rejected Three.js renderer must never come back; the personalized
  // pipeline's own endpoints are the only backend traffic this journey may make.
  const badRequests: string[] = [];
  const backendRequests: string[] = [];
  page.on("request", request => {
    const url = request.url();
    if (/geometry\/|renderer_scene/.test(url)) badRequests.push(url);
    else if (/\/api\//.test(url)) backendRequests.push(new URL(url).pathname);
  });
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
  expect(
    backendRequests.filter(
      (path) =>
        !["/api/designs/drafts", "/api/revisions/approve", "/api/state"].includes(path),
    ),
  ).toEqual([]);
});

test("the customer's own studio photograph becomes the hero and the sample moves to the tile row", async ({ page }) => {
  await stubPipeline(page, {
    tasks: { studio: "ready", on_skin: "blocked", close_up: "blocked", dark: "blocked" },
    assets: [{ view: "studio" }],
    runStatus: "partial",
  });
  await page.goto(path);
  await page.getByLabel("Name on your pendant").fill("Noor");
  await page.getByLabel("Name on your pendant").blur();
  await allReady(page);
  await preview(page);
  await page.getByRole("checkbox", { name: "I confirm the spelling" }).check();
  // The customer's own photograph replaces the illustrated sample.
  await expect(page.locator('[data-caleums-photo="personalized"]').first()).toBeVisible();
  await expect(page.locator(".photoLabel, [class*='photoLabel']").first()).toContainText("Your piece");
  // A run that ends with Studio ready and the dependent views blocked is a
  // partial success, reported per view, never a failed run.
  await expect(page.locator('[data-own-outcome="personalized"]')).toBeVisible();
  await expect(page.locator('p[data-view="Studio"]')).toContainText("Ready");
  await expect(page.locator('p[data-view="Dark"]')).toContainText("Being prepared");
  // The illustrated sample is still reachable, now from the small tile row.
  const sampleTile = page.getByRole("button", { name: "Asma example" });
  await expect(sampleTile).toBeVisible();
  await sampleTile.click();
  await expect(page.locator('img[data-caleums-photo="sample"]').first()).toBeVisible();
  await page.getByRole("button", { name: "Add to bag", exact: true }).click();
  await expect(page.getByRole("dialog", { name: /Your bag/ })).toBeVisible();
  const stored = (await snapshot(page)).bag[0];
  expect(stored.personalized.runId).toBe("11111111-1111-4111-8111-111111111111");
  expect(stored.personalized.assets).toEqual([{ view: "Studio", assetId: "asset-studio" }]);
});

test("a run that cannot start degrades honestly and captures a way to be contacted", async ({ page }) => {
  await stubPipeline(page, {
    approve: { status: 429, body: { error: "daily spend guard exceeded", code: "spend_guard" } },
  });
  await page.goto(path);
  await page.getByLabel("Name on your pendant").fill("Noor");
  await page.getByLabel("Name on your pendant").blur();
  await allReady(page);
  await preview(page);
  await page.getByRole("checkbox", { name: "I confirm the spelling" }).check();
  await expect(
    page.getByText("Your personalized preview is being prepared. We will send it to you."),
  ).toBeVisible();
  // The labelled illustrated sample is still on screen: nothing is claimed.
  await expect(page.locator('img[data-caleums-photo="sample"]').first()).toBeVisible();
  await page.getByRole("button", { name: "WhatsApp", exact: true }).click();
  await page.getByLabel("Number with country code").fill("+971501234567");
  await page.getByRole("button", { name: "Send this to me" }).click();
  await expect(page.getByText("Saved. Our team has your request.")).toBeVisible();
  await expect(page.locator("[data-preview-request-id]")).toContainText("44444444-4444-4444-8444-444444444444");
  await page.getByRole("button", { name: "Add to bag", exact: true }).click();
  await expect(page.getByRole("dialog", { name: /Your bag/ })).toBeVisible();
  expect((await snapshot(page)).bag[0].personalized.previewRequestId).toBe("44444444-4444-4444-8444-444444444444");
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
