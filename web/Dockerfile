# syntax=docker/dockerfile:1.7
# Build context: monorepo root (docker build -f web/Dockerfile .)

FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY web/package.json ./web/
COPY shared/package.json ./shared/
RUN pnpm install --filter @ecommmer/web --filter @ecommmer/shared --frozen-lockfile

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/web/node_modules ./web/node_modules
COPY tsconfig.base.json ./
COPY web ./web
COPY shared ./shared
WORKDIR /app/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs
COPY --from=build --chown=nextjs:nodejs /app/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/web/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/web/public ./public
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -q -O- http://localhost:3000/ || exit 1
CMD ["node", "server.js"]
