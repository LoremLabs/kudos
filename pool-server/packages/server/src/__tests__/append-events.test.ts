import { describe, it, expect, beforeEach } from "vitest";
import { createTestServer, authHeader } from "./helpers/test-server.js";
import type { TestContext } from "./helpers/test-server.js";

const SENDER = "email:alice@example.com";
const AUTH = authHeader(SENDER);
const POOL = "pool_test";
const URL = `/core/v1/pools/${POOL}/events`;

function post(ctx: TestContext, body: unknown, sender = SENDER) {
  return ctx.app.inject({
    method: "POST",
    url: URL,
    headers: { authorization: authHeader(sender), "content-type": "application/json" },
    payload: body,
  });
}

describe("POST /pools/:poolId/events", () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = createTestServer();
  });

  // --- Lax mode ---

  it("lax: accepts valid events", async () => {
    const res = await post(ctx, {
      sender: SENDER,
      mode: "lax",
      events: [
        { recipient: "email:bob@example.com", kudos: 10 },
        { recipient: "email:carol@example.com", kudos: 20 },
      ],
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("ok");
    expect(body.accepted).toBe(2);
    expect(body.rejected).toBe(0);
    expect(body.events).toHaveLength(2);
  });

  it("lax: skips invalid events and accepts valid ones (partial)", async () => {
    const res = await post(ctx, {
      sender: SENDER,
      mode: "lax",
      events: [
        { recipient: "email:bob@example.com", kudos: 10 },
        { recipient: SENDER, kudos: 5 }, // self-send → invalid
      ],
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("partial");
    expect(body.accepted).toBe(1);
    expect(body.rejected).toBe(1);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].index).toBe(1);
  });

  it("lax: returns 422 when all events are invalid", async () => {
    const res = await post(ctx, {
      sender: SENDER,
      mode: "lax",
      events: [
        { recipient: SENDER, kudos: 5 }, // self-send
      ],
    });
    expect(res.statusCode).toBe(422);
    const body = res.json();
    expect(body.status).toBe("error");
    expect(body.accepted).toBe(0);
    expect(body.rejected).toBe(1);
  });

  // --- Strict mode ---

  it("strict: accepts all valid events", async () => {
    const res = await post(ctx, {
      sender: SENDER,
      mode: "strict",
      events: [
        { recipient: "email:bob@example.com", kudos: 10 },
        { recipient: "email:carol@example.com", kudos: 20 },
      ],
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("ok");
    expect(body.accepted).toBe(2);
  });

  it("strict: rejects entire batch if any event is invalid", async () => {
    const res = await post(ctx, {
      sender: SENDER,
      mode: "strict",
      events: [
        { recipient: "email:bob@example.com", kudos: 10 },
        { recipient: SENDER, kudos: 5 }, // self-send
        { recipient: "email:carol@example.com", kudos: 9999 }, // exceeds max
      ],
    });
    expect(res.statusCode).toBe(422);
    const body = res.json();
    expect(body.status).toBe("error");
    expect(body.accepted).toBe(0);
    expect(body.rejected).toBe(3);
    // Errors are in stable (index) order
    expect(body.errors[0].index).toBe(1);
    expect(body.errors[1].index).toBe(2);
  });

  it("strict: returns all errors in stable order", async () => {
    const res = await post(ctx, {
      sender: SENDER,
      mode: "strict",
      events: [
        { recipient: "not-a-valid-subject", kudos: 50 },
        { recipient: "email:bob@example.com", kudos: 9999 },
      ],
    });
    expect(res.statusCode).toBe(422);
    const body = res.json();
    expect(body.errors).toHaveLength(2);
    expect(body.errors[0].index).toBe(0);
    expect(body.errors[1].index).toBe(1);
  });

  // --- Sender mismatch ---

  it("returns 403 when authenticated sender does not match body sender", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: URL,
      headers: {
        authorization: authHeader("email:eve@example.com"),
        "content-type": "application/json",
      },
      payload: {
        sender: SENDER,
        events: [{ recipient: "email:bob@example.com" }],
      },
    });
    expect(res.statusCode).toBe(403);
    const body = res.json();
    expect(body.code).toBe("FORBIDDEN");
  });

  // --- Batch size ---

  it("returns 413 when batch exceeds maxBatchSize", async () => {
    const smallCtx = createTestServer({ policy: { maxBatchSize: 2 } });
    const res = await smallCtx.app.inject({
      method: "POST",
      url: URL,
      headers: { authorization: AUTH, "content-type": "application/json" },
      payload: {
        sender: SENDER,
        events: [
          { recipient: "email:a@example.com" },
          { recipient: "email:b@example.com" },
          { recipient: "email:c@example.com" },
        ],
      },
    });
    expect(res.statusCode).toBe(413);
    const body = res.json();
    expect(body.code).toBe("BATCH_TOO_LARGE");
  });

  // --- Idempotent duplicate ---

  it("idempotent duplicate is accepted (skipped count)", async () => {
    const eventId = "kudos:test-dupe-id";
    const payload = {
      sender: SENDER,
      events: [{ id: eventId, recipient: "email:bob@example.com", kudos: 10 }],
    };

    // First append
    const res1 = await post(ctx, payload);
    expect(res1.statusCode).toBe(200);
    expect(res1.json().accepted).toBe(1);

    // Second append with same ID
    const res2 = await post(ctx, payload);
    expect(res2.statusCode).toBe(200);
    const body2 = res2.json();
    expect(body2.accepted).toBe(1); // still accepted (skipped)
    expect(body2.events).toHaveLength(1);
    expect(body2.events[0].id).toBe(eventId);
  });

  // --- Normalized fields ---

  it("events echo normalized fields (id, ts, sender, defaults)", async () => {
    const res = await post(ctx, {
      sender: SENDER,
      events: [{ recipient: "email:bob@example.com" }],
    });
    const body = res.json();
    const event = body.events[0];
    expect(event.id).toMatch(/^kudos:/);
    expect(event.ts).toBeDefined();
    expect(event.sender).toBe(SENDER);
    expect(event.kudos).toBe(1); // default
    expect(event.visibility).toBe("PRIVATE"); // default
    expect(event.emoji).toBeNull();
    expect(event.title).toBeNull();
    expect(event.meta).toBeNull();
    expect(event.scopeId).toBeNull();
  });

  // --- Sink ---

  it("sink is called on success", async () => {
    await post(ctx, {
      sender: SENDER,
      events: [{ recipient: "email:bob@example.com", kudos: 10 }],
    });
    expect(ctx.sink.published).toHaveLength(1);
    expect(ctx.sink.published[0].poolId).toBe(POOL);
    expect(ctx.sink.published[0].events).toHaveLength(1);
  });

  it("sink failure does not affect response or cause unhandled rejection", async () => {
    ctx.sink.shouldFail = true;
    const res = await post(ctx, {
      sender: SENDER,
      events: [{ recipient: "email:bob@example.com", kudos: 10 }],
    });
    // Response should still be 200
    expect(res.statusCode).toBe(200);
    expect(res.json().accepted).toBe(1);
  });

  // --- Default mode is lax ---

  it("defaults to lax mode when mode is omitted", async () => {
    const res = await post(ctx, {
      sender: SENDER,
      events: [
        { recipient: "email:bob@example.com", kudos: 10 },
        { recipient: SENDER, kudos: 5 }, // self-send → invalid
      ],
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("partial");
    expect(body.accepted).toBe(1);
  });

  // --- Validation body errors ---

  it("returns 422 for invalid request body (missing events)", async () => {
    const res = await post(ctx, { sender: SENDER });
    expect(res.statusCode).toBe(422);
  });

  it("returns 422 for invalid request body (bad sender format)", async () => {
    const res = await ctx.app.inject({
      method: "POST",
      url: URL,
      headers: { authorization: authHeader("email:alice@example.com"), "content-type": "application/json" },
      payload: {
        sender: "not-valid",
        events: [{ recipient: "email:bob@example.com" }],
      },
    });
    expect(res.statusCode).toBe(422);
  });
});
