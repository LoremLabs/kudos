import type { Event } from "@kudos-protocol/pool-core";

export interface SinkPort {
  /**
   * Publish accepted events to a downstream system.
   * Best-effort in the hot path — production should use the outbox pattern (Phase 4).
   */
  publish(poolId: string, events: Event[]): Promise<void>;
}
