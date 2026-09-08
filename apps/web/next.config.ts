import type { NextConfig } from "next";
import { loadRootEnv, parseBrowserEnv } from "@jewelo/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(
  fileURLToPath(new URL("../..", import.meta.url)),
);
// Must run before anything reads process.env, including Next inlining
// NEXT_PUBLIC_* into the client bundle.
loadRootEnv();
parseBrowserEnv(process.env);

const supabaseHost = new URL(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co",
).hostname;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/**",
      },
    ],
  },
  reactStrictMode: true,
  transpilePackages: ["@jewelo/config"],
  // `@jewelo/jobs` renders the deterministic identity anchor with sharp, a
  // native module the Inngest route loads at runtime; it must not be bundled.
  // `harfbuzzjs` ships a `.wasm` its ESM entry reads next to its own module
  // URL; bundling it would rewrite that URL, so it stays external and is
  // required from `node_modules` at runtime. `@jewelo/identity` cannot join it:
  // its export map points at raw `.ts`, so Next has to compile it, which is
  // also what emits the pinned `.ttf` files into `.next/server/assets`.
  serverExternalPackages: ["sharp", "harfbuzzjs"],
  // Belt and braces for a traced deploy: the pinned font bytes and the HarfBuzz
  // wasm are data files no import graph points at once they are external, so
  // name them. Globs are relative to this app directory.
  outputFileTracingIncludes: {
    "/api/inngest": [
      "../../packages/identity/engines/**/*.ttf",
      "../../node_modules/.pnpm/harfbuzzjs@*/node_modules/harfbuzzjs/dist/*.wasm",
    ],
    "/api/operator/diagnostics/identity": [
      "../../packages/identity/engines/**/*.ttf",
      "../../node_modules/.pnpm/harfbuzzjs@*/node_modules/harfbuzzjs/dist/*.wasm",
    ],
  },
  turbopack: {
    root: workspaceRoot,
  },
};

export default nextConfig;
