import { test, expect, type Page } from "@playwright/test";
import { assemblyKey } from "../src/features/atelier/renderer/assembly";
import {
  emptyDraft,
  STORAGE_KEY,
  type Draft,
} from "../src/features/atelier/model";
const path = "/en/design/new";
async function section(page: Page, id: string) {
  const heading = page.locator(`#section-${id} > button`);
  if ((await heading.getAttribute("aria-expanded")) === "false")
    await heading.click();
}
async function rendered(page: Page, draft: Draft) {
  const image = page.locator("img[data-render-key]");
  await expect(image).toHaveAttribute("data-render-key", assemblyKey(draft));
  await expect(image).toBeVisible();
  await expect
    .poll(() =>
      image.evaluate(
        (node: HTMLImageElement) => node.complete && node.naturalWidth > 0,
      ),
    )
    .toBe(true);
  return image;
}
async function imageHash(page: Page) {
  return page
    .locator("img[data-render-key]")
    .evaluate(async (node: HTMLImageElement) => {
      const bytes = await (await fetch(node.src)).arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest))
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("");
    });
}
async function readyViews(page: Page) {
  for (const view of ["Studio", "On skin", "Close-up", "Dark"])
    await expect(
      page.getByRole("button", { name: view, exact: true }),
    ).toHaveAttribute("data-preview-status", "ready");
}
async function preview(page: Page) {
  await page
    .getByRole("button", { name: "Preview my piece", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your piece, in every light." }),
  ).toBeVisible();
  await readyViews(page);
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
async function bagState(page: Page) {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).bag,
    STORAGE_KEY,
  );
}

test("cumulative rendered selections, confirmation, immutable bag snapshot and reload editing", async ({
  page,
}, info) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (
      /\/api\//.test(request.url()) ||
      (/^https?:/.test(request.url()) &&
        new URL(request.url()).hostname !== "localhost")
    )
      requests.push(request.url());
  });
  await page.goto(path);
  const draft: Draft = { ...emptyDraft, name: "Asma" };
  await page.getByLabel("Name on your pendant").fill("Asma");
  await page.getByLabel("Name on your pendant").blur();
  await rendered(page, draft);
  let previousHash = await imageHash(page);
  const sequence: { section: string; label: string; patch: Partial<Draft> }[] =
    [
      {
        section: "style",
        label: "Framed minimal",
        patch: { construction: "Framed minimal" },
      },
      { section: "style", label: "Minimal", patch: { lettering: "Minimal" } },
      { section: "gold", label: "Rose gold", patch: { metal: "Rose gold" } },
      { section: "gold", label: "Accent", patch: { coverage: "Accent" } },
      { section: "gold", label: "Ruby", patch: { gem: "Ruby" } },
      { section: "size", label: "22", patch: { size: 22 } },
      { section: "size", label: "Box", patch: { chain: "Box" } },
    ];
  for (const option of sequence) {
    await section(page, option.section);
    await page.getByRole("button", { name: option.label, exact: true }).click();
    Object.assign(draft, option.patch);
    await rendered(page, draft);
    const hash = await imageHash(page);
    expect(
      hash,
      `${option.label} changes image bytes while preserving earlier assembly options`,
    ).not.toBe(previousHash);
    previousHash = hash;
    await noOverflow(page);
  }
  await readyViews(page);
  for (const view of ["On skin", "Close-up", "Dark", "Studio"]) {
    await page.getByRole("button", { name: view, exact: true }).click();
    await rendered(page, draft);
    await expect(page.locator("img[data-render-key]")).toHaveAttribute(
      "data-sample-id",
      `fixed-${view}`,
    );
  }
  await preview(page);
  await expect(
    page.getByRole("button", { name: "Add to bag", exact: true }),
  ).toBeDisabled();
  await page.getByRole("checkbox", { name: "I confirm the spelling" }).check();
  await page.getByRole("button", { name: "Add to bag", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: /Your bag/ });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByAltText("Saved pendant configuration"),
  ).toBeVisible();
  const saved = (await bagState(page))[0];
  expect(saved.snapshot.persistent).toBe(true);
  expect(saved.snapshot.key).toBe(assemblyKey(draft));
  expect(saved.snapshot.availableViews).toHaveLength(4);
  await page.reload();
  await page.getByRole("button", { name: "Your bag (1)" }).click();
  await expect(
    dialog.getByAltText("Saved pendant configuration"),
  ).toBeVisible();
  expect((await bagState(page))[0].snapshot).toEqual(saved.snapshot);
  await dialog.getByRole("button", { name: "Edit", exact: true }).click();
  await rendered(page, draft);
  await section(page, "gold");
  await page.getByRole("button", { name: "White gold", exact: true }).click();
  draft.metal = "White gold";
  await rendered(page, draft);
  expect((await bagState(page))[0].snapshot).toEqual(saved.snapshot);
  await preview(page);
  await page.getByRole("checkbox", { name: "I confirm the spelling" }).check();
  await page.getByRole("button", { name: "Update piece", exact: true }).click();
  await expect(dialog).toBeVisible();
  const edited = (await bagState(page))[0];
  expect(edited.id).toBe(saved.id);
  expect(edited.snapshot.id).not.toBe(saved.snapshot.id);
  expect(edited.snapshot.key).toBe(assemblyKey(draft));
  await expect(
    dialog.getByRole("button", { name: "Checkout unavailable" }),
  ).toBeDisabled();
  expect(requests).toEqual([]);
  await page.screenshot({ path: info.outputPath("saved-piece.png") });
});

