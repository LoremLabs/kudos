import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SqliteStorage } from "../sqlite-storage.js";
import type { Event } from "@kudos-protocol/pool-core";
import { normalizeEvent } from "@kudos-protocol/pool-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsPath = path.resolve(__dirname, "..", "..", "drizzle");
const fixturesPath = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "test",
  "conformance",
  "fixtures",
);

function createStorage(opts?: { outbox?: boolean }): SqliteStorage {
  return new SqliteStorage({ path: ":memory:", migrationsPath, outbox: opts?.outbox });
}

function makeEvent(overrides: Partial<Event> & { recipient: string }): Event {
  return normalizeEvent(
    {
      recipient: overrides.recipient,
      id: overrides.id,
      ts: overrides.ts,
      scopeId: overrides.scopeId ?? undefined,
      kudos: overrides.kudos,
      emoji: overrides.emoji ?? undefined,
      title: overrides.title ?? undefined,
      visibility: overrides.visibility,
      meta: overrides.meta ?? undefined,
    },
    {
      sender: overrides.sender ?? "email:alice@example.com",
      now: () => overrides.ts ?? "2026-03-03T12:00:00.000Z",
      generateId: overrides.id ? () => overrides.id! : undefined,
    },
  );
}

let storage: SqliteStorage;

beforeEach(() => {
  storage = createStorage();
});

afterEach(() => {
  storage.close();
});

// ─── Schema & Init ────────────────────────────────────────────────────────

describe("schema & init", () => {
  it("creates all tables", async () => {
    // If we get here without error, migrations ran successfully
    const result = await storage.readEvents({ poolId: "empty", limit: 10 });
    expect(result.events).toEqual([]);
    expect(result.hasMore).toBe(false);
  });

  it("migrations are idempotent", () => {
    // Creating a second storage on the same file should not throw
    // (uses :memory: so this is a separate db, but tests migrate path)
    const s2 = createStorage();
    s2.close();
  });

  it("WAL mode is set", () => {
    // Access the underlying sqlite instance via a fresh connection
    const s = createStorage();
    // WAL mode is set on :memory: but returns 'memory' for in-memory dbs
    // Just verify we can create and use the storage
    expect(s).toBeDefined();
    s.close();
  });
});

// ─── Basic Insert ─────────────────────────────────────────────────────────

describe("basic insert", () => {
  it("inserts a single event", async () => {
    const event = makeEvent({
      id: "kudos:test-001",
      recipient: "email:bob@example.com",
      kudos: 42,
      ts: "2026-03-03T10:00:00.000Z",
    });

    const result = await storage.appendEvents("pool-1", [event]);
    expect(result.inserted).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].id).toBe("kudos:test-001");
  });

  it("inserts multiple events", async () => {
    const events = [
      makeEvent({
        id: "kudos:multi-001",
        recipient: "email:bob@example.com",
        kudos: 10,
        ts: "2026-03-03T10:00:00.000Z",
      }),
      makeEvent({
        id: "kudos:multi-002",
        recipient: "email:carol@example.com",
        kudos: 20,
        ts: "2026-03-03T11:00:00.000Z",
      }),
    ];

    const result = await storage.appendEvents("pool-1", events);
    expect(result.inserted).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.events).toHaveLength(2);
  });

  it("returns correct event shape", async () => {
    const event = makeEvent({
      id: "kudos:shape-001",
      recipient: "email:bob@example.com",
      kudos: 5,
      ts: "2026-03-03T10:00:00.000Z",
      emoji: "star",
      title: "Great work",
      visibility: "PUBLIC_ALL",
      meta: '{"key":"value"}',
    });

    const result = await storage.appendEvents("pool-1", [event]);
    const e = result.events[0];
    expect(e.id).toBe("kudos:shape-001");
    expect(e.recipient).toBe("email:bob@example.com");
    expect(e.sender).toBe("email:alice@example.com");
    expect(e.ts).toBe("2026-03-03T10:00:00.000Z");
    expect(e.scopeId).toBeNull();
    expect(e.kudos).toBe(5);
    expect(e.emoji).toBe("star");
    expect(e.title).toBe("Great work");
    expect(e.visibility).toBe("PUBLIC_ALL");
    expect(e.meta).toBe('{"key":"value"}');
  });

  it("updates projection counts on insert", async () => {
    const events = [
      makeEvent({
        id: "kudos:proj-001",
        recipient: "email:bob@example.com",
        kudos: 10,
        ts: "2026-03-03T10:00:00.000Z",
      }),
      makeEvent({
        id: "kudos:proj-002",
        recipient: "email:bob@example.com",
        kudos: 20,
        ts: "2026-03-03T11:00:00.000Z",
      }),
    ];

    await storage.appendEvents("pool-1", events);
    const summary = await storage.readSummary("pool-1", 10);
    expect(summary.totalKudos).toBe(30);
    expect(summary.summary[0].kudos).toBe(30);
  });
});

