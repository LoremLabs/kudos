import { describe, it, expect, beforeEach } from "vitest";
import { createTestServer, authHeader } from "./helpers/test-server.js";
import type { TestContext } from "./helpers/test-server.js";
import type { Event } from "@kudos-protocol/pool-core";

const SENDER = "email:alice@example.com";
const AUTH = authHeader(SENDER);
const POOL = "pool_test";
const URL = `/core/v1/pools/${POOL}/distribution`;

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

describe("POST /pools/:poolId/distribution", () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = createTestServer();
  });

  it("returns distribution with correct shape and string encoding", async () => {
    await seedEvents(ctx, [
      { recipient: "email:bob@example.com", kudos: 100 },
      { recipient: "email:carol@example.com", kudos: 200 },
    ]);

    const res = await ctx.app.inject({
      method: "POST",
      url: URL,
      headers: { authorization: AUTH },
      payload: { totalPie: "3000" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("success");
    expect(body.poolId).toBe(POOL);
    expect(body.totalPie).toBe("3000");
    expect(body.totalKudos).toBe("300");
    expect(body.allocated).toBe("3000");
    expect(body.remainder).toBe("0");
    expect(body.roundingMode).toBe("LARGEST_REMAINDER");
    expect(body.itemCount).toBe(2);
    expect(body.items).toHaveLength(2);

    // All settlement values are base-10 strings
    for (const item of body.items) {
      expect(typeof item.kudos).toBe("string");
      expect(typeof item.points).toBe("string");
      expect(typeof item.shareNumerator).toBe("string");
      expect(typeof item.shareDenominator).toBe("string");
    }

    // Carol has 200/300 → 2000, Bob has 100/300 → 1000
    const carol = body.items.find((i: any) => i.recipient === "email:carol@example.com");
    const bob = body.items.find((i: any) => i.recipient === "email:bob@example.com");
    expect(carol.points).toBe("2000");
    expect(bob.points).toBe("1000");
  });

  it("sum of points equals totalPie", async () => {
    await seedEvents(ctx, [
      { recipient: "email:a@example.com", kudos: 1 },
      { recipient: "email:b@example.com", kudos: 1 },
      { recipient: "email:c@example.com", kudos: 1 },
    ]);

    const res = await ctx.app.inject({
      method: "POST",
      url: URL,
      headers: { authorization: AUTH },
      payload: { totalPie: "100" },
    });
    const body = res.json();
    const sum = body.items.reduce((s: bigint, i: any) => s + BigInt(i.points), 0n);
    expect(sum).toBe(100n);
  });

  it("empty pool returns remainder = totalPie and no items", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: URL,
      headers: { authorization: AUTH },
      payload: { totalPie: "5000" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.totalKudos).toBe("0");
    expect(body.remainder).toBe("5000");
    expect(body.items).toEqual([]);
    expect(body.itemCount).toBe(0);
  });

  it("missing totalPie returns 422", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: URL,
      headers: { authorization: AUTH },
      payload: {},
    });
    expect(res.statusCode).toBe(422);
  });

  it("non-numeric totalPie returns 422", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: URL,
      headers: { authorization: AUTH },
      payload: { totalPie: "abc" },
    });
    expect(res.statusCode).toBe(422);
  });

  it("zero totalPie returns 422", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: URL,
      headers: { authorization: AUTH },
      payload: { totalPie: "0" },
    });
    expect(res.statusCode).toBe(422);
  });

  it("negative totalPie returns 422", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: URL,
      headers: { authorization: AUTH },
      payload: { totalPie: "-100" },
    });
    expect(res.statusCode).toBe(422);
  });

  it("excludes zero-allocation items", async () => {
    // With totalPie=1 and 3 recipients each with 1 kudos,
    // only 1 recipient can get the single point
    await seedEvents(ctx, [
      { recipient: "email:a@example.com", kudos: 1 },
      { recipient: "email:b@example.com", kudos: 1 },
      { recipient: "email:c@example.com", kudos: 1 },
    ]);

    const res = await ctx.app.inject({
      method: "POST",
      url: URL,
      headers: { authorization: AUTH },
      payload: { totalPie: "1" },
    });
    const body = res.json();
    expect(body.items).toHaveLength(1);
    expect(body.itemCount).toBe(1);
    expect(body.items[0].points).toBe("1");
  });

  it("permission check: pool with permissions, unauthorized user gets 403", async () => {
    // Set permissions that only grant access to a different user
    await ctx.storage.setPoolMetadata(POOL, {
      permissions: ["u:other-hash:a", "u:other-hash:r", "u:other-hash:w"],
    });

    const res = await ctx.app.inject({
      method: "POST",
      url: URL,
      headers: { authorization: AUTH },
      payload: { totalPie: "1000" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("large totalPie as string works correctly", async () => {
    await seedEvents(ctx, [
      { recipient: "email:bob@example.com", kudos: 1 },
    ]);

    const largePie = "1" + "0".repeat(30);
    const res = await ctx.app.inject({
      method: "POST",
      url: URL,
      headers: { authorization: AUTH },
      payload: { totalPie: largePie },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    // Should be string-encoded since it exceeds MAX_SAFE_INTEGER
    expect(typeof body.totalPie).toBe("string");
    expect(body.totalPie).toBe(largePie);
  });
});
