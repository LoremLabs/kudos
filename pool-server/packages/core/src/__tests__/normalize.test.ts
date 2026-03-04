import { describe, it, expect } from "vitest";
import { normalizeEvent } from "../normalize.js";
import type { EventInput } from "../schemas/event-input.js";

const FIXED_TS = "2026-03-03T12:00:00.000Z";
const FIXED_ID = "kudos:test-uuid-1234";
const SENDER = "email:alice@example.com";

function makeCtx(overrides = {}) {
  return {
    sender: SENDER,
    now: () => FIXED_TS,
    generateId: () => FIXED_ID,
    ...overrides,
  };
}

describe("normalizeEvent", () => {
  it("fills all defaults for minimal input", () => {
    const input: EventInput = { recipient: "email:bob@example.com" };
    const event = normalizeEvent(input, makeCtx());

    expect(event.id).toBe(FIXED_ID);
    expect(event.recipient).toBe("email:bob@example.com");
    expect(event.sender).toBe(SENDER);
    expect(event.ts).toBe(FIXED_TS);
    expect(event.scopeId).toBeNull();
    expect(event.kudos).toBe(1);
    expect(event.emoji).toBeNull();
    expect(event.title).toBeNull();
    expect(event.visibility).toBe("PRIVATE");
    expect(event.meta).toBeNull();
  });

  it("preserves provided fields", () => {
    const input: EventInput = {
      id: "my-custom-id",
      recipient: "email:bob@example.com",
      ts: "2026-01-01T00:00:00.000Z",
      scopeId: "dp:2026-01-01",
      kudos: 500,
      emoji: "\u{1F680}",
      title: "Ship it",
      visibility: "PUBLIC_ALL",
      meta: '{"key":"value"}',
    };
    const event = normalizeEvent(input, makeCtx());

    expect(event.id).toBe("my-custom-id");
    expect(event.ts).toBe("2026-01-01T00:00:00.000Z");
    expect(event.scopeId).toBe("dp:2026-01-01");
    expect(event.kudos).toBe(500);
    expect(event.emoji).toBe("\u{1F680}");
    expect(event.title).toBe("Ship it");
    expect(event.visibility).toBe("PUBLIC_ALL");
    expect(event.meta).toBe('{"key":"value"}');
  });

  it("uses injectable clock for ts", () => {
    const customTime = "2025-12-25T00:00:00.000Z";
    const input: EventInput = { recipient: "email:bob@example.com" };
    const event = normalizeEvent(input, makeCtx({ now: () => customTime }));
    expect(event.ts).toBe(customTime);
  });

  it("uses injectable id generator", () => {
    const customId = "custom:my-id";
    const input: EventInput = { recipient: "email:bob@example.com" };
    const event = normalizeEvent(input, makeCtx({ generateId: () => customId }));
    expect(event.id).toBe(customId);
  });

  it("attaches sender from context", () => {
    const input: EventInput = { recipient: "email:bob@example.com" };
    const event = normalizeEvent(input, makeCtx({ sender: "email:custom@example.com" }));
    expect(event.sender).toBe("email:custom@example.com");
  });

  it("nullifies missing optional fields", () => {
    const input: EventInput = { recipient: "email:bob@example.com", kudos: 100 };
    const event = normalizeEvent(input, makeCtx());

    expect(event.scopeId).toBeNull();
    expect(event.emoji).toBeNull();
    expect(event.title).toBeNull();
    expect(event.meta).toBeNull();
  });

  it("produces valid tombstone shape (kudos=0 with scopeId)", () => {
    const input: EventInput = {
      recipient: "email:bob@example.com",
      scopeId: "review:pr-1042",
      kudos: 0,
    };
    const event = normalizeEvent(input, makeCtx());

    expect(event.kudos).toBe(0);
    expect(event.scopeId).toBe("review:pr-1042");
  });

  it("generates kudos:<base64url-uuidv7> IDs by default", () => {
    const input: EventInput = { recipient: "email:bob@example.com" };
    const event = normalizeEvent(input, {
      sender: SENDER,
      now: () => FIXED_TS,
      // no generateId override — use the real default
    });

    expect(event.id).toMatch(/^kudos:[A-Za-z0-9\-_]{22}$/);
  });
});
