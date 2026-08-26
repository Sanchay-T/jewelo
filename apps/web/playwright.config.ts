import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3200",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "tablet-landscape",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1024, height: 768 },
      },
    },
    {
      name: "tablet",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 834, height: 1112 },
      },
    },
    {
      name: "phone",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "short-phone",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 360, height: 640 },
      },
    },
  ],
  webServer: {
    command:
      "NEXT_PUBLIC_JEWELO_SCENARIOS=1 pnpm dev --hostname 127.0.0.1 --port 3200",
    url: "http://127.0.0.1:3200/en",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
