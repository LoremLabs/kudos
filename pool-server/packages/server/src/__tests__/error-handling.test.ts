import { describe, it, expect, beforeEach } from "vitest";
import { createTestServer, authHeader } from "./helpers/test-server.js";
import { PoolServerError, ErrorCode, ErrorResponseSchema } from "@kudos-protocol/core";
import type { TestContext } from "./helpers/test-server.js";

describe("error handling", () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = createTestServer();
  });

  it("PoolServerError maps to correct HTTP status + JSON", async () => {
    const res = await ctx.app.inject({
      method: "GET",
      url: "/core/v1/pools/pool1/events",
      headers: { authorization: "Bearer bad-token" },
    });
    expect(res.statusCode).toBe(401);
    const body = res.json();
    expect(body.status).toBe("error");
    expect(body.code).toBe("UNAUTHORIZED");
    expect(body.message).toBeDefined();
  });

  it("error response matches ErrorResponseSchema", async () => {
    const res = await ctx.app.inject({
      method: "GET",
      url: "/core/v1/pools/pool1/events",
      headers: { authorization: "Bearer bad-token" },
    });
    const body = res.json();
    const result = ErrorResponseSchema.safeParse(body);
    expect(result.success).toBe(true);
  });

  it("Zod parse error returns 422 with VALIDATION_ERROR", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: "/core/v1/pools/pool1/events",
      headers: {
        authorization: authHeader("email:alice@example.com"),
        "content-type": "application/json",
      },
      payload: { sender: "email:alice@example.com", events: [] }, // empty events array → min(1) fails
    });
    expect(res.statusCode).toBe(422);
    const body = res.json();
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("unknown errors return 500 with INTERNAL_ERROR", async () => {
    // Force an internal error by making storage throw
    ctx.storage.appendEvents = async () => {
      throw new Error("Unexpected DB error");
    };

    const res = await ctx.app.inject({
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
    expect(res.statusCode).toBe(500);
    const body = res.json();
    expect(body.code).toBe("INTERNAL_ERROR");
  });
});
