import { describe, it, expect } from "vitest";
import { encodeCursor, decodeCursor } from "../cursor.js";
import { PoolServerError, ErrorCode } from "../errors.js";

describe("cursor", () => {
  it("round-trips a cursor payload", () => {
    const payload = { ts: "2026-03-03T14:20:00.000Z", id: "kudos:c3d4e5f6" };
    const encoded = encodeCursor(payload);
    const decoded = decodeCursor(encoded);

    expect(decoded.ts).toBe(payload.ts);
    expect(decoded.id).toBe(payload.id);
  });

  it("produces base64url output (no +, /, or =)", () => {
    const payload = { ts: "2026-03-03T14:20:00.000Z", id: "kudos:c3d4e5f6" };
    const encoded = encodeCursor(payload);
    expect(encoded).not.toMatch(/[+/=]/);
  });

  it("decodes the example cursor from paged response", () => {
    // This is the cursor from events-paged-response.json
    const cursor = "eyJ0cyI6IjIwMjYtMDMtMDNUMTQ6MjA6MDAuMDAwWiIsImlkIjoia3Vkb3M6YzNkNGU1ZjYifQ";
    const decoded = decodeCursor(cursor);
    expect(decoded.ts).toBe("2026-03-03T14:20:00.000Z");
    expect(decoded.id).toBe("kudos:c3d4e5f6");
  });

  it("throws PoolServerError on corrupt base64", () => {
    expect(() => decodeCursor("!!!not-valid-base64!!!")).toThrow(PoolServerError);
    try {
      decodeCursor("!!!not-valid-base64!!!");
    } catch (e) {
      expect(e).toBeInstanceOf(PoolServerError);
      expect((e as PoolServerError).code).toBe(ErrorCode.INVALID_CURSOR);
    }
  });

  it("throws PoolServerError on valid base64 but invalid JSON", () => {
    const badBase64 = btoa("not json");
    expect(() => decodeCursor(badBase64)).toThrow(PoolServerError);
  });

  it("throws PoolServerError on valid JSON but missing fields", () => {
    const badPayload = btoa(JSON.stringify({ ts: "2026-01-01T00:00:00.000Z" }));
    expect(() => decodeCursor(badPayload)).toThrow(PoolServerError);
  });

  it("throws PoolServerError on invalid timestamp format", () => {
    const badPayload = btoa(JSON.stringify({ ts: "not-a-date", id: "test" }));
    expect(() => decodeCursor(badPayload)).toThrow(PoolServerError);
  });
});
