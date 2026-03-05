import { describe, it, expect, beforeEach, vi } from "vitest";
import { validateEvent } from "../validate.js";
import { normalizeEvent } from "../normalize.js";
import type { EventInput } from "../schemas/event-input.js";
import type { Event } from "../schemas/event.js";

const FIXED_TS = "2026-03-03T12:00:00.000Z";
const FIXED_NOW = new Date(FIXED_TS).getTime();

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

describe("validateEvent", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_TS));
  });

  it("accepts a valid event", () => {
    const result = validateEvent(makeEvent());
    expect(result.ok).toBe(true);
  });

  describe("subject validation", () => {
    it("rejects invalid recipient format", () => {
      const result = validateEvent(makeEvent({ recipient: "no-colon" as any }));
      expect(result.ok).toBe(false);
    });

    it("accepts uppercase type in recipient", () => {
      const result = validateEvent(makeEvent({ recipient: "UPPER:case" }));
      expect(result.ok).toBe(true);
    });

    it("rejects email without @", () => {
      const result = validateEvent(makeEvent({ recipient: "email:noemail" }));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain("@");
      }
    });

    it("accepts email with @", () => {
      const result = validateEvent(makeEvent({ recipient: "email:user@example.com" }));
      expect(result.ok).toBe(true);
    });

    it("accepts non-email subject without @", () => {
      const result = validateEvent(makeEvent({ recipient: "twitter:dave_dev" }));
      expect(result.ok).toBe(true);
    });
  });

  describe("self-send", () => {
    it("rejects self-send by default", () => {
      const result = validateEvent(
        makeEvent({
          sender: "email:alice@example.com",
          recipient: "email:alice@example.com",
        }),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain("same");
      }
    });

    it("allows self-send when policy permits", () => {
      const result = validateEvent(
        makeEvent({
          sender: "email:alice@example.com",
          recipient: "email:alice@example.com",
        }),
        { allowSelfSend: true },
      );
      expect(result.ok).toBe(true);
    });
  });

  describe("timestamp validation", () => {
    it("accepts current time", () => {
      const result = validateEvent(makeEvent({ ts: FIXED_TS }));
      expect(result.ok).toBe(true);
    });

    it("accepts time within clock skew", () => {
      const withinSkew = new Date(FIXED_NOW + 4000).toISOString();
      const result = validateEvent(makeEvent({ ts: withinSkew }));
      expect(result.ok).toBe(true);
    });

    it("rejects time beyond clock skew", () => {
      const future = new Date(FIXED_NOW + 60000).toISOString();
      const result = validateEvent(makeEvent({ ts: future }));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain("future");
      }
    });

    it("respects custom clockSkewMs", () => {
      const future = new Date(FIXED_NOW + 60000).toISOString();
      const result = validateEvent(makeEvent({ ts: future }), { clockSkewMs: 120000 });
      expect(result.ok).toBe(true);
    });
  });

  describe("emoji validation", () => {
    it("accepts single emoji", () => {
      const result = validateEvent(makeEvent({ emoji: "\u{1F44D}" }));
      expect(result.ok).toBe(true);
    });

    it("accepts 3 emoji grapheme clusters", () => {
      const result = validateEvent(makeEvent({ emoji: "\u{1F44D}\u{1F680}\u{2764}\u{FE0F}" }));
      expect(result.ok).toBe(true);
    });

    it("rejects more than 3 grapheme clusters", () => {
      const result = validateEvent(makeEvent({ emoji: "\u{1F44D}\u{1F680}\u{2764}\u{FE0F}\u{1F31F}" }));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain("grapheme");
      }
    });

    it("accepts null emoji", () => {
      const result = validateEvent(makeEvent({ emoji: null }));
      expect(result.ok).toBe(true);
    });
  });

  describe("title validation", () => {
    it("accepts short title", () => {
      const result = validateEvent(makeEvent({ title: "Good work" }));
      expect(result.ok).toBe(true);
    });

    it("accepts title up to 128 bytes", () => {
      const title = "a".repeat(128);
      const result = validateEvent(makeEvent({ title }));
      expect(result.ok).toBe(true);
    });

    it("rejects title over 128 bytes", () => {
      const title = "a".repeat(129);
      const result = validateEvent(makeEvent({ title }));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain("128");
      }
    });

    it("counts multi-byte characters correctly", () => {
      // Each CJK character is 3 bytes in UTF-8
      const title = "\u4e16".repeat(43); // 43 * 3 = 129 bytes
      const result = validateEvent(makeEvent({ title }));
      expect(result.ok).toBe(false);
    });

    it("accepts null title", () => {
      const result = validateEvent(makeEvent({ title: null }));
      expect(result.ok).toBe(true);
    });
  });

  describe("event ID validation", () => {
    it("accepts opaque string IDs", () => {
      const result = validateEvent(makeEvent({ id: "my-custom-id-12345" }));
      expect(result.ok).toBe(true);
    });

    it("rejects ID with whitespace", () => {
      const result = validateEvent(makeEvent({ id: "has space" }));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain("whitespace");
      }
    });

    it("rejects ID exceeding 255 bytes", () => {
      const longId = "x".repeat(256);
      const result = validateEvent(makeEvent({ id: longId }));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain("255");
      }
    });
  });

  describe("tombstone validation", () => {
    it("accepts tombstone with scopeId", () => {
      const result = validateEvent(makeEvent({ kudos: 0, scopeId: "review:pr-1042" }));
      expect(result.ok).toBe(true);
    });

    it("rejects tombstone without scopeId", () => {
      const result = validateEvent(makeEvent({ kudos: 0, scopeId: null }));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain("scopeId");
      }
    });
  });

  describe("kudos range", () => {
    it("accepts kudos=0 (tombstone) with scopeId", () => {
      const result = validateEvent(makeEvent({ kudos: 0, scopeId: "scope:1" }));
      expect(result.ok).toBe(true);
    });

    it("accepts kudos at max (5000)", () => {
      const result = validateEvent(makeEvent({ kudos: 5000 }));
      expect(result.ok).toBe(true);
    });

    it("respects custom maxKudos", () => {
      const result = validateEvent(makeEvent({ kudos: 100 }), { maxKudos: 50 });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toContain("50");
      }
    });
  });

  describe("custom subject validation hook", () => {
    it("runs custom validation", () => {
      const result = validateEvent(makeEvent({ recipient: "email:test@blocked.com" }), {
        validateSubject: (s) =>
          s.includes("blocked") ? { ok: false, message: "Blocked domain" } : { ok: true },
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.message).toBe("Blocked domain");
      }
    });
  });
});
