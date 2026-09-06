import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: ["atelier-options.spec.ts", "atelier-photo-journey.spec.ts", "atelier-photographs.spec.ts"],
  workers: 1,
  timeout: 90000,
  expect: { timeout: 15000 },
  outputDir: "test-results/customer",
  use: { baseURL: "http://localhost:3001", reducedMotion: "reduce", trace: "retain-on-failure" },
  projects: [320, 390, 768, 1024, 1440].map(width => ({
    name: `customer-${width}`,
    use: { viewport: { width, height: width === 320 ? 568 : 900 } },
  })),
});
