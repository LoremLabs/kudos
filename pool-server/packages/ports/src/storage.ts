import type { Event, CursorPayload, RecipientSummary } from "@kudos-protocol/core";

export interface AppendResult {
  /** Events newly written to storage. */
  inserted: number;
  /** Events that already existed (idempotent dupes). */
  skipped: number;
  /** All accepted events (inserted + skipped), with normalized fields. */
  events: Event[];
}

export interface ReadEventsOptions {
  poolId: string;
  limit: number;
  /** Resume after this (ts, id) pair. */
  cursor?: CursorPayload;
  /** Only events with ts >= since (RFC 3339 string). */
  since?: string;
  /** Only events with ts < until (RFC 3339 string). */
  until?: string;
  includeTombstones?: boolean;
}

export interface ReadEventsResult {
  events: Event[];
  /** Cursor for the last item on this page, or null if no more results. */
  nextCursor: CursorPayload | null;
  hasMore: boolean;
}

export interface ReadSummaryResult {
  /** Total kudos across all recipients (for percent calculation). */
  totalKudos: number;
  /** Top-N recipients sorted by kudos descending. percent=0 placeholder. */
  summary: RecipientSummary[];
}

export interface StoragePort {
  appendEvents(poolId: string, events: Event[]): Promise<AppendResult>;
  readEvents(options: ReadEventsOptions): Promise<ReadEventsResult>;
  readSummary(poolId: string, limit: number): Promise<ReadSummaryResult>;
}
