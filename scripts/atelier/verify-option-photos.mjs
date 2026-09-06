/** Verify the integrated photographic catalogue through the running local app. */
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const requireWeb = createRequire(resolve(root, 'apps/web/package.json'));
const requireVitest = createRequire(requireWeb.resolve('vitest/package.json'));
const { createServer } = await import(requireVitest.resolve('vite'));
const { chromium } = requireWeb('@playwright/test');
const server = await createServer({ root: resolve(root, 'apps/web'), configFile: false, server: { middlewareMode: true } });
const browser = await chromium.launch();
try {
  const { samples, sampleKey } = await server.ssrLoadModule('/src/features/atelier/catalogue.ts');
  const page = await browser.newPage();
  await page.goto('http://localhost:3001/en/design/new');
  const results = [];
  for (let i = 0; i < samples.length; i += 4) {
    results.push(...await page.evaluate(async batch => Promise.all(batch.map(async sample => {
      const image = new Image();
      image.src = sample.src;
      try {
        await image.decode();
        return { id: sample.id, src: sample.src, width: image.naturalWidth, height: image.naturalHeight, pass: image.naturalWidth > 0 && image.naturalHeight > 0 };
      } catch { return { id: sample.id, src: sample.src, pass: false }; }
      finally { image.src = ''; }
    })), samples.slice(i, i + 4).map(({ id, src }) => ({ id, src }))));
  }
  const families = new Map();
  for (const sample of samples) {
    const key = sampleKey(sample.draft, 'Studio');
    if (!families.has(key)) families.set(key, new Set());
    families.get(key).add(sample.view);
  }
  const report = { generatedAt: new Date().toISOString(), photos: results.length, failed: results.filter(r => !r.pass), families: families.size, completeFamilies: [...families.values()].filter(v => v.size === 4).length, results };
  await writeFile(resolve(root, 'docs/proof/responsive-atelier/option-catalogue/browser-asset-decode.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({photos: report.photos, failed: report.failed, families: report.families, completeFamilies: report.completeFamilies}));
  if (report.failed.length) process.exitCode = 1;
} finally { await browser.close(); await server.close(); }
