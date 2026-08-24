import type { NextConfig } from "next";
import path from "path";

const appRoot = path.dirname(new URL(import.meta.url).pathname);

const nextConfig: NextConfig = {
  turbopack: {
    root: appRoot,
  },
};

export default nextConfig;
