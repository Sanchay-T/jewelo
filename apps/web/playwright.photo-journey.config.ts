import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests", testMatch: "atelier-photo-journey.spec.ts", workers: 1,
  timeout: 60000, expect: { timeout: 15000 }, outputDir: "test-results/photo-journey",
  reporter: [["list"]], use: { baseURL: "http://localhost:3001", reducedMotion: "reduce", trace: "retain-on-failure" },
  projects: [320, 390, 768, 1024, 1440].map(width => ({ name: `photo-journey-${width}`, use: { viewport: { width, height: width === 320 ? 568 : 900 } } })),
});