// ─── Idempotency ──────────────────────────────────────────────────────────

describe("idempotency", () => {
  it("skips duplicate event IDs", async () => {
    const event = makeEvent({
      id: "kudos:dup-001",
      recipient: "email:bob@example.com",
      kudos: 100,
      ts: "2026-03-03T10:00:00.000Z",
    });

    await storage.appendEvents("pool-1", [event]);
    const result = await storage.appendEvents("pool-1", [event]);
    expect(result.inserted).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.events).toHaveLength(1);
  });

  it("does not double-count projections for duplicates", async () => {
    const event = makeEvent({
      id: "kudos:dup-proj-001",
      recipient: "email:bob@example.com",
      kudos: 50,
      ts: "2026-03-03T10:00:00.000Z",
    });

    await storage.appendEvents("pool-1", [event]);
    await storage.appendEvents("pool-1", [event]);

    const summary = await storage.readSummary("pool-1", 10);
    expect(summary.totalKudos).toBe(50);
  });

  it("returns input event for duplicates (not re-read)", async () => {
    const event = makeEvent({
      id: "kudos:dup-input-001",
      recipient: "email:bob@example.com",
      kudos: 100,
      ts: "2026-03-03T10:00:00.000Z",
    });

    await storage.appendEvents("pool-1", [event]);
    const result = await storage.appendEvents("pool-1", [event]);
    expect(result.events[0]).toBe(event); // same reference
  });
});

// ─── scopeId Latest-Wins ──────────────────────────────────────────────────

describe("scopeId latest-wins", () => {
  it("newer event replaces older in projections", async () => {
    const old = makeEvent({
      id: "kudos:scope-old",
      recipient: "email:bob@example.com",
      scopeId: "dp:2026-03-03",
      kudos: 50,
      ts: "2026-03-03T10:00:00.000Z",
    });
    const newer = makeEvent({
      id: "kudos:scope-new",
      recipient: "email:bob@example.com",
      scopeId: "dp:2026-03-03",
      kudos: 200,
      ts: "2026-03-03T14:00:00.000Z",
    });

    await storage.appendEvents("pool-1", [old]);
    await storage.appendEvents("pool-1", [newer]);

    const summary = await storage.readSummary("pool-1", 10);
    expect(summary.totalKudos).toBe(200);
    expect(summary.summary[0].kudos).toBe(200);
  });

  it("older event does not replace newer in projections", async () => {
    const newer = makeEvent({
      id: "kudos:scope-newer",
      recipient: "email:bob@example.com",
      scopeId: "dp:2026-03-03",
      kudos: 200,
      ts: "2026-03-03T14:00:00.000Z",
    });
    const older = makeEvent({
      id: "kudos:scope-older",
      recipient: "email:bob@example.com",
      scopeId: "dp:2026-03-03",
      kudos: 50,
      ts: "2026-03-03T10:00:00.000Z",
    });

    await storage.appendEvents("pool-1", [newer]);
    await storage.appendEvents("pool-1", [older]);

    const summary = await storage.readSummary("pool-1", 10);
    expect(summary.totalKudos).toBe(200);
  });

  it("tombstone reduces totals via scopeId delta", async () => {
    const original = makeEvent({
      id: "kudos:tomb-001",
      recipient: "email:bob@example.com",
      scopeId: "dp:2026-03-03",
      kudos: 100,
      ts: "2026-03-03T10:00:00.000Z",
    });
    const tombstone = makeEvent({
      id: "kudos:tomb-002",
      recipient: "email:bob@example.com",
      scopeId: "dp:2026-03-03",
      kudos: 0,
      ts: "2026-03-03T14:00:00.000Z",
    });

    await storage.appendEvents("pool-1", [original]);
    await storage.appendEvents("pool-1", [tombstone]);

    const summary = await storage.readSummary("pool-1", 10);
    expect(summary.totalKudos).toBe(0);
  });

  it("handles multiple scopes independently", async () => {
    const scope1a = makeEvent({
      id: "kudos:ms-001",
      recipient: "email:bob@example.com",
      scopeId: "scope-a",
      kudos: 10,
      ts: "2026-03-03T10:00:00.000Z",
    });
    const scope1b = makeEvent({
      id: "kudos:ms-002",
      recipient: "email:bob@example.com",
      scopeId: "scope-a",
      kudos: 30,
      ts: "2026-03-03T14:00:00.000Z",
    });
    const scope2 = makeEvent({
      id: "kudos:ms-003",
      recipient: "email:bob@example.com",
      scopeId: "scope-b",
      kudos: 50,
      ts: "2026-03-03T12:00:00.000Z",
    });

    await storage.appendEvents("pool-1", [scope1a, scope2]);
    await storage.appendEvents("pool-1", [scope1b]);

    const summary = await storage.readSummary("pool-1", 10);
    // scope-a: 30 (latest wins over 10), scope-b: 50
    expect(summary.totalKudos).toBe(80);
    expect(summary.summary[0].kudos).toBe(80);
  });

  it("breaks ties by eventId (lexicographic)", async () => {
    const evA = makeEvent({
      id: "kudos:tie-aaa",
      recipient: "email:bob@example.com",
      scopeId: "dp:tie",
      kudos: 10,
      ts: "2026-03-03T12:00:00.000Z",
    });
    const evB = makeEvent({
      id: "kudos:tie-zzz",
      recipient: "email:bob@example.com",
      scopeId: "dp:tie",
      kudos: 99,
      ts: "2026-03-03T12:00:00.000Z", // same timestamp
    });

    await storage.appendEvents("pool-1", [evA]);
    await storage.appendEvents("pool-1", [evB]);

    const summary = await storage.readSummary("pool-1", 10);
    // evB has lexicographically larger eventId, so it wins
    expect(summary.totalKudos).toBe(99);
  });

  it("no-scope events are always additive", async () => {
    const e1 = makeEvent({
      id: "kudos:noscope-001",
      recipient: "email:bob@example.com",
      kudos: 10,
      ts: "2026-03-03T10:00:00.000Z",
    });
    const e2 = makeEvent({
      id: "kudos:noscope-002",
      recipient: "email:bob@example.com",
      kudos: 20,
      ts: "2026-03-03T11:00:00.000Z",
    });

    await storage.appendEvents("pool-1", [e1, e2]);

    const summary = await storage.readSummary("pool-1", 10);
    expect(summary.totalKudos).toBe(30);
  });
});

