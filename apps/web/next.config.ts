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
  turbopack: {
    root: workspaceRoot,
  },
};

export default nextConfig;
