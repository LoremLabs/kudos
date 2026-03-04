import type { Event } from "@kudos-protocol/core";
import type { OutboxPort, OutboxRow, SinkPort, LoggerPort } from "@kudos-protocol/ports";

export interface OutboxWorkerOptions {
  outbox: OutboxPort;
  sink: SinkPort;
  logger?: LoggerPort;
  pollIntervalMs?: number;
  batchSize?: number;
  maxAttempts?: number;
  leaseTtlSeconds?: number;
}

export class OutboxWorker {
  private outbox: OutboxPort;
  private sink: SinkPort;
  private logger?: LoggerPort;
  private pollIntervalMs: number;
  private batchSize: number;
  private maxAttempts: number;
  private leaseTtlSeconds: number;
  private leaseId: string;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private draining: Promise<number> | null = null;
  private running = false;

  constructor(options: OutboxWorkerOptions) {
    this.outbox = options.outbox;
    this.sink = options.sink;
    this.logger = options.logger;
    this.pollIntervalMs = options.pollIntervalMs ?? 1000;
    this.batchSize = options.batchSize ?? 100;
    this.maxAttempts = options.maxAttempts ?? 5;
    this.leaseTtlSeconds = options.leaseTtlSeconds ?? 60;
    this.leaseId = randomLeaseId();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.scheduleNext();
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.draining) {
      await this.draining;
    }
  }

  async drain(): Promise<number> {
    const rows = await this.outbox.leasePending(
      this.batchSize,
      this.maxAttempts,
      this.leaseId,
      this.leaseTtlSeconds,
    );

    if (rows.length === 0) return 0;

    // Parse payloads and separate valid from invalid
    const valid: { row: OutboxRow; event: Event }[] = [];
    const invalid: { row: OutboxRow; error: string }[] = [];

    for (const row of rows) {
      try {
        const event = JSON.parse(row.payload) as Event;
        valid.push({ row, event });
      } catch (e) {
        invalid.push({
          row,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    // Group valid rows by poolId
    const groups = new Map<string, { rows: OutboxRow[]; events: Event[] }>();
    for (const { row, event } of valid) {
      let group = groups.get(row.poolId);
      if (!group) {
        group = { rows: [], events: [] };
        groups.set(row.poolId, group);
      }
      group.rows.push(row);
      group.events.push(event);
    }

    let delivered = 0;

    // Publish each pool group
    for (const [poolId, group] of groups) {
      const ids = group.rows.map((r) => r.id);
      try {
        await this.sink.publish(poolId, group.events);
        await this.outbox.markDelivered(ids, this.leaseId);
        delivered += ids.length;
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        await this.outbox.markFailed(ids, errorMsg, this.leaseId);

        // Log poison rows at threshold
        for (const row of group.rows) {
          if (row.attempts + 1 === this.maxAttempts) {
            this.logger?.error(
              `Poison row: outbox id=${row.id} reached maxAttempts=${this.maxAttempts}`,
              { outboxId: row.id, poolId: row.poolId, eventId: row.eventId },
            );
          }
        }
      }
    }

    // Mark unparseable rows as failed
    if (invalid.length > 0) {
      const badIds = invalid.map((i) => i.row.id);
      const errorMsg = `Invalid JSON payload: ${invalid[0].error}`;
      await this.outbox.markFailed(badIds, errorMsg, this.leaseId);

      for (const { row } of invalid) {
        if (row.attempts + 1 === this.maxAttempts) {
          this.logger?.error(
            `Poison row: outbox id=${row.id} reached maxAttempts=${this.maxAttempts}`,
            { outboxId: row.id, poolId: row.poolId, eventId: row.eventId },
          );
        }
      }
    }

    return delivered;
  }

  private scheduleNext(): void {
    if (!this.running) return;
    this.timer = setTimeout(async () => {
      this.draining = this.drain();
      try {
        await this.draining;
      } catch {
        // errors logged inside drain; keep polling
      } finally {
        this.draining = null;
        this.scheduleNext();
      }
    }, this.pollIntervalMs);
  }
}

function randomLeaseId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
