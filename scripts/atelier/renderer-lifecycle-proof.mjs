import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
const root = process.cwd(),
  { chromium } = createRequire(resolve(root, "apps/web/package.json"))(
    "@playwright/test",
  );
const require = createRequire(resolve(root, "package.json"));
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
  server: { port: 3346, strictPort: true, host: "127.0.0.1" },
  plugins: [
    {
      name: "lifecycle-proof",
      configureServer(server) {
        server.middlewares.use("/__renderer-sweep", (_req, res) => {
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
  await page.goto("http://127.0.0.1:3346/__renderer-sweep");
  const result = await page.evaluate(async () => {
    const [{ createRenderer }, { emptyDraft }] = await Promise.all([
      import("/src/features/atelier/renderer/scene.ts"),
      import("/src/features/atelier/model.ts"),
    ]);
    const engine = await createRenderer(document.querySelector("canvas"));
    await engine.apply(emptyDraft);
    const first = engine.inspect();
    await engine.apply({
      ...emptyDraft,
      name: "Different customer",
      engraving: "Gift",
    });
    const second = engine.inspect();
    const sameIdentity =
      !!first.assemblyId && first.assemblyId === second.assemblyId;
    const results = await Promise.allSettled([
      engine.apply({ ...emptyDraft, metal: "Rose gold" }),
      engine.apply({ ...emptyDraft, metal: "White gold" }),
    ]);
    const latestWon = JSON.parse(engine.inspect().key).metal === "White gold";
    const staleRejected =
      results[0].status === "rejected" &&
      results[0].reason.name === "AbortError" &&
      results[1].status === "fulfilled";
    const blob = await engine.capture("Studio", 256);
    const validCapture = blob.type === "image/png" && blob.size > 1000;
    const pending = engine.apply({
      ...emptyDraft,
      construction: "Framed minimal",
    });
    engine.dispose();
    let disposeRejected = false;
    try {
      await pending;
    } catch (error) {
      disposeRejected = error.name === "AbortError";
    }
    return {
      sameIdentity,
      latestWon,
      staleRejected,
      validCapture,
      disposeRejected,
    };
  });
  const dir = resolve(root, "docs/proof/responsive-atelier/renderer-sweep");
  await mkdir(dir, { recursive: true });
  await writeFile(
    resolve(dir, "lifecycle.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(result);
  if (Object.values(result).some((x) => !x)) process.exitCode = 1;
} finally {
  await browser.close();
  await server.close();
}
