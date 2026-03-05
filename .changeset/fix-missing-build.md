---
"@kudos-protocol/pool-server": patch
"@kudos-protocol/server": patch
"@kudos-protocol/storage-sqlite": patch
"@kudos-protocol/storage-postgres": patch
"@kudos-protocol/worker-outbox": patch
"@kudos-protocol/ports": patch
"@kudos-protocol/pool-core": patch
---

Fix missing compiled output in published packages. The 0.1.0 release contained only TypeScript source files because the build step was skipped during the publish run. Added a pre-publish build step to the release workflow.
