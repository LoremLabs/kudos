---
"@kudos-protocol/storage-sqlite": minor
"@kudos-protocol/worker-outbox": minor
---

Add exponential backoff and improved logging for outbox sink delivery

- **storage-sqlite**: Add `next_retry_at` column to outbox table. `leasePending` skips rows whose retry time hasn't arrived. `markFailed` sets exponential backoff delay: 5s, 20s, 80s, 320s, 1280s, capped at 1 hour.
- **worker-outbox**: Default `maxAttempts` increased from 5 to 10 to allow transient failures more time to recover. ConsoleSink now logs per-event details (sender, recipient, id, kudos, emoji) instead of just a count.
- Migration: `ALTER TABLE outbox ADD next_retry_at text` (backward-compatible, NULL = immediately eligible)