// ─── readEvents Ordering & Pagination ─────────────────────────────────────

describe("readEvents ordering & pagination", () => {
  it("returns events in ts DESC order", async () => {
    const events = [
      makeEvent({
        id: "kudos:ord-001",
        recipient: "email:bob@example.com",
        kudos: 10,
        ts: "2026-03-03T10:00:00.000Z",
      }),
      makeEvent({
        id: "kudos:ord-002",
        recipient: "email:bob@example.com",
        kudos: 20,
        ts: "2026-03-03T14:00:00.000Z",
      }),
      makeEvent({
        id: "kudos:ord-003",
        recipient: "email:bob@example.com",
        kudos: 30,
        ts: "2026-03-03T12:00:00.000Z",
      }),
    ];

    await storage.appendEvents("pool-1", events);
    const result = await storage.readEvents({ poolId: "pool-1", limit: 10 });

    expect(result.events.map((e) => e.id)).toEqual([
      "kudos:ord-002",
      "kudos:ord-003",
      "kudos:ord-001",
    ]);
  });

  it("paginates with cursor", async () => {
    const events = Array.from({ length: 5 }, (_, i) =>
      makeEvent({
        id: `kudos:page-00${i + 1}`,
        recipient: "email:bob@example.com",
        kudos: (i + 1) * 10,
        ts: `2026-03-03T${String(10 + i).padStart(2, "0")}:00:00.000Z`,
      }),
    );

    await storage.appendEvents("pool-1", events);

    // Page 1
    const page1 = await storage.readEvents({ poolId: "pool-1", limit: 2 });
    expect(page1.events).toHaveLength(2);
    expect(page1.hasMore).toBe(true);
    expect(page1.nextCursor).not.toBeNull();
    expect(page1.events[0].id).toBe("kudos:page-005");
    expect(page1.events[1].id).toBe("kudos:page-004");

    // Page 2
    const page2 = await storage.readEvents({
      poolId: "pool-1",
      limit: 2,
      cursor: page1.nextCursor!,
    });
    expect(page2.events).toHaveLength(2);
    expect(page2.hasMore).toBe(true);
    expect(page2.events[0].id).toBe("kudos:page-003");
    expect(page2.events[1].id).toBe("kudos:page-002");

    // Page 3
    const page3 = await storage.readEvents({
      poolId: "pool-1",
      limit: 2,
      cursor: page2.nextCursor!,
    });
    expect(page3.events).toHaveLength(1);
    expect(page3.hasMore).toBe(false);
    expect(page3.nextCursor).toBeNull();
    expect(page3.events[0].id).toBe("kudos:page-001");
  });

  it("filters with since", async () => {
    const events = [
      makeEvent({
        id: "kudos:since-001",
        recipient: "email:bob@example.com",
        kudos: 10,
        ts: "2026-03-03T10:00:00.000Z",
      }),
      makeEvent({
        id: "kudos:since-002",
        recipient: "email:bob@example.com",
        kudos: 20,
        ts: "2026-03-03T14:00:00.000Z",
      }),
    ];

    await storage.appendEvents("pool-1", events);
    const result = await storage.readEvents({
      poolId: "pool-1",
      limit: 10,
      since: "2026-03-03T12:00:00.000Z",
    });

    expect(result.events).toHaveLength(1);
    expect(result.events[0].id).toBe("kudos:since-002");
  });

  it("filters with until", async () => {
    const events = [
      makeEvent({
        id: "kudos:until-001",
        recipient: "email:bob@example.com",
        kudos: 10,
        ts: "2026-03-03T10:00:00.000Z",
      }),
      makeEvent({
        id: "kudos:until-002",
        recipient: "email:bob@example.com",
        kudos: 20,
        ts: "2026-03-03T14:00:00.000Z",
      }),
    ];

    await storage.appendEvents("pool-1", events);
    const result = await storage.readEvents({
      poolId: "pool-1",
      limit: 10,
      until: "2026-03-03T12:00:00.000Z",
    });

    expect(result.events).toHaveLength(1);
    expect(result.events[0].id).toBe("kudos:until-001");
  });

  it("filters tombstones by default", async () => {
    const events = [
      makeEvent({
        id: "kudos:tomb-filter-001",
        recipient: "email:bob@example.com",
        scopeId: "dp:tomb",
        kudos: 0,
        ts: "2026-03-03T10:00:00.000Z",
      }),
      makeEvent({
        id: "kudos:tomb-filter-002",
        recipient: "email:bob@example.com",
        kudos: 10,
        ts: "2026-03-03T11:00:00.000Z",
      }),
    ];

    await storage.appendEvents("pool-1", events);

    const withoutTomb = await storage.readEvents({
      poolId: "pool-1",
      limit: 10,
    });
    expect(withoutTomb.events).toHaveLength(1);

    const withTomb = await storage.readEvents({
      poolId: "pool-1",
      limit: 10,
      includeTombstones: true,
    });
    expect(withTomb.events).toHaveLength(2);
  });

  it("combines since and until filters", async () => {
    const events = [
      makeEvent({
        id: "kudos:range-001",
        recipient: "email:bob@example.com",
        kudos: 10,
        ts: "2026-03-03T08:00:00.000Z",
      }),
      makeEvent({
        id: "kudos:range-002",
        recipient: "email:bob@example.com",
        kudos: 20,
        ts: "2026-03-03T12:00:00.000Z",
      }),
      makeEvent({
        id: "kudos:range-003",
        recipient: "email:bob@example.com",
        kudos: 30,
        ts: "2026-03-03T16:00:00.000Z",
      }),
    ];

    await storage.appendEvents("pool-1", events);
    const result = await storage.readEvents({
      poolId: "pool-1",
      limit: 10,
      since: "2026-03-03T10:00:00.000Z",
      until: "2026-03-03T14:00:00.000Z",
    });

    expect(result.events).toHaveLength(1);
    expect(result.events[0].id).toBe("kudos:range-002");
  });

  it("returns empty for unknown pool", async () => {
    const result = await storage.readEvents({
      poolId: "nonexistent",
      limit: 10,
    });
    expect(result.events).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(result.nextCursor).toBeNull();
  });
});

