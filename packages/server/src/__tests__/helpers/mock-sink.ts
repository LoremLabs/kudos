import type { Event } from "@kudos-protocol/pool-core";
import type { SinkPort } from "@kudos-protocol/ports";

/**
 * Mock SinkPort for testing. Records all published events.
 */
export class MockSink implements SinkPort {
  published: Array<{ poolId: string; events: Event[] }> = [];
  shouldFail = false;

  async publish(poolId: string, events: Event[]): Promise<void> {
    if (this.shouldFail) {
      throw new Error("Sink failure (mock)");
    }
    this.published.push({ poolId, events });
  }

  clear(): void {
    this.published = [];
    this.shouldFail = false;
  }
}
