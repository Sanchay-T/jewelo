import { defineConfig } from "@trigger.dev/sdk";
import { syncEnvVars } from "@trigger.dev/build/extensions/core";
import { loadRootEnv, parseTriggerConfigEnv } from "@jewelo/config";

loadRootEnv();
const environment = parseTriggerConfigEnv(process.env);
const jobEnvironmentKeys = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "OPENAI_IMAGE_MODEL",
  "OPENAI_VERIFIER_MODEL",
  "FAL_KEY",
  "OPENAI_STILL_CONCURRENCY_LIMIT",
  "FAL_VIDEO_CONCURRENCY_LIMIT",
  "OPENAI_STILL_ESTIMATED_COST_CENTS",
  "FAL_VIDEO_ESTIMATED_COST_CENTS",
] as const;

export default defineConfig({
  project: environment.TRIGGER_PROJECT_REF,
  dirs: ["./src/trigger"],
  additionalFiles: [
    "../../packages/identity/engines/caleums-arabic-v3/fonts/*.ttf",
    "../../packages/identity/engines/caleums-arabic-v3/manifest.json",
  ],
  build: {
    extensions: [
      syncEnvVars(
        () => {
          const missing = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter(
            (name) => !process.env[name],
          );
          if (missing.length > 0)
            throw new Error(
              `Trigger deployment environment missing: ${missing.join(", ")}`,
            );
          return jobEnvironmentKeys.flatMap((name) =>
            process.env[name]
              ? [{ name, value: process.env[name], isSecret: true }]
              : [],
          );
        },
        { override: true },
      ),
    ],
  },
  maxDuration: 600,
  runtime: "node",
});