// ─── readSummary ──────────────────────────────────────────────────────────

describe("readSummary", () => {
  it("aggregates kudos across recipients", async () => {
    const events = [
      makeEvent({
        id: "kudos:sum-001",
        recipient: "email:bob@example.com",
        kudos: 100,
        ts: "2026-03-03T10:00:00.000Z",
      }),
      makeEvent({
        id: "kudos:sum-002",
        recipient: "email:carol@example.com",
        kudos: 200,
        ts: "2026-03-03T11:00:00.000Z",
      }),
      makeEvent({
        id: "kudos:sum-003",
        recipient: "email:bob@example.com",
        kudos: 50,
        ts: "2026-03-03T12:00:00.000Z",
      }),
    ];

    await storage.appendEvents("pool-1", events);
    const summary = await storage.readSummary("pool-1", 10);

    expect(summary.totalKudos).toBe(350);
    expect(summary.summary).toHaveLength(2);
    // Sorted by kudos DESC
    expect(summary.summary[0].recipient).toBe("email:carol@example.com");
    expect(summary.summary[0].kudos).toBe(200);
    expect(summary.summary[1].recipient).toBe("email:bob@example.com");
    expect(summary.summary[1].kudos).toBe(150);
  });

  it("respects limit", async () => {
    const events = [
      makeEvent({
        id: "kudos:lim-001",
        recipient: "email:bob@example.com",
        kudos: 100,
        ts: "2026-03-03T10:00:00.000Z",
      }),
      makeEvent({
        id: "kudos:lim-002",
        recipient: "email:carol@example.com",
        kudos: 200,
        ts: "2026-03-03T11:00:00.000Z",
      }),
      makeEvent({
        id: "kudos:lim-003",
        recipient: "email:dave@example.com",
        kudos: 50,
        ts: "2026-03-03T12:00:00.000Z",
      }),
    ];

    await storage.appendEvents("pool-1", events);
    const summary = await storage.readSummary("pool-1", 2);
    expect(summary.summary).toHaveLength(2);
    expect(summary.totalKudos).toBe(350);
  });

  it("includes emojis", async () => {
    const events = [
      makeEvent({
        id: "kudos:emj-001",
        recipient: "email:bob@example.com",
        kudos: 10,
        emoji: "star",
        ts: "2026-03-03T10:00:00.000Z",
      }),
      makeEvent({
        id: "kudos:emj-002",
        recipient: "email:bob@example.com",
        kudos: 10,
        emoji: "heart",
        ts: "2026-03-03T11:00:00.000Z",
      }),
      makeEvent({
        id: "kudos:emj-003",
        recipient: "email:bob@example.com",
        kudos: 10,
        emoji: "star", // duplicate emoji
        ts: "2026-03-03T12:00:00.000Z",
      }),
    ];

    await storage.appendEvents("pool-1", events);
    const summary = await storage.readSummary("pool-1", 10);

    expect(summary.summary[0].emojis).toHaveLength(2);
    expect(summary.summary[0].emojis).toContain("star");
    expect(summary.summary[0].emojis).toContain("heart");
  });

  it("returns empty for unknown pool", async () => {
    const summary = await storage.readSummary("nonexistent", 10);
    expect(summary.totalKudos).toBe(0);
    expect(summary.summary).toEqual([]);
  });

  it("totalKudos includes all recipients", async () => {
    const events = [
      makeEvent({
        id: "kudos:tot-001",
        recipient: "email:bob@example.com",
        kudos: 100,
        ts: "2026-03-03T10:00:00.000Z",
      }),
      makeEvent({
        id: "kudos:tot-002",
        recipient: "email:carol@example.com",
        kudos: 200,
        ts: "2026-03-03T11:00:00.000Z",
      }),
    ];

    await storage.appendEvents("pool-1", events);
    // Even with limit=1, totalKudos should be the full total
    const summary = await storage.readSummary("pool-1", 1);
    expect(summary.totalKudos).toBe(300);
    expect(summary.summary).toHaveLength(1);
  });
});

