import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "atelier-renderer.spec.ts",
  outputDir: "./test-results/atelier-renderer",
  reporter: [["list"]],
  workers: 1,
  timeout: 180000,
  expect: { timeout: 30000 },
  use: {
    baseURL: "http://localhost:3001",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    reducedMotion: "reduce",
    launchOptions: {
      args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    },
  },
  projects: [320, 390, 768, 1024, 1440].map((width) => ({
    name: `renderer-${width}`,
    use: {
      viewport: { width, height: width === 320 ? 568 : 900 },
      hasTouch: width < 1100,
      isMobile: width < 768,
    },
  })),
});
