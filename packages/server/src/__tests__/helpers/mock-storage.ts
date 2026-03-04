import type { Event, CursorPayload, RecipientSummary } from "@kudos-protocol/pool-core";
import type {
  StoragePort,
  AppendResult,
  ReadEventsOptions,
  ReadEventsResult,
  ReadSummaryResult,
} from "@kudos-protocol/ports";

/**
 * In-memory StoragePort implementation for testing.
 * Stores events per pool, maintains (ts DESC, id DESC) ordering.
 */
export class InMemoryStorage implements StoragePort {
  /** poolId → Event[] (sorted ts DESC, id DESC) */
  private pools = new Map<string, Event[]>();

  async ping(): Promise<void> {}

  async appendEvents(poolId: string, events: Event[]): Promise<AppendResult> {
    if (!this.pools.has(poolId)) {
      this.pools.set(poolId, []);
    }
    const pool = this.pools.get(poolId)!;

    let inserted = 0;
    let skipped = 0;
    const accepted: Event[] = [];

    for (const event of events) {
      const existing = pool.find((e) => e.id === event.id);
      if (existing) {
        skipped++;
        accepted.push(existing);
      } else {
        pool.push(event);
        inserted++;
        accepted.push(event);
      }
    }

    // Re-sort: ts DESC, id DESC
    pool.sort((a, b) => {
      const tsCmp = b.ts.localeCompare(a.ts);
      if (tsCmp !== 0) return tsCmp;
      return b.id.localeCompare(a.id);
    });

    return { inserted, skipped, events: accepted };
  }

  async readEvents(options: ReadEventsOptions): Promise<ReadEventsResult> {
    const pool = this.pools.get(options.poolId) ?? [];

    let filtered = pool;

    // Filter tombstones
    if (!options.includeTombstones) {
      filtered = filtered.filter((e) => e.kudos !== 0);
    }

    // Apply since filter (ts >= since)
    if (options.since) {
      filtered = filtered.filter((e) => e.ts >= options.since!);
    }

    // Apply until filter (ts < until)
    if (options.until) {
      filtered = filtered.filter((e) => e.ts < options.until!);
    }

    // Apply cursor: "after cursor" means strictly before in sort order
    // Sort is (ts DESC, id DESC), so "after" means older ts or same ts + smaller id
    if (options.cursor) {
      const { ts, id } = options.cursor;
      filtered = filtered.filter((e) => {
        if (e.ts < ts) return true;
        if (e.ts === ts && e.id < id) return true;
        return false;
      });
    }

    // Take limit + 1 to check hasMore
    const page = filtered.slice(0, options.limit + 1);
    const hasMore = page.length > options.limit;
    const events = hasMore ? page.slice(0, options.limit) : page;

    let nextCursor: CursorPayload | null = null;
    if (hasMore && events.length > 0) {
      const last = events[events.length - 1];
      nextCursor = { ts: last.ts, id: last.id };
    }

    return { events, nextCursor, hasMore };
  }

  async readSummary(poolId: string, limit: number): Promise<ReadSummaryResult> {
    const pool = this.pools.get(poolId) ?? [];

    // Aggregate kudos per recipient (exclude tombstones from totals)
    const totals = new Map<string, { kudos: number; emojis: Set<string> }>();
    for (const event of pool) {
      if (!totals.has(event.recipient)) {
        totals.set(event.recipient, { kudos: 0, emojis: new Set() });
      }
      const entry = totals.get(event.recipient)!;
      entry.kudos += event.kudos;
      if (event.emoji) {
        entry.emojis.add(event.emoji);
      }
    }

    let totalKudos = 0;
    const summary: RecipientSummary[] = [];
    for (const [recipient, data] of totals) {
      totalKudos += data.kudos;
      summary.push({
        recipient,
        kudos: data.kudos,
        emojis: [...data.emojis],
        percent: 0, // placeholder — server computes this
      });
    }

    // Sort by kudos descending
    summary.sort((a, b) => b.kudos - a.kudos);

    return {
      totalKudos,
      summary: summary.slice(0, limit),
    };
  }

  /** Test helper: get all events for a pool */
  getPool(poolId: string): Event[] {
    return this.pools.get(poolId) ?? [];
  }

  /** Test helper: clear all data */
  clear(): void {
    this.pools.clear();
  }
}