test("a failed review angle preserves other views and a single retry recovers it", async ({
  page,
}) => {
  await page.goto(path + "?preview-test=1");
  const draft: Draft = { ...emptyDraft, name: "Asma" };
  await page.getByLabel("Name on your pendant").fill("Asma");
  await page.getByLabel("Name on your pendant").blur();
  await rendered(page, draft);
  await readyViews(page);
  await page.getByText("Local preview controls", { exact: true }).click();
  await page
    .getByRole("checkbox", { name: "Simulate a failed Dark view" })
    .check();
  await page
    .getByRole("button", { name: "Preview my piece", exact: true })
    .click();
  const dark = page.getByRole("button", { name: "Dark", exact: true });
  await expect(dark).toHaveAttribute("data-preview-status", "failed");
  await page.getByRole("button", { name: "Studio", exact: true }).click();
  await rendered(page, draft);
  const studio = await imageHash(page);
  await dark.click();
  await page.getByRole("button", { name: /^Retry( Dark)?$/ }).click();
  await expect(dark).toHaveAttribute("data-preview-status", "ready");
  await rendered(page, draft);
  await page.getByRole("button", { name: "Studio", exact: true }).click();
  await rendered(page, draft);
  expect(await imageHash(page)).toBe(studio);
  await noOverflow(page);
});

test("rapid changes settle on cumulative selection; keyboard, RTL and reduced motion remain usable", async ({
  page,
}) => {
  await page.goto(path);
  const draft: Draft = { ...emptyDraft, name: "Asma" };
  await page.getByLabel("Name on your pendant").fill("Asma");
  await page.getByLabel("Name on your pendant").blur();
  await rendered(page, draft);
  await section(page, "gold");
  for (const metal of ["Rose gold", "White gold", "Yellow gold", "Rose gold"]) {
    await page.getByRole("button", { name: metal, exact: true }).click();
  }
  draft.metal = "Rose gold";
  await rendered(page, draft);
  await readyViews(page);
  await expect(page.locator("[data-playing]")).toHaveAttribute(
    "data-playing",
    "false",
  );
  const dark = page.getByRole("button", { name: "Dark", exact: true });
  await dark.focus();
  await page.keyboard.press("Enter");
  await expect(dark).toBeFocused();
  await expect(dark).toHaveAttribute("aria-pressed", "true");
  await rendered(page, draft);
  await page.goto("/ar/design/new");
  await expect(page.getByTestId("atelier")).toHaveAttribute("dir", "rtl");
  await section(page, "name");
  await page.getByRole("button", { name: "العربية", exact: true }).click();
  await page.locator("#pendant-name").fill("أسماء");
  await page.locator("#pendant-name").blur();
  draft.script = "Arabic";
  draft.name = "أسماء";
  await rendered(page, draft);
  await noOverflow(page);
  await expect(page.locator("#pendant-name")).toHaveCSS("font-size", "16px");
});

test("real WebGL context loss presents recovery and retry rebuilds the selected piece", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "renderer-1440",
    "Context loss is injected once; responsive selection coverage runs at every width.",
  );
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      ...args: Parameters<typeof original>
    ) {
      const context = original.apply(this, args);
      if (args[0] === "webgl2" && context)
        (
          window as unknown as { rendererTestContext: unknown }
        ).rendererTestContext = context;
      return context;
    } as typeof original;
  });
  await page.goto(path);
  const draft: Draft = { ...emptyDraft, name: "Asma" };
  await page.getByLabel("Name on your pendant").fill("Asma");
  await page.getByLabel("Name on your pendant").blur();
  await rendered(page, draft);
  await readyViews(page);
  await page.evaluate(() => {
    const gl = (
      window as unknown as { rendererTestContext: WebGL2RenderingContext }
    ).rendererTestContext;
    const extension = gl.getExtension("WEBGL_lose_context");
    if (!extension)
      throw new Error("WebGL context-loss injection unavailable.");
    extension.loseContext();
  });
  await expect(
    page.getByText("The piece could not be rendered.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await rendered(page, draft);
  await expect(page.locator("[data-render-status]")).toHaveAttribute(
    "data-render-status",
    "ready",
  );
});

