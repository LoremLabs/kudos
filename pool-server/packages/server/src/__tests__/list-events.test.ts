import { describe, it, expect, beforeEach } from "vitest";
import { createTestServer, authHeader } from "./helpers/test-server.js";
import { encodeCursor } from "@kudos-protocol/core";
import type { TestContext } from "./helpers/test-server.js";
import type { Event } from "@kudos-protocol/core";

const SENDER = "email:alice@example.com";
const AUTH = authHeader(SENDER);
const POOL = "pool_test";
const URL = `/core/v1/pools/${POOL}/events`;

/** Insert events directly into storage for list tests. */
async function seedEvents(ctx: TestContext, events: Partial<Event>[]): Promise<Event[]> {
  const fullEvents: Event[] = events.map((e, i) => ({
    id: e.id ?? `kudos:test-${i}`,
    recipient: e.recipient ?? "email:bob@example.com",
    sender: e.sender ?? SENDER,
    ts: e.ts ?? `2026-03-01T00:00:0${i}.000Z`,
    scopeId: e.scopeId ?? null,
    kudos: e.kudos ?? 10,
    emoji: e.emoji ?? null,
    title: e.title ?? null,
    visibility: e.visibility ?? "PRIVATE",
    meta: e.meta ?? null,
  }));
  await ctx.storage.appendEvents(POOL, fullEvents);
  return fullEvents;
}

describe("GET /pools/:poolId/events", () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = createTestServer();
  });

  it("returns events in ts DESC order", async () => {
    await seedEvents(ctx, [
      { id: "e1", ts: "2026-03-01T00:00:01.000Z" },
      { id: "e2", ts: "2026-03-01T00:00:02.000Z" },
      { id: "e3", ts: "2026-03-01T00:00:03.000Z" },
    ]);

    const res = await ctx.app.inject({
      method: "GET",
      url: URL,
      headers: { authorization: AUTH },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.events[0].id).toBe("e3");
    expect(body.events[1].id).toBe("e2");
    expect(body.events[2].id).toBe("e1");
  });

  it("cursor pagination across pages", async () => {
    await seedEvents(ctx, [
      { id: "e1", ts: "2026-03-01T00:00:01.000Z" },
      { id: "e2", ts: "2026-03-01T00:00:02.000Z" },
      { id: "e3", ts: "2026-03-01T00:00:03.000Z" },
      { id: "e4", ts: "2026-03-01T00:00:04.000Z" },
      { id: "e5", ts: "2026-03-01T00:00:05.000Z" },
    ]);

    // Page 1: limit=2
    const res1 = await ctx.app.inject({
      method: "GET",
      url: `${URL}?limit=2`,
      headers: { authorization: AUTH },
    });
    const body1 = res1.json();
    expect(body1.events).toHaveLength(2);
    expect(body1.hasMore).toBe(true);
    expect(body1.nextCursor).toBeTruthy();

    // Page 2
    const res2 = await ctx.app.inject({
      method: "GET",
      url: `${URL}?limit=2&cursor=${body1.nextCursor}`,
      headers: { authorization: AUTH },
    });
    const body2 = res2.json();
    expect(body2.events).toHaveLength(2);
    expect(body2.hasMore).toBe(true);

    // Page 3
    const res3 = await ctx.app.inject({
      method: "GET",
      url: `${URL}?limit=2&cursor=${body2.nextCursor}`,
      headers: { authorization: AUTH },
    });
    const body3 = res3.json();
    expect(body3.events).toHaveLength(1);
    expect(body3.hasMore).toBe(false);
    expect(body3.nextCursor).toBeNull();

    // All 5 events across 3 pages
    const allIds = [
      ...body1.events.map((e: Event) => e.id),
      ...body2.events.map((e: Event) => e.id),
      ...body3.events.map((e: Event) => e.id),
    ];
    expect(allIds).toHaveLength(5);
    expect(new Set(allIds).size).toBe(5);
  });

  it("hasMore=false and nextCursor=null when no more results", async () => {
    await seedEvents(ctx, [{ id: "e1" }]);
    const res = await ctx.app.inject({
      method: "GET",
      url: `${URL}?limit=10`,
      headers: { authorization: AUTH },
    });
    const body = res.json();
    expect(body.hasMore).toBe(false);
    expect(body.nextCursor).toBeNull();
  });

  it("since filter returns events with ts >= since", async () => {
    await seedEvents(ctx, [
      { id: "e1", ts: "2026-03-01T00:00:01.000Z" },
      { id: "e2", ts: "2026-03-01T00:00:02.000Z" },
      { id: "e3", ts: "2026-03-01T00:00:03.000Z" },
    ]);

    const res = await ctx.app.inject({
      method: "GET",
      url: `${URL}?since=2026-03-01T00:00:02.000Z`,
      headers: { authorization: AUTH },
    });
    const body = res.json();
    expect(body.events).toHaveLength(2);
    expect(body.events.map((e: Event) => e.id).sort()).toEqual(["e2", "e3"]);
  });

  it("until filter returns events with ts < until", async () => {
    await seedEvents(ctx, [
      { id: "e1", ts: "2026-03-01T00:00:01.000Z" },
      { id: "e2", ts: "2026-03-01T00:00:02.000Z" },
      { id: "e3", ts: "2026-03-01T00:00:03.000Z" },
    ]);

    const res = await ctx.app.inject({
      method: "GET",
      url: `${URL}?until=2026-03-01T00:00:02.000Z`,
      headers: { authorization: AUTH },
    });
    const body = res.json();
    expect(body.events).toHaveLength(1);
    expect(body.events[0].id).toBe("e1");
  });

  it("includeTombstones=true includes tombstone events", async () => {
    await seedEvents(ctx, [
      { id: "e1", kudos: 10 },
      { id: "e2", kudos: 0, scopeId: "scope:1" }, // tombstone
    ]);

    // Without includeTombstones
    const res1 = await ctx.app.inject({
      method: "GET",
      url: URL,
      headers: { authorization: AUTH },
    });
    expect(res1.json().events).toHaveLength(1);

    // With includeTombstones
    const res2 = await ctx.app.inject({
      method: "GET",
      url: `${URL}?includeTombstones=true`,
      headers: { authorization: AUTH },
    });
    expect(res2.json().events).toHaveLength(2);
  });

  it("invalid cursor returns 400 with INVALID_CURSOR", async () => {
    const res = await ctx.app.inject({
      method: "GET",
      url: `${URL}?cursor=not-a-valid-cursor`,
      headers: { authorization: AUTH },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.code).toBe("INVALID_CURSOR");
  });

  it("empty pool returns empty array", async () => {
    const res = await ctx.app.inject({
      method: "GET",
      url: URL,
      headers: { authorization: AUTH },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.events).toEqual([]);
    expect(body.hasMore).toBe(false);
    expect(body.nextCursor).toBeNull();
  });

  it("respects limit parameter", async () => {
    await seedEvents(ctx, [
      { id: "e1", ts: "2026-03-01T00:00:01.000Z" },
      { id: "e2", ts: "2026-03-01T00:00:02.000Z" },
      { id: "e3", ts: "2026-03-01T00:00:03.000Z" },
    ]);

    const res = await ctx.app.inject({
      method: "GET",
      url: `${URL}?limit=1`,
      headers: { authorization: AUTH },
    });
    const body = res.json();
    expect(body.events).toHaveLength(1);
    expect(body.hasMore).toBe(true);
  });
});
