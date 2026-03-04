import type { Event } from "@kudos-protocol/core";
import type { SinkPort } from "@kudos-protocol/ports";

export class MockSink implements SinkPort {
  published: { poolId: string; events: Event[] }[] = [];
  failForPools: Set<string> = new Set();
  failError = "Sink error";

  async publish(poolId: string, events: Event[]): Promise<void> {
    if (this.failForPools.has(poolId)) {
      throw new Error(this.failError);
    }
    this.published.push({ poolId, events });
  }
}