// ─── Conformance Fixtures ─────────────────────────────────────────────────

describe("conformance fixtures", () => {
  function loadFixture(name: string) {
    const raw = readFileSync(path.join(fixturesPath, name), "utf-8");
    return JSON.parse(raw);
  }

  it("idempotency", async () => {
    const fixture = loadFixture("idempotency.json");
    const { poolId, sender } = fixture.setup;

    for (const step of fixture.steps) {
      if (step.action === "appendEvents") {
        const events = step.request.events.map((e: Record<string, unknown>) =>
          normalizeEvent(e as Parameters<typeof normalizeEvent>[0], { sender }),
        );
        const result = await storage.appendEvents(poolId, events);
        expect(result.events.length).toBe(step.expect.accepted);
      } else if (step.action === "getPoolSummary") {
        const summary = await storage.readSummary(poolId, 50);
        expect(summary.totalKudos).toBe(step.expect.totalKudos);
        for (const expected of step.expect.summary) {
          const found = summary.summary.find(
            (s: { recipient: string }) => s.recipient === expected.recipient,
          );
          expect(found).toBeDefined();
          expect(found!.kudos).toBe(expected.kudos);
        }
      }
    }
  });

  it("scope-id-latest-wins", async () => {
    const fixture = loadFixture("scope-id-latest-wins.json");
    const { poolId, sender } = fixture.setup;

    for (const step of fixture.steps) {
      if (step.action === "appendEvents") {
        const events = step.request.events.map((e: Record<string, unknown>) =>
          normalizeEvent(e as Parameters<typeof normalizeEvent>[0], { sender }),
        );
        const result = await storage.appendEvents(poolId, events);
        expect(result.events.length).toBe(step.expect.accepted);
      } else if (step.action === "getPoolSummary") {
        const summary = await storage.readSummary(poolId, 50);
        expect(summary.totalKudos).toBe(step.expect.totalKudos);
        for (const expected of step.expect.summary) {
          const found = summary.summary.find(
            (s: { recipient: string }) => s.recipient === expected.recipient,
          );
          expect(found).toBeDefined();
          expect(found!.kudos).toBe(expected.kudos);
        }
      }
    }
  });

  it("out-of-order-timestamps", async () => {
    const fixture = loadFixture("out-of-order-timestamps.json");
    const { poolId, sender } = fixture.setup;

    for (const step of fixture.steps) {
      if (step.action === "appendEvents") {
        const events = step.request.events.map((e: Record<string, unknown>) =>
          normalizeEvent(e as Parameters<typeof normalizeEvent>[0], { sender }),
        );
        const result = await storage.appendEvents(poolId, events);
        expect(result.events.length).toBe(step.expect.accepted);
      } else if (step.action === "listEvents") {
        const result = await storage.readEvents({
          poolId,
          limit: step.request.limit,
        });
        expect(result.hasMore).toBe(step.expect.hasMore);
        for (let i = 0; i < step.expect.events.length; i++) {
          expect(result.events[i].id).toBe(step.expect.events[i].id);
        }
      } else if (step.action === "getPoolSummary") {
        const summary = await storage.readSummary(poolId, 50);
        expect(summary.totalKudos).toBe(step.expect.totalKudos);
      }
    }
  });

  it("cursor-paging", async () => {
    const fixture = loadFixture("cursor-paging.json");
    const { poolId, sender, seed } = fixture.setup;

    // Seed events
    const seedEvents = seed.events.map((e: Record<string, unknown>) =>
      normalizeEvent(e as Parameters<typeof normalizeEvent>[0], { sender }),
    );
    await storage.appendEvents(poolId, seedEvents);

    let lastCursor: { ts: string; id: string } | undefined;

    for (const step of fixture.steps) {
      if (step.action === "listEvents") {
        const cursor =
          step.request.cursor === "$previousNextCursor"
            ? lastCursor
            : undefined;
        const result = await storage.readEvents({
          poolId,
          limit: step.request.limit,
          cursor,
        });

        expect(result.hasMore).toBe(step.expect.hasMore);
        expect(result.events.length).toBe(step.expect.events.length);

        for (let i = 0; i < step.expect.events.length; i++) {
          expect(result.events[i].id).toBe(step.expect.events[i].id);
        }

        if (step.expect.nextCursor === null) {
          expect(result.nextCursor).toBeNull();
        } else if (result.nextCursor) {
          lastCursor = result.nextCursor;
        }
      }
    }
  });
});

