import { describe, it, expect, vi, beforeEach } from "vitest";
import { OutboxWorker } from "../outbox-worker.js";
import { MockOutbox } from "./helpers/mock-outbox.js";
import { MockSink } from "./helpers/mock-sink.js";
import type { LoggerPort } from "@kudos-protocol/ports";
import type { Event } from "@kudos-protocol/pool-core";

function makeEvent(id: string, overrides?: Partial<Event>): Event {
  return {
    id,
    recipient: "email:bob@example.com",
    sender: "email:alice@example.com",
    ts: "2026-03-03T12:00:00.000Z",
    scopeId: null,
    kudos: 10,
    emoji: null,
    title: null,
    visibility: "PRIVATE",
    meta: null,
    ...overrides,
  };
}

function makePayload(id: string, overrides?: Partial<Event>): string {
  return JSON.stringify(makeEvent(id, overrides));
}

let outbox: MockOutbox;
let sink: MockSink;
let logger: LoggerPort;

beforeEach(() => {
  outbox = new MockOutbox();
  sink = new MockSink();
  logger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
});

describe("OutboxWorker drain", () => {
  it("returns 0 when outbox empty", async () => {
    const worker = new OutboxWorker({ outbox, sink, logger });
    const count = await worker.drain();
    expect(count).toBe(0);
  });

  it("delivers a single row", async () => {
    outbox.addRow("pool-1", "kudos:ow-001", makePayload("kudos:ow-001"));
    const worker = new OutboxWorker({ outbox, sink, logger });
    const count = await worker.drain();

    expect(count).toBe(1);
    expect(sink.published).toHaveLength(1);
    expect(sink.published[0].poolId).toBe("pool-1");
    expect(sink.published[0].events[0].id).toBe("kudos:ow-001");
  });

  it("batches multiple rows for same pool", async () => {
    outbox.addRow("pool-1", "kudos:ow-001", makePayload("kudos:ow-001"));
    outbox.addRow("pool-1", "kudos:ow-002", makePayload("kudos:ow-002"));
    const worker = new OutboxWorker({ outbox, sink, logger });
    const count = await worker.drain();

    expect(count).toBe(2);
    expect(sink.published).toHaveLength(1);
    expect(sink.published[0].events).toHaveLength(2);
  });

  it("groups rows by poolId", async () => {
    outbox.addRow("pool-a", "kudos:ow-001", makePayload("kudos:ow-001"));
    outbox.addRow("pool-b", "kudos:ow-002", makePayload("kudos:ow-002"));
    const worker = new OutboxWorker({ outbox, sink, logger });
    const count = await worker.drain();

    expect(count).toBe(2);
    expect(sink.published).toHaveLength(2);
    const poolIds = sink.published.map((p) => p.poolId).sort();
    expect(poolIds).toEqual(["pool-a", "pool-b"]);
  });

  it("marks all rows delivered on success", async () => {
    outbox.addRow("pool-1", "kudos:ow-001", makePayload("kudos:ow-001"));
    outbox.addRow("pool-1", "kudos:ow-002", makePayload("kudos:ow-002"));
    const worker = new OutboxWorker({ outbox, sink, logger });
    await worker.drain();

    expect(outbox.rows.every((r) => r.delivered)).toBe(true);
  });

  it("marks group failed when sink throws", async () => {
    outbox.addRow("pool-1", "kudos:ow-001", makePayload("kudos:ow-001"));
    sink.failForPools.add("pool-1");
    const worker = new OutboxWorker({ outbox, sink, logger });
    const count = await worker.drain();

    expect(count).toBe(0);
    expect(outbox.rows[0].delivered).toBe(false);
    expect(outbox.rows[0].attempts).toBe(1);
  });

  it("records error message on failure", async () => {
    outbox.addRow("pool-1", "kudos:ow-001", makePayload("kudos:ow-001"));
    sink.failForPools.add("pool-1");
    sink.failError = "Connection refused";
    const worker = new OutboxWorker({ outbox, sink, logger });
    await worker.drain();

    expect(outbox.rows[0].lastError).toBe("Connection refused");
  });

  it("partial pool failure — pool-a delivered, pool-b failed", async () => {
    outbox.addRow("pool-a", "kudos:ow-001", makePayload("kudos:ow-001"));
    outbox.addRow("pool-b", "kudos:ow-002", makePayload("kudos:ow-002"));
    sink.failForPools.add("pool-b");
    const worker = new OutboxWorker({ outbox, sink, logger });
    const count = await worker.drain();

    expect(count).toBe(1);
    const rowA = outbox.rows.find((r) => r.poolId === "pool-a")!;
    const rowB = outbox.rows.find((r) => r.poolId === "pool-b")!;
    expect(rowA.delivered).toBe(true);
    expect(rowB.delivered).toBe(false);
    expect(rowB.attempts).toBe(1);
  });

  it("poison rows skipped by leasePending", async () => {
    outbox.addRow("pool-1", "kudos:ow-001", makePayload("kudos:ow-001"), {
      attempts: 5,
    });
    const worker = new OutboxWorker({ outbox, sink, logger, maxAttempts: 5 });
    const count = await worker.drain();

    expect(count).toBe(0);
    expect(sink.published).toHaveLength(0);
  });

  it("poison row log only at threshold", async () => {
    // Row with attempts=4, maxAttempts=5 — this drain will push it to 5
    outbox.addRow("pool-1", "kudos:ow-001", makePayload("kudos:ow-001"), {
      attempts: 4,
    });
    sink.failForPools.add("pool-1");
    const worker = new OutboxWorker({ outbox, sink, logger, maxAttempts: 5 });
    await worker.drain();

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Poison row"),
      expect.objectContaining({ outboxId: 1 }),
    );
  });

  it("invalid JSON payload marked failed", async () => {
    outbox.addRow("pool-1", "kudos:ow-001", "not valid json {{{");
    const worker = new OutboxWorker({ outbox, sink, logger });
    const count = await worker.drain();

    expect(count).toBe(0);
    expect(outbox.rows[0].attempts).toBe(1);
    expect(outbox.rows[0].lastError).toContain("Invalid JSON");
  });
});

