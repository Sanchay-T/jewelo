import { defineConfig } from "@trigger.dev/sdk";
import { parseTriggerConfigEnv } from "@jewelo/config";

const environment = parseTriggerConfigEnv(process.env);

export default defineConfig({
  project: environment.TRIGGER_PROJECT_REF,
  dirs: ["./src/trigger"],
  maxDuration: 60,
  runtime: "node",
});
