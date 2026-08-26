import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF ?? "proj_not_configured",
  dirs: ["./src/trigger"],
  maxDuration: 60,
  runtime: "node",
});