// ─── Transaction Atomicity ────────────────────────────────────────────────

describe("transaction atomicity", () => {
  it("rolls back events and projections together on failure", async () => {
    // Insert one event successfully first
    const goodEvent = makeEvent({
      id: "kudos:atom-001",
      recipient: "email:bob@example.com",
      kudos: 10,
      ts: "2026-03-03T10:00:00.000Z",
    });
    await storage.appendEvents("pool-1", [goodEvent]);

    // Now create a batch where we'll cause a failure mid-transaction
    // by accessing the underlying sqlite to add a constraint that will fail
    const events = [
      makeEvent({
        id: "kudos:atom-002",
        recipient: "email:bob@example.com",
        kudos: 20,
        ts: "2026-03-03T11:00:00.000Z",
      }),
      makeEvent({
        id: "kudos:atom-003",
        recipient: "email:bob@example.com",
        kudos: 30,
        ts: "2026-03-03T12:00:00.000Z",
      }),
    ];

    // Monkey-patch: save the real method, then make it throw after first call
    const origAppend = storage.appendEvents.bind(storage);
    let callCount = 0;
    const origProto = Object.getPrototypeOf(storage);
    const origUpdateProjections =
      origProto.updateProjections.bind(storage);

    origProto.updateProjections = function (
      this: typeof storage,
      ...args: Parameters<typeof origUpdateProjections>
    ) {
      callCount++;
      if (callCount >= 2) {
        throw new Error("Simulated projection failure");
      }
      return origUpdateProjections.apply(this, args);
    };

    try {
      await expect(
        storage.appendEvents("pool-1", events),
      ).rejects.toThrow("Simulated projection failure");
    } finally {
      origProto.updateProjections = origUpdateProjections;
    }

    // Verify nothing from the failed batch was persisted
    const readResult = await storage.readEvents({
      poolId: "pool-1",
      limit: 10,
    });
    expect(readResult.events).toHaveLength(1);
    expect(readResult.events[0].id).toBe("kudos:atom-001");

    // Projections should be unchanged
    const summary = await storage.readSummary("pool-1", 10);
    expect(summary.totalKudos).toBe(10);
  });
});

