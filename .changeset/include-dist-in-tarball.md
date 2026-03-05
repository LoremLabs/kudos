---
"@kudos-protocol/pool-server": patch
"@kudos-protocol/server": patch
"@kudos-protocol/storage-sqlite": patch
"@kudos-protocol/storage-postgres": patch
"@kudos-protocol/worker-outbox": patch
"@kudos-protocol/ports": patch
"@kudos-protocol/pool-core": patch
---

Add `"files": ["dist"]` so compiled output is included in published tarballs. Previous releases excluded `dist/` because it was in `.gitignore` and no `files` field was set.
