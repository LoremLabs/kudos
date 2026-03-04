import Fastify from "fastify";
import { poolServerPlugin, adminPlugin } from "@kudos-protocol/server";
import { SqliteStorage } from "@kudos-protocol/storage-sqlite";
import { OutboxWorker, ConsoleSink } from "@kudos-protocol/worker-outbox";
import { StaticTokenAuth } from "./auth.js";
import { logger } from "./logger.js";

const env = (key: string, fallback: string) => process.env[key] ?? fallback;

const port = Number(env("PORT", "5859"));
const host = env("HOST", "0.0.0.0");
const dbPath = env("DB_PATH", "./pool-server.db");
const authToken = env("AUTH_TOKEN", "dev-token");
const outboxEnabled = env("OUTBOX_ENABLED", "1") === "1";
const workerEnabled = env("OUTBOX_WORKER", "1") === "1";
const pollMs = Number(env("OUTBOX_POLL_MS", "1000"));
const batchSize = Number(env("OUTBOX_BATCH", "100"));

// logger imported from ./logger.js (wraps @kudos-protocol/logging)
const storage = new SqliteStorage({ path: dbPath, outbox: outboxEnabled });
const auth = new StaticTokenAuth(authToken);

const app = Fastify({ logger: false });

await app.register(poolServerPlugin, { storage, auth, logger });
await app.register(adminPlugin, { storage });

let worker: OutboxWorker | undefined;
if (outboxEnabled && workerEnabled) {
  const sink = new ConsoleSink(logger);
  worker = new OutboxWorker({
    outbox: storage,
    sink,
    logger,
    pollIntervalMs: pollMs,
    batchSize,
  });
  worker.start();
  logger.info("Outbox worker started");
}

await app.listen({ port, host });
logger.info(`Server listening on http://${host}:${port}`);

const shutdown = async () => {
  logger.info("Shutting down...");
  if (worker) await worker.stop();
  await app.close();
  storage.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
