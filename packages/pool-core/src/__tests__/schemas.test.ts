import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  EventInputSchema,
  EventSchema,
  AppendEventsRequestSchema,
  AppendEventsResponseSchema,
  ListEventsResponseSchema,
  PoolSummaryResponseSchema,
  ErrorResponseSchema,
  SubjectSchema,
  VisibilitySchema,
} from "../schemas/index.js";

const EXAMPLES_DIR = resolve(import.meta.dirname, "../../../../docs/protocol/examples");

function readExample(name: string) {
  return JSON.parse(readFileSync(resolve(EXAMPLES_DIR, name), "utf-8"));
}

describe("SubjectSchema", () => {
  it("accepts valid subjects", () => {
    expect(SubjectSchema.safeParse("email:bob@example.com").success).toBe(true);
    expect(SubjectSchema.safeParse("twitter:dave_dev").success).toBe(true);
    expect(SubjectSchema.safeParse("did:abc:123").success).toBe(true);
    expect(SubjectSchema.safeParse("UPPER:case").success).toBe(true);
    expect(SubjectSchema.safeParse("email+hash:user@example.com").success).toBe(true);
    expect(SubjectSchema.safeParse("did.web:example.com").success).toBe(true);
    expect(SubjectSchema.safeParse("X509:cert-id").success).toBe(true);
    expect(SubjectSchema.safeParse("type123:id").success).toBe(true);
  });

  it("rejects invalid subjects", () => {
    expect(SubjectSchema.safeParse("").success).toBe(false);
    expect(SubjectSchema.safeParse("nocolon").success).toBe(false);
    expect(SubjectSchema.safeParse(":notype").success).toBe(false);
    expect(SubjectSchema.safeParse("email: space").success).toBe(false);
    expect(SubjectSchema.safeParse("has space:id").success).toBe(false);
    expect(SubjectSchema.safeParse("a".repeat(129) + ":id").success).toBe(false);
  });
});

describe("VisibilitySchema", () => {
  it("accepts all valid visibilities", () => {
    for (const v of ["PRIVATE", "RECIPIENT_SUMMARY", "RECIPIENT_ALL", "PUBLIC_SUMMARY", "PUBLIC_ALL"]) {
      expect(VisibilitySchema.safeParse(v).success).toBe(true);
    }
  });

  it("rejects invalid visibilities", () => {
    expect(VisibilitySchema.safeParse("public").success).toBe(false);
    expect(VisibilitySchema.safeParse("UNKNOWN").success).toBe(false);
  });
});

describe("EventInputSchema", () => {
  it("accepts minimal input (just recipient)", () => {
    const result = EventInputSchema.safeParse({ recipient: "email:bob@example.com" });
    expect(result.success).toBe(true);
  });

  it("accepts full input", () => {
    const result = EventInputSchema.safeParse({
      id: "kudos:test-id",
      recipient: "email:bob@example.com",
      ts: "2026-03-03T12:00:00Z",
      scopeId: "dp:2026-03-03",
      kudos: 100,
      emoji: "\u{1F44D}",
      title: "Great work",
      visibility: "RECIPIENT_SUMMARY",
      meta: '{"source":"web"}',
    });
    expect(result.success).toBe(true);
  });

  it("accepts kudos > 5000 at schema level (business rule enforced by validateEvent)", () => {
    const result = EventInputSchema.safeParse({
      recipient: "email:bob@example.com",
      kudos: 9999,
    });
    expect(result.success).toBe(true);
  });

  it("rejects kudos < 0", () => {
    const result = EventInputSchema.safeParse({
      recipient: "email:bob@example.com",
      kudos: -1,
    });
    expect(result.success).toBe(false);
  });

  it("accepts any non-empty recipient string at schema level (format validated by validateEvent)", () => {
    const result = EventInputSchema.safeParse({
      recipient: "not-a-valid-subject",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty recipient", () => {
    const result = EventInputSchema.safeParse({
      recipient: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("EventSchema", () => {
  it("accepts a fully normalized event", () => {
    const result = EventSchema.safeParse({
      id: "kudos:a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      recipient: "email:bob@example.com",
      sender: "email:alice@example.com",
      ts: "2026-03-03T14:30:00.000Z",
      scopeId: null,
      kudos: 100,
      emoji: "\u{1F44D}",
      title: "Great PR review",
      visibility: "RECIPIENT_SUMMARY",
      meta: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects event missing required fields", () => {
    const result = EventSchema.safeParse({
      id: "kudos:test",
      recipient: "email:bob@example.com",
    });
    expect(result.success).toBe(false);
  });
});

describe("AppendEventsRequestSchema", () => {
  it("accepts valid request with defaults", () => {
    const result = AppendEventsRequestSchema.safeParse({
      sender: "email:alice@example.com",
      events: [{ recipient: "email:bob@example.com" }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mode).toBe("lax");
    }
  });

  it("rejects empty events array", () => {
    const result = AppendEventsRequestSchema.safeParse({
      sender: "email:alice@example.com",
      events: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("example files parse correctly", () => {
  it("parses append-events-lax.json request body", () => {
    const example = readExample("append-events-lax.json");
    const result = AppendEventsRequestSchema.safeParse(example.request.body);
    expect(result.success).toBe(true);
  });

  it("parses append-events-lax.json response body", () => {
    const example = readExample("append-events-lax.json");
    const result = AppendEventsResponseSchema.safeParse(example.response.body);
    expect(result.success).toBe(true);
  });

  it("parses append-events-strict.json request body", () => {
    const example = readExample("append-events-strict.json");
    const result = AppendEventsRequestSchema.safeParse(example.request.body);
    expect(result.success).toBe(true);
  });

  it("parses append-events-strict.json response body", () => {
    const example = readExample("append-events-strict.json");
    const result = AppendEventsResponseSchema.safeParse(example.response.body);
    expect(result.success).toBe(true);
  });

  it("parses summary-response.json", () => {
    const example = readExample("summary-response.json");
    const result = PoolSummaryResponseSchema.safeParse(example.response.body);
    expect(result.success).toBe(true);
  });

  it("parses events-paged-response.json", () => {
    const example = readExample("events-paged-response.json");
    const result = ListEventsResponseSchema.safeParse(example.response.body);
    expect(result.success).toBe(true);
  });

  it("parses tombstone.json request body", () => {
    const example = readExample("tombstone.json");
    const result = AppendEventsRequestSchema.safeParse(example.request.body);
    expect(result.success).toBe(true);
  });

  it("parses tombstone.json response body", () => {
    const example = readExample("tombstone.json");
    const result = AppendEventsResponseSchema.safeParse(example.response.body);
    expect(result.success).toBe(true);
  });
});
