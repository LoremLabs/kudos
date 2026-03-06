import { describe, it, expect, vi } from "vitest";
import { ConsoleSink } from "../console-sink.js";
import type { LoggerPort } from "@kudos-protocol/ports";
import type { Event } from "@kudos-protocol/pool-core";

function makeEvent(id: string): Event {
  return {
    id,
    recipient: "email:bob@example.com",
    sender: "email:alice@example.com",
    ts: "2026-03-03T12:00:00.000Z",
    scopeId: null,
    kudos: 10,
    emoji: null,
    title: null,
    visibility: "PRIVATE",
    meta: null,
  };
}

describe("ConsoleSink", () => {
  it("calls logger.info with message", async () => {
    const logger: LoggerPort = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const sink = new ConsoleSink(logger);
    await sink.publish("pool-1", [makeEvent("kudos:cs-001")]);

    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("pool=pool-1"),
      expect.objectContaining({ poolId: "pool-1", sender: "email:alice@example.com", recipient: "email:bob@example.com" }),
    );
  });

  it("works without logger", async () => {
    const sink = new ConsoleSink();
    // Should not throw
    await expect(
      sink.publish("pool-1", [makeEvent("kudos:cs-002")]),
    ).resolves.toBeUndefined();
  });
});
