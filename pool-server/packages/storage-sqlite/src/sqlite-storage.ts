import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { eq, and, desc, ne, gte, lt, or, sql, inArray } from "drizzle-orm";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type { Event, CursorPayload, RecipientSummary } from "@kudos-protocol/core";
import type {
  StoragePort,
  AppendResult,
  ReadEventsOptions,
  ReadEventsResult,
  ReadSummaryResult,
  OutboxPort,
  OutboxRow,
} from "@kudos-protocol/ports";
import * as schema from "./schema.js";

export interface SqliteStorageOptions {
  path: string;
  migrationsPath?: string;
  outbox?: boolean;
}

export class SqliteStorage implements StoragePort, OutboxPort {
  private sqlite: Database.Database;
  private db: BetterSQLite3Database<typeof schema>;
  private outboxEnabled: boolean;

  constructor(options: SqliteStorageOptions) {
    this.sqlite = new Database(options.path);
    this.sqlite.pragma("journal_mode = WAL");
    this.db = drizzle(this.sqlite, { schema });
    this.outboxEnabled = options.outbox ?? false;

    const migrationsFolder =
      options.migrationsPath ??
      path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "..",
        "drizzle",
      );
    migrate(this.db, { migrationsFolder });
  }

  close(): void {
    this.sqlite.close();
  }

  async ping(): Promise<void> {
    this.db.select({ poolId: schema.poolTotals.poolId }).from(schema.poolTotals).limit(1).all();
  }

  async appendEvents(poolId: string, events: Event[]): Promise<AppendResult> {
    return this.db.transaction((tx) => {
      let inserted = 0;
      let skipped = 0;
      const accepted: Event[] = [];

      for (const event of events) {
        const result = tx
          .insert(schema.events)
          .values({
            poolId,
            eventId: event.id,
            recipient: event.recipient,
            sender: event.sender,
            ts: event.ts,
            scopeId: event.scopeId,
            kudos: event.kudos,
            emoji: event.emoji,
            title: event.title,
            visibility: event.visibility,
            meta: event.meta,
          })
          .onConflictDoNothing({
            target: [schema.events.poolId, schema.events.eventId],
          })
          .run();

        if (result.changes === 0) {
          skipped++;
          accepted.push(event);
        } else {
          inserted++;
          accepted.push(event);
          this.updateProjections(tx, poolId, event);

          if (this.outboxEnabled) {
            tx.insert(schema.outbox)
              .values({
                poolId,
                eventId: event.id,
                payload: JSON.stringify(event),
              })
              .run();
          }
        }
      }

      return { inserted, skipped, events: accepted };
    });
  }

  private updateProjections(
    tx: Parameters<Parameters<BetterSQLite3Database<typeof schema>["transaction"]>[0]>[0],
    poolId: string,
    event: Event,
  ): void {
    let delta: number;

    if (event.scopeId === null) {
      // Branch A: no scopeId — always additive
      delta = event.kudos;
    } else {
      // Branch B: scopeId present — latest-wins
      const current = tx
        .select()
        .from(schema.poolScopeLatest)
        .where(
          and(
            eq(schema.poolScopeLatest.poolId, poolId),
            eq(schema.poolScopeLatest.recipient, event.recipient),
            eq(schema.poolScopeLatest.scopeId, event.scopeId),
          ),
        )
        .get();

      if (!current) {
        // B1: no existing row — insert, delta = event.kudos
        delta = event.kudos;
        tx.insert(schema.poolScopeLatest)
          .values({
            poolId,
            recipient: event.recipient,
            scopeId: event.scopeId,
            eventId: event.id,
            kudos: event.kudos,
            ts: event.ts,
          })
          .run();
      } else {
        // Deterministic tie-break: newer ts wins, or lexicographic eventId
        const isNewer =
          event.ts > current.ts ||
          (event.ts === current.ts && event.id > current.eventId);

        if (isNewer) {
          // B2: new event is newer — update scope_latest, delta = new - old
          delta = event.kudos - current.kudos;
          tx.update(schema.poolScopeLatest)
            .set({
              eventId: event.id,
              kudos: event.kudos,
              ts: event.ts,
            })
            .where(
              and(
                eq(schema.poolScopeLatest.poolId, poolId),
                eq(schema.poolScopeLatest.recipient, event.recipient),
                eq(schema.poolScopeLatest.scopeId, event.scopeId),
              ),
            )
            .run();
        } else {
          // B3: old event still newest — no change
          delta = 0;
        }
      }
    }

    // Apply delta to projection tables
    if (delta !== 0) {
      // Upsert poolRecipientTotals
      tx.insert(schema.poolRecipientTotals)
        .values({
          poolId,
          recipient: event.recipient,
          kudos: delta,
          emojis: "[]",
        })
        .onConflictDoUpdate({
          target: [
            schema.poolRecipientTotals.poolId,
            schema.poolRecipientTotals.recipient,
          ],
          set: {
            kudos: sql`${schema.poolRecipientTotals.kudos} + ${delta}`,
          },
        })
        .run();

      // Upsert poolTotals
      tx.insert(schema.poolTotals)
        .values({
          poolId,
          kudos: delta,
        })
        .onConflictDoUpdate({
          target: schema.poolTotals.poolId,
          set: {
            kudos: sql`${schema.poolTotals.kudos} + ${delta}`,
          },
        })
        .run();
    }

    // Update emojis if present
    if (event.emoji !== null) {
      // Ensure the recipient totals row exists
      tx.insert(schema.poolRecipientTotals)
        .values({
          poolId,
          recipient: event.recipient,
          kudos: 0,
          emojis: "[]",
        })
        .onConflictDoNothing({
          target: [
            schema.poolRecipientTotals.poolId,
            schema.poolRecipientTotals.recipient,
          ],
        })
        .run();

      const row = tx
        .select({ emojis: schema.poolRecipientTotals.emojis })
        .from(schema.poolRecipientTotals)
        .where(
          and(
            eq(schema.poolRecipientTotals.poolId, poolId),
            eq(schema.poolRecipientTotals.recipient, event.recipient),
          ),
        )
        .get();

      const emojis: string[] = JSON.parse(row?.emojis ?? "[]");
      if (!emojis.includes(event.emoji)) {
        emojis.push(event.emoji);
        tx.update(schema.poolRecipientTotals)
          .set({ emojis: JSON.stringify(emojis) })
          .where(
            and(
              eq(schema.poolRecipientTotals.poolId, poolId),
              eq(schema.poolRecipientTotals.recipient, event.recipient),
            ),
          )
          .run();
      }
    }
  }

  async readEvents(options: ReadEventsOptions): Promise<ReadEventsResult> {
    const conditions = [eq(schema.events.poolId, options.poolId)];

    if (!options.includeTombstones) {
      conditions.push(ne(schema.events.kudos, 0));
    }

    if (options.since) {
      conditions.push(gte(schema.events.ts, options.since));
    }

    if (options.until) {
      conditions.push(lt(schema.events.ts, options.until));
    }

    if (options.cursor) {
      conditions.push(
        or(
          lt(schema.events.ts, options.cursor.ts),
          and(
            eq(schema.events.ts, options.cursor.ts),
            lt(schema.events.eventId, options.cursor.id),
          ),
        )!,
      );
    }

    const rows = this.db
      .select()
      .from(schema.events)
      .where(and(...conditions))
      .orderBy(desc(schema.events.ts), desc(schema.events.eventId))
      .limit(options.limit + 1)
      .all();

    const hasMore = rows.length > options.limit;
    const page = hasMore ? rows.slice(0, options.limit) : rows;
    const mappedEvents = page.map(rowToEvent);

    let nextCursor: CursorPayload | null = null;
    if (hasMore && mappedEvents.length > 0) {
      const last = mappedEvents[mappedEvents.length - 1];
      nextCursor = { ts: last.ts, id: last.id };
    }

    return { events: mappedEvents, nextCursor, hasMore };
  }

  async readSummary(poolId: string, limit: number): Promise<ReadSummaryResult> {
    const totalsRow = this.db
      .select({ kudos: schema.poolTotals.kudos })
      .from(schema.poolTotals)
      .where(eq(schema.poolTotals.poolId, poolId))
      .get();

    const totalKudos = totalsRow?.kudos ?? 0;

    const rows = this.db
      .select()
      .from(schema.poolRecipientTotals)
      .where(eq(schema.poolRecipientTotals.poolId, poolId))
      .orderBy(desc(schema.poolRecipientTotals.kudos))
      .limit(limit)
      .all();

    const summary: RecipientSummary[] = rows.map((row) => ({
      recipient: row.recipient,
      kudos: row.kudos,
      emojis: JSON.parse(row.emojis),
      percent: 0,
    }));

    return { totalKudos, summary };
  }

  // ─── OutboxPort Implementation ──────────────────────────────────────────

  async leasePending(
    limit: number,
    maxAttempts: number,
    leaseId: string,
    leaseTtlSeconds: number,
  ): Promise<OutboxRow[]> {
    return this.db.transaction((tx) => {
      const rows = tx
        .select({
          id: schema.outbox.id,
          poolId: schema.outbox.poolId,
          eventId: schema.outbox.eventId,
          payload: schema.outbox.payload,
          createdAt: schema.outbox.createdAt,
          attempts: schema.outbox.attempts,
          lastError: schema.outbox.lastError,
        })
        .from(schema.outbox)
        .where(
          and(
            eq(schema.outbox.delivered, 0),
            lt(schema.outbox.attempts, maxAttempts),
            or(
              sql`${schema.outbox.leasedAt} IS NULL`,
              sql`${schema.outbox.leasedAt} <= datetime('now', '-${sql.raw(String(leaseTtlSeconds))} seconds')`,
            ),
          ),
        )
        .orderBy(schema.outbox.createdAt)
        .limit(limit)
        .all();

      if (rows.length === 0) return [];

      const ids = rows.map((r) => r.id);
      tx.update(schema.outbox)
        .set({
          leaseId,
          leasedAt: sql`datetime('now')`,
        })
        .where(inArray(schema.outbox.id, ids))
        .run();

      return rows;
    });
  }

  async markDelivered(ids: number[], leaseId: string): Promise<void> {
    if (ids.length === 0) return;
    this.db
      .update(schema.outbox)
      .set({
        delivered: 1,
        deliveredAt: sql`datetime('now')`,
      })
      .where(
        and(
          inArray(schema.outbox.id, ids),
          eq(schema.outbox.leaseId, leaseId),
        ),
      )
      .run();
  }

  async markFailed(ids: number[], error: string, leaseId: string): Promise<void> {
    if (ids.length === 0) return;
    this.db
      .update(schema.outbox)
      .set({
        attempts: sql`${schema.outbox.attempts} + 1`,
        lastError: error,
      })
      .where(
        and(
          inArray(schema.outbox.id, ids),
          eq(schema.outbox.leaseId, leaseId),
        ),
      )
      .run();
  }
}

function rowToEvent(row: typeof schema.events.$inferSelect): Event {
  return {
    id: row.eventId,
    recipient: row.recipient,
    sender: row.sender,
    ts: row.ts,
    scopeId: row.scopeId ?? null,
    kudos: row.kudos,
    emoji: row.emoji ?? null,
    title: row.title ?? null,
    visibility: row.visibility as Event["visibility"],
    meta: row.meta ?? null,
  };
}