test("selecting the current option and changing only customer text preserve rendered pixels", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "renderer-1440",
    "Nonvisual state invariance is checked once; option interactions run at every width.",
  );
  await page.goto(path);
  const draft: Draft = { ...emptyDraft, name: "Asma" };
  await page.getByLabel("Name on your pendant").fill("Asma");
  await page.getByLabel("Name on your pendant").blur();
  await rendered(page, draft);
  await readyViews(page);
  const hash = await imageHash(page);
  await section(page, "gold");
  await page.getByRole("button", { name: "Yellow gold", exact: true }).click();
  await rendered(page, draft);
  expect(await imageHash(page)).toBe(hash);
  await section(page, "name");
  await page.getByLabel("Name on your pendant").fill("Noor");
  await page.getByLabel("Name on your pendant").blur();
  draft.name = "Noor";
  await rendered(page, draft);
  expect(await imageHash(page)).toBe(hash);
  await expect(page.locator('[aria-label="Your selections"]')).toContainText(
    "Noor",
  );
});

test("short desktop keeps tall Arabic arrangements contained without shrinking the main panel", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "renderer-1440",
    "Focused short-desktop regression uses its own1265×712 viewport.",
  );
  await page.setViewportSize({ width: 1265, height: 712 });
  await page.goto(path);
  const draft: Draft = {
    ...emptyDraft,
    name: "أسماء",
    secondName: "فاطمة",
    script: "Arabic",
    twoNames: true,
  };
  await page.getByRole("button", { name: "Arabic", exact: true }).click();
  await page.getByRole("button", { name: "Two names", exact: true }).click();
  await page.getByLabel("Name on your pendant").fill(draft.name);
  await page.getByLabel("Second name", { exact: true }).fill(draft.secondName);
  await page.getByLabel("Second name", { exact: true }).blur();
  await rendered(page, draft);
  await page.locator("#section-style").scrollIntoViewIfNeeded();
  const panel = page.locator("[data-assembly-key]");
  const baseline = await panel.boundingBox();
  expect(baseline).not.toBeNull();
  for (const layout of ["Stacked", "Interlocked"] as const) {
    await page.getByRole("button", { name: layout, exact: true }).click();
    draft.layout = layout;
    await rendered(page, draft);
    await expect(panel).toHaveAttribute("data-fit", "full");
    await expect(page.locator("img[data-render-key]")).toHaveCSS(
      "object-fit",
      "contain",
    );
    const bounds = await page
      .locator("img[data-render-key]")
      .evaluate((image: HTMLImageElement) => {
        const box = image.getBoundingClientRect();
        const parent = image.parentElement!.getBoundingClientRect();
        const scale = Math.min(
          box.width / image.naturalWidth,
          box.height / image.naturalHeight,
        );
        const width = image.naturalWidth * scale,
          height = image.naturalHeight * scale;
        return {
          left: box.left + (box.width - width) / 2,
          top: box.top + (box.height - height) / 2,
          right: box.left + (box.width + width) / 2,
          bottom: box.top + (box.height + height) / 2,
          parent: {
            left: parent.left,
            top: parent.top,
            right: parent.right,
            bottom: parent.bottom,
            width: parent.width,
            height: parent.height,
          },
        };
      });
    expect(bounds.left).toBeGreaterThanOrEqual(bounds.parent.left - 1);
    expect(bounds.right).toBeLessThanOrEqual(bounds.parent.right + 1);
    expect(bounds.top).toBeGreaterThanOrEqual(bounds.parent.top - 1);
    expect(bounds.bottom).toBeLessThanOrEqual(bounds.parent.bottom + 1);
    expect(Math.abs(bounds.parent.width - baseline!.width)).toBeLessThanOrEqual(
      1,
    );
    expect(
      Math.abs(bounds.parent.height - baseline!.height),
    ).toBeLessThanOrEqual(1);
    await page.getByRole("button", { name: "White gold", exact: true }).click();
    draft.metal = "White gold";
    await rendered(page, draft);
    const visible = await panel.boundingBox();
    expect(visible!.y).toBeGreaterThanOrEqual(0);
    expect(visible!.y + visible!.height).toBeLessThanOrEqual(712);
    await noOverflow(page);
    await page.screenshot({
      path: info.outputPath(`arabic-${layout.toLowerCase()}-1265.png`),
    });
  }
});
