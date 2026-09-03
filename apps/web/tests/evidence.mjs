// Walkthrough evidence capture for goal 09. Run against a mock-mode dev server:
//   node tests/evidence.mjs
// It never submits to a real provider: NEXT_PUBLIC_JEWELO_DATA_MODE=mock, and
// the transliteration route is stubbed in-browser.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const OUT = "../../docs/evidence/2026-09-03-declutter-entry";
const BASE = "http://localhost:3000";

async function stub(page) {
  await page.route("**/api/transliterate", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ arabicText: "أسماء", model: "evidence-stub" }),
    }),
  );
}

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  console.log("captured", name);
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

// Desktop 1440x900
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await stub(page);
  await page.goto(`${BASE}/en/design/new`);
  await page.waitForTimeout(600);
  await shot(page, "desktop-01-empty-single-page");

  await page.getByLabel("Name", { exact: true }).fill("Asma");
  await page.waitForTimeout(400);
  await shot(page, "desktop-02-name-live-preview");

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.getByRole("checkbox", { name: /confirm the spelling/i }).check();
  await page.waitForTimeout(300);
  await shot(page, "desktop-03-estimate-visible-at-approval");

  await page.getByRole("button", { name: "العربية" }).click();
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, "desktop-04-arabic-six-styles");

  await page.getByRole("button", { name: /add a second name/i }).click();
  await page.getByLabel("Second name").fill("Noor");
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: /more layouts/i }).click();
  await page.waitForTimeout(300);
  await shot(page, "desktop-05-two-names-layouts-atelier-notice");

  await page.locator(".clm-details-block > summary").click();
  await page.waitForTimeout(300);
  await shot(page, "desktop-06-details-disclosure-open");

  // Mock-mode generation feedback (no provider call).
  await page.getByRole("button", { name: /remove the second name/i }).click();
  await page.getByRole("button", { name: "English" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Asma");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.getByRole("checkbox", { name: /confirm the spelling/i }).check();
  await page.getByRole("button", { name: /approve revision/i }).click();
  await page.waitForURL(/design\/crafting/);
  await page.waitForTimeout(1500);
  await shot(page, "desktop-07-generation-feedback-honest-states");
  await page.close();
}

// Mobile 390x844
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await stub(page);
  await page.goto(`${BASE}/en/design/new`);
  await page.waitForTimeout(600);
  await shot(page, "mobile-01-empty-single-page");

  await page.getByLabel("Name", { exact: true }).fill("Asma");
  await page.waitForTimeout(400);
  await shot(page, "mobile-02-name-live-preview");

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  await shot(page, "mobile-03-sticky-bar-with-estimate");
  await page.close();
}

// Arabic RTL desktop
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await stub(page);
  await page.goto(`${BASE}/ar`);
  await page.waitForTimeout(700);
  await shot(page, "rtl-01-landing-copy-isolated-ltr");
  await page.goto(`${BASE}/ar/design/new`);
  await page.getByLabel("Name", { exact: true }).fill("Asma");
  await page.getByRole("button", { name: "العربية" }).click();
  await page.waitForTimeout(1300);
  await shot(page, "rtl-02-configurator-mirrored");
  await page.close();
}

await browser.close();
console.log("done");
