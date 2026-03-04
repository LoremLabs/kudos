import { describe, it, expect, beforeEach } from "vitest";
import { createTestServer, authHeader } from "./helpers/test-server.js";
import { SpyAuth } from "./helpers/mock-auth.js";
import type { TestContext } from "./helpers/test-server.js";

describe("auth plugin", () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = createTestServer();
  });

  it("returns 401 when Authorization header is missing", async () => {
    const res = await ctx.app.inject({
      method: "GET",
      url: "/core/v1/pools/pool1/events",
    });
    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 when Authorization header is malformed", async () => {
    const res = await ctx.app.inject({
      method: "GET",
      url: "/core/v1/pools/pool1/events",
      headers: { authorization: "Basic abc123" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("returns 401 for invalid token", async () => {
    const res = await ctx.app.inject({
      method: "GET",
      url: "/core/v1/pools/pool1/events",
      headers: { authorization: "Bearer bad-token" },
    });
    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.code).toBe("UNAUTHORIZED");
  });

  it("sets request.sender on valid token", async () => {
    const res = await ctx.app.inject({
      method: "GET",
      url: "/core/v1/pools/pool1/events",
      headers: { authorization: authHeader("email:alice@example.com") },
    });
    expect(res.statusCode).toBe(200);
  });

  it("all routes require auth", async () => {
    const routes = [
      { method: "GET" as const, url: "/core/v1/pools/pool1/events" },
      { method: "GET" as const, url: "/core/v1/pools/pool1/summary" },
      { method: "POST" as const, url: "/core/v1/pools/pool1/events" },
    ];

    for (const route of routes) {
      const res = await ctx.app.inject(route);
      expect(res.statusCode).toBe(401);
    }
  });

  it("passes action='append' for POST and action='read' for GET", async () => {
    const spyAuth = new SpyAuth();
    const spyCtx = createTestServer({ auth: spyAuth });

    // POST
    await spyCtx.app.inject({
      method: "POST",
      url: "/core/v1/pools/pool1/events",
      headers: {
        authorization: authHeader("email:alice@example.com"),
        "content-type": "application/json",
      },
      payload: {
        sender: "email:alice@example.com",
        events: [{ recipient: "email:bob@example.com" }],
      },
    });

    // GET events
    await spyCtx.app.inject({
      method: "GET",
      url: "/core/v1/pools/pool1/events",
      headers: { authorization: authHeader("email:alice@example.com") },
    });

    // GET summary
    await spyCtx.app.inject({
      method: "GET",
      url: "/core/v1/pools/pool1/summary",
      headers: { authorization: authHeader("email:alice@example.com") },
    });

    expect(spyAuth.calls[0].action).toBe("append");
    expect(spyAuth.calls[1].action).toBe("read");
    expect(spyAuth.calls[2].action).toBe("read");
  });
});
