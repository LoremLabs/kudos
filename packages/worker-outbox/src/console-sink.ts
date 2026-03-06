import type { Event } from "@kudos-protocol/pool-core";
import type { SinkPort, LoggerPort } from "@kudos-protocol/ports";

export class ConsoleSink implements SinkPort {
  private logger?: LoggerPort;

  constructor(logger?: LoggerPort) {
    this.logger = logger;
  }

  async publish(poolId: string, events: Event[]): Promise<void> {
    for (const e of events) {
      const message = `[ConsoleSink] pool=${poolId} id=${e.id} sender=${e.sender} recipient=${e.recipient} kudos=${e.kudos} emoji=${e.emoji ?? ""}`;
      if (this.logger) {
        this.logger.info(message, { poolId, id: e.id, sender: e.sender, recipient: e.recipient, kudos: e.kudos, emoji: e.emoji });
      } else {
        console.log(message);
      }
    }
  }
}
