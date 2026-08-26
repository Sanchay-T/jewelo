import { defineConfig } from "@trigger.dev/sdk";
import { parseTriggerConfigEnv } from "@jewelo/config";

const environment = parseTriggerConfigEnv(process.env);

export default defineConfig({
  project: environment.TRIGGER_PROJECT_REF,
  dirs: ["./src/trigger"],
  additionalFiles: [
    "../../packages/identity/engines/caleums-arabic-v3/fonts/*.ttf",
    "../../packages/identity/engines/caleums-arabic-v3/manifest.json",
  ],
  maxDuration: 300,
  runtime: "node",
});
