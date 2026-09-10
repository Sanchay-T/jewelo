import type { NextConfig } from "next";
import { loadRootEnv, parseBrowserEnv } from "@jewelo/config";
import {
  observabilityConnectOrigins,
  withObservabilityConfig,
} from "@jewelo/observability/next-config";
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

const supabaseOrigin = new URL(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://example.supabase.co",
).origin;
const isProduction = process.env.NODE_ENV === "production";

/**
 * P7-5 / DS-9. The error tracker and the analytics endpoint, if and only if
 * this deployment has been given one.
 *
 * `connect-src` is an allowlist, so a Sentry DSN or a PostHog host that is not
 * named here is a report the browser silently refuses to send - a dead
 * observability stack that looks configured. The other direction is the one
 * storyline review 1 caught (M4): an origin named while its SDK is switched off
 * is a permission granted to a vendor the app never talks to. Each origin is
 * therefore gated on the credential that actually loads its SDK -
 * `NEXT_PUBLIC_POSTHOG_KEY` for the PostHog host, `NEXT_PUBLIC_SENTRY_DSN` for
 * Sentry, which is its own origin - so the policy cannot drift from what is
 * enabled in either direction. With the keys empty this list is empty and the
 * shipped policy names no vendor at all.
 */
const observabilityOrigins = observabilityConnectOrigins();
const observabilityConnectSrc = observabilityOrigins.length
  ? ` ${observabilityOrigins.join(" ")}`
  : "";
const devDistDir = process.env.JEWELO_DEV_DIST_DIR;

/**
 * Security headers.
 *
 * The Content-Security-Policy is the one that matters: it stops anything the
 * shop's own origin did not serve from executing, and it is what makes an
 * injected script or a stored file a dead end rather than a session theft.
 *
 * `'unsafe-inline'` is present for scripts and styles because Next's App
 * Router inlines its bootstrap and flight payload scripts, and styled-jsx
 * inlines style elements; removing it needs a per-request nonce from
 * middleware, which is a separate change. `'unsafe-eval'` is development only -
 * the dev overlay and React refresh need it, production does not.
 *
 * Images and connections are limited to this origin plus the Supabase project,
 * which is where every signed asset URL and every REST call goes.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `img-src 'self' data: blob: ${supabaseOrigin}`,
  `media-src 'self' blob: ${supabaseOrigin}`,
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  `connect-src 'self' ${supabaseOrigin} ${supabaseOrigin.replace("https://", "wss://")}${observabilityConnectSrc}${isProduction ? "" : " ws: http://localhost:*"}`,
  "worker-src 'self' blob:",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const baseSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];
const documentSecurityHeaders = [
  ...baseSecurityHeaders,
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // The Mac mini also has an older port-3001 checkout running from this app
  // directory. Keep the port-3011 LaunchAgent's Turbopack lock and cache
  // separate so restarting this primary dev service never touches that
  // unrelated process.
  distDir: devDistDir ?? ".next",
  // The Mac mini is reached through loopback by the in-app browser and
  // through its Tailscale address when another device dogfoods it. Next's
  // development HMR endpoint rejects those host origins unless they are
  // explicit, and the rejected dev resource leaves the App Router's client
  // hydration waiting behind a server-rendered page.
  allowedDevOrigins: isProduction
    ? undefined
    : ["localhost", "127.0.0.1", "100.102.144.100"],
  // `/api/inngest` and `/api/shopify` answer machine callers - the Inngest
  // dashboard also renders its own signed page there - so they keep the
  // transport headers and stay out of the document policy.
  async headers() {
    return [
      { source: "/api/inngest/:path*", headers: baseSecurityHeaders },
      { source: "/api/shopify/:path*", headers: baseSecurityHeaders },
      { source: "/", headers: documentSecurityHeaders },
      {
        source: "/:path((?!api/inngest|api/shopify).*)",
        headers: documentSecurityHeaders,
      },
    ];
  },
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
  transpilePackages: ["@jewelo/config", "@jewelo/observability"],
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

/**
 * P7-5 / DS-9. The config, wrapped for source map upload only when the three
 * variables that upload needs are present (`SENTRY_AUTH_TOKEN`, `SENTRY_ORG`,
 * `SENTRY_PROJECT`). Until then `withObservabilityConfig` returns this object
 * unchanged, so the build is exactly the build it was before observability
 * existed. The function form is what lets that decision be asynchronous: the
 * vendor plugin is imported only on a build that uses it.
 */
export default async function config(): Promise<NextConfig> {
  return withObservabilityConfig(nextConfig);
}
