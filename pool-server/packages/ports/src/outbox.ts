export interface OutboxRow {
  id: number;
  poolId: string;
  eventId: string;
  payload: string;
  createdAt: string;
  attempts: number;
  lastError: string | null;
}

export interface OutboxPort {
  /** Lease up to `limit` undelivered rows. Returns rows where:
   *  delivered=0 AND attempts < maxAttempts AND
   *  (leased_at IS NULL OR leased_at < now - leaseTtlSeconds)
   *  Sets lease_id and leased_at on returned rows atomically. */
  leasePending(
    limit: number,
    maxAttempts: number,
    leaseId: string,
    leaseTtlSeconds: number,
  ): Promise<OutboxRow[]>;

  /** Mark rows as delivered. Only succeeds if leaseId matches. */
  markDelivered(ids: number[], leaseId: string): Promise<void>;

  /** Mark rows as failed (increment attempts, record error). Only succeeds if leaseId matches. */
  markFailed(ids: number[], error: string, leaseId: string): Promise<void>;
}
