---
"@kudos-protocol/pool-core": minor
"@kudos-protocol/server": minor
"@kudos-protocol/ports": minor
"@kudos-protocol/storage-postgres": minor
"@kudos-protocol/storage-sqlite": minor
"@kudos-protocol/pool-server": minor
---

Add settlement-grade distribution endpoint

- `POST /core/v1/pools/{poolId}/distribution` — computes deterministic integer allocation of `totalPie` across pool recipients using largest-remainder method with bigint math
- All settlement values on the wire are base-10 strings (via new `bigintToString` helper)
- New `computeDistribution()` pure function in pool-core
- New `readRecipientTotals()` storage method returns bigint-native data without lossy Number() conversion
- Zero-allocation recipients are excluded from the response
- Invariant: `sum(points) === totalPie` (exact, no rounding loss)
- OpenAPI spec updated with full endpoint documentation
