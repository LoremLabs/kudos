# Kudos Pool Server

A hexagonal-architecture implementation of the Kudos protocol, built as a pnpm monorepo.

## Packages

| Package | Description |
|---------|-------------|
| `@kudos-protocol/pool-core` | Pure logic: schemas, validation, normalization, errors |
| `@kudos-protocol/ports` | Interface contracts: StoragePort, AuthPort, SinkPort, etc. |
| `@kudos-protocol/server` | Fastify HTTP server + plugin for `/core/v1/*` routes |
| `@kudos-protocol/storage-sqlite` | SQLite storage adapter (reference) |
| `@kudos-protocol/storage-postgres` | PostgreSQL storage adapter (production) |
| `@kudos-protocol/worker-outbox` | Outbox polling worker + ConsoleSink |

## Apps

| App | Description |
|-----|-------------|
| `@kudos-protocol/basic-pool-server` | Reference app: SQLite + outbox + static-token auth |

## Quickstart

### Local development

```bash
pnpm install
pnpm -r run build
pnpm -C apps/basic-pool-server dev
```

### Docker

```bash
cd apps/basic-pool-server
docker compose up --build
```

### Try it

```bash
# Health check
curl http://localhost:5859/healthz

# Append kudos
curl -X POST http://localhost:5859/core/v1/pools/demo/events \
  -H "Authorization: Bearer dev-token:email:alice@example.com" \
  -H "Content-Type: application/json" \
  -d '{"sender":"email:alice@example.com","events":[{"recipient":"email:bob@example.com","kudos":10}]}'

# Get summary
curl http://localhost:5859/core/v1/pools/demo/summary \
  -H "Authorization: Bearer dev-token:email:alice@example.com"
```

## Development

```bash
# Build all packages
pnpm -r run build

# Run all tests
pnpm -r run test

# Typecheck
pnpm -r run typecheck
```
