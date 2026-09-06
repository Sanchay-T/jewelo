/** Actual WebGL proof of the production renderer, isolated from customer/browser state.
 * node scripts/atelier/render-sweep.mjs; optional SWEEP_LIMIT and SWEEP_WIDTH.
 */
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(resolve(root, "package.json"));
const webRequire = createRequire(resolve(root, "apps/web/package.json"));
const { chromium } = webRequire("@playwright/test");
const { createServer } = await import(
  pathToFileURL(
    require.resolve("vite", {
      paths: [dirname(require.resolve("vitest/package.json"))],
    }),
  ).href
);
const mode = process.env.SWEEP_MODE || "base";
const output = resolve(
  root,
  `docs/proof/responsive-atelier/${mode === "materials" ? "material-sweep" : mode === "density" ? "stone-density-pilot" : "renderer-sweep"}`,
);
await mkdir(output, { recursive: true });
const port = mode === "materials" ? 3345 : mode === "density" ? 3347 : 3344,
  width = Number(process.env.SWEEP_WIDTH || 384),
  limit = Number(
    process.env.SWEEP_LIMIT ||
      (mode === "materials" ? 306 : mode === "density" ? 2 : 288),
  );
const server = await createServer({
  root: resolve(root, "apps/web"),
  configFile: false,
  server: { port, strictPort: true, host: "127.0.0.1" },
  plugins: [
    {
      name: "renderer-proof",
      configureServer(server) {
        server.middlewares.use("/__renderer-sweep", (_req, res) => {
          res.setHeader("Content-Type", "text/html");
          res.end(
            "<!doctype html><title>Renderer proof</title><canvas id='piece'></canvas>",
          );
        });
      },
    },
  ],
});
await server.listen();
const browser = await chromium.launch({
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.route("**/*", (route) => {
  const url = new URL(route.request().url());
  return ["127.0.0.1", "localhost"].includes(url.hostname)
    ? route.continue()
    : route.abort();
});
const started = new Date().toISOString(),
  results = [];
try {
  await page.goto(`http://127.0.0.1:${port}/__renderer-sweep`);
  await page.evaluate(async () => {
    const [{ createRenderer }, model, { assemblyKey }] = await Promise.all([
      import("/src/features/atelier/renderer/scene.ts"),
      import("/src/features/atelier/model.ts"),
      import("/src/features/atelier/renderer/assembly.ts"),
    ]);
    window.proof = {
      renderer: await createRenderer(document.querySelector("canvas")),
      model,
      assemblyKey,
    };
  });
  const cases = await page.evaluate((mode) => {
    const { model } = window.proof,
      out = [];
    for (const script of ["English", "Arabic"])
      for (const construction of model.constructions)
        for (const lettering of model.letters)
          for (const layout of [null, ...model.layouts])
            out.push({
              ...model.emptyDraft,
              name: "Asma",
              secondName: "Fatima",
              script,
              construction,
              lettering,
              twoNames: layout !== null,
              layout: layout || "Connected heart",
            });
    if (mode === "density")
      return [
        {
          ...model.emptyDraft,
          name: "Asma",
          coverage: "Full pavé",
          gem: "Ruby",
        },
        {
          ...model.emptyDraft,
          name: "Asma",
          script: "Arabic",
          coverage: "Full pavé",
          gem: "Emerald",
        },
      ];
    if (mode === "materials") {
      const variants = [];
      for (const base of out.filter((d) => !d.twoNames))
        for (const [coverage, gem] of [
          ["No stones", "Lab diamond"],
          ["Accent", "Lab diamond"],
          ["Partial pavé", "Lab diamond"],
          ["Full pavé", "Lab diamond"],
          ["Full pavé", "Ruby"],
          ["Full pavé", "Emerald"],
        ])
          variants.push({ ...base, coverage, gem });
      for (const metal of model.metals)
        for (const chain of model.chains)
          variants.push({
            ...model.emptyDraft,
            name: "Asma",
            metal,
            chain,
            coverage: "Full pavé",
            gem: "Ruby",
          });
      for (const gem of model.gems)
        variants.push({
          ...model.emptyDraft,
          name: "Asma",
          coverage: "Full pavé",
          gem,
        });
      return variants;
    }
    return out;
  }, mode);
  for (const [index, draft] of cases.slice(0, limit).entries()) {
    const start = Date.now();
    const result = await page.evaluate(
      async ({ draft, width, mode }) => {
        const { renderer, assemblyKey } = window.proof;
        try {
          await renderer.apply(draft);
          const views = [];
          for (const view of mode === "materials"
            ? ["Studio"]
            : mode === "density"
              ? ["Studio", "Close-up"]
              : ["Studio", "On skin", "Close-up", "Dark"]) {
            const blob = await renderer.capture(view, width);
            const data = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            if (blob.size < 1000) throw new Error(`Empty capture: ${view}`);
            views.push({ view, bytes: blob.size, data });
          }
          return {
            key: assemblyKey(draft),
            views,
            metrics: renderer.inspect?.(),
          };
        } catch (error) {
          return { error: String(error) };
        }
      },
      { draft, width, mode },
    );
    const entry = {
      index,
      draft,
      elapsedMs: Date.now() - start,
      key: result.key,
      error: result.error,
      metrics: result.metrics,
      views: [],
    };
    for (const [viewIndex, image] of (result.views || []).entries()) {
      const file = `${String(index).padStart(3, "0")}-${viewIndex}.png`;
      await writeFile(
        resolve(output, file),
        Buffer.from(image.data.split(",")[1], "base64"),
      );
      entry.views.push({
        view: image.view,
        file,
        bytes: image.bytes,
        sha256: createHash("sha256")
          .update(Buffer.from(image.data.split(",")[1], "base64"))
          .digest("hex"),
      });
    }
    results.push(entry);
    if (index % 12 === 0 || index === Math.min(limit, cases.length) - 1) {
      await writeFile(
        resolve(output, "report.json"),
        JSON.stringify(
          {
            started,
            updated: new Date().toISOString(),
            requested: Math.min(limit, cases.length),
            completed: results.length,
            captured: results.reduce((n, r) => n + r.views.length, 0),
            errors,
            results,
          },
          null,
          2,
        ),
      );
      console.log(
        `Rendered ${index + 1}/${Math.min(limit, cases.length)} assemblies, ${(index + 1) * (mode === "materials" ? 1 : 4)} requested camera frames`,
      );
    }
  }
  if (mode === "materials") {
    const checks = [];
    for (let i = 0; i < Math.min(288, results.length); i += 6) {
      const batch = results.slice(i, i + 6),
        counts = batch.map((r) => r.metrics?.stoneCount ?? -1),
        hashes = batch.map((r) => r.views[0]?.sha256);
      checks.push({
        index: i,
        identity: batch[0]?.draft,
        counts,
        nested:
          counts[0] === 0 &&
          counts[1] > 0 &&
          counts[2] > counts[1] &&
          counts[3] > counts[2] &&
          counts[4] === counts[3] &&
          counts[5] === counts[3],
        distinctPixels: new Set(hashes).size === 6,
      });
    }
    await writeFile(
      resolve(output, "stone-checks.json"),
      JSON.stringify(checks, null, 2),
    );
    if (checks.some((c) => !c.nested || !c.distinctPixels))
      process.exitCode = 1;
    if (results.length >= 306) {
      const gems = results.slice(300, 306),
        hashes = gems.map((r) => r.views[0]?.sha256);
      const check = {
        gems: gems.map((r) => r.draft.gem),
        sameDiamondAppearance: hashes[0] === hashes[1],
        distinctGemAppearances:
          new Set([hashes[0], ...hashes.slice(2)]).size === 5,
      };
      await writeFile(
        resolve(output, "gem-checks.json"),
        JSON.stringify(check, null, 2),
      );
      if (!check.sameDiamondAppearance || !check.distinctGemAppearances)
        process.exitCode = 1;
    }
  }
  // Four sheets each show representative cases across both scripts and every style.
  for (let sheet = 0; sheet < 4; sheet++) {
    const selected =
      mode === "materials"
        ? results.slice(sheet * 72, (sheet + 1) * 72)
        : results.filter(
            (r) => Math.floor(r.index / 36) % 4 === sheet && r.index % 6 === 0,
          );
    const html =
      `<!doctype html><style>body{margin:20px;background:#ede8de;font:13px sans-serif}h1{font:24px Georgia}.row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:18px}img{width:100%;display:block}p{margin:4px 0 8px}figure{margin:0}</style><h1>Fixed renderer — construction ${sheet + 1}</h1>` +
      selected
        .map(
          (r) =>
            `<p>${r.draft.script} · ${r.draft.construction} · ${r.draft.lettering}</p><div class="row">${r.views.map((v) => `<figure><img src="http://127.0.0.1:${port}/@fs/${resolve(output, v.file)}"><figcaption>${v.view}</figcaption></figure>`).join("")}</div>`,
        )
        .join("");
    await page.setContent(html);
    await page
      .locator("img")
      .evaluateAll((imgs) => Promise.all(imgs.map((i) => i.decode())));
    await page.screenshot({
      path: resolve(output, `contact-${sheet + 1}.png`),
      fullPage: true,
    });
  }
  if (results.some((r) => r.error) || errors.length) process.exitCode = 1;
} finally {
  await browser.close();
  await server.close();
}
