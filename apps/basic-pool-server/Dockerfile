FROM node:22-slim AS builder
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm -r run build

FROM node:22-slim AS runner
RUN corepack enable && useradd -m app
WORKDIR /app

COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/pool-core/package.json packages/pool-core/package.json
COPY --from=builder /app/packages/pool-core/dist/ packages/pool-core/dist/
COPY --from=builder /app/packages/logging/package.json packages/logging/package.json
COPY --from=builder /app/packages/logging/ packages/logging/
COPY --from=builder /app/packages/ports/package.json packages/ports/package.json
COPY --from=builder /app/packages/ports/dist/ packages/ports/dist/
COPY --from=builder /app/packages/server/package.json packages/server/package.json
COPY --from=builder /app/packages/server/dist/ packages/server/dist/
COPY --from=builder /app/packages/storage-sqlite/package.json packages/storage-sqlite/package.json
COPY --from=builder /app/packages/storage-sqlite/dist/ packages/storage-sqlite/dist/
COPY --from=builder /app/packages/storage-sqlite/drizzle/ packages/storage-sqlite/drizzle/
COPY --from=builder /app/packages/worker-outbox/package.json packages/worker-outbox/package.json
COPY --from=builder /app/packages/worker-outbox/dist/ packages/worker-outbox/dist/
COPY --from=builder /app/packages/pool-server/package.json packages/pool-server/package.json
COPY --from=builder /app/packages/pool-server/dist/ packages/pool-server/dist/
COPY --from=builder /app/apps/basic-pool-server/package.json apps/basic-pool-server/package.json
COPY --from=builder /app/apps/basic-pool-server/dist/ apps/basic-pool-server/dist/

RUN pnpm install --frozen-lockfile --prod
USER app
EXPOSE 5859
CMD ["node", "apps/basic-pool-server/dist/main.js"]
