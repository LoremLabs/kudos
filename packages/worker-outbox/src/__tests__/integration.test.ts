import { describe, it, expect, afterEach } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeEvent } from "@kudos-protocol/pool-core";
import { SqliteStorage } from "@kudos-protocol/storage-sqlite";
import { OutboxWorker } from "../outbox-worker.js";
import { MockSink } from "./helpers/mock-sink.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsPath = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "storage-sqlite",
  "drizzle",
);

let storage: SqliteStorage;

afterEach(() => {
  storage?.close();
});

describe("integration: storage → worker → sink", () => {
  it("end-to-end: append events, worker drains, sink receives, outbox marked delivered", async () => {
    storage = new SqliteStorage({
      path: ":memory:",
      migrationsPath,
      outbox: true,
    });
    const sink = new MockSink();

    // Append events
    const events = [
      normalizeEvent(
        { recipient: "email:bob@example.com", kudos: 10 },
        { sender: "email:alice@example.com", now: () => "2026-03-03T10:00:00.000Z" },
      ),
      normalizeEvent(
        { recipient: "email:carol@example.com", kudos: 20 },
        { sender: "email:alice@example.com", now: () => "2026-03-03T11:00:00.000Z" },
      ),
    ];

    await storage.appendEvents("pool-1", events);

    // Create worker and drain
    const worker = new OutboxWorker({
      outbox: storage,
      sink,
      batchSize: 100,
      maxAttempts: 5,
      leaseTtlSeconds: 60,
    });

    const delivered = await worker.drain();
    expect(delivered).toBe(2);

    // Verify sink received events
    expect(sink.published).toHaveLength(1);
    expect(sink.published[0].poolId).toBe("pool-1");
    expect(sink.published[0].events).toHaveLength(2);
    const sinkEventIds = sink.published[0].events.map((e) => e.id).sort();
    const inputEventIds = events.map((e) => e.id).sort();
    expect(sinkEventIds).toEqual(inputEventIds);

    // Verify outbox rows are now delivered (no more pending)
    const remaining = await storage.leasePending(100, 5, "post-check", 60);
    expect(remaining).toHaveLength(0);
  });
});
