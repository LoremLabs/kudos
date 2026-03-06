import { pgTable, text, bigint, integer, timestamp, index, primaryKey } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const events = pgTable(
  "events",
  {
    poolId: text("pool_id").notNull(),
    eventId: text("event_id").notNull(),
    recipient: text("recipient").notNull(),
    sender: text("sender").notNull(),
    ts: text("ts").notNull(),
    scopeId: text("scope_id"),
    kudos: bigint("kudos", { mode: "number" }).notNull().default(1),
    emoji: text("emoji"),
    title: text("title"),
    visibility: text("visibility").notNull().default("PRIVATE"),
    meta: text("meta"),
    insertedAt: timestamp("inserted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.poolId, table.eventId] }),
    index("idx_events_pool_ts_id").on(table.poolId, table.ts, table.eventId),
  ],
);

export const poolScopeLatest = pgTable(
  "pool_scope_latest",
  {
    poolId: text("pool_id").notNull(),
    recipient: text("recipient").notNull(),
    scopeId: text("scope_id").notNull(),
    eventId: text("event_id").notNull(),
    kudos: bigint("kudos", { mode: "number" }).notNull(),
    ts: text("ts").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.poolId, table.recipient, table.scopeId] }),
  ],
);

export const poolRecipientTotals = pgTable(
  "pool_recipient_totals",
  {
    poolId: text("pool_id").notNull(),
    recipient: text("recipient").notNull(),
    kudos: bigint("kudos", { mode: "number" }).notNull().default(0),
    emojis: text("emojis").notNull().default("[]"),
  },
  (table) => [
    primaryKey({ columns: [table.poolId, table.recipient] }),
    index("idx_recipient_totals_by_kudos").on(table.poolId, table.kudos),
  ],
);

export const poolTotals = pgTable("pool_totals", {
  poolId: text("pool_id").primaryKey(),
  kudos: bigint("kudos", { mode: "number" }).notNull().default(0),
});

export const pools = pgTable("pools", {
  poolId: text("pool_id").primaryKey(),
  name: text("name"),
  permissions: text("permissions"),
  config: text("config"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const outbox = pgTable(
  "outbox",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    poolId: text("pool_id").notNull(),
    eventId: text("event_id").notNull(),
    payload: text("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    delivered: integer("delivered").notNull().default(0),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    leasedAt: timestamp("leased_at", { withTimezone: true }),
    leaseId: text("lease_id"),
  },
  (table) => [
    index("idx_outbox_pending").on(table.delivered, table.createdAt),
  ],
);
