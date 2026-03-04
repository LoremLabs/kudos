import type { OutboxPort, OutboxRow } from "@kudos-protocol/ports";

export class MockOutbox implements OutboxPort {
  rows: (OutboxRow & { delivered: boolean; leaseId: string | null; leasedAt: string | null })[] = [];
  private nextId = 1;

  addRow(poolId: string, eventId: string, payload: string, overrides?: Partial<OutboxRow>): OutboxRow {
    const row = {
      id: this.nextId++,
      poolId,
      eventId,
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
      lastError: null,
      delivered: false,
      leaseId: null,
      leasedAt: null,
      ...overrides,
    };
    this.rows.push(row);
    return row;
  }

  async leasePending(
    limit: number,
    maxAttempts: number,
    leaseId: string,
    _leaseTtlSeconds: number,
  ): Promise<OutboxRow[]> {
    const eligible = this.rows.filter(
      (r) => !r.delivered && r.attempts < maxAttempts && r.leaseId === null,
    );
    const batch = eligible.slice(0, limit);
    for (const row of batch) {
      row.leaseId = leaseId;
      row.leasedAt = new Date().toISOString();
    }
    return batch.map(({ delivered, leaseId: _l, leasedAt: _la, ...rest }) => rest);
  }

  async markDelivered(ids: number[], leaseId: string): Promise<void> {
    for (const row of this.rows) {
      if (ids.includes(row.id) && row.leaseId === leaseId) {
        row.delivered = true;
      }
    }
  }

  async markFailed(ids: number[], error: string, leaseId: string): Promise<void> {
    for (const row of this.rows) {
      if (ids.includes(row.id) && row.leaseId === leaseId) {
        row.attempts++;
        row.lastError = error;
        // Release the lease so it can be re-leased
        row.leaseId = null;
        row.leasedAt = null;
      }
    }
  }
}
