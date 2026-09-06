import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "atelier.spec.ts",
  outputDir: "./test-results/atelier",
  reporter: [["list"]],
  workers: 2,
  use: {
    baseURL: "http://localhost:3001",

    trace: "retain-on-failure",
  },
  projects: [320, 390, 768, 1024, 1440].map((width) => ({
    name: `atelier-${width}`,
    use: {
      viewport: { width, height: width === 320 ? 568 : 900 },
      hasTouch: width < 1100,
      isMobile: width < 768,
    },
  })),
});
