import type { Event } from "@kudos-protocol/pool-core";
import type { SinkPort, LoggerPort } from "@kudos-protocol/ports";

export class ConsoleSink implements SinkPort {
  private logger?: LoggerPort;

  constructor(logger?: LoggerPort) {
    this.logger = logger;
  }

  async publish(poolId: string, events: Event[]): Promise<void> {
    const message = `[ConsoleSink] poolId=${poolId} events=${events.length}`;
    if (this.logger) {
      this.logger.info(message, { poolId, count: events.length });
    } else {
      console.log(message);
    }
  }
}