describe("OutboxWorker lifecycle", () => {
  it("start/stop lifecycle — drain called at least once", async () => {
    outbox.addRow("pool-1", "kudos:ow-001", makePayload("kudos:ow-001"));
    const worker = new OutboxWorker({
      outbox,
      sink,
      logger,
      pollIntervalMs: 10,
    });

    worker.start();
    // Wait long enough for at least one drain
    await new Promise((r) => setTimeout(r, 50));
    await worker.stop();

    expect(sink.published.length).toBeGreaterThanOrEqual(1);
  });

  it("stop waits for in-flight drain", async () => {
    // Create a sink that takes time to publish
    let publishResolve: (() => void) | null = null;
    const slowSink: MockSink = new MockSink();
    const origPublish = slowSink.publish.bind(slowSink);
    slowSink.publish = async (poolId, events) => {
      await new Promise<void>((r) => {
        publishResolve = r;
      });
      return origPublish(poolId, events);
    };

    outbox.addRow("pool-1", "kudos:ow-001", makePayload("kudos:ow-001"));
    const worker = new OutboxWorker({
      outbox,
      sink: slowSink,
      logger,
      pollIntervalMs: 5,
    });

    worker.start();
    // Wait for drain to start
    await new Promise((r) => setTimeout(r, 20));

    const stopPromise = worker.stop();
    // Resolve the slow publish
    if (publishResolve) publishResolve();

    await stopPromise;
    expect(slowSink.published).toHaveLength(1);
  });

  it("start is idempotent", async () => {
    const drainSpy = vi.spyOn(
      OutboxWorker.prototype,
      "drain",
    );
    const worker = new OutboxWorker({
      outbox,
      sink,
      logger,
      pollIntervalMs: 10,
    });

    worker.start();
    worker.start(); // second call should be no-op

    await new Promise((r) => setTimeout(r, 50));
    await worker.stop();

    // Should have roughly the same number of drains as if started once
    // (not double due to double-start)
    const callCount = drainSpy.mock.calls.length;
    expect(callCount).toBeGreaterThanOrEqual(1);
    expect(callCount).toBeLessThanOrEqual(10); // sanity upper bound

    drainSpy.mockRestore();
  });
});
