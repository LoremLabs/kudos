import { eq, and, desc, ne, gte, lt, or, sql, inArray } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import type { Event, CursorPayload, RecipientSummary } from "@kudos-protocol/pool-core";
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

type AnyPgDb = PgDatabase<any, typeof schema, any>;

export interface PostgresStorageOptions {
  url: string;
  migrationsPath?: string;
  outbox?: boolean;
}

export class PostgresStorage implements StoragePort, OutboxPort {
  private db: AnyPgDb;
  private outboxEnabled: boolean;
  private closeFn: (() => Promise<void>) | undefined;

  constructor(
    db: AnyPgDb,
    options?: { outbox?: boolean; closeFn?: () => Promise<void> },
  ) {
    this.db = db;
    this.outboxEnabled = options?.outbox ?? false;
    this.closeFn = options?.closeFn;
  }

  async close(): Promise<void> {
    if (this.closeFn) {
      await this.closeFn();
    }
  }

  async ping(): Promise<void> {
    await this.db.select({ poolId: schema.poolTotals.poolId }).from(schema.poolTotals).limit(1);
  }

  async appendEvents(poolId: string, events: Event[]): Promise<AppendResult> {
    return await this.db.transaction(async (tx) => {
      let inserted = 0;
      let skipped = 0;
      const accepted: Event[] = [];

      for (const event of events) {
        const rows = await tx
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
          .returning({ eventId: schema.events.eventId });

        if (rows.length === 0) {
          skipped++;
          accepted.push(event);
        } else {
          inserted++;
          accepted.push(event);
          await this.updateProjections(tx, poolId, event);

          if (this.outboxEnabled) {
            await tx.insert(schema.outbox).values({
              poolId,
              eventId: event.id,
              payload: JSON.stringify(event),
            });
          }
        }
      }

      return { inserted, skipped, events: accepted };
    });
  }

  private async updateProjections(
    tx: Parameters<Parameters<AnyPgDb["transaction"]>[0]>[0],
    poolId: string,
    event: Event,
  ): Promise<void> {
    let delta: number;

    if (event.scopeId === null) {
      // Branch A: no scopeId — always additive
      delta = event.kudos;
    } else {
      // Branch B: scopeId present — latest-wins
      const [current] = await tx
        .select()
        .from(schema.poolScopeLatest)
        .where(
          and(
            eq(schema.poolScopeLatest.poolId, poolId),
            eq(schema.poolScopeLatest.recipient, event.recipient),
            eq(schema.poolScopeLatest.scopeId, event.scopeId),
          ),
        );

      if (!current) {
        // B1: no existing row — insert, delta = event.kudos
        delta = event.kudos;
        await tx.insert(schema.poolScopeLatest).values({
          poolId,
          recipient: event.recipient,
          scopeId: event.scopeId,
          eventId: event.id,
          kudos: event.kudos,
          ts: event.ts,
        });
      } else {
        // Deterministic tie-break: newer ts wins, or lexicographic eventId
        const isNewer =
          event.ts > current.ts ||
          (event.ts === current.ts && event.id > current.eventId);

        if (isNewer) {
          // B2: new event is newer — update scope_latest, delta = new - old
          delta = event.kudos - Number(current.kudos);
          await tx
            .update(schema.poolScopeLatest)
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
            );
        } else {
          // B3: old event still newest — no change
          delta = 0;
        }
      }
    }

