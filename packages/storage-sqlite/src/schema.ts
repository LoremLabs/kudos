import { sqliteTable, text, integer, index, primaryKey } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const events = sqliteTable(
  "events",
  {
    poolId: text("pool_id").notNull(),
    eventId: text("event_id").notNull(),
    recipient: text("recipient").notNull(),
    sender: text("sender").notNull(),
    ts: text("ts").notNull(),
    scopeId: text("scope_id"),
    kudos: integer("kudos").notNull().default(1),
    emoji: text("emoji"),
    title: text("title"),
    visibility: text("visibility").notNull().default("PRIVATE"),
    meta: text("meta"),
    insertedAt: text("inserted_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    primaryKey({ columns: [table.poolId, table.eventId] }),
    index("idx_events_pool_ts_id").on(table.poolId, table.ts, table.eventId),
  ],
);

export const poolScopeLatest = sqliteTable(
  "pool_scope_latest",
  {
    poolId: text("pool_id").notNull(),
    recipient: text("recipient").notNull(),
    scopeId: text("scope_id").notNull(),
    eventId: text("event_id").notNull(),
    kudos: integer("kudos").notNull(),
    ts: text("ts").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.poolId, table.recipient, table.scopeId] }),
  ],
);

export const poolRecipientTotals = sqliteTable(
  "pool_recipient_totals",
  {
    poolId: text("pool_id").notNull(),
    recipient: text("recipient").notNull(),
    kudos: integer("kudos").notNull().default(0),
    emojis: text("emojis").notNull().default("[]"),
  },
  (table) => [
    primaryKey({ columns: [table.poolId, table.recipient] }),
    index("idx_recipient_totals_by_kudos").on(table.poolId, table.kudos),
  ],
);

export const poolTotals = sqliteTable("pool_totals", {
  poolId: text("pool_id").primaryKey(),
  kudos: integer("kudos").notNull().default(0),
});

export const pools = sqliteTable("pools", {
  poolId: text("pool_id").primaryKey(),
  name: text("name"),
  permissions: text("permissions"),
  config: text("config"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const outbox = sqliteTable(
  "outbox",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    poolId: text("pool_id").notNull(),
    eventId: text("event_id").notNull(),
    payload: text("payload").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    delivered: integer("delivered").notNull().default(0),
    deliveredAt: text("delivered_at"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    leasedAt: text("leased_at"),
    leaseId: text("lease_id"),
  },
  (table) => [
    index("idx_outbox_pending").on(table.delivered, table.createdAt),
  ],
);
