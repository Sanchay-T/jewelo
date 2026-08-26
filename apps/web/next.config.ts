import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.resolve(
  fileURLToPath(new URL("../..", import.meta.url)),
);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ["@jewelo/config"],
  turbopack: {
    root: workspaceRoot,
  },
};

export default nextConfig;
