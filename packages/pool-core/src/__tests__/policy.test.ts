import { describe, it, expect, beforeEach, vi } from "vitest";
import { DEFAULT_POLICY } from "../policy.js";
import { validateEvent } from "../validate.js";
import type { Event } from "../schemas/event.js";

const FIXED_TS = "2026-03-03T12:00:00.000Z";

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "kudos:test-id",
    recipient: "email:bob@example.com",
    sender: "email:alice@example.com",
    ts: FIXED_TS,
    scopeId: null,
    kudos: 100,
    emoji: null,
    title: null,
    visibility: "PRIVATE",
    meta: null,
    ...overrides,
  };
}

describe("DEFAULT_POLICY", () => {
  it("has sensible defaults", () => {
    expect(DEFAULT_POLICY.maxBatchSize).toBe(10_000);
    expect(DEFAULT_POLICY.maxKudos).toBe(5000);
    expect(DEFAULT_POLICY.maxEmojiGraphemes).toBe(3);
    expect(DEFAULT_POLICY.maxEmojiBytes).toBe(64);
    expect(DEFAULT_POLICY.maxTitleBytes).toBe(128);
    expect(DEFAULT_POLICY.maxEventIdBytes).toBe(255);
    expect(DEFAULT_POLICY.maxScopeIdLength).toBe(255);
    expect(DEFAULT_POLICY.clockSkewMs).toBe(5000);
    expect(DEFAULT_POLICY.allowSelfSend).toBe(false);
    expect(DEFAULT_POLICY.allowedVisibilities).toHaveLength(5);
  });
});

describe("policy overrides change validation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_TS));
  });

  it("custom maxKudos rejects events above the limit", () => {
    const result = validateEvent(makeEvent({ kudos: 100 }), { maxKudos: 50 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("50");
    }
  });

  it("custom maxKudos accepts events at the limit", () => {
    const result = validateEvent(makeEvent({ kudos: 50 }), { maxKudos: 50 });
    expect(result.ok).toBe(true);
  });

  it("custom maxTitleBytes changes title validation", () => {
    const title = "a".repeat(33);
    const result = validateEvent(makeEvent({ title }), { maxTitleBytes: 32 });
    expect(result.ok).toBe(false);
  });

  it("custom maxEmojiGraphemes changes emoji validation", () => {
    const result = validateEvent(
      makeEvent({ emoji: "\u{1F44D}\u{1F680}" }),
      { maxEmojiGraphemes: 1 },
    );
    expect(result.ok).toBe(false);
  });

  it("allowSelfSend: true permits self-send", () => {
    const result = validateEvent(
      makeEvent({
        sender: "email:alice@example.com",
        recipient: "email:alice@example.com",
      }),
      { allowSelfSend: true },
    );
    expect(result.ok).toBe(true);
  });

  it("restricted allowedVisibilities rejects non-listed visibilities", () => {
    const result = validateEvent(
      makeEvent({ visibility: "PUBLIC_ALL" }),
      { allowedVisibilities: ["PRIVATE", "RECIPIENT_SUMMARY"] },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("PUBLIC_ALL");
    }
  });

  it("custom clockSkewMs allows more future drift", () => {
    const future = new Date(new Date(FIXED_TS).getTime() + 30000).toISOString();
    const result = validateEvent(makeEvent({ ts: future }), { clockSkewMs: 60000 });
    expect(result.ok).toBe(true);
  });
});