    // Apply delta to projection tables
    if (delta !== 0) {
      // Upsert poolRecipientTotals
      await tx
        .insert(schema.poolRecipientTotals)
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
        });

      // Upsert poolTotals
      await tx
        .insert(schema.poolTotals)
        .values({
          poolId,
          kudos: delta,
        })
        .onConflictDoUpdate({
          target: schema.poolTotals.poolId,
          set: {
            kudos: sql`${schema.poolTotals.kudos} + ${delta}`,
          },
        });
    }

    // Update emojis if present
    if (event.emoji !== null) {
      // Ensure the recipient totals row exists
      await tx
        .insert(schema.poolRecipientTotals)
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
        });

      const [row] = await tx
        .select({ emojis: schema.poolRecipientTotals.emojis })
        .from(schema.poolRecipientTotals)
        .where(
          and(
            eq(schema.poolRecipientTotals.poolId, poolId),
            eq(schema.poolRecipientTotals.recipient, event.recipient),
          ),
        );

      const emojis: string[] = JSON.parse(row?.emojis ?? "[]");
      if (!emojis.includes(event.emoji)) {
        emojis.push(event.emoji);
        await tx
          .update(schema.poolRecipientTotals)
          .set({ emojis: JSON.stringify(emojis) })
          .where(
            and(
              eq(schema.poolRecipientTotals.poolId, poolId),
              eq(schema.poolRecipientTotals.recipient, event.recipient),
            ),
          );
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

    const rows = await this.db
      .select()
      .from(schema.events)
      .where(and(...conditions))
      .orderBy(desc(schema.events.ts), desc(schema.events.eventId))
      .limit(options.limit + 1);

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

  async readSummary(
    poolId: string,
    limit: number,
  ): Promise<ReadSummaryResult> {
    const [totalsRow] = await this.db
      .select({ kudos: schema.poolTotals.kudos })
      .from(schema.poolTotals)
      .where(eq(schema.poolTotals.poolId, poolId));

    const totalKudos = totalsRow ? Number(totalsRow.kudos) : 0;

    const rows = await this.db
      .select()
      .from(schema.poolRecipientTotals)
      .where(eq(schema.poolRecipientTotals.poolId, poolId))
      .orderBy(desc(schema.poolRecipientTotals.kudos))
      .limit(limit);

    const summary: RecipientSummary[] = rows.map((row) => ({
      recipient: row.recipient,
      kudos: Number(row.kudos),
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
    return await this.db.transaction(async (tx) => {
      // Use raw SQL for FOR UPDATE SKIP LOCKED support
      const rows = await tx.execute(
        sql`SELECT "id", "pool_id", "event_id", "payload", "created_at", "attempts", "last_error"
            FROM "outbox"
            WHERE "delivered" = 0
              AND "attempts" < ${maxAttempts}
              AND ("leased_at" IS NULL OR "leased_at" <= now() - interval '${sql.raw(String(leaseTtlSeconds))} seconds')
            ORDER BY "created_at" ASC
            LIMIT ${limit}
            FOR UPDATE SKIP LOCKED`,
      );

      if (rows.rows.length === 0) return [];

      const ids = rows.rows.map((r: any) => r.id as number);

      await tx
        .update(schema.outbox)
        .set({
          leaseId,
          leasedAt: sql`now()`,
        })
        .where(inArray(schema.outbox.id, ids));

      return rows.rows.map((r: any) => ({
        id: r.id as number,
        poolId: r.pool_id as string,
        eventId: r.event_id as string,
        payload: r.payload as string,
        createdAt:
          r.created_at instanceof Date
            ? r.created_at.toISOString()
            : String(r.created_at),
        attempts: r.attempts as number,
        lastError: (r.last_error as string | null) ?? null,
      }));
    });
  }

  async markDelivered(ids: number[], leaseId: string): Promise<void> {
    if (ids.length === 0) return;
    await this.db
      .update(schema.outbox)
      .set({
        delivered: 1,
        deliveredAt: sql`now()`,
      })
      .where(
        and(
          inArray(schema.outbox.id, ids),
          eq(schema.outbox.leaseId, leaseId),
        ),
      );
  }

  async markFailed(
    ids: number[],
    error: string,
    leaseId: string,
  ): Promise<void> {
    if (ids.length === 0) return;
    await this.db
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
      );
  }
}

function rowToEvent(row: typeof schema.events.$inferSelect): Event {
  return {
    id: row.eventId,
    recipient: row.recipient,
    sender: row.sender,
    ts: row.ts,
    scopeId: row.scopeId ?? null,
    kudos: Number(row.kudos),
    emoji: row.emoji ?? null,
    title: row.title ?? null,
    visibility: row.visibility as Event["visibility"],
    meta: row.meta ?? null,
  };
}
