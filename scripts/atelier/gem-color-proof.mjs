/** Refresh only the six gemstone cases in the final material proof. */
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { readFile, writeFile, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = process.cwd(),
  require = createRequire(resolve(root, "package.json"));
const { chromium } = createRequire(resolve(root, "apps/web/package.json"))(
  "@playwright/test",
);
const { createServer } = await import(
  pathToFileURL(
    require.resolve("vite", {
      paths: [dirname(require.resolve("vitest/package.json"))],
    }),
  ).href
);
const server = await createServer({
  root: resolve(root, "apps/web"),
  configFile: false,
  server: { port: 3348, strictPort: true, host: "127.0.0.1" },
  plugins: [
    {
      name: "gem-proof",
      configureServer(server) {
        server.middlewares.use("/__gem-proof", (_req, res) => {
          res.setHeader("Content-Type", "text/html");
          res.end("<!doctype html><canvas></canvas>");
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
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:3348/__gem-proof");
  const result = await page.evaluate(async () => {
    const [{ createRenderer }, model, { assemblyKey }] = await Promise.all([
      import("/src/features/atelier/renderer/scene.ts"),
      import("/src/features/atelier/model.ts"),
      import("/src/features/atelier/renderer/assembly.ts"),
    ]);
    const renderer = await createRenderer(document.querySelector("canvas")),
      rows = [];
    for (const gem of model.gems) {
      const draft = {
          ...model.emptyDraft,
          name: "Asma",
          coverage: "Full pavé",
          gem,
        },
        start = performance.now();
      await renderer.apply(draft);
      const blob = await renderer.capture("Studio", 384);
      const data = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
      rows.push({
        draft,
        key: assemblyKey(draft),
        metrics: renderer.inspect(),
        elapsedMs: performance.now() - start,
        data,
        bytes: blob.size,
      });
    }
    renderer.dispose();
    return rows;
  });
  const dir = resolve(root, "docs/proof/responsive-atelier/material-sweep"),
    report = JSON.parse(await readFile(resolve(dir, "report.json"), "utf8"));
  await copyFile(
    resolve(dir, "305-0.png"),
    resolve(dir, "305-pink-initial-pale.png"),
  );
  for (let i = 0; i < result.length; i++) {
    const row = result[i],
      index = 300 + i,
      file = `${index}-0.png`,
      bytes = Buffer.from(row.data.split(",")[1], "base64");
    await writeFile(resolve(dir, file), bytes);
    report.results[index] = {
      index,
      draft: row.draft,
      key: row.key,
      metrics: row.metrics,
      elapsedMs: row.elapsedMs,
      views: [
        {
          view: "Studio",
          file,
          bytes: row.bytes,
          sha256: createHash("sha256").update(bytes).digest("hex"),
        },
      ],
    };
  }
  report.gemComparisonUpdated = new Date().toISOString();
  await writeFile(resolve(dir, "report.json"), JSON.stringify(report, null, 2));
  const rows = report.results.slice(300, 306),
    hashes = rows.map((r) => r.views[0].sha256),
    check = {
      gems: rows.map((r) => r.draft.gem),
      sameDiamondAppearance: hashes[0] === hashes[1],
      distinctGemAppearances:
        new Set([hashes[0], ...hashes.slice(2)]).size === 5,
    };
  await writeFile(
    resolve(dir, "gem-checks.json"),
    JSON.stringify(check, null, 2),
  );
  const summary = JSON.parse(
    await readFile(resolve(dir, "summary.json"), "utf8"),
  );
  summary.gemChecks = check;
  await writeFile(
    resolve(dir, "summary.json"),
    JSON.stringify(summary, null, 2),
  );
  console.log(check);
  if (!check.sameDiamondAppearance || !check.distinctGemAppearances)
    process.exitCode = 1;
} finally {
  await browser.close();
  await server.close();
}
