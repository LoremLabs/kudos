import { describe, it, expect, beforeEach } from "vitest";
import { createTestServer, authHeader } from "./helpers/test-server.js";
import type { TestContext } from "./helpers/test-server.js";
import type { Event } from "@kudos-protocol/pool-core";

const SENDER = "email:alice@example.com";
const AUTH = authHeader(SENDER);
const POOL = "pool_test";
const URL = `/core/v1/pools/${POOL}/summary`;

async function seedEvents(ctx: TestContext, events: Partial<Event>[]): Promise<void> {
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
}

describe("GET /pools/:poolId/summary", () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = createTestServer();
  });

  it("returns totalKudos and ranked summary", async () => {
    await seedEvents(ctx, [
      { recipient: "email:bob@example.com", kudos: 100 },
      { recipient: "email:carol@example.com", kudos: 200 },
      { recipient: "email:bob@example.com", kudos: 50 },
    ]);

    const res = await ctx.app.inject({
      method: "GET",
      url: URL,
      headers: { authorization: AUTH },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.totalKudos).toBe(350);
    expect(body.summary).toHaveLength(2);
    // Carol has 200, Bob has 150 → Carol first
    expect(body.summary[0].recipient).toBe("email:carol@example.com");
    expect(body.summary[0].kudos).toBe(200);
    expect(body.summary[1].recipient).toBe("email:bob@example.com");
    expect(body.summary[1].kudos).toBe(150);
  });

  it("percentages are correct to 2 decimal places", async () => {
    await seedEvents(ctx, [
      { recipient: "email:bob@example.com", kudos: 100 },
      { recipient: "email:carol@example.com", kudos: 200 },
    ]);

    const res = await ctx.app.inject({
      method: "GET",
      url: URL,
      headers: { authorization: AUTH },
    });
    const body = res.json();
    // bob: 100/300 = 33.33%, carol: 200/300 = 66.67%
    expect(body.summary[0].percent).toBeCloseTo(66.67, 2);
    expect(body.summary[1].percent).toBeCloseTo(33.33, 2);
  });

  it("empty pool returns totalKudos=0 and empty summary", async () => {
    const res = await ctx.app.inject({
      method: "GET",
      url: URL,
      headers: { authorization: AUTH },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.totalKudos).toBe(0);
    expect(body.summary).toEqual([]);
  });

  it("limit controls recipient count", async () => {
    await seedEvents(ctx, [
      { recipient: "email:a@example.com", kudos: 100 },
      { recipient: "email:b@example.com", kudos: 200 },
      { recipient: "email:c@example.com", kudos: 300 },
    ]);

    const res = await ctx.app.inject({
      method: "GET",
      url: `${URL}?limit=2`,
      headers: { authorization: AUTH },
    });
    const body = res.json();
    expect(body.summary).toHaveLength(2);
    expect(body.summary[0].recipient).toBe("email:c@example.com");
    expect(body.summary[1].recipient).toBe("email:b@example.com");
  });

  it("single recipient gets 100%", async () => {
    await seedEvents(ctx, [
      { recipient: "email:bob@example.com", kudos: 42 },
    ]);

    const res = await ctx.app.inject({
      method: "GET",
      url: URL,
      headers: { authorization: AUTH },
    });
    const body = res.json();
    expect(body.summary).toHaveLength(1);
    expect(body.summary[0].percent).toBe(100);
    expect(body.summary[0].kudos).toBe(42);
  });

  it("includes emojis in summary", async () => {
    await seedEvents(ctx, [
      { recipient: "email:bob@example.com", kudos: 10, emoji: "👍" },
      { recipient: "email:bob@example.com", kudos: 20, emoji: "🚀" },
      { recipient: "email:bob@example.com", kudos: 5, emoji: "👍" }, // duplicate emoji
    ]);

    const res = await ctx.app.inject({
      method: "GET",
      url: URL,
      headers: { authorization: AUTH },
    });
    const body = res.json();
    expect(body.summary[0].emojis).toHaveLength(2);
    expect(body.summary[0].emojis).toContain("👍");
    expect(body.summary[0].emojis).toContain("🚀");
  });

  it("totalKudos includes all recipients even beyond limit", async () => {
    await seedEvents(ctx, [
      { recipient: "email:a@example.com", kudos: 100 },
      { recipient: "email:b@example.com", kudos: 200 },
      { recipient: "email:c@example.com", kudos: 300 },
    ]);

    const res = await ctx.app.inject({
      method: "GET",
      url: `${URL}?limit=1`,
      headers: { authorization: AUTH },
    });
    const body = res.json();
    expect(body.totalKudos).toBe(600);
    expect(body.summary).toHaveLength(1);
  });

  it("percent is 0 when totalKudos is 0", async () => {
    // Seed events with kudos=0 (tombstones)
    await seedEvents(ctx, [
      { recipient: "email:bob@example.com", kudos: 0, scopeId: "scope:1" },
    ]);

    const res = await ctx.app.inject({
      method: "GET",
      url: URL,
      headers: { authorization: AUTH },
    });
    const body = res.json();
    if (body.summary.length > 0) {
      expect(body.summary[0].percent).toBe(0);
    }
  });
});
