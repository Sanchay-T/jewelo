/** Render legible comparison sheets from actual sweep captures (no image alteration). */
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, writeFile } from "node:fs/promises";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const { chromium } = createRequire(resolve(root, "apps/web/package.json"))(
  "@playwright/test",
);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 900 },
  });
  for (const name of process.env.SWEEP_MODE === "base"
    ? ["renderer-sweep"]
    : ["renderer-sweep", "material-sweep"]) {
    const dir = resolve(root, "docs/proof/responsive-atelier", name),
      report = JSON.parse(await readFile(resolve(dir, "report.json"), "utf8"));
    const material = name === "material-sweep";
    for (let construction = 0; construction < 4; construction++) {
      const rows = [];
      if (material) {
        for (let script = 0; script < 2; script++)
          for (let lettering = 0; lettering < 6; lettering++) {
            const at = script * 144 + construction * 36 + lettering * 6;
            rows.push(report.results.slice(at, at + 6));
          }
      } else
        for (let script = 0; script < 2; script++)
          for (let lettering = 0; lettering < 6; lettering++) {
            const at =
              script * 144 + construction * 36 + lettering * 6 + lettering;
            rows.push([report.results[at]].filter(Boolean));
          }
      let html = `<!doctype html><style>body{margin:20px;background:#eee8de;color:#292019;font:13px sans-serif}h1{font:26px Georgia;margin:0 0 20px}.row{display:grid;grid-template-columns:repeat(${material ? 6 : 4},1fr);gap:8px;margin-bottom:18px}img{display:block;width:100%}p{margin:8px 0}figure{margin:0}figcaption{margin:5px 0}</style><h1>${material ? "Stone coverage and colour" : "Shared geometry across cameras"} — construction ${construction + 1}</h1>`;
      for (const row of rows) {
        const first = row[0];
        if (!first) continue;
        html += `<p>${first.draft.script} · ${first.draft.lettering} · ${first.draft.construction}${first.draft.twoNames ? " · " + first.draft.layout : " · One name"}</p><div class="row">`;
        for (const entry of row)
          for (const image of entry.views) {
            const data = await readFile(resolve(dir, image.file));
            html += `<figure><img src="data:image/png;base64,${data.toString("base64")}"><figcaption>${material ? entry.draft.coverage + " · " + entry.draft.gem : image.view}</figcaption></figure>`;
          }
        html += "</div>";
      }
      await page.setContent(html);
      await page
        .locator("img")
        .evaluateAll((imgs) => Promise.all(imgs.map((i) => i.decode())));
      await page.screenshot({
        path: resolve(dir, `contact-${construction + 1}.png`),
        fullPage: true,
      });
      await writeFile(resolve(dir, `contact-${construction + 1}.html`), html);
    }
    if (material && report.results.length >= 306) {
      const groups = [
        {
          title: "Six gemstone options",
          items: report.results.slice(300, 306),
          columns: 6,
        },
        {
          title: "Three metals × four chains",
          items: report.results.slice(288, 300),
          columns: 4,
        },
      ];
      for (const group of groups) {
        let html = `<!doctype html><style>body{margin:20px;background:#eee8de;color:#292019;font:14px sans-serif}h1{font:26px Georgia}.grid{display:grid;grid-template-columns:repeat(${group.columns},1fr);gap:12px}img{width:100%}figure{margin:0}</style><h1>${group.title}</h1><div class="grid">`;
        for (const entry of group.items) {
          const image = entry.views[0],
            data = await readFile(resolve(dir, image.file));
          html += `<figure><img src="data:image/png;base64,${data.toString("base64")}"><figcaption>${group.columns === 6 ? entry.draft.gem : entry.draft.metal + " · " + entry.draft.chain}</figcaption></figure>`;
        }
        html += "</div>";
        await page.setContent(html);
        await page
          .locator("img")
          .evaluateAll((imgs) => Promise.all(imgs.map((i) => i.decode())));
        await page.screenshot({
          path: resolve(
            dir,
            group.columns === 6 ? "gem-options.png" : "metal-chain-options.png",
          ),
          fullPage: true,
        });
      }
    }
  }
} finally {
  await browser.close();
}