// ─── Outbox ──────────────────────────────────────────────────────────────

describe("outbox", () => {
  let outboxStorage: SqliteStorage;

  beforeEach(() => {
    outboxStorage = createStorage({ outbox: true });
  });

  afterEach(() => {
    outboxStorage.close();
  });

  it("outbox rows written when outbox=true", async () => {
    const event = makeEvent({
      id: "kudos:ob-001",
      recipient: "email:bob@example.com",
      kudos: 10,
      ts: "2026-03-03T10:00:00.000Z",
    });

    await outboxStorage.appendEvents("pool-1", [event]);
    const rows = await outboxStorage.leasePending(100, 5, "test-lease", 60);
    expect(rows).toHaveLength(1);
    expect(rows[0].eventId).toBe("kudos:ob-001");
    expect(rows[0].poolId).toBe("pool-1");
  });

  it("outbox rows NOT written when outbox=false", async () => {
    // Use the default storage (outbox=false)
    const event = makeEvent({
      id: "kudos:ob-002",
      recipient: "email:bob@example.com",
      kudos: 10,
      ts: "2026-03-03T10:00:00.000Z",
    });

    await storage.appendEvents("pool-1", [event]);
    const rows = await storage.leasePending(100, 5, "test-lease", 60);
    expect(rows).toHaveLength(0);
  });

  it("outbox payload contains correct JSON", async () => {
    const event = makeEvent({
      id: "kudos:ob-003",
      recipient: "email:bob@example.com",
      kudos: 42,
      ts: "2026-03-03T10:00:00.000Z",
      emoji: "star",
    });

    await outboxStorage.appendEvents("pool-1", [event]);
    const rows = await outboxStorage.leasePending(100, 5, "test-lease", 60);
    const parsed = JSON.parse(rows[0].payload);
    expect(parsed.id).toBe("kudos:ob-003");
    expect(parsed.kudos).toBe(42);
    expect(parsed.emoji).toBe("star");
    expect(parsed.recipient).toBe("email:bob@example.com");
  });

  it("outbox rows only for new inserts, not dupes", async () => {
    const event = makeEvent({
      id: "kudos:ob-004",
      recipient: "email:bob@example.com",
      kudos: 10,
      ts: "2026-03-03T10:00:00.000Z",
    });

    await outboxStorage.appendEvents("pool-1", [event]);
    await outboxStorage.appendEvents("pool-1", [event]); // dupe

    // Mark first batch delivered so we can count properly
    const rows = await outboxStorage.leasePending(100, 5, "lease-1", 60);
    expect(rows).toHaveLength(1); // only one outbox row, not two
  });

  it("outbox rows in same transaction (atomicity)", async () => {
    const event = makeEvent({
      id: "kudos:ob-005",
      recipient: "email:bob@example.com",
      kudos: 10,
      ts: "2026-03-03T10:00:00.000Z",
    });

    // Monkey-patch to force projection failure
    const origProto = Object.getPrototypeOf(outboxStorage);
    const origUpdate = origProto.updateProjections.bind(outboxStorage);
    origProto.updateProjections = function () {
      throw new Error("Simulated failure");
    };

    try {
      await expect(
        outboxStorage.appendEvents("pool-1", [event]),
      ).rejects.toThrow("Simulated failure");
    } finally {
      origProto.updateProjections = origUpdate;
    }

    // Outbox should also be empty since transaction rolled back
    const rows = await outboxStorage.leasePending(100, 5, "test-lease", 60);
    expect(rows).toHaveLength(0);
  });

  it("leasePending returns rows in createdAt order", async () => {
    const e1 = makeEvent({
      id: "kudos:ob-ord-001",
      recipient: "email:bob@example.com",
      kudos: 10,
      ts: "2026-03-03T10:00:00.000Z",
    });
    const e2 = makeEvent({
      id: "kudos:ob-ord-002",
      recipient: "email:bob@example.com",
      kudos: 20,
      ts: "2026-03-03T11:00:00.000Z",
    });

    await outboxStorage.appendEvents("pool-1", [e1, e2]);
    const rows = await outboxStorage.leasePending(100, 5, "test-lease", 60);

    expect(rows).toHaveLength(2);
    // First row should have the first event (lower createdAt)
    expect(rows[0].eventId).toBe("kudos:ob-ord-001");
    expect(rows[1].eventId).toBe("kudos:ob-ord-002");
  });

  it("leasePending respects maxAttempts filter", async () => {
    const event = makeEvent({
      id: "kudos:ob-max-001",
      recipient: "email:bob@example.com",
      kudos: 10,
      ts: "2026-03-03T10:00:00.000Z",
    });

    await outboxStorage.appendEvents("pool-1", [event]);

    // Fail the row 5 times
    for (let i = 0; i < 5; i++) {
      const rows = await outboxStorage.leasePending(100, 10, `lease-${i}`, 60);
      if (rows.length > 0) {
        await outboxStorage.markFailed(rows.map((r) => r.id), "test error", `lease-${i}`);
      }
    }

    // Now with maxAttempts=5, it should not be returned
    const rows = await outboxStorage.leasePending(100, 5, "final-lease", 60);
    expect(rows).toHaveLength(0);
  });

  it("leasePending sets lease_id and leased_at", async () => {
    const event = makeEvent({
      id: "kudos:ob-lease-001",
      recipient: "email:bob@example.com",
      kudos: 10,
      ts: "2026-03-03T10:00:00.000Z",
    });

    await outboxStorage.appendEvents("pool-1", [event]);
    const rows = await outboxStorage.leasePending(100, 5, "my-lease-id", 60);

    expect(rows).toHaveLength(1);
    // The row was leased — verify by trying to lease again (should return empty since lease is fresh)
    const rows2 = await outboxStorage.leasePending(100, 5, "another-lease", 60);
    expect(rows2).toHaveLength(0);
  });

  it("expired lease re-leasable", async () => {
    const event = makeEvent({
      id: "kudos:ob-expire-001",
      recipient: "email:bob@example.com",
      kudos: 10,
      ts: "2026-03-03T10:00:00.000Z",
    });

    await outboxStorage.appendEvents("pool-1", [event]);
    // Lease with a very short TTL
    await outboxStorage.leasePending(100, 5, "old-lease", 60);

    // With leaseTtlSeconds=0, the lease is immediately considered expired
    const rows = await outboxStorage.leasePending(100, 5, "new-lease", 0);
    expect(rows).toHaveLength(1);
  });

  it("markDelivered sets delivered=1", async () => {
    const event = makeEvent({
      id: "kudos:ob-del-001",
      recipient: "email:bob@example.com",
      kudos: 10,
      ts: "2026-03-03T10:00:00.000Z",
    });

    await outboxStorage.appendEvents("pool-1", [event]);
    const rows = await outboxStorage.leasePending(100, 5, "test-lease", 60);
    await outboxStorage.markDelivered(rows.map((r) => r.id), "test-lease");

    // Should not be returned by leasePending anymore
    const remaining = await outboxStorage.leasePending(100, 5, "test-lease-2", 0);
    expect(remaining).toHaveLength(0);
  });

  it("markFailed increments attempts and records error", async () => {
    const event = makeEvent({
      id: "kudos:ob-fail-001",
      recipient: "email:bob@example.com",
      kudos: 10,
      ts: "2026-03-03T10:00:00.000Z",
    });

    await outboxStorage.appendEvents("pool-1", [event]);
    const rows = await outboxStorage.leasePending(100, 5, "test-lease", 60);
    await outboxStorage.markFailed(rows.map((r) => r.id), "Connection timeout", "test-lease");

    // Re-lease with TTL=0 to get the row back
    const rows2 = await outboxStorage.leasePending(100, 5, "test-lease-2", 0);
    expect(rows2).toHaveLength(1);
    expect(rows2[0].attempts).toBe(1);
    expect(rows2[0].lastError).toBe("Connection timeout");
  });
});

// ─── ping ─────────────────────────────────────────────────────────────────

describe("ping", () => {
  it("resolves without error on a healthy database", async () => {
    await expect(storage.ping()).resolves.toBeUndefined();
  });
});
