# The web service image.
#
# App Platform built this component with the node-js buildpack: `source_dir: /`
# plus `pnpm do:build`. A measured audit of the 14.5 minute staging deploy found
# `next build` was 48 seconds of it and ~585 seconds was compressing, pushing
# and pulling one buildpack layer that carried the whole repository - docs/
# 1.2G, reviews/ 450M, none of it read by the build. This file ships the server
# instead of the repository: `.next/standalone` plus `.next/static` and
# `public`, on node:24-slim, and nothing else.
#
# The Inngest route renders the deterministic identity stencil with sharp and
# HarfBuzz at run time, so the runtime layer must keep the native sharp binary,
# the harfbuzzjs `.wasm` and the pinned `.ttf` files. All three arrive through
# Next's file trace: `serverExternalPackages` and `outputFileTracingIncludes` in
# apps/web/next.config.ts name them, `outputFileTracingRoot` pins the workspace
# root they are traced against, and `output: "standalone"` copies them.

# --- dependencies -----------------------------------------------------------
# `pnpm fetch` resolves from the lockfile alone, so this layer is invalidated
# only by a dependency change and a source edit never re-downloads anything.
FROM node:24-slim AS deps
RUN corepack enable && corepack prepare pnpm@11.23.0 --activate
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch

# --- build ------------------------------------------------------------------
FROM deps AS build
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile --offline

# App Platform exposes RUN_AND_BUILD_TIME variables to a buildpack build as
# ordinary environment variables, but to a Dockerfile build only as `--build-arg`
# values, and a build arg that is not declared is silently dropped. Every
# RUN_AND_BUILD_TIME key in this app's spec is a `NEXT_PUBLIC_` one (see
# `appSecretEnvs` in scripts/digitalocean/env-contract.mjs), Next inlines those
# into the browser bundle at build time, so each is declared here. Undeclared,
# the shopper's bundle would be compiled against the schema defaults - data mode
# `mock`, no Supabase - and the app would look configured and serve nothing.
# These are public values by definition; no secret is ever passed as a build arg.
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_JEWELO_DATA_MODE
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_JEWELO_DATA_MODE=$NEXT_PUBLIC_JEWELO_DATA_MODE \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN \
    NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY \
    NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
# The same command the buildpack ran, so there is one definition of what a
# cloud build builds: the web app and the workspace packages it depends on, in
# topological order.
RUN pnpm do:build

# --- runtime ----------------------------------------------------------------
FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=8080
# The standalone tree is rooted at the workspace root, so the server entry is
# apps/web/server.js and the static and public assets sit beside it where that
# server expects them.
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public
USER node
EXPOSE 8080
# App Platform overrides this when the spec carries a `run_command`; the spec
# deliberately carries none, so this is the command that runs. It honours the
# platform's own $PORT when it sets one.
CMD ["node", "apps/web/server.js"]
