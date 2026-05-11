# syntax=docker/dockerfile:1.7
# Build context: monorepo root (docker build -f api/Dockerfile .)

FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY api/package.json ./api/
COPY shared/package.json ./shared/
RUN pnpm install --filter @ecommmer/api --filter @ecommmer/shared --frozen-lockfile

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/api/node_modules ./api/node_modules
COPY tsconfig.base.json ./
COPY api ./api
COPY shared ./shared
WORKDIR /app/api
# Generate Prisma client BEFORE compiling — the deps stage doesn't have
# the schema, so the install-time postinstall couldn't generate it.
RUN pnpm exec prisma generate --schema=./prisma/schema.prisma
RUN pnpm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S app -G nodejs
COPY --from=build --chown=app:nodejs /app/api/dist ./dist
COPY --from=build --chown=app:nodejs /app/api/node_modules ./node_modules
COPY --chown=app:nodejs api/package.json ./
COPY --chown=app:nodejs api/prisma ./prisma
COPY --chown=app:nodejs api/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh
USER app
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q -O- http://localhost:3001/api/v1/health || exit 1
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
